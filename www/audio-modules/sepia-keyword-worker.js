/*
 * The SEPIA module: a Web Worker that turns microphone audio into keyword
 * detections, and into the record that makes a day of use measurable.
 *
 * It replaces porcupine-wake-word-worker.js and implements the same ctrl
 * protocol, so the pipeline does not have to know the difference.
 * INTEGRATION.md has that protocol, read off sepia-web-audio at commit
 * 18742f54 rather than from documentation.
 *
 * Three files ship together: this one, sepia-kws/kws-decision.js below
 * it and the .wasm. KWS_VERSION below is how a mixed copy is
 * told. The model, the keywords and the .wasm may arrive as pre-loads;
 * whatever the host does not give, the worker fetches from sepia-kws/
 * itself, by the names in its setup.
 *
 * The division of labour with the WASM is deliberate and load-bearing.
 * The module is a pure function - 35 200 samples in, three cosines out -
 * and everything stateful lives here: the sliding window, the two
 * consecutive windows, the refractory period, the records. That is what
 * lets tests/test_c.py compare the module against reference/kwsref.py as
 * a function, which is the one rule this project has.
 *
 * Nothing here allocates per window. The buffers are made once in
 * construct() and reused, because this runs ten times a second for days.
 */

/*
 * The release this file belongs to. The worker, kws-decision.js and the
 * .wasm are copied into SEPIA together and carry one number, from
 * VERSION; tests/test_version.mjs holds this repository's three to it.
 *
 * Copies from different releases are refused only when the numbers say
 * they cannot work together: a different first number, or - while that
 * is 0 - a different second one. Anything else is an improvement on one
 * side, reported in moduleInfo.version and not refused. A file with no
 * number predates them and is reported as null.
 */
const KWS_VERSION = "0.1.2";
let versions = null;            // {worker, decision, wasm}, once loaded

/* The decision layer lives in sepia-kws/kws-decision.js, because the
 * enrollment page needs the same rules to choose a threshold. In a
 * Worker this brings PersistenceGate, arbitrate and Decider into scope. */
if (typeof Decider === "undefined") {
    importScripts("./sepia-kws/kws-decision.js");
}

/* A module whose one function returns a v128. It validates only where
 * WASM SIMD exists, and validating instantiates nothing. Checked once,
 * when the worker starts; it decides which build is fetched when the
 * host gave none, and explains a SIMD build the browser cannot run.
 * Without validate() at all the answer is null and the scalar build,
 * which runs everywhere, is the one fetched. */
const SIMD_PROBE = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0,   // magic, version
    1, 5, 1, 96, 0, 1, 123,        // type section: () -> v128
    3, 2, 1, 0,                    // function section: one, of that type
    10, 8, 1, 6, 0,                // code section: one body, 6 bytes, 0 locals
    65, 0,                         //   i32.const 0
    253, 15,                       //   i8x16.splat   <- the SIMD opcode
    11                             //   end
]);
const browserSimd = typeof WebAssembly.validate === "function"
    ? WebAssembly.validate(SIMD_PROBE) : null;

/* The model the worker runs when the setup names none. js/kws-settings.js
 * holds the repository's default, KWS_DEFAULT_MODEL, and
 * tests/test_version.mjs holds this one to it. */
const KWS_DEFAULT_MODEL = "wdtcn-v4-s0-uno";
// Where the worker finds what it fetches, relative to its own URL: the
// package's layout, and the repository's js/sepia-kws/ for the scripts.
const KWS_FOLDER = "./sepia-kws/";
// What the worker fetched itself, by URL, and null for what it was given.
let fetchedFiles = null;

const workerId = "sepia-keyword-worker-"
    + Math.round(Math.random() * 1000000) + "-" + Date.now();

// The rate the module works at. Everything downstream of pushSamples()
// counts in it: the history, the hop grid, the meters, the clips.
const MODULE_RATE = 16000;

// --- what the pipeline told us ------------------------------------------
// captureSampleRate is what arrives, inputSampleRate is what the module
// sees. They differ only when the module converts between them, which is
// the point of doing it here rather than in the AudioContext.
let inputSampleRate, captureSampleRate, resampleOn;
let channelCount, inputSampleSize, processBufferSize;
let isFloat32Input, sendClips, emitWindowScores;
let shadowThreshold, clipPreSeconds, clipPostSeconds, exposureEverySeconds;
// How long a score has to stay over a threshold, in seconds. Negative
// leaves it to the calibration point the run selects; a value is a
// condition that point has to match, and the module derives the window
// count from the hop in force.
let persistenceSeconds = -1;
// See supersedeSeconds in construct(): a detection and the shadow
// crossing that preceded it are one utterance, and each would otherwise
// open its own clip.
let supersedeSeconds = -1;

// --- the module ---------------------------------------------------------
let api = null;                 // the WASM exports
let audioView, scoresView, meterView;   // views onto its memory, made once
let keywords = [], thresholds = [];
// Each keyword's own shadow and calibrated gap, as the module chose them
// with its thresholds; see kws_shadow() in src/wasm_api.c. A shadow set
// in the setup replaces every one of them.
let moduleShadows = [], gaps = [];
let windowSamples, hopSamples, hopSeconds, minConsecutive, refractorySeconds;

// --- what the front end is doing ----------------------------------------
// Both read back out of the module rather than remembered from what was
// asked for, and both reported in moduleInfo. A module built before
// these existed simply does not export them, and then the worker runs
// the way it always did - which is the only reason the flags are read
// instead of assumed.
let frontEndF32 = false;        // the mel in float32 rather than float64
let carryFrames = false;        // and carried between overlapping windows

/*
 * The streaming encoder, if the page asked for it and the module has it.
 *
 * `carryFrames` carries the front end's mel frames between overlapping
 * windows, which is exact. The ring carries the encoder's columns too -
 * a hop in, an embedding out, each layer keeping what it computed last
 * time - and that is twice as fast again. It is not exact, and that is
 * why it is asked for rather than switched on by finding it: a window
 * scored by the ring has the real audio to its left where the windowed
 * path has zeros, so the two answer slightly different questions. On
 * real capture the worst disagreement measured is 0.04 in a cosine and
 * the events land on the same grid, but "slightly different" is not a
 * thing to decide on somebody's behalf from here.
 *
 * It also costs a continuity the windowed path does not need. Every hop
 * must go in, in order, or the ring holds columns computed from audio
 * that is no longer behind the window. That matters at SEPIA's module
 * gate, and that is where it turns out not to be a cost at all - see
 * `gateOpenedAtSample`.
 */
let useRing = false;            // what the page asked for
let ringOn = false;             // and what the module can actually do

/*
 * The 30 Hz capture high-pass, run inside the module so that a browser
 * and `kwsc listen` cannot drift apart on the filter itself.
 *
 * On unless the page says otherwise, which is how sepia-keyword-spotting
 * runs it and what their thresholds are calibrated with. A page that
 * turns it off is reproducing a measurement taken before it existed.
 */
let useHighpass = true;         // what the page asked for
let highpassOn = false;         // and what the module can actually do
let hpOut = null;               // one reusable block, see atModuleRate()
let int16Out = null;            // and one for fromInt16()
const EMPTY_BLOCK = new Float32Array(0);

/*
 * Whether the thresholds in force were calibrated for what this run is
 * doing, or borrowed from the model's default point.
 *
 * A threshold belongs to a set of conditions - the encoder path, the
 * grid, the capture filter, the false-alarm budget - and a model
 * carries one point per set somebody measured. Running outside all of
 * them is allowed and is sometimes the only option, but a page has to
 * be able to see that it is happening.
 */
let falseAlarmsPerHour = 0;     // 0: the default point's own budget
let calibrated = false;
// setup.thresholds and every setThresholds since, by keyword name, kept
// so that every re-read of the module's numbers applies them again. A new
// enrollment brings its own and drops them, and so does a sensitivity.
let thresholdOverrides = null;
// The sensitivity asked for, 1 (strictest) to 5 (loosest), applied on
// every re-read before any threshold typed over it; null for the
// calibrated point as the module chose it. `levels` is what each keyword's
// file carries: [null, t1, ..., t5], or null for a keyword without levels.
let sensitivityLevel = null;
let levels = [];

/*
 * The absolute index at which SEPIA's module gate last opened, and the
 * rule that no window reaching behind it is scored. (The module gate is
 * the host's switch for not listening - `{gate: 'open'}` - and not the
 * detector's trigger rule; INTEGRATION.md keeps the two apart.)
 *
 * A shut module gate means the pipeline is deliberately not asking for a
 * keyword check - because it is speaking, most often. The audio from
 * that time is the thing being excluded, so a window that reaches into
 * it is being scored on exactly what the module gate was shut for.
 * **Every opening of the module gate is therefore a stream that starts
 * now.** A window covers the 2.2 s before it, so the first one that can
 * be scored is the one ending a full window after it opened.
 *
 * That was not true before, and the windowed path had the same hole:
 * the first twenty-two windows after the module gate opened reached back
 * into the muted audio. It is a correctness rule and not a ring rule, so
 * both paths obey it, and the ring gets its continuity for free - a
 * reset at the opening is what the rule asks for anyway.
 *
 * The one case this gives up is a pipeline that deliberately buffers
 * audio just before opening the module gate and means it to be scored. None
 * does today, and if one ever does it has to say so rather than be
 * guessed at from a timestamp.
 */
let gateOpenedAtSample = 0;

// --- the sliding window and the clip history ----------------------------
// One buffer serves both. A sample with absolute index s always lives at
// s % history.length, which makes every read an index calculation rather
// than a book-keeping problem.
let history = null;
let samplesSeen = 0;
let nextScoreAt = 0;            // absolute index at which the next window ends

// --- the record ---------------------------------------------------------
let runId = "";
// What runId is built from: the setup's run name, then how many times the
// enrollment and the thresholds have changed since - each change is a new
// measurement with a run record of its own.
let runBase = "";
let thresholdGeneration = 0;
let decider = null;
let windowsScored = 0, behindWindows = 0, eventsEmitted = 0, overThreshold = 0;
let supersededRecords = 0;      // kept records a detection replaced
let scoreMs = 0, scoreMsMin = Infinity, scoreMsMax = 0;
let startedAtMs = 0, lastExposureAt = 0;
let pending = [];               // events waiting for their post-roll
let timeline = [];              // [at_seconds, {keyword: score}] for clips

// --- the two signals that are recorded and never acted on -------------
// CONCEPT.md 12: a veto can only suppress, and a real keyword it throws
// away leaves no event, no clip and no trace. Both can be switched off,
// because both cost time and a runtime that cannot keep up measures
// nothing at all - the exposure record carries what they cost so the
// decision can be made on a number.
let measureGlitch, measureSnr, emitGlitchWindows;
let glitchSeconds = 0, glitchMax = 0, glitchMs = 0, snrMs = 0;
let lastGlitchAt = 0, inGlitch = false;

