/*
 * Takes what the worker emits and posts it to collector/server.py.
 *
 * The page gets the worker's messages from the pipeline and hands each
 * one to `handle()`. What is a detection, what is a record and what is
 * neither is decided here, so the application does not have to know.
 *
 * The one rule this file follows: **it must never disturb the detector.**
 * The collector is a measurement convenience and the wake word is the
 * product, so every failure here is swallowed, the queue is bounded, and
 * nothing is ever awaited by the caller. A collector that is not running,
 * or a laptop that went to sleep, costs evidence and not detections.
 *
 *     const collector = new KwsCollector({url: "http://127.0.0.1:8731"});
 *     // wherever the pipeline hands you module messages:
 *     collector.handle(message);
 */

function KwsCollector(options) {
    options = options || {};
    this.url = (options.url || "http://127.0.0.1:8731").replace(/\/+$/, "");
    // Enough for a long outage - at a few events an hour plus one
    // exposure record a minute, this is most of a day - and bounded, so a
    // collector that never comes back cannot grow the tab until it dies.
    this.maxQueue = options.maxQueue || 2000;
    // The entries are bounded in number, the clips in bytes: a clip is
    // about a megabyte at 48 kHz, so 2000 of them would be two gigabytes
    // in a tab, which a phone does not survive. Over this, the oldest
    // clip loses its audio and keeps its record. About fifty clips.
    this.maxQueueBytes = options.maxQueueBytes || 50 * 1024 * 1024;
    this.retrySeconds = options.retrySeconds || 5;
    // How often an entry the collector answered with a server error is
    // tried before it is given up. Unanswered sends are retried for as
    // long as it takes: that is a collector that is away, not one that
    // refuses this entry.
    this.maxServerTries = options.maxServerTries || 3;
    this.onStatus = options.onStatus || null;

    this.queue = [];
    this.queuedBytes = 0;
    this.sending = null;            // the entry being posted, if any
    this.dropped = 0;
    this.clipsDropped = 0;
    this.rejected = 0;
    this.sent = 0;
    this.failures = 0;
    this.lastError = null;
    this.lastRejection = null;
}

/* The pipeline's messages, sorted into what the collector wants. */
KwsCollector.prototype.handle = function (message) {
    if (!message) return;
    try {
        // 1 is ready, 2 is "changed" - a new enrollment, which is a new
        // measurement and gets its own run record.
        if ((message.moduleState === 1 || message.moduleState === 2)
                && message.moduleInfo) {
            this._push("/kws/run", this.runRecord(message.moduleInfo), null);
        } else if (message.kwsEvent) {
            this._push("/kws/event", message.kwsEvent,
                       message.kwsClip && message.kwsClip.samples);
        } else if (message.kwsExposure) {
            this._push("/kws/exposure", message.kwsExposure, null);
        }
    } catch (err) {
        this.lastError = String(err && err.message || err);
    }
};

/*
 * moduleInfo, in the shape monitor.py writes run_<run>.json.
 *
 * The names are not ours to choose: live/review_clips.py reads
 * `threshold`, `window_seconds`, `hop_seconds`, `min_consecutive` and
 * `post_seconds` out of this file, and a run it cannot read is a run
 * nobody labels.
 */
