var exec = require("cordova/exec");

/** 
    attribute SpeechGrammarList grammars;
    attribute DOMString lang;
    attribute boolean continuous;
    attribute boolean interimResults;
    attribute unsigned long maxAlternatives;
    attribute DOMString serviceURI;
 */
var SpeechRecognition = function () {
    this.grammars = null;
    this.lang = "en";
    this.continuous = false;
    this.interimResults = true;
    this.maxAlternatives = 2;
    this.serviceURI = "";
    
    // event methods

    //Both Platforms
    this.onresult = null;
    this.onpartialresult = null;
    this.onerror = null;
    this.onend = null;

    //Android
    this.onaudiostart = null;
    this.onsoundstart = null;
    this.onspeechstart = null;
    this.onspeechend = null;
    this.onsoundend = null;
    this.onaudioend = null;
    this.onvoicelevelchange = null;
    this.onnomatch = null;
    this.onstart = null;
    

    var init = (!navigator.userAgent.match(/iPhone/)) ? 'init' : 'initialize';
    exec(function() {
        console.log("initialized");
    }, function(e) {
        console.log("error: " + e);
    }, "SpeechRecognition", init, []);
};

SpeechRecognition.prototype.start = function() {
    var that = this;
    var successCallback = function(event) {
        if (event.type === "audiostart" && typeof that.onaudiostart === "function") {
            that.onaudiostart(event);
        } else if (event.type === "soundstart" && typeof that.onsoundstart === "function") {
            that.onsoundstart(event);
        } else if (event.type === "speechstart" && typeof that.onspeechstart === "function") {
            that.onspeechstart(event);
        } else if (event.type === "speechend" && typeof that.onspeechend === "function") {
            that.onspeechend(event);
        } else if (event.type === "soundend" && typeof that.onsoundend === "function") {
            that.onsoundend(event);
        } else if (event.type === "audioend" && typeof that.onaudioend === "function") {
            that.onaudioend(event);
        } else if (event.type === "result" && typeof that.onresult === "function") {
            that.onresult(event);
        } else if (event.type === "partialResult" && typeof that.onpartialresult === "function") {
            that.onpartialresult(event);
        } else if (event.type === "voiceLevelChange" && typeof that.onvoicelevelchange === "function") {
            that.onvoicelevelchange(event);
        } else if (event.type === "nomatch" && typeof that.onnomatch === "function") {
            that.onnomatch(event);
        } else if (event.type === "start" && typeof that.onstart === "function") {
            that.onstart(event);
        } else if (event.type === "end" && typeof that.onend === "function") {
            that.onend(event);
        }
    };
    var errorCallback = function(err) {
        if (typeof that.onerror === "function") {
            that.onerror(err);
        }   
    };

    var myArr = (!navigator.userAgent.match(/iPhone/)) ? [this.lang] : [this.lang, "sounds/mic_open.mp3", "sounds/mic_closed.mp3"];
    exec(successCallback, errorCallback, "SpeechRecognition", "start", myArr);
};

SpeechRecognition.prototype.stop = function() {
    exec(null, null, "SpeechRecognition", "stop", []);
};

SpeechRecognition.prototype.abort = function() {
    exec(null, null, "SpeechRecognition", "abort", []);
};

module.exports = SpeechRecognition;