/*
 * The meters' parameters, by the name the setup uses, in the order the
 * module's field indices run. Nothing about a meter is spelled into this
 * file as a number: the defaults live in src/meters.c and this reads
 * them back after applying whatever the setup overrode, so the run
 * record states what actually measured the day rather than what someone
 * meant to ask for.
 */
/* src/wasm_api.c's text_field() numbers. Which model and which
 * enrollments are running has to reach the run record: two days measured
 * with different ones look alike afterwards otherwise. */
const MODEL_FIELDS = {
    classifierId: 0, modelName: 1, classifierSource: 2, classifierBuilt: 3,
    encoderId: 8,
    // How a window is scored; the thresholds belong to it.
    centre: 11, projection: 12
};
/* And keyword_text()'s: what each keyword's enrollment said about it. A
 * keyword can come from a file of its own, so this is per keyword. */
const KEYWORD_FIELDS = [
    "thresholdSource", "thresholdNote", "enrolledBy", "enrolledAt",
    "requiresClassifier", "pairingNote"
];

const METER_FIELDS = [
    "glitchPeriodSeconds",      // one DMA period of the machine that faults
    "glitchSearchFraction",     // +/- this much of it, for clock offset
    "snrBandLowHz",
    "snrBandHighHz",
    "snrFrameSeconds",
    "snrSpanSeconds",           // how far before the trigger to look
    "snrFloorSeconds",          // how much of the start sets the floor
    "snrFloorPercentile"
];
let meterConfig = {};
let identity = {};
// The enrollment files in force, kept so a refused swap can go back.
let enrollments = [];

/*
 * Views onto the module's buffers, made in init() and again whenever
 * enrollments were loaded. Loading one is the one thing in the module
 * that allocates: it may move the scores and grow linear memory, which
 * detaches every view made before it - silently, a detached view reads
 * as empty. Nothing else allocates, so between loads these stay valid.
 */
function bindViews() {
    audioView = new Float32Array(api.memory.buffer, api.kws_audio_ptr(), windowSamples);
    scoresView = new Float64Array(api.memory.buffer, api.kws_scores_ptr(), keywords.length);
    meterView = new Float32Array(api.memory.buffer, api.kws_meter_ptr(),
                                 api.kws_meter_capacity());
}

/*
 * The module's keywords from these .kwsp files: one ArrayBuffer, or an
 * array of them, each holding one keyword or several. Whatever was
 * loaded is dropped first. Returns null, or why a file was refused - and
 * then the module holds the files before it, not the set asked for.
 */
function loadEnrollments(files) {
    const list = Array.isArray(files) ? files : [files];
    if (!list.length) return "no enrollment file given";
    api.kws_drop_prototypes();
    for (let i = 0; i < list.length; i++) {
        const proto = new Uint8Array(list[i]);
        const which = list.length > 1 ? "file " + (i + 1) + " of "
            + list.length + ": " : "";
        if (proto.length > api.kws_proto_capacity()) {
            return which + proto.length + " bytes, the module holds "
                + api.kws_proto_capacity();
        }
        new Uint8Array(api.memory.buffer, api.kws_proto_ptr(), proto.length)
            .set(proto);
        if (api.kws_add_prototypes_file(proto.length) !== 0) {
            return which + refusal();
        }
    }
    enrollments = list.slice();
    return null;
}

/*
 * The model and its enrollments, for moduleInfo and the run record.
 *
 * Per keyword as the module holds it, and once more for the run as a
 * whole under the names the record has always had: the same value when
 * every keyword agrees, all of them joined when they do not, and
 * "mixed" for a threshold source, which is read as a word. Every
 * enrollment loaded was paired on the model's own name and build, so
 * those are what it asks for.
 */
function readIdentity() {
    identity = {};
    Object.keys(MODEL_FIELDS).forEach(function (name) {
        identity[name] = decodeText(api.kws_text_ptr(MODEL_FIELDS[name]),
                                    api.kws_text_len(MODEL_FIELDS[name]));
    });
    identity.modelBuild = api.kws_model_build();
    identity.requiresModel = identity.modelName;
    identity.requiresBuild = identity.modelBuild;
    identity.keywords = [];
    for (let i = 0; i < api.kws_n_keywords(); i++) {
        const k = { name: decodeText(api.kws_keyword_name_ptr(i),
                                     api.kws_keyword_name_len(i)) };
        KEYWORD_FIELDS.forEach(function (name, field) {
            k[name] = decodeText(api.kws_keyword_text_ptr(i, field),
                                 api.kws_keyword_text_len(i, field));
        });
        identity.keywords.push(k);
    }
    KEYWORD_FIELDS.forEach(function (name) {
        const seen = [];
        identity.keywords.forEach(function (k) {
            if (k[name] && seen.indexOf(k[name]) < 0) seen.push(k[name]);
        });
        identity[name] = !seen.length ? null : seen.length === 1 ? seen[0]
            : name === "thresholdSource" ? "mixed" : seen.join("; ");
    });
}

function decodeText(ptr, len) {
    if (!len) return null;
    return new TextDecoder().decode(
        new Uint8Array(api.memory.buffer, ptr, len));
}

/* The module's own reason for refusing the last enrollment: text field
 * 13 in src/wasm_api.c, after the model's fields. */
const REFUSED_FIELD = 13;
function refusal() {
    return decodeText(api.kws_text_ptr(REFUSED_FIELD),
                      api.kws_text_len(REFUSED_FIELD))
        || "the module gave no reason";
}

// Above this the capture-fault meter calls it a fault. The Pi's number
// was 0.85, calibrated on 48 kHz capture against 1320 s of fault-free
// material that topped out at 0.758 - and that calibration has not been
// repeated on browser audio. glitch_max is recorded beside the count so
// a run can be re-read at another threshold afterwards, the same way the
// shadow threshold lets a day be re-scored.
let glitchThreshold;

/*
 * An optional collector, run from in here rather than from the page.
 *
 * The worker has `fetch` and already holds the clip, so posting from
 * here keeps 320 kB per event off the thread boundary and, more
 * usefully, puts the whole thing in the module declaration: an
 * integrator who wires this into SEPIA configures one object and is
 * done, instead of also having to catch module messages in the page.
 *
 * Nothing about it can disturb the detector. kws-collector-client.js
 * swallows every failure, bounds its queue and is never awaited - a
 * collector that is not running costs evidence, not detections.
 *
 * Leave `collectorUrl` unset and the worker never touches the network;
 * the page can then run the same client over the same messages, which is
 * what examples/page does.
 */
let collector = null;

let gateIsOpen = false;
let gateOpenedAt = 0, gateClosedAt = 0;
let wasConstructed = false;
let enrollmentGeneration = 0;
let isFirstProcess = true;

/* The templates throw JSON strings rather than objects, with the comment
 * that an object does not show up in worker.onerror properly. Keep that. */
function throwAs(name, message) {
    throw JSON.stringify({ name: name, message: message });
}

function sendError(name, message, info) {
    emit({ moduleState: 10, error: { name: name, message: message, info: info } });
}

/*
 * Overrides the operating thresholds, by keyword name or by position.
 * Returns null, or a message saying why nothing was changed.
 *
 * A threshold below the shadow is refused for the same reason a shadow
 * above a threshold is: the persistence gate runs at the shadow and
 * over_threshold is only read for a window that got through it, so the
 * two have to stay in that order or scores in between are dropped
 * rather than recorded.
 *
 * All or nothing. A half-applied set would leave the run measuring with
 * numbers nobody chose.
 */
function applyThresholds(values) {
    const next = thresholds.slice();
    const names = Object.keys(values || {});
    for (const name of names) {
        const at = keywords.indexOf(name);
        const index = at >= 0 ? at : (/^\d+$/.test(name) ? Number(name) : -1);
        if (index < 0 || index >= thresholds.length) {
            return "no keyword '" + name + "'; this model has "
                + keywords.join(", ");
        }
        const value = Number(values[name]);
        if (!(value >= 0 && value <= 1)) {
            return "threshold for '" + name + "' must be between 0 and 1, got "
                + values[name];
        }
        // Only a shadow the setup set for every keyword is a floor; a
        // keyword's own follows its threshold down.
        const floor = shadowThreshold;
        if (floor !== undefined && value < floor) {
            return "threshold " + value + " for '" + name + "' is below the "
                + "shadow " + floor + "; the shadow would keep a "
                + "subset of the detections and no near misses at all";
        }
        next[index] = value;
    }
    thresholds = next;
    return null;
}

/* The shadow in force for one keyword, and for all of them. */
function shadowFor(i) {
    return shadowThreshold !== undefined ? shadowThreshold : moduleShadows[i];
}

/*
 * A keyword's own shadow, from the threshold in force: one calibrated gap
 * under it, or KWS_SHADOW_MARGIN under it without a gap - so what is
 * kept is the near miss of whatever threshold runs, a sensitivity's or
 * one typed in. At the default point that is the looser calibrated point,
 * which is what the module reports. kws_shadow_under() in src/kwsfile.c
 * is the same rule; tests/test_worker.mjs holds the two together.
 */
const KWS_SHADOW_MARGIN = 0.03;
function shadowUnder(threshold, gap) {
    const s = threshold - (gap > 0 ? gap : KWS_SHADOW_MARGIN);
    return s > 0 ? Math.floor(s * 1e4 + 0.5) / 1e4 : 0;
}

/* The sensitivity the thresholds in force amount to: the level every
 * keyword that carries levels sits at, the one asked for first; null when
 * none does, which a page shows as "custom". */
function currentSensitivity() {
    const order = [sensitivityLevel, 4, 3, 2, 1, 5];
    const carrying = levels.filter(Boolean).length;
    if (!carrying) return null;
    for (const n of order) {
        if (!n) continue;
        if (levels.every((l, i) => !l || l[n] === null
                                   || thresholds[i] === l[n])
                && levels.some((l) => l && l[n] !== null)) return n;
    }
    return null;
}

/* Whether any keyword loaded carries level `n`, read from the module
 * before the levels are. */
function carriesLevel(n) {
    if (!api.kws_sensitivity) return false;
    for (let i = 0; i < api.kws_n_keywords(); i++) {
        if (api.kws_sensitivity(i, n) >= 0) return true;
    }
    return false;
}