KwsCollector.prototype.runRecord = function (info) {
    const rate = info.inputSampleRate || 16000;
    const now = new Date();
    const record = {
        run: info.run,
        source: "browser",
        module_id: info.moduleId,
        keywords: info.keywords,
        // Keyed by keyword, as live/monitor.py writes it: review_clips.py
        // reads the threshold an event was judged against by its name.
        thresholds: byKeyword(info.keywords, info.thresholds),
        // Each keyword's own shadow, as monitor.py writes `shadows`; the
        // single `shadow` only when the setup set one for all of them.
        shadows: info.shadows ? byKeyword(info.keywords, info.shadows) : null,
        shadow: info.shadowThreshold === undefined ? null
                                                   : info.shadowThreshold,
        // The sensitivity the thresholds amount to, null when they are
        // none of the levels, and each keyword's levels beside it.
        sensitivity: info.sensitivity === undefined ? null : info.sensitivity,
        sensitivity_levels: info.sensitivityLevels
            ? byKeyword(info.keywords, info.sensitivityLevels) : null,
        // How a window was given to one keyword, in monitor.py's form:
        // {keyword: [threshold, gap]} when it was in calibrated gaps, null
        // when by score, so analyze_live_monitor.py replays the choice.
        arbitration: info.arbitration === "gap"
            ? byKeyword(info.keywords, info.keywords.map(function (k, i) {
                return [info.thresholds[i], info.gaps[i]]; }))
            : null,
        min_consecutive: info.minConsecutive,
        refractory: info.refractorySeconds,
        window_seconds: info.windowSamples / rate,
        hop_seconds: info.hopSamples / rate,
        pre_seconds: info.clipSeconds ? info.clipSeconds[0] : null,
        post_seconds: info.clipSeconds ? info.clipSeconds[1] : null,
        sample_rate: rate,
        simd: info.simd,
        // Which front end produced the scores. float32 moves them in the
        // seventh decimal, which is nothing against a threshold - but a
        // run that cannot say which arithmetic it used cannot be the one
        // a disagreement is traced to either.
        front_end_f32: info.frontEndF32 === undefined ? null : info.frontEndF32,
        carry_frames: info.carryFrames === undefined ? null : info.carryFrames,
        // The pair that measured the day. Without it two runs made with
        // different models are indistinguishable afterwards, and the
        // second one silently invalidates comparisons with the first.
        classifier: info.model ? info.model.classifierId : null,
        model_name: info.model ? info.model.modelName : null,
        build: info.model ? info.model.modelBuild : null,
        centre: info.model ? info.model.centre : null,
        projection: info.model ? info.model.projection : null,
        classifier_built: info.model ? info.model.classifierBuilt : null,
        enrolled_by: info.model ? info.model.enrolledBy : null,
        enrolled_at: info.model ? info.model.enrolledAt : null,
        threshold_source: info.model ? info.model.thresholdSource : null,
        // What actually measured this run. Without these a changed
        // threshold is invisible afterwards, and two days that cannot be
        // told apart cannot be compared either.
        glitch: info.glitch,
        glitch_threshold: info.glitch ? info.glitchThreshold : null,
        snr_db: info.snrDb,
        meters: info.meters || null,
        // Whether anything gated us is the pipeline's business and not
        // visible from in here, so this says "unknown" rather than
        // claiming a run listened to everything.
        vad: null,
        started_epoch: now.getTime() / 1000,
        // Local, which is what monitor.py writes here, and what the
        // reviewer's own clock said. The UTC one is beside it and the
        // offset with them, so neither has to be inferred.
        started_local: localStamp(now).replace("T", " "),
        started_utc: now.toISOString().slice(0, 19) + "Z",
        utc_offset: offsetString(now),
        timezone: (typeof Intl !== "undefined"
            && Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null
    };

    // One number as well, when there is only one, for a review_clips.py
    // older than its per-keyword reading. When the keywords differ,
    // leaving it out is more honest than picking one of them.
    const all = info.thresholds || [];
    if (all.length && all.every(function (t) { return t === all[0]; })) {
        record.threshold = all[0];
    }
    return record;
};

function byKeyword(keywords, values) {
    const out = {};
    (keywords || []).forEach(function (k, i) { out[k] = values[i]; });
    return out;
}

/* The same local format the worker stamps events with. */
function localStamp(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-"
        + pad(date.getDate()) + "T" + pad(date.getHours()) + ":"
        + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}

function offsetString(date) {
    const minutes = -date.getTimezoneOffset();
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    return sign + String(Math.floor(abs / 60)).padStart(2, "0")
        + String(abs % 60).padStart(2, "0");
}

KwsCollector.prototype._push = function (path, record, clipBuffer) {
    if (this.queue.length >= this.maxQueue) {
        // Drop the oldest. A recent event is worth more than the one that
        // has been waiting an hour, and the exposure records make the gap
        // visible afterwards. Not the one being posted: its answer would
        // then remove another.
        const at = this.queue[0] === this.sending ? 1 : 0;
        if (at < this.queue.length) {
            this._remove(this.queue[at]);
            this.dropped++;
        }
    }
    const item = { path: path, record: record, clip: clipBuffer || null,
                   answered: 0 };
    this.queue.push(item);
    if (item.clip) this.queuedBytes += item.clip.byteLength;
    this._trimClips();
    this._drain();
};

KwsCollector.prototype._remove = function (item) {
    const at = this.queue.indexOf(item);
    if (at < 0) return;
    this.queue.splice(at, 1);
    if (item.clip) this.queuedBytes -= item.clip.byteLength;
};

/* Oldest first, the clips over the byte budget lose their audio; their
 * records stay, so the event is still known and only cannot be heard. */
KwsCollector.prototype._trimClips = function () {
    for (let i = 0; this.queuedBytes > this.maxQueueBytes
                    && i < this.queue.length; i++) {
        const item = this.queue[i];
        // The one being posted has its body built already: taking its
        // clip now would free nothing and count a clip that arrives.
        if (!item.clip || item === this.sending) continue;
        this.queuedBytes -= item.clip.byteLength;
        item.clip = null;
        this.clipsDropped++;
    }
};

/*
 * The framed body: [uint32 LE json length][json][float32 clip].
 *
 * base64 would inflate a 320 kB clip by a third and multipart needs a
 * parser at both ends. This needs four bytes and a slice.
 */
function frame(record, clip) {
    const json = new TextEncoder().encode(JSON.stringify(record));
    if (!clip || !clip.byteLength) return json;
    const body = new Uint8Array(4 + json.length + clip.byteLength);
    new DataView(body.buffer).setUint32(0, json.length, true);
    body.set(json, 4);
    body.set(new Uint8Array(clip), 4 + json.length);
    return body;
}

KwsCollector.prototype._drain = function () {
    if (this.sending || !this.queue.length) return;
    const self = this;
    const item = this.queue[0];
    this.sending = item;

    fetch(this.url + item.path, {
        method: "POST",
        headers: { "Content-Type": item.clip ? "application/octet-stream"
                                             : "application/json" },
        body: frame(item.record, item.clip)
    }).then(function (response) {
        if (response.ok) {
            self._remove(item);
            self.sent++;
            self.lastError = null;
        } else {
            // Answered, so the collector is there and this entry is what
            // it will not take. A 4xx will not change on a retry; a 5xx
            // might, a few times. Kept forever, either would hold up
            // every entry behind it.
            item.answered++;
            if (response.status < 500 || item.answered >= self.maxServerTries) {
                self._remove(item);
                self.rejected++;
                self.lastRejection = item.path + ": HTTP " + response.status;
                self.lastError = null;
            } else {
                throw new Error("HTTP " + response.status);
            }
        }
        self.sending = null;
        self._trimClips();
        if (self.onStatus) self.onStatus(self.status());
        self._drain();
    }).catch(function (err) {
        self.failures++;
        self.lastError = String(err && err.message || err);
        self.sending = null;
        self._trimClips();
        if (self.onStatus) self.onStatus(self.status());
        // Keep the item and try again. Nothing here throws outwards: the
        // detector is running in another thread and does not care.
        setTimeout(function () { self._drain(); }, self.retrySeconds * 1000);
    });
};

KwsCollector.prototype.status = function () {
    return {
        queued: this.queue.length, queuedBytes: this.queuedBytes,
        sent: this.sent, dropped: this.dropped,
        clipsDropped: this.clipsDropped, rejected: this.rejected,
        failures: this.failures, lastError: this.lastError,
        lastRejection: this.lastRejection
    };
};

/* Resolve once the queue has drained, or after `timeoutMs`. For tests and
 * for a page that wants to say "everything is saved" before it closes. */
KwsCollector.prototype.flushed = function (timeoutMs) {
    const self = this;
    const deadline = Date.now() + (timeoutMs || 10000);
    return new Promise(function (resolve) {
        (function poll() {
            if (!self.queue.length || Date.now() > deadline) resolve(self.status());
            else setTimeout(poll, 50);
        })();
    });
};

if (typeof module !== "undefined" && module.exports) module.exports = { KwsCollector };
