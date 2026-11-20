/*
 * The decision layer, on its own because two things need it.
 *
 * The worker turns scores into detections with it. The enrollment page
 * needs the same rules to work out a threshold: `calibrate_threshold.py`
 * counts false alarms *through* the decision layer rather than on raw
 * window scores, and says why - "a threshold calibrated on raw window
 * scores would not transfer to a detector that requires two consecutive
 * windows".
 *
 * So there is one copy of it, and both load this file.
 */

/* The release this file belongs to. The worker, this file and the .wasm
 * are copied into SEPIA together and carry one number, from VERSION; the
 * worker reads it and refuses a copy it cannot work with. */
var KWS_DECISION_VERSION = "0.1.2";

/* The decision layer is detector.py's, transcribed. The numbers in it
 * were measured and the reasons are worth carrying across: two
 * consecutive windows instead of one cut the miss rate from 22.7 % to
 * 9.1 % at unchanged false alarms, and three costs hits on briefly
 * spoken keywords. The refractory period is not tuning - without it one
 * utterance fires once per hop for as long as it sits in the window. */
function PersistenceGate(threshold, minConsecutive, refractorySeconds) {
    this.threshold = threshold;
    this.minConsecutive = minConsecutive;
    this.refractorySeconds = refractorySeconds;
    this._run = 0;
    this._blockedUntil = -Infinity;
}

PersistenceGate.prototype.update = function (score, now) {
    this._run = score >= this.threshold ? this._run + 1 : 0;
    if (this._run < this.minConsecutive || now < this._blockedUntil) return false;
    this._blockedUntil = now + this.refractorySeconds;
    this._run = 0;
    return true;
};

/*
 * Suppress every keyword except the highest-scoring one.
 *
 * An utterance can only have been one keyword, but the scores do not
 * know that: saying "hey sepia" also lifts the other prototypes. Observed
 * live, hey_sepia 0.86 firing correctly and hey_jarvis 0.66 and computer
 * 0.59 following 0.3 s later on the same utterance. The refractory period
 * does not prevent it, because it is per keyword.
 *
 * Without `gaps`, the highest score. With them, the keyword furthest
 * above its own threshold counted in its own calibrated gap, which is
 * the training project's decision.winner(); src/decision.c says why.
 *
 * This is an arbitration rule and not a score transform. Subtracting the
 * cohort mean was tried offline and made the operating point worse for
 * two of three keywords.
 */
function arbitrate(scores, thresholds, gaps) {
    const above = gaps
        ? function (i) { return (scores[i] - thresholds[i]) / gaps[i]; }
        : function (i) { return scores[i]; };
    let best = 0;
    for (let i = 1; i < scores.length; i++) if (above(i) > above(best)) best = i;
    const out = new Array(scores.length);
    for (let i = 0; i < scores.length; i++) out[i] = i === best ? scores[i] : -1.0;
    return out;
}

/*
 * How many consecutive windows make up a span of `seconds` on this grid.
 *
 * A run of k windows spans (k-1) hops - that is how far apart the first
 * and the last of them start - so k is the smallest number whose span
 * reaches the one asked for. This is what makes two grids comparable:
 * "two consecutive windows" is 0.1 s of persistence at a 100 ms hop and
 * 0.8 s at an 800 ms one, so a count means a different rule on every
 * grid and a span means the same one everywhere.
 *
 * Rounds up and never down: a grid too coarse to express 0.4 s demands
 * 0.8 s rather than falling back to a single window, because a single
 * window over the threshold is what the gate exists to refuse. The
 * epsilon is for the grids that divide exactly - 0.8 / 0.4 is 2 in
 * decimal and can be 2.0000000000000004 in binary, and a ceil() of that
 * would ask for one window more than was wanted.
 *
 * src/decision.c carries the same function and tests/test_decision.mjs
 * holds the two to each other.
 */
function windowsForSpan(seconds, hopSeconds) {
    if (!(seconds > 0) || !(hopSeconds > 0)) return 1;
    let hops = Math.ceil(seconds / hopSeconds - 1e-9);
    if (!(hops > 0)) hops = 0;
    if (hops > 1e6) hops = 1e6;
    return hops + 1;
}

/*
 * Both gates, the arbitration and the order they run in - the whole rule,
 * in one place, because the rule is what the three implementations have
 * to agree on and a shared gate class was never enough to make them.
 *
 * Each keyword runs the persistence rule twice over the same windows: at
 * the shadow, for what is worth keeping, and at its own operating
 * threshold, for what counts as said. `over_threshold` is the second
 * gate firing and nothing else. It used to be `score >= threshold` read
 * on whatever window the shadow gate let through, which reported a lone
 * spike as a detection and missed the real ones, because the shadow
 * crossing precedes the peak and the refractory period then silenced the
 * windows that would have recorded it. src/decision.c carries the
 * measurement.
 *
 * The second gate is fed **every** window. There used to be one here fed
 * only on the windows where the shadow gate had already fired, so its
 * "two consecutive windows" meant two shadow events a refractory period
 * apart and a keyword said once was never marked a detection at all. It
 * was removed, rightly; this is not that gate.
 *
 * `shadow` is one number for every keyword or an array of each one's
 * own. `gaps`, when every keyword has one, makes arbitration count in
 * them; a keyword enrolled by hand has no second point to measure a gap
 * against, and then it is the highest score as it was.
 */
function Decider(thresholds, shadow, minConsecutive, refractorySeconds, gaps) {
    this.thresholds = Array.prototype.slice.call(thresholds);
    this.shadows = this.thresholds.map(function (t, i) {
        return Array.isArray(shadow) ? shadow[i] : shadow;
    });
    this.gaps = gaps && gaps.length === this.thresholds.length
            && gaps.every(function (g) { return g > 0; })
        ? Array.prototype.slice.call(gaps) : null;
    this.gates = this.shadows.map(function (s) {
        return new PersistenceGate(s, minConsecutive, refractorySeconds);
    });
    this.detect = this.thresholds.map(function (t) {
        return new PersistenceGate(t, minConsecutive, refractorySeconds);
    });
}

/* One window of scores to however many events it caused, in keyword
 * order. A window where both gates fire is one event and not two, which
 * is what leaves a production configuration - the shadow at the
 * operating threshold - exactly what it was. */
Decider.prototype.update = function (scores, now) {
    const gated = arbitrate(scores, this.thresholds, this.gaps);
    const out = [];
    for (let i = 0; i < this.gates.length; i++) {
        const kept = this.gates[i].update(gated[i], now);
        const fired = this.detect[i].update(gated[i], now);
        if (!kept && !fired) continue;
        out.push({
            keyword: i,
            score: scores[i],
            over_threshold: fired,
            at_seconds: now
        });
    }
    return out;
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        PersistenceGate: PersistenceGate,
        arbitrate: arbitrate,
        Decider: Decider,
        windowsForSpan: windowsForSpan,
        KWS_DECISION_VERSION: KWS_DECISION_VERSION
    };
}