/* Why sensitivity `n` cannot run, or null. */
function sensitivityProblem(n) {
    if (!(n >= 1 && n <= 5 && Math.floor(n) === n)) {
        return "sensitivity is 1 (strictest) to 5 (loosest), not " + n;
    }
    if (!levels.some((l) => l && l[n] !== null)) {
        return "no keyword in this enrollment carries sensitivity levels";
    }
    for (let i = 0; i < levels.length; i++) {
        if (levels[i] && levels[i][n] !== null && shadowThreshold !== undefined
                && levels[i][n] < shadowThreshold) {
            return "sensitivity " + n + " puts '" + keywords[i] + "' at "
                + levels[i][n] + ", under the shadow " + shadowThreshold
                + " the setup set for every keyword";
        }
    }
    return null;
}
function shadows() {
    return keywords.map(function (k, i) { return shadowFor(i); });
}

/* One way out, so the collector sees what the pipeline sees. */
/* The part of a version that has to be equal for two files to work
 * together: "1" of 1.4.2, "0.3" of 0.3.1. */
function breakingPart(version) {
    const part = String(version).split(".");
    return part[0] === "0" ? part[0] + "." + part[1] : part[0];
}

function checkVersions() {
    const packed = api.kws_version ? api.kws_version() : null;
    versions = {
        worker: KWS_VERSION,
        decision: typeof KWS_DECISION_VERSION === "string"
            ? KWS_DECISION_VERSION : null,
        wasm: packed === null ? null
            : (packed >> 16) + "." + ((packed >> 8) & 255) + "." + (packed & 255)
    };
    [["decision", "kws-decision.js"], ["wasm", "The .wasm"]].forEach(function (file) {
        const theirs = versions[file[0]];
        if (theirs === null) {
            console.warn("KeywordWorker: " + file[1] + " carries no version, "
                + "so it predates this worker (" + KWS_VERSION + ")");
        } else if (breakingPart(theirs) !== breakingPart(KWS_VERSION)) {
            throwAs("KeywordModuleException", file[1] + " is from release "
                + theirs + " and this worker from " + KWS_VERSION + ", which do "
                + "not work together. Copy the worker, kws-decision.js and "
                + "the .wasm from one release.");
        }
    });
}

function emit(message, transfer) {
    if (collector) collector.handle(message);
    if (transfer && transfer.length) postMessage(message, transfer);
    else postMessage(message);
}

function moduleInfo() {
    return {
            moduleId: workerId,
            inputSampleRate: inputSampleRate,
            captureSampleRate: captureSampleRate,
            resampling: !!resampleOn,
            channelCount: channelCount,
            inputSampleSize: inputSampleSize,
            inputIsFloat32: isFloat32Input,
            processBufferSize: processBufferSize,
            run: runId,
            keywords: keywords,
            thresholds: thresholds,
            // The level the thresholds amount to, null when they are none
            // of them; and each keyword's levels, null for one without.
            sensitivity: currentSensitivity(),
            sensitivityLevels: levels.map((l) => l && {
                1: l[1], 2: l[2], 3: l[3], 4: l[4], 5: l[5] }),
            // The one set in the setup, if any; `shadows` is what runs.
            shadowThreshold: shadowThreshold,
            shadows: shadows(),
            // Which keyword a window belongs to when several score at
            // once: in calibrated gaps when every keyword has one, by
            // score otherwise. The run record keeps both, so an analysis
            // can replay the same choice.
            gaps: gaps,
            arbitration: gaps.length && gaps.every(function (g) {
                return g > 0; }) ? "gap" : "score",
            windowSamples: windowSamples,
            hopSamples: hopSamples,
            minConsecutive: minConsecutive,
            refractorySeconds: refractorySeconds,
            clipSeconds: sendClips ? [clipPreSeconds, clipPostSeconds] : null,
            emitWindowScores: emitWindowScores,
            glitch: measureGlitch,
            snrDb: measureSnr,
            glitchThreshold: glitchThreshold,
            // The module's own answer, not the filename's. A scalar build
            // under the SIMD name runs 1.6x slower and looks identical
            // from outside.
            simd: api.kws_has_simd ? !!api.kws_has_simd() : null,
            // What the worker fetched itself, by URL: the keyword list,
            // the module, the model and the enrollments. null for what
            // the host gave as a pre-load.
            fetched: fetchedFiles,
            // What the front end is actually doing, read back out of the
            // module. A build without the switches reports false for
            // both and is 1.8x slower, which is otherwise invisible -
            // and the float32 path moves scores in the seventh decimal,
            // so a run compared against one measured the other way
            // should be able to say which it was.
            frontEndF32: frontEndF32,
            carryFrames: carryFrames,
            // The streaming encoder: asked for with useRing, and true
            // only if the module exports it. A page that asked and got
            // false is running on a module built before it existed,
            // which is worth being able to see from outside.
            streaming: ringOn,
            // The capture high-pass, asked for by default and true only
            // if the module exports it. A page running an older module
            // is scoring unfiltered audio against filtered thresholds,
            // which is worth being able to see from outside.
            highpass: highpassOn ? api.kws_highpass_rate() : 0,
            // False when the thresholds in force were fitted to other
            // conditions than these. See the note above `calibrated`.
            calibrated: calibrated,
            // Which classifier and which enrollment produced this run.
            model: identity,
            // And which release of the worker, kws-decision.js and the
            // .wasm, each as the file itself states it.
            version: versions,
            // Whether this worker posts its own records, and where. A run
            // that believes it is being recorded and is not produces no
            // evidence and no warning, so this says which it is.
            collectorUrl: collector ? collector.url : null,
            // Read back out of the module, not echoed from the setup.
            meters: meterConfig,
        // Porcupine starts closed and so do we: nothing is scored
        // until whatever sits in front opens the module gate.
        gateIsOpen: gateIsOpen
    };
}

function ready() {
    emit({ moduleState: 1, moduleInfo: moduleInfo() });
}

/*
 * The keyword names and thresholds, read back out of the module.
 *
 * Names come out of the file, not out of the pipeline's setup. A runtime
 * that reads a .kws needs no other knowledge of the training project,
 * and a name list configured separately is the second source of truth
 * the format exists to avoid.
 *
 * Both callers need all of it: the enrollment supplies the names and the
 * thresholds together, so a load and a mid-run swap read the same way.
 */
function readKeywords() {
    const decoder = new TextDecoder();
    // Before the thresholds are read, and with whatever useRing and
    // useHighpass have settled to, since both are conditions.
    // The gate comes with them: the point says what it was counted
    // under, and setup.persistenceSeconds, when given, is a condition the
    // point has to match rather than a number laid over it.
    const chosen = api.kws_calibration_select(ringOn ? 1 : 0,
                                              falseAlarmsPerHour,
                                              persistenceSeconds);
    if (chosen < 0) {
        throwAs("KeywordSetupException", "the module could not choose "
            + "calibration points for this run: " + refusal());
    }
    calibrated = chosen === 0;
    // Before the thresholds are read, so they come back at the level. The
    // module applies it - the levels belong to the default point, and
    // only the module knows which point each keyword runs on. A set that
    // carries none of it runs at its own points and the level stays
    // asked, so a swap to such a set and back keeps it; whether a level
    // may start at all is the setup's question, asked once it is loaded.
    if (sensitivityLevel !== null && carriesLevel(sensitivityLevel)
            && api.kws_sensitivity_select(sensitivityLevel) < 0) {
        throwAs("KeywordSetupException", "sensitivity " + sensitivityLevel
            + ": " + refusal());
    }
    minConsecutive = api.kws_min_consecutive();
    refractorySeconds = api.kws_refractory_ms() / 1000;
    const count = api.kws_n_keywords();
    keywords = [];
    thresholds = [];
    moduleShadows = [];
    gaps = [];
    levels = [];
    for (let i = 0; i < count; i++) {
        keywords.push(decoder.decode(new Uint8Array(
            api.memory.buffer, api.kws_keyword_name_ptr(i),
            api.kws_keyword_name_len(i))));
        thresholds.push(api.kws_threshold(i));
        gaps.push(api.kws_gap(i));
        // A module built before the levels has no getter; its keywords
        // simply have none.
        const own = [null];
        for (let n = 1; n <= 5; n++) {
            const t = api.kws_sensitivity ? api.kws_sensitivity(i, n) : -1;
            own.push(t >= 0 ? t : null);
        }
        levels.push(own[4] === null ? null : own);
    }
    if (thresholdOverrides) {
        const problem = applyThresholds(thresholdOverrides);
        if (problem) throwAs("KeywordSetupException", problem);
    }
    moduleShadows = thresholds.map((t, i) => shadowUnder(t, gaps[i]));
}

/*
 * A new sensitivity or new thresholds while running: a new measurement,
 * like a new enrollment, because the shadow moves with the thresholds and
 * a run record states one set of both. The exposure so far is flushed
 * under the old run, the run gets a new id, and the module starts over
 * on the settings it now has - with whatever the host's gate said before.
 */
function restartRun(reason) {
    if (windowsScored) flushExposure(reason);
    thresholdGeneration++;
    runId = composeRunId();
    const open = gateIsOpen;
    init();
    gateIsOpen = open;
    emit({ moduleState: 2, moduleInfo: moduleInfo(), changed: "thresholds" });
}

/* restartRun(), or - when the module refuses the new settings - the old
 * ones back, running as they were, and the reason. */
function restartOrRestore(reason, was) {
    try {
        restartRun(reason);
        return null;
    } catch (err) {
        thresholdOverrides = was[0];
        sensitivityLevel = was[1];
        const open = gateIsOpen;
        init();
        gateIsOpen = open;
        try { return JSON.parse(err).message; }
        catch (_) { return String(err && err.message || err); }
    }
}

/* Sent after every change asked for, and that is the point: on a refusal
 * the caller has a value on screen that is not in force, and only the
 * effective set can put it right. Reporting what is, not what was asked
 * for. */
function reportThresholds(problem) {
    emit({ moduleEvent: true, kwsThresholds: {
        keywords: keywords, thresholds: thresholds,
        shadow: shadowThreshold, shadows: shadows(),
        sensitivity: api ? currentSensitivity() : null,
        refused: problem || null
    } });
}

function composeRunId() {
    return runBase + (enrollmentGeneration ? "_e" + enrollmentGeneration : "")
        + (thresholdGeneration ? "_t" + thresholdGeneration : "");
}

/*
 * Replaces the enrollment while running.
 *
 * This is what makes an enrollment page usable: build a prototype, try it
 * against your own voice, keep or redo it. The module checks the new
 * file against the classifier as always.
 *
 * A new enrollment is a new measurement, so this ends the old one rather
 * than continuing it. The exposure so far is flushed with its own
 * reason, the decision state is cleared - the persistence and refractory
 * state of a run under different prototypes means nothing - and the run
 * gets a new id, because a record that changed models half way through
 * is one nobody can read afterwards.
 *
 * moduleState 2 is the protocol's "changed", which is what this is.
 */
function setPrototypes(bytes) {
    if (!api) return;
    try {
        const refused = loadEnrollments(bytes);
        if (refused) {
            // What ran before runs on, rather than whatever part of the
            // new set got in before the refusal - which may have grown the
            // memory under the views the run is still using.
            loadEnrollments(enrollments);
            readKeywords();
            bindViews();
            sendError("KeywordSetupException",
                "the module refused this enrollment: " + refused);
            return;
        }

        if (windowsScored) flushExposure("prototypes_changed");
        // Names, not only thresholds. An enrollment names its own keywords -
        // that is what lets somebody enroll a word the classifier never
        // saw - so a module that re-read the numbers and kept the old
        // names went on calling a new keyword by the shipped one, on
        // every score bar and in every event it emitted. Its thresholds
        // replace any the setup asked for: those were about the old one.
        thresholdOverrides = null;
        readKeywords();

        /*
         * The shadow has to sit at or below every operating threshold,
         * and setup refuses to start otherwise. A swap could not refuse
         * the same way: the file is already loaded by the time its
         * thresholds are readable, and there is no earlier copy to go
         * back to. So it lowers the shadow instead and says so.
         *
         * Lowering only ever records more. Leaving it where it was would
         * do the thing setup exists to prevent - the gate runs at the
         * shadow, and a keyword whose threshold is under it never fires
         * at all, so the run looks like one where nothing was said.
         *
         * An enrollment estimated in a quiet room lands below the
         * default 0.80 easily; this is not an exotic case.
         */
        const lowest = Math.min.apply(null, thresholds);
        if (shadowThreshold > lowest) {
            const was = shadowThreshold;
            shadowThreshold = lowest;
            emit({
                moduleEvent: true,
                kwsShadowLowered: {
                    was: was, now: shadowThreshold,
                    because: keywords[thresholds.indexOf(lowest)]
                }
            });
        }

        readIdentity();
        ++enrollmentGeneration;
        runId = composeRunId();
        init();
        gateIsOpen = true;   // whoever was listening still is
        emit({ moduleState: 2, moduleInfo: moduleInfo(), changed: "enrollment" });
    } catch (err) {
        sendError("KeywordSetupException",
            "could not load the enrollment: " + String(err && err.message || err));
    }
}

// --- history ------------------------------------------------------------

/*
 * The incoming block as the history wants it: high-passed at the rate it
 * arrived at, then converted to the module's rate. In that order,
 * because the filter is designed for the capture rate - src/main.c runs
 * the same two stages the same way round.
 *
 * Either may be off, and with both off the block is handed back
 * untouched.
 *
 * Here and not on the window copied out for scoring. Windows overlap by
 * all but one hop, so a recursive filter run over them would see most
 * samples several times and carry state across a boundary the audio
 * does not have. Every sample passes through once, in order, which is
 * what the native capture path does with it.
 *
 * The result is a view onto one reused block rather than a fresh array:
 * at 16 kHz this runs tens of times a second for the life of the
 * session, and the caller copies out of it immediately.
 */
function atModuleRate(samples) {
    const n = samples.length;
    if (!highpassOn && !resampleOn) return samples;
    if (n > audioView.length) {
        // Passing a block through unfiltered is a degradation; passing
        // one through unconverted puts audio at the wrong rate into the
        // history, and every window after it would be wrong.
        if (!resampleOn) return samples;
        throwAs("BufferSizeException", "Block of " + n + " samples is larger "
            + "than the module's audio buffer (" + audioView.length + ")");
    }
    audioView.set(samples, 0);
    let out = n;
    if (highpassOn && api.kws_highpass_audio(n) < 0) return samples;
    if (resampleOn) {
        out = api.kws_resample_audio(n);
        if (out < 0) {
            throwAs("KeywordModuleException", "kws_resample_audio failed");
        }
        // A block short enough to fall between two output samples is
        // not an error: its samples are held and come out with the next.
        if (out === 0) return EMPTY_BLOCK;
    }
    if (!hpOut || hpOut.length < out) hpOut = new Float32Array(out);
    const block = hpOut.subarray(0, out);
    block.set(audioView.subarray(0, out));
    return block;
}

/*
 * Int16 as SEPIA's resampler hands it on, as the Float32 it stands for:
 * the scale of CommonConverters.int16ToFloat32BitAudio and of
 * `kwsc listen --in-format s16`. Into one reused block, for the reason
 * atModuleRate() gives.
 */
function fromInt16(samples) {
    const n = samples.length;
    if (!int16Out || int16Out.length < n) int16Out = new Float32Array(n);
    for (let i = 0; i < n; i++) int16Out[i] = samples[i] / 32768;
    return int16Out.subarray(0, n);
}

function pushSamples(samples) {
    const n = history.length;
    let offset = samplesSeen % n;
    const first = Math.min(samples.length, n - offset);
    history.set(samples.subarray(0, first), offset);
    if (first < samples.length) history.set(samples.subarray(first), 0);
    samplesSeen += samples.length;
}

/* Copies [startSample, startSample + length) into dest. Returns false when
 * that range has already been overwritten, which is the one failure the
 * caller has to handle rather than trust. */
function copyRange(dest, startSample, length) {
    const n = history.length;
    const oldest = Math.max(0, samplesSeen - n);
    if (startSample < oldest || startSample + length > samplesSeen) return false;
    const begin = startSample % n;
    const first = Math.min(length, n - begin);
    dest.set(history.subarray(begin, begin + first), 0);
    if (first < length) dest.set(history.subarray(0, length - first), first);
    return true;
}

// --- construction -------------------------------------------------------

/* A name that may become part of a file name: no path, no "..". */
function isPlainName(name) {
    return typeof name === "string" && /^[\w.-]+$/.test(name) && !/^\.+$/.test(name);
}

/* A keyword as a setup may write it - "Hey SEPIA" - to the name files
 * use: lower case, white space as "_". */
function keywordFileName(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, "_");
}

/* The JSON header of a .kws or .kwsp (FORMAT.md, "The container"), or
 * null when the bytes are not that file. */
function readHeader(bytes, magic) {
    const b = new Uint8Array(bytes);
    if (b.length < 8 || String.fromCharCode(b[0], b[1], b[2], b[3]) !== magic) return null;
    const length = new DataView(b.buffer, b.byteOffset, 8).getUint32(4, true);
    try {
        return JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + length)));
    } catch (err) {
        return null;
    }
}

/* An error the setup caused, said in the words of the setup. */
function setupError(message) {
    const err = new Error(message);
    err.kwsName = "KeywordSetupException";
    err.kwsMessage = message;
    return err;
}

function fetchBytes(url, what) {
    return fetch(url).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.arrayBuffer();
    }).catch(function (err) {
        err.kwsStatus = err.kwsStatus || String(err && err.message || err);
        err.kwsMessage = "could not fetch " + what + " from '" + url + "': "
            + err.kwsStatus;
        throw err;
    });
}

/*
 * The model and the enrollments the setup asks for: from the pre-loads
 * where the host gave them, fetched from sepia-kws/ where it did not.
 * The names say what runs, the pre-loads only where the bytes come from.
 *
 * - The model is setup.model, or the one the given modelFile says it is,
 *   or KWS_DEFAULT_MODEL. A setup.model the given file contradicts is
 *   refused: nothing can say which of the two was meant.
 * - The keywords are setup.keywords, written as a setup may write them.
 *   Each is looked up in <model>.keywords.json, and one not listed there
 *   is the file <model>.<name>.kwsp - which is how a file of one's own
 *   is dropped in without editing the list. Without setup.keywords the
 *   list's "default" runs, or every listed word for a list without one.
 * - Given enrollments are chosen from by the names inside them, all of
 *   them when setup.keywords is left out.
 *
 * Two enrollments of one name are refused here, by their headers, before
 * the module sees either.
 */
function gatherFiles(setup, givenModel, givenProtos) {
    const fetched = { list: null, wasm: null, model: null, keywords: null };
    const asked = setup.keywords === undefined || setup.keywords === null ? null
        : (Array.isArray(setup.keywords) ? setup.keywords : [setup.keywords])
            .map(keywordFileName);
    if (asked && !asked.length) {
        return Promise.reject(setupError("setup.keywords is empty; leave it "
            + "out for the model's default keywords"));
    }
    const badName = asked && asked.filter((n) => !isPlainName(n))[0];
    if (badName !== undefined && badName !== null) {
        return Promise.reject(setupError("keyword '" + badName + "' is not a "
            + "name a file can have: letters, digits, '_', '.' and '-' only"));
    }

    let modelName = setup.model === undefined || setup.model === null
        ? null : String(setup.model);
    if (modelName !== null && !isPlainName(modelName)) {
        return Promise.reject(setupError("setup.model '" + modelName + "' is not "
            + "a model's file name: letters, digits, '_', '.' and '-' only"));
    }
    if (givenModel) {
        const header = readHeader(givenModel, "KWS1");
        const inFile = header && header.model_name;
        if (modelName && inFile && inFile !== modelName) {
            return Promise.reject(setupError("setup.model asks for '" + modelName
                + "', and the modelFile given is '" + inFile + "'"));
        }
        modelName = modelName || inFile;
    }
    modelName = modelName || KWS_DEFAULT_MODEL;

    const modelReady = givenModel ? Promise.resolve(givenModel)
        : fetchBytes(fetched.model = KWS_FOLDER + modelName + ".kws",
                     "the model '" + modelName + "'");
    // A refusal below can return before this is waited on; its own
    // failure is then not the one worth reporting.
    modelReady.catch(function () {});

    let protosReady;
    if (givenProtos) {
        const files = Array.isArray(givenProtos) ? givenProtos : [givenProtos];
        let chosen = files;
        if (asked) {
            const named = files.map(function (f) {
                const h = readHeader(f, "KWSP");
                return h && h.keywords ? h.keywords.map((k) => k.name) : [];
            });
            const offered = [].concat.apply([], named);
            const missing = asked.filter((n) => offered.indexOf(n) < 0);
            if (missing.length) {
                return Promise.reject(setupError("no keyword '" + missing[0]
                    + "' among the enrollments given; they hold "
                    + offered.join(", ")));
            }
            const split = named.filter((names) => names.some((n) => asked.indexOf(n) >= 0)
                && names.some((n) => asked.indexOf(n) < 0))[0];
            if (split) {
                return Promise.reject(setupError("one enrollment given holds "
                    + split.join(", ") + " together; setup.keywords can take "
                    + "all of them or none"));
            }
            chosen = files.filter((f, i) => named[i].some((n) => asked.indexOf(n) >= 0));
        }
        protosReady = Promise.resolve(chosen);
    } else {
        const listUrl = KWS_FOLDER + modelName + ".keywords.json";
        // The list is needed for the default and read for the file names;
        // without one, asked keywords go by the naming convention alone.
        protosReady = fetchBytes(listUrl, "the keyword list of '" + modelName + "'")
            .then(function (bytes) {
                fetched.list = listUrl;
                try {
                    return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
                } catch (err) {
                    throw setupError(listUrl + " is not JSON: " + err.message);
                }
            }, function (err) {
                if (!asked) throw err;
                return null;
            }).then(function (list) {
                const listed = list && Array.isArray(list.keywords) ? list.keywords : [];
                const names = listed.map((k) => k.name);
                const wanted = asked || (list && Array.isArray(list.default)
                    ? list.default.map(keywordFileName) : names);
                if (!wanted.length) {
                    throw setupError(listUrl + " lists no keywords");
                }
                const urls = wanted.map(function (n) {
                    const entry = listed.filter((k) => k.name === n)[0];
                    if (!entry && !asked) {
                        throw setupError(listUrl + " names '" + n + "' as a default "
                            + "but lists no such keyword; it lists " + names.join(", "));
                    }
                    const file = entry ? entry.file : modelName + "." + n + ".kwsp";
                    if (!isPlainName(file)) {
                        throw setupError(listUrl + " names '" + file + "', which is "
                            + "not a plain file name");
                    }
                    return { name: n, url: KWS_FOLDER + file, listed: !!entry };
                });
                fetched.keywords = urls.map((u) => u.url);
                return Promise.all(urls.map(function (u) {
                    return fetchBytes(u.url, "keyword '" + u.name + "'")
                        .catch(function (err) {
                            if (!u.listed && /^HTTP 404/.test(err.kwsStatus)) {
                                throw setupError("no keyword '" + u.name + "' for '"
                                    + modelName + "': " + (list ? "not in " + listUrl
                                    + " (" + names.join(", ") + ")" : "no " + listUrl)
                                    + ", and no file " + u.url);
                            }
                            throw err;
                        });
                }));
            });
    }

    return Promise.all([modelReady, protosReady]).then(function (both) {
        const seen = {};
        both[1].forEach(function (f) {
            const h = readHeader(f, "KWSP");
            (h && h.keywords || []).forEach(function (k) {
                if (seen[k.name]) {
                    throw setupError("two enrollments are both named '" + k.name
                        + "'; one keyword can run once");
                }
                seen[k.name] = true;
            });
        });
        return { model: both[0], prototypes: both[1], fetched: fetched };
    });
}

function constructWorker(options) {
    if (wasConstructed) {
        console.error("KeywordWorker: constructor called twice, second ignored");
        return;
    }
    wasConstructed = true;

    const setup = (options && options.setup) || {};
    const preLoads = (options && options.preLoadResults) || {};

    captureSampleRate = setup.inputSampleRate
        || (setup.ctxInfo && (setup.ctxInfo.targetSampleRate || setup.ctxInfo.sampleRate));
    inputSampleRate = MODULE_RATE;
    channelCount = setup.channelCount || 1;
    inputSampleSize = setup.inputSampleSize || 512;
    processBufferSize = setup.bufferSize || inputSampleSize;

    // Float32 unless told otherwise, because it is what the capture
    // delivered. Int16 is what a module behind speex-resample-switch is
    // given, and is taken as the Float32 it stands for; what the
    // quantising before it costs is in LEARNINGS.md, "Sixteen bits are
    // not the problem".
    isFloat32Input = setup.isFloat32 !== undefined ? !!setup.isFloat32 : true;

    // Everything at or above this is recorded, whether or not it fires.
    // It is what lets a day be re-scored at another threshold afterwards,
    // and by a future encoder. Without it a run produces detections and
    // no evidence.
    // Left undefined when nothing asked for one: then each keyword has
    // its own, from the calibration point the module chose for it.
    shadowThreshold = setup.shadowThreshold;
    persistenceSeconds = setup.persistenceSeconds !== undefined
        ? setup.persistenceSeconds : -1;
    // How long a kept record stays open to being replaced by a detection
    // of the same keyword. Negative means "as long as it is pending at
    // all", which is clipPostSeconds and is the only limit that is
    // physical rather than chosen. 0 keeps every record.
    supersedeSeconds = setup.supersedeSeconds !== undefined
        ? setup.supersedeSeconds : -1;
    clipPreSeconds = setup.clipPreSeconds !== undefined ? setup.clipPreSeconds : 4.0;
    clipPostSeconds = setup.clipPostSeconds !== undefined ? setup.clipPostSeconds : 1.0;
    exposureEverySeconds = setup.exposureEverySeconds !== undefined
        ? setup.exposureEverySeconds : 60.0;
    sendClips = setup.sendClips !== undefined ? !!setup.sendClips : true;
    if (setup.collectorUrl) {
        try {
            if (typeof KwsCollector === "undefined") {
                importScripts(setup.collectorClientUrl || "./sepia-kws/kws-collector-client.js");
            }
            collector = new KwsCollector({
                url: setup.collectorUrl,
                maxQueue: setup.collectorMaxQueue,
                retrySeconds: setup.collectorRetrySeconds
            });
        } catch (err) {
            // Worth failing construction over: a run that believes it is
            // being recorded and is not produces no evidence and no
            // warning, which is the failure this whole component exists
            // to prevent.
            sendError("KeywordSetupException",
                "could not load the collector client from '"
                + (setup.collectorClientUrl || "./sepia-kws/kws-collector-client.js")
                + "': " + String(err && err.message || err));
            return;
        }
    }
    measureGlitch = setup.glitch !== undefined ? !!setup.glitch : true;
    measureSnr = setup.snrDb !== undefined ? !!setup.snrDb : true;
    glitchThreshold = setup.glitchThreshold !== undefined
        ? setup.glitchThreshold : 0.85;
    if (!(glitchThreshold >= 0 && glitchThreshold <= 1)) {
        sendError("KeywordSetupException",
            "glitchThreshold must be between 0 and 1, got " + setup.glitchThreshold);
        return;
    }
    emitWindowScores = !!setup.emitWindowScores;
    // Off unless asked for. See the note above `useRing`.
    useRing = !!setup.useRing;
    // On unless refused. See the note above `useHighpass`.
    useHighpass = setup.useHighpass === undefined || !!setup.useHighpass;
    // Which calibrated budget to run at, when the model carries more
    // than one. The deployment's call, not the file's.
    falseAlarmsPerHour = Number(setup.falseAlarmsPerHour) > 0
        ? Number(setup.falseAlarmsPerHour) : 0;
    // Every measurement rather than only the ones that cross.
    // Off by default because it is one message a second that
    // SEPIA has no use for - and on for whoever is calibrating
    // the threshold, who needs the number and not the verdict.
    emitGlitchWindows = !!setup.emitGlitchWindows;
    runBase = setup.run || ("browser_" + Date.now().toString(36));
    runId = runBase;
    // 1 to 5, or the calibrated point as chosen. Checked against the
    // levels the enrollment carries once it is loaded.
    sensitivityLevel = setup.sensitivity === undefined
        || setup.sensitivity === null ? null : Number(setup.sensitivity);

    const givenWasm = preLoads.wasmFile || preLoads.wasm;
    const givenModel = preLoads.modelFile || preLoads.model;
    // The enrollments: one prototype per keyword and the thresholds that
    // go with it, in as many .kwsp files as there are. A list from a page
    // that fetched them itself; or from a preLoad, which delivers one file
    // per key, every key that starts with `prototypesFile`, in the order
    // they were declared - one per word, or one file holding several.
    const declared = Object.keys(preLoads)
        .filter((k) => /^prototypesFile(?!s$)/.test(k) && preLoads[k])
        .map((k) => preLoads[k]);
    const givenProtos = preLoads.prototypesFiles
        || (declared.length ? declared : null);
    let modelBytes = null, protoBytes = null;

    // A build the host chose is used as given. If it does not validate
    // where the probe did not either, the reason is known and worth
    // saying, instead of the engine's CompileError.
    if (givenWasm && browserSimd === false && !WebAssembly.validate(givenWasm)) {
        sendError("KeywordModuleException",
            "This browser has no WASM SIMD, and the .wasm given as wasmFile "
            + "needs it. Give sepia-keyword-scalar.wasm instead, or leave "
            + "wasmFile out and the worker fetches the build that runs here.");
        return;
    }
    // Without one, the build this browser can run, from beside the
    // scripts the worker already loads. Fetched per worker; a host that
    // wants it held across workers in its preLoadCache gives wasmFile.
    const wasmUrl = givenWasm ? null : KWS_FOLDER + (browserSimd
        ? "sepia-keyword.wasm" : "sepia-keyword-scalar.wasm");
    const wasmReady = givenWasm ? Promise.resolve(givenWasm)
        : fetchBytes(wasmUrl, "the module");

    // Everything is fetched at once; what is missing elsewhere is said
    // with its path, and a pre-load is how a file that lives elsewhere is
    // given. Instantiating is async too, and everything after it depends
    // on numbers that only exist once the model is parsed, so the rest
    // lives in here.
    Promise.all([wasmReady, gatherFiles(setup, givenModel, givenProtos)])
    .then(function (ready) {
        modelBytes = ready[1].model;
        protoBytes = ready[1].prototypes;
        fetchedFiles = ready[1].fetched;
        fetchedFiles.wasm = wasmUrl;
        return WebAssembly.instantiate(ready[0], {});
    }).then(function (result) {
        try {
            api = result.instance ? result.instance.exports : result.exports;
            if (api._initialize) api._initialize();      // reactor model
            checkVersions();

            const model = new Uint8Array(modelBytes);
            if (model.length > api.kws_buffer_capacity()) {
                throwAs("KeywordModuleException",
                    "Model is " + model.length + " bytes, the module holds "
                    + api.kws_buffer_capacity());
            }
            new Uint8Array(api.memory.buffer, api.kws_buffer_ptr(), model.length)
                .set(model);
            if (api.kws_load_file(model.length) !== 0) {
                throwAs("KeywordModuleException",
                    "The module rejected the model file. Wrong file, or built "
                    + "for a different format version?");
            }

            const refused = loadEnrollments(protoBytes);
            if (refused) {
                throwAs("KeywordModuleException",
                    "The module rejected the enrollment: " + refused);
            }

            // Apply the setup's overrides, then read every value back.
            // A refused value is a construction error and not a quiet
            // fallback: a day measured with the defaults while the
            // operator believed otherwise is a day of unreadable numbers.
            METER_FIELDS.forEach(function (name, field) {
                if (setup[name] === undefined) return;
                if (api.kws_meter_set(field, setup[name]) !== 0) {
                    throwAs("KeywordSetupException",
                        "the module refused " + name + " = " + setup[name]
                        + " - it would make the measurement meaningless");
                }
            });
            meterConfig = {};
            METER_FIELDS.forEach(function (name, field) {
                meterConfig[name] = api.kws_meter_get(field);
            });

            windowSamples = api.kws_window_samples();
            hopSamples = api.kws_hop_samples();
            hopSeconds = hopSamples / inputSampleRate;
            readIdentity();

            // The file's thresholds are the measured ones and the right
            // default, but a room is not a corpus and the operating point
            // may have to move. Overriding is allowed and recorded:
            // moduleInfo carries the effective values, so the run record
            // states what actually decided, not what the model shipped
            // with. readKeywords() applies them, here and on every later
            // re-read.
            thresholdOverrides = setup.thresholds !== undefined
                ? setup.thresholds : null;
            readKeywords();
            if (sensitivityLevel !== null) {
                const problem = sensitivityProblem(sensitivityLevel);
                if (problem) throwAs("KeywordSetupException", problem);
            }

            /*
             * The default shadow is each keyword's own: the threshold of
             * the looser point calibrated beside its operating one - the
             * 1/h point beside a 0.05/h one - or KWS_SHADOW_MARGIN under its
             * threshold where there is none. The module works it out with
             * the thresholds (cal_shadow() in src/kwsfile.c). One number
             * under the lowest threshold, as it was, would record nearly
             * everything for a keyword whose threshold sits 0.1 higher.
             */

            /*
             * And a shadow above an operating threshold is refused. The
             * rule is monitor.py's; its reason changed on 2026-10-14
             * without the rule changing with it.
             *
             * It used to be that such a shadow *dropped detections*: one
             * gate ran at the shadow and over_threshold was read
             * afterwards, so a score between the two never passed the
             * gate and the run looked like one where the keyword had not
             * been said. That is no longer true - the keyword's own gate
             * is fed every window and fires whatever the shadow does.
             *
             * What is left is a configuration that cannot mean what it
             * says: above the operating threshold the shadow keeps a
             * subset of what fired and no near miss at all, so the run
             * loses its evidence and gains nothing. Only an explicit
             * setup.shadowThreshold can reach it now.
             */
            for (let i = 0; i < keywords.length; i++) {
                if (shadowThreshold > thresholds[i]) {
                    throwAs("KeywordSetupException",
                        "shadowThreshold " + shadowThreshold + " is above the "
                        + "operating threshold " + thresholds[i] + " for '"
                        + keywords[i] + "'. It would keep a subset of the "
                        + "detections and no near misses at all.");
                }
            }

            init();
            ready();
        } catch (err) {
            api = null;
            if (typeof err === "string") { postMessage({ moduleState: 10, error: JSON.parse(err) }); }
            else sendError("KeywordModuleException", String(err && err.message || err));
        }
    }).catch(function (err) {
        sendError(err && err.kwsName || "KeywordModuleException", err && err.kwsMessage
            || "WebAssembly.instantiate failed: " + String(err && err.message || err),
            String(err));
    });
}

function init() {
    if (inputSampleSize > processBufferSize) {
        throwAs("BufferSizeException", "Processor 'bufferSize' has to be at least "
            + "'inputSampleSize'! Currently: " + inputSampleSize + " > " + processBufferSize);
    }
    /*
     * A capture path that delivers another rate is converted here rather
     * than refused. The alternative is asking the AudioContext for the
     * model's rate, which does not remove a resampler - it moves it into
     * the browser, where nothing here can see what it did. Some
     * converters cut hard enough below 8 kHz to empty the top mel band;
     * LEARNINGS.md, "How steep is too steep", has which ones.
     *
     * Whole-number ratios only, so a 44.1 kHz context is still refused:
     * ask it for 48000 instead, since raising a rate to a whole multiple
     * costs nothing in the band the model reads and lowering it can.
     */
    resampleOn = false;
    if (captureSampleRate !== inputSampleRate) {
        resampleOn = !!api.kws_resample_set && !!api.kws_resample_audio
            && api.kws_resample_set(captureSampleRate) === 0
            && api.kws_resample_rate() === captureSampleRate;
        if (!resampleOn) {
            throwAs("SampleRateException",
                "Input sample-rate needs to be " + inputSampleRate
                + " or a whole multiple of it! Currently: " + captureSampleRate);
        }
        if (api.kws_resample_restart) api.kws_resample_restart();
    } else if (api.kws_resample_set) {
        api.kws_resample_set(0);
    }
    if (channelCount !== 1) {
        throwAs("ChannelCountException",
            "Input needs to be MONO! Current channel-count: " + channelCount);
    }

    // Long enough for the window and for a whole clip, with two seconds
    // of slack so a late post-roll never reads something already gone.
    const historySeconds = clipPreSeconds + clipPostSeconds + 2.0;
    history = new Float32Array(Math.max(windowSamples * 2,
        Math.ceil(historySeconds * inputSampleRate)));

    bindViews();

    /*
     * The front end in float32, and its frames carried between windows.
     *
     * Successive windows overlap by all but one hop, so most of the mel
     * was computed a moment ago. Together the two take a window from
     * 10.6 ms to 6.0 on a desktop - tests/wasm_bench.mjs measures it -
     * and they cost almost nothing in answers: the carry is exact, and
     * float32 moves a score by at most 2.6e-07 against thresholds
     * written to four decimals.
     *
     * Set here rather than at load because init() also runs on reset,
     * and the cache must not survive one: the first window of a new run
     * would otherwise be built partly from the old run's audio. Every
     * other path that breaks the hop grid is safe without being told -
     * a gap, a jump or a repeat fails the module's own check and gets a
     * full recomputation.
     */
    frontEndF32 = false;
    carryFrames = false;
    if (api.kws_use_f32_frontend) {
        api.kws_use_f32_frontend(1);
        frontEndF32 = api.kws_f32_frontend ? !!api.kws_f32_frontend() : true;
    }
    if (api.kws_mel_cache_reset) api.kws_mel_cache_reset();
    carryFrames = frontEndF32 && !!api.kws_compute_score_at;
    ringOn = useRing && frontEndF32 && !!api.kws_ring_reset
        && !!api.kws_ring_push && !!api.kws_ring_score;
    if (ringOn && api.kws_ring_reset() !== 0) ringOn = false;
    highpassOn = useHighpass && !!api.kws_highpass_set
        && !!api.kws_highpass_audio
        && api.kws_highpass_set(captureSampleRate) === 0;
    if (highpassOn && api.kws_highpass_restart) api.kws_highpass_restart();
    // Again now that the conditions are settled: the first read happened
    // while loading, before useRing and useHighpass had been applied.
    readKeywords();

    // Two gates per keyword: one at the SHADOW for what is kept, one at
    // the keyword's own threshold for what counts as said. Both are fed
    // every window, which is the whole of the difference from the second
    // gate this file once had - that one was fed only on windows where
    // the shadow gate had already fired, so its "two consecutive windows"
    // meant two shadow events one refractory apart and a keyword said
    // once was never marked a detection at all.
    //
    // over_threshold was `score >= threshold` in between, read on the
    // window the shadow gate let through, and that was wrong both ways:
    // it called a lone spike a detection, and it read the score at the
    // shadow crossing, which comes before the peak.
    // js/sepia-kws/kws-decision.js and src/decision.c carry the measurement.
    //
    // After the read above: the decider keeps the numbers it is built
    // with and the run record reports the ones read last, so both have to
    // come from the same read.
    decider = new Decider(thresholds, shadows(), minConsecutive,
                          refractorySeconds, gaps);

    samplesSeen = 0;
    // The ring is fed from the first hop, not from the first full
    // window: it has to see the audio the window's history is made of.
    // The grid is the same either way - a window still ends at a
    // multiple of the hop - and the first embedding comes out once a
    // window's worth has gone in, which is where the windowed path
    // starts too.
    nextScoreAt = ringOn ? hopSamples : windowSamples;
    windowsScored = 0; behindWindows = 0; eventsEmitted = 0; overThreshold = 0;
    supersededRecords = 0;
    scoreMs = 0; scoreMsMin = Infinity; scoreMsMax = 0;
    pending = []; timeline = [];
    startedAtMs = Date.now();
    lastExposureAt = 0;
    glitchSeconds = 0; glitchMax = 0; glitchMs = 0; snrMs = 0;
    lastGlitchAt = 0; inGlitch = false;
    isFirstProcess = true;
    gateIsOpen = false;
    gateOpenedAtSample = 0;
}

// --- the audio path -----------------------------------------------------

function process(data) {
    if (!api || !data || !data.samples) return;

    if (isFirstProcess) {
        isFirstProcess = false;
        if (data.sampleRate !== captureSampleRate) {
            throwAs("SampleRateException", "Sample-rate mismatch! Should be '"
                + captureSampleRate + "' is '" + data.sampleRate + "'");
        }
        const type = data.type || data.samples[0].constructor.name;
        const isFloat32 = type.indexOf("Float32") >= 0;
        if (isFloat32 !== isFloat32Input) {
            throwAs("ArrayTypeException", "Array type mismatch! Input samples are '"
                + type + "' but expected: " + (isFloat32Input ? "Float32" : "Int16"));
        }
    }

    // SEPIA's module gate is the pipeline's to control. When it is shut
    // we take the audio in - the history has to stay continuous, or a clip
    // that spans the moment it opened would be spliced - but we score
    // nothing, and the exposure record counts only scored windows, so a
    // closed module gate correctly reduces the exposure a run claims.
    let input = data.samples[0];
    if (!isFloat32Input) input = fromInt16(input);
    pushSamples(atModuleRate(input));
    if (!gateIsOpen) {
        // Skip the windows that went by while the module gate was shut,
        // rather than scoring a backlog of stale audio the moment it
        // reopens.
        // The phase of the hop grid is preserved, so the browser and the
        // Python monitor still score on the same 0.1 s boundaries.
        if (samplesSeen >= nextScoreAt) {
            const missed = Math.floor((samplesSeen - nextScoreAt) / hopSamples) + 1;
            nextScoreAt += missed * hopSamples;
        }
        return;
    }

    while (samplesSeen >= nextScoreAt
            && nextScoreAt >= (ringOn ? hopSamples : windowSamples)) {
        if (ringOn) pushHop(nextScoreAt);
        else scoreWindow(nextScoreAt);
        nextScoreAt += hopSamples;
    }
    checkGlitch();
    drainPending();

    const listened = windowsScored * hopSeconds;
    if (listened - lastExposureAt >= exposureEverySeconds) {
        flushExposure("periodic");
        lastExposureAt = listened;
    }
}

/*
 * Everything before this instant stops counting as audio to score.
 *
 * Called when SEPIA's module gate opens. The hop grid's phase is kept -
 * it is what makes this worker and monitor.py measure the same 0.1 s
 * boundaries - so the next window is the first grid point that lies a
 * whole window after the opening, not the opening's own instant. The
 * ring is reset because its columns describe the muted audio, and its
 * own warm-up then lands on the same window the rule asks for.
 */
function startStreamHere() {
    gateOpenedAtSample = samplesSeen;
    const gridFrom = Math.ceil(samplesSeen / hopSamples) * hopSamples;
    if (ringOn) {
        if (api.kws_ring_reset() !== 0) {
            sendError("KeywordModuleException", "kws_ring_reset failed");
            ringOn = false;
        }
        // The first hop to feed is the one that begins at gridFrom; it
        // ends a hop later. The first embedding arrives a window after
        // that, which is the rule.
        nextScoreAt = gridFrom + hopSamples;
    } else {
        nextScoreAt = gridFrom + windowSamples;
    }
    if (api.kws_mel_cache_reset) api.kws_mel_cache_reset();
}

/* Scores the window ending at absolute sample `windowEnd`.
 *
 * The hop is exact. 1600 samples is not a multiple of the 512 the
 * pipeline delivers, so a scorer triggered "whenever enough arrived"
 * would step by 1536 or 2048 and drift off the 0.1 s grid that monitor.py
 * measured on. Counting samples rather than chunks keeps the browser and
 * the Python monitor comparing the same thing. */
function scoreWindow(windowEnd) {
    if (!copyRange(audioView, windowEnd - windowSamples, windowSamples)) return;

    const began = now();
    // Where this window begins, which is what lets the front end reuse
    // the previous one's frames. It outgrows 32 bits after 74 hours and
    // the conversion to the module's i32 wraps, which is correct: the
    // cache only ever asks for the difference between two positions,
    // and the difference of two wrapped values is the true one.
    const count = carryFrames
        ? api.kws_compute_score_at(windowSamples,
                                   (windowEnd - windowSamples) >>> 0)
        : api.kws_compute_score(windowSamples);
    if (count < 0) {
        sendError("KeywordModuleException", "kws_compute_score failed");
        return;
    }
    const took = now() - began;
    scoreMs += took;
    // The mean alone cannot tell a module that is slow from a worker that
    // is being interrupted. The minimum is what the arithmetic actually
    // costs on this machine; the distance to the mean is everything else.
    if (took < scoreMsMin) scoreMsMin = took;
    if (took > scoreMsMax) scoreMsMax = took;
    windowsScored++;
    // Ten a second is the budget. A window that took longer than its own
    // hop is not a failure by itself, but a run where many did is a run
    // whose exposure figure is fiction, so it is counted rather than
    // hidden.
    if (took > hopSeconds * 1000) behindWindows++;

    recordScores(windowEnd, count);
}

/*
 * One hop into the ring, and the window it completes if it completes
 * one.
 *
 * Returns nothing and reports through the same counters scoreWindow()
 * does, so a run's statistics mean the same thing whichever path
 * produced them. The pushes that go in before the first window is
 * complete are real work and are not counted: there are twenty-two of
 * them per run, against ten windows a second for as long as the page
 * is open, and counting them would make `ms a window` a different
 * quantity in the first two seconds than afterwards.
 */
function pushHop(hopEnd) {
    if (!copyRange(audioView, hopEnd - hopSamples, hopSamples)) {
        // The audio went out of the history before we reached it, so
        // the ring would carry columns with a gap behind them. A gap is
        // a discontinuity like any other and gets the same answer the
        // module gate's opening gets: start the stream here.
        startStreamHere();
        return;
    }
    const began = now();
    const got = api.kws_ring_push(hopSamples);
    if (got < 0) {
        sendError("KeywordModuleException", "kws_ring_push failed");
        ringOn = false;
        return;
    }
    if (got === 0) return;      // still filling; see the note above
    const count = api.kws_ring_score();
    if (count < 0) {
        sendError("KeywordModuleException", "kws_ring_score failed");
        return;
    }
    const took = now() - began;
    scoreMs += took;
    if (took < scoreMsMin) scoreMsMin = took;
    if (took > scoreMsMax) scoreMsMax = took;
    windowsScored++;
    if (took > hopSeconds * 1000) behindWindows++;
    recordScores(hopEnd, count);
}

/* The half of a scored window that does not depend on which path
 * produced the numbers: the record, the events and the clips. */
function recordScores(windowEnd, count) {
    const scores = new Array(count);
    for (let i = 0; i < count; i++) scores[i] = scoresView[i];
    const listened = windowsScored * hopSeconds;
    const named = {};
    for (let i = 0; i < count; i++) named[keywords[i]] = Math.round(scores[i] * 1e4) / 1e4;

    if (emitWindowScores) {
        emit({ moduleEvent: true, kwsWindow: { at_seconds: round2(listened), scores: named } });
    }

    timeline.push([round2(listened), named]);
    const timelineMax = Math.ceil((clipPreSeconds + clipPostSeconds + 2.0) / hopSeconds);
    while (timeline.length > timelineMax) timeline.shift();

    const events = decider.update(scores, listened);
    for (const event of events) {
        const i = event.keyword;
        const over = event.over_threshold;
        const stamp = localStamp(new Date());
        if (over) overThreshold++;

        // The detection goes out now, not when the clip is complete. A
        // wake word that arrives a second late is not a wake word.
        if (over) {
            emit({
                keyword: keywords[i],
                score: Math.round(scores[i] * 1e4) / 1e4,
                threshold: thresholds[i],
                scores: named,
                at_seconds: round2(listened),
                wall_clock: stamp
            });
        }

        /*
         * One utterance, one record.
         *
         * The two gates fire on the same word a window or two apart -
         * the shadow on the rising flank, the keyword's own threshold
         * at the peak - so a collecting run produces a kept record and
         * then a detection for the same speech. Each would open its own
         * clip, and with a 4 s pre-roll the two overlap almost
         * completely: the same audio twice, and the same utterance
         * weighted twice by whoever labels it.
         *
         * So a detection replaces the kept record it grew out of, while
         * that record is still waiting for its post-roll. Nothing looks
         * forward: the record is in hand, and a detection that arrives
         * after it has gone is simply a detection.
         *
         * What the shadow is actually for survives untouched. A near
         * miss is a kept window with no detection behind it, and
         * nothing replaces it - on the reference recording 15 of 18
         * kept records are superseded this way and the 3 that remain
         * are the real near misses.
         */
        if (over) {
            const limit = supersedeSeconds >= 0 ? supersedeSeconds
                                                : clipPostSeconds;
            const j = supersedeKept(pending, keywords[i], listened, limit);
            if (j >= 0) { pending.splice(j, 1); supersededRecords++; }
        }

        // The record follows once the post-roll has arrived. Field names
        // are monitor.py's, so live/review_clips.py and
        // scripts/analyze_live_monitor.py read browser data unchanged.
        pending.push({
            run: runId,
            keyword: keywords[i],
            at_seconds: round2(listened),
            score: Math.round(scores[i] * 1e4) / 1e4,
            over_threshold: over,
            all_scores: named,
            wall_clock: stamp,
            sample: windowEnd,
            label: null
        });
    }
}

/*
 * The kept record a detection grew out of, or -1.
 *
 * Searched backwards and stopped at the first record older than the
 * limit, because `pending` is in time order: anything before that is
 * older still. Only an unflagged record of the same keyword can be
 * superseded - a near miss has no detection behind it and nothing
 * replaces it, and a record already marked a detection belongs to an
 * earlier utterance.
 *
 * Its own function so that it can be tested without a module, a model
 * and audio that happens to cross two thresholds in the right order -
 * reaching a chosen score with real audio is not a test, it is a
 * search.
 */
function supersedeKept(pending, keyword, at, limit) {
    for (let j = pending.length - 1; j >= 0; j--) {
        const earlier = pending[j];
        if (at - earlier.at_seconds > limit) return -1;
        if (earlier.keyword === keyword && !earlier.over_threshold) return j;
    }
    return -1;
}

/* A clock that does not depend on the page having one. */
const now = (typeof performance !== "undefined" && performance.now)
    ? function () { return performance.now(); }
    : function () { return Date.now(); };

/*
 * Once per second of listened audio, over the last second of it.
 *
 * The capture fault this looks for replaced the microphone with a
 * periodic waveform for one to twelve seconds at a time, and the kernel
 * log said nothing about it for the hundred minutes it ran. It mostly
 * falls where nothing fires, which is why it belongs here and not only
 * on events: a day that lost ten minutes of audio to it has ten fewer
 * minutes of exposure than the window count claims.
 */
function checkGlitch() {
    if (!measureGlitch || !api) return;
    const listened = windowsScored * hopSeconds;
    if (listened - lastGlitchAt < 1.0) return;
    lastGlitchAt = listened;
    if (samplesSeen < inputSampleRate) return;

    const began = now();
    if (!copyRange(meterView.subarray(0, inputSampleRate),
                   samplesSeen - inputSampleRate, inputSampleRate)) return;
    const r = api.kws_meter_glitch(inputSampleRate, inputSampleRate);
    glitchMs += now() - began;

    if (r > glitchMax) glitchMax = r;
    const over = r >= glitchThreshold;

    // Reported, not acted on, and marked as what it is: the threshold
    // comes from 48 kHz capture on a Pi and has not been re-measured
    // here. `over` is the verdict; `r` is the measurement, and only the
    // measurement can be re-read at another threshold later.
    if (emitGlitchWindows || (over && !inGlitch)) {
        emit({ moduleEvent: true, kwsGlitch: {
            r: Math.round(r * 1e3) / 1e3,
            at_seconds: round2(listened),
            over: over,
            threshold: glitchThreshold,
            calibrated_for_this_input: false
        } });
    }
    if (over) {
        glitchSeconds += 1.0;
        inGlitch = true;
    } else {
        inGlitch = false;
    }
}

function drainPending() {
    if (!pending.length) return;
    const post = Math.round(clipPostSeconds * inputSampleRate);
    const pre = Math.round(clipPreSeconds * inputSampleRate);
    const still = [];

    for (const event of pending) {
        if (samplesSeen - event.sample < post) { still.push(event); continue; }

        const oldest = Math.max(0, samplesSeen - history.length);
        const start = Math.max(oldest, event.sample - pre);
        const end = Math.min(samplesSeen, event.sample + post);
        const offset = event.sample - start;
        event.clip_trigger_seconds = Math.round(offset / inputSampleRate * 1e3) / 1e3;

        // Recorded, never acted on. Both are computed in the module,
        // from transcriptions of monitor.py's speech_snr() and
        // capture_glitch() that tests/test_meters.py holds to the
        // originals within 1e-6 - so a browser run can be read next to
        // the Pi runs in EVALUATION.md. null when switched off, which is
        // not the same as zero.
        event.snr_db = null;
        event.glitch_r = null;
        const span = end - start;
        if ((measureSnr || measureGlitch) && span > 0
            && span <= meterView.length
            && copyRange(meterView.subarray(0, span), start, span)) {
            if (measureSnr) {
                const began = now();
                const value = api.kws_meter_snr_db(span, inputSampleRate, offset);
                snrMs += now() - began;
                event.snr_db = Number.isNaN(value) ? null
                    : Math.round(value * 10) / 10;
            }
            if (measureGlitch) {
                // Two seconds around the trigger, as monitor.py takes it:
                // whether this particular sound was recorded at all. An
                // affected event is not a detection and not a miss; it is
                // audio that never arrived.
                const from = Math.max(0, offset - inputSampleRate);
                const to = Math.min(span, offset + inputSampleRate);
                if (to - from >= 2) {
                    const began = now();
                    if (copyRange(meterView.subarray(0, to - from),
                                  start + from, to - from)) {
                        event.glitch_r = Math.round(
                            api.kws_meter_glitch(to - from, inputSampleRate) * 1e3) / 1e3;
                    }
                    glitchMs += now() - began;
                }
            }
        }

        event.timeline = timeline.filter(function (row) {
            return row[0] >= event.at_seconds - clipPreSeconds
                && row[0] <= event.at_seconds + clipPostSeconds;
        });

        const message = { moduleEvent: true, kwsEvent: event };
        const transfer = [];
        if (sendClips && end > start) {
            const clip = new Float32Array(end - start);
            if (copyRange(clip, start, end - start)) {
                message.kwsClip = {
                    sampleRate: inputSampleRate,
                    samples: clip.buffer,
                    trigger: offset
                };
                // Transferring detaches the buffer, and a collector in
                // here still needs it: it frames the body when the
                // request goes out, not when the event is queued. So the
                // clip is handed over first and the page gets the event
                // without it - 320 kB across a thread boundary for
                // nobody is the waste this arrangement avoids. A page
                // that wants the clips runs its own client instead and
                // leaves collectorUrl unset.
                if (collector) {
                    collector.handle(message);
                    delete message.kwsClip;
                } else {
                    transfer.push(clip.buffer);
                }
            }
        }
        delete event.sample;
        if (transfer.length) postMessage(message, transfer);
        else if (collector) postMessage(message);
        else emit(message);
        eventsEmitted++;
    }
    pending = still;
}

function exposureRecord(reason) {
    return {
        run: runId,
        reason: reason,
        windows: windowsScored,
        listened_seconds: round1(windowsScored * hopSeconds),
        behind_windows: behindWindows,
        // What a window actually cost. The budget is one hop; knowing how
        // much of it was used is the difference between "it kept up" and
        // "it kept up on this machine, with no idea how much room was
        // left".
        score_ms: round1(scoreMs),
        score_ms_min: windowsScored ? Math.round(scoreMsMin * 100) / 100 : null,
        score_ms_max: windowsScored ? round1(scoreMsMax) : null,
        events: eventsEmitted,
        over_threshold: overThreshold,
        // Kept records a detection of the same utterance replaced. Not
        // a fault: it says how much of the shadow's output was the
        // rising flank of something that then fired.
        superseded_kept: supersededRecords,
        // null rather than zero when the meter is off: zero would read
        // as "measured, none found".
        glitch_seconds: measureGlitch ? round1(glitchSeconds) : null,
        glitch_max: measureGlitch ? Math.round(glitchMax * 1e3) / 1e3 : null,
        // What the two cost so far, so that switching them off is a
        // decision made on a number rather than a suspicion.
        glitch_ms: measureGlitch ? round1(glitchMs) : null,
        snr_ms: measureSnr ? round1(snrMs) : null,
        // Only when this worker is doing the posting. Records that never
        // arrived are the one loss the exposure figure cannot show by
        // itself, so the queue is part of the exposure.
        collector: collector ? collector.status() : null,
        wall_clock_seconds: round1((Date.now() - startedAtMs) / 1000),
        at: localStamp(new Date())
    };
}

function flushExposure(reason) {
    emit({ moduleEvent: true, kwsExposure: exposureRecord(reason) });
}

/*
 * Local time, in the shape monitor.py's time.strftime("%Y-%m-%dT%H:%M:%S")
 * produces - which is local, not UTC.
 *
 * This is the clock a person matches against their own memory of the
 * room: live/review_clips.py prints wall_clock[11:] and asks whether the
 * keyword was said then. A UTC stamp in that field looks exactly like a
 * local one and is wrong by the offset, which in CEST is two hours - far
 * enough to make a reviewer say no to a real detection.
 *
 * The same stamp goes on screen and into the record, so the two can
 * never disagree. monitor.py says the same thing in a comment.
 */
function localStamp(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-"
        + pad(date.getDate()) + "T" + pad(date.getHours()) + ":"
        + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}

function round1(x) { return Math.round(x * 10) / 10; }
function round2(x) { return Math.round(x * 100) / 100; }

// --- the pipeline's control surface -------------------------------------

function gateControl(open, gateOptions) {
    // A refused setup leaves no module, and that refusal has been sent.
    if (!api) return;
    const message = { moduleEvent: true, gate: {} };
    if (open) {
        gateOpenedAt = Date.now();
        gateIsOpen = true;
        startStreamHere();
        message.gate.openedAt = gateOpenedAt;
    } else {
        gateClosedAt = Date.now();
        gateIsOpen = false;
        message.gate.openedAt = gateOpenedAt;
        message.gate.closedAt = gateClosedAt;
    }
    message.gate.isOpen = gateIsOpen;
    emit(message);
}

/*
 * Scores the window that is already in the module, `runs` times, as fast
 * as it can, and reports the distribution.
 *
 * It exists because a per-window average cannot tell how much of itself
 * is arithmetic. A first browser run measured 30.9 ms at its fastest
 * against 12.1 ms for the same module in Node on the same machine, with
 * the page drawing nothing - so the difference was not the page, and a
 * tight loop is what separates "this engine is slower here" from
 * "something is getting in the way ten times a second".
 *
 * It blocks the worker while it runs. Audio queues rather than being
 * lost, but windows will arrive late, so this is a diagnostic and not
 * something to leave on.
 *
 * It scores one window over and over, so it deliberately does not use
 * the frame carry: there is only one position here, and reusing frames
 * across a repeat of the same window would time something that never
 * happens and answer it wrongly besides. The number is therefore the
 * cost of a cold window - the worst case, and about 1.7x what a running
 * detector pays per window. `carryFrames` in the payload says so.
 */
function benchmark(options) {
    if (!api || !windowSamples) return;
    const runs = Math.max(1, Math.min(500, (options && options.runs) || 50));
    const times = [];
    for (let i = 0; i < runs; i++) {
        const began = now();
        api.kws_compute_score(windowSamples);
        times.push(now() - began);
    }
    times.sort(function (a, b) { return a - b; });
    emit({ moduleResponse: true, kwsBenchmark: {
        runs: runs,
        min: Math.round(times[0] * 100) / 100,
        median: Math.round(times[runs >> 1] * 100) / 100,
        max: Math.round(times[runs - 1] * 100) / 100,
        simd: api.kws_has_simd ? !!api.kws_has_simd() : null,
        frontEndF32: frontEndF32,
        carryFrames: false
    } });
}

function handleEvent(data) {
    // Data that should not be scored but might trigger something.
}

function start(options) {
    // The timing of this signal is explicitly not well defined in the
    // pipeline, so it is used for gating and nothing measured.
}

function stop(options) {
    if (api) flushExposure("stopped");
}

function reset(options) {
    if (api) { flushExposure("reset"); init(); }
}

function release(options) {
    if (api) flushExposure("released");
    api = null;
    history = null;
    audioView = null;
    scoresView = null;
    pending = [];
    timeline = [];
    emit({ moduleState: 9 });
}

onmessage = function (e) {
    if (e.data.ctrl) {
        switch (e.data.ctrl.action) {
            case "construct": constructWorker(e.data.ctrl.options); break;
            case "process": process(e.data.ctrl.data); break;
            case "handle": handleEvent(e.data.ctrl.data); break;
            case "start": start(e.data.ctrl.options); break;
            case "stop": stop(e.data.ctrl.options); break;
            case "reset": reset(e.data.ctrl.options); break;
            case "release":
            case "close": release(e.data.ctrl.options); break;
            default: console.log("Unknown control message:", e.data); break;
        }
    }
    if (e.data.setPrototypes !== undefined) {
        setPrototypes(e.data.setPrototypes);
    }
    // Live, and each a new run: the shadow follows the thresholds, and a
    // run record states one set of both - see restartRun().
    if (e.data.setThresholds !== undefined) {
        const before = thresholds.slice();
        let problem = applyThresholds(e.data.setThresholds);
        if (!problem && api && thresholds.some((t, i) => t !== before[i])) {
            // All of them, by name: a number typed over a sensitivity
            // keeps the others where the level put them, and a re-read
            // keeps every one.
            const was = [thresholdOverrides, sensitivityLevel];
            thresholdOverrides = {};
            keywords.forEach((k, i) => { thresholdOverrides[k] = thresholds[i]; });
            sensitivityLevel = null;
            problem = restartOrRestore("thresholds_changed", was);
        }
        if (problem) sendError("KeywordSetupException", problem);
        reportThresholds(problem);
    }
    if (e.data.setSensitivity !== undefined) {
        const n = e.data.setSensitivity === null ? null
                                                 : Number(e.data.setSensitivity);
        let problem = !api ? "the module is not loaded"
            : n === null ? null : sensitivityProblem(n);
        if (!problem && (n !== sensitivityLevel || thresholdOverrides)) {
            // A level replaces numbers typed before it.
            const was = [thresholdOverrides, sensitivityLevel];
            thresholdOverrides = null;
            sensitivityLevel = n;
            problem = restartOrRestore("sensitivity_changed", was);
        }
        if (problem) sendError("KeywordSetupException", problem);
        reportThresholds(problem);
    }
    if (e.data.benchmark !== undefined) {
        benchmark(e.data.benchmark);
    }
    // SEPIA's module gate, as Porcupine defines it. A pipeline feature:
    // if something upstream shuts it, that is the pipeline's decision and
    // not this module's to second-guess.
    if (e.data.gate !== undefined) {
        gateControl(e.data.gate && e.data.gate === "open", e.data.gateOptions);
    }
};
