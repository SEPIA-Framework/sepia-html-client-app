//Handle wake triggers like "Hey SEPIA" wake-word.
function sepiaFW_build_wake_triggers() {
	var WakeTriggers = {};
	
	WakeTriggers.useWakeWord = false;		//allows to use client side and remote wake-word trigger
	WakeTriggers.autoLoadWakeWord = false;	//load wake-word on app start?
	WakeTriggers.allowWakeWordDuringStream = false;		//activate wake-word during audio streaming (e.g. music)?
	WakeTriggers.engine = "Porcupine";		//active engine
	WakeTriggers.engineLoaded = false;

	//timers
	var switchOnWakeWordTimer = undefined;

	//Broadcasting

	function broadcastWakeWordTrigger(keyword){
		//TODO: check assistant state before

		//dispatch event
		var event = new CustomEvent('sepia_wake_word', { detail: {
			keyword: keyword
		}});
		document.dispatchEvent(event);
		
		//trigger mic?
		if (WakeTriggers.useWakeWord){ 		// && keyword == "hey sepia"
			SepiaFW.animate.assistant.loading();
			WakeTriggers.stopListeningToWakeWords(function(){
				var useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
				SepiaFW.ui.toggleMicButton(useConfirmationSound);
			}, function(e){
				//no error handling?
			});
		}
	}
	
	//Interface 

	WakeTriggers.initialize = function(){
		//allowed?
		WakeTriggers.useWakeWord = SepiaFW.data.get('useWakeWord');
		if (typeof WakeTriggers.useWakeWord == 'undefined') WakeTriggers.useWakeWord = false;
		SepiaFW.debug.info("Wake-word 'Hey SEPIA' is " + ((WakeTriggers.useWakeWord)? "ALLOWED" : "NOT ALLOWED"));
		//auto-load?
		WakeTriggers.autoLoadWakeWord = SepiaFW.data.get('autoloadWakeWord');
		if (typeof WakeTriggers.autoLoadWakeWord == 'undefined') WakeTriggers.autoLoadWakeWord = false;
		SepiaFW.debug.info("Wake-word 'Hey SEPIA' will " + ((WakeTriggers.autoLoadWakeWord)? "be LOADED" : "NOT be LOADED"));
		//restore sensitivity
		var wwSensitivity = SepiaFW.data.getPermanent('wakeWordSensitivity');
		if (wwSensitivity != undefined){
			WakeTriggers.setWakeWordSensitivities(wwSensitivity);
		}
		//allow during audio stream?
		WakeTriggers.allowWakeWordDuringStream = SepiaFW.data.get('allowWakeWordDuringStream');
		if (typeof WakeTriggers.allowWakeWordDuringStream == 'undefined') WakeTriggers.allowWakeWordDuringStream = false;
		SepiaFW.debug.info("Wake-word during audio streaming is " + ((WakeTriggers.allowWakeWordDuringStream)? "ALLOWED" : "NOT ALLOWED"));

		//Add onActive action:
		SepiaFW.client.addOnActiveOneTimeAction(wakeTriggersOnActiveAction);
		
		//Event listeners
		document.addEventListener('sepia_audio_player_event', function(e){
			if (e.detail){
				//console.error(e.detail);
				if (WakeTriggers.useWakeWord && WakeTriggers.engineLoaded){
					//Audio player start
					if (e.detail.action == "start" || e.detail.action == "resume"){
						if (WakeTriggers.isListening() && !WakeTriggers.allowWakeWordDuringStream){
							SepiaFW.debug.info("WakeTriggers - Stopping wake-word listener due to audio player '" + e.detail.action + "' event");
							WakeTriggers.stopListeningToWakeWords();
						}
					//Audio player stop
					}else if (e.detail.action == "stop" || e.detail.action == "pause"){
						if ((SepiaFW.animate.assistant.getState() == "idle") && !WakeTriggers.isListening()){
							SepiaFW.debug.info("WakeTriggers - Scheduling wake-word listener restart due to audio player '" + e.detail.action + "' event");
							WakeTriggers.listenToWakeWords(undefined, undefined, true);
						}
					}
				}
			}
		}, true);
	}
	function wakeTriggersOnActiveAction(){
		//start setup?
		if (WakeTriggers.autoLoadWakeWord){ 		//Client.onActive good place?
			setTimeout(function(){
				WakeTriggers.setupWakeWords();
			}, 50);
		}
	}
	
	WakeTriggers.setupWakeWords = function(onFinishCallback){
		//load engine to JS
		if (!WakeTriggers.engineLoaded){
			SepiaFW.tools.loadJS("xtensions/picovoice/pv_porcupine_mod.js", function(){
				SepiaFW.tools.loadJS("xtensions/picovoice/porcupine.js", function(){
					SepiaFW.tools.loadJS("xtensions/picovoice/picovoiceAudioManager.js", function(){
						WakeTriggers.engineLoaded = true;
						SepiaFW.debug.log("WakeTriggers - Loaded Picovoice Porcupine engine.");
						//start listening?
						setTimeout(function(){
							if (WakeTriggers.useWakeWord){
								SepiaFW.debug.log("WakeTriggers - Starting wake-word listener.");
								WakeTriggers.listenToWakeWords();
							}
							if (onFinishCallback) onFinishCallback();
						}, 3000);
					});
				});
			});
		}else{
			if (onFinishCallback) onFinishCallback();
		}
	}
	
	WakeTriggers.listenToWakeWords = function(onSuccessCallback, onErrorCallback, doDelayAndCheck){
		if (doDelayAndCheck){
			if (switchOnWakeWordTimer) clearTimeout(switchOnWakeWordTimer);
			//set delay time depending on device type
			var switchOnWakeWordTimerDelay = (SepiaFW.ui.isMobile)? 3000 : 1500;
			switchOnWakeWordTimer = setTimeout(function(){
				var isAudioStreamActive = SepiaFW.audio.isAnyAudioSourceActive();
				//console.error("Audio playing? " + isAudioStreamActive);		//DEBUG
				if (isAudioStreamActive && !WakeTriggers.allowWakeWordDuringStream){
					return;
				}else if (WakeTriggers.useWakeWord && WakeTriggers.engineLoaded && !WakeTriggers.isListening() && (SepiaFW.animate.assistant.getState() == "idle")){
					//call without delay NOW
					WakeTriggers.listenToWakeWords(onSuccessCallback, onErrorCallback, false);
				}
			}, switchOnWakeWordTimerDelay);
		}else{
			//Porcupine integration
			ppListenToWakeWords(onSuccessCallback, onErrorCallback);
		}
	}
	WakeTriggers.isListening = function(){
		//Porcupine integration
		return ppIsListening;
	}
	
	WakeTriggers.stopListeningToWakeWords = function(onSuccessCallback, onErrorCallback){
		if (switchOnWakeWordTimer) clearTimeout(switchOnWakeWordTimer);
		//Porcupine integration
		ppStopListeningToWakeWords(onSuccessCallback, onErrorCallback);
	}
	
	WakeTriggers.getWakeWords = function(){
		//Porcupine integration
		return ppKeywordNames;
	}
	
	WakeTriggers.setWakeWordSensitivities = function(newValues, onSuccessCallback, onErrorCallback){
		SepiaFW.data.setPermanent('wakeWordSensitivity', newValues);
		//Porcupine integration
		ppSetWakeWordSensitivities(newValues, onSuccessCallback, onErrorCallback);
	}
	WakeTriggers.getWakeWordSensitivities = function(){
		//Porcupine integration
		return ppGetWakeWordSensitivities();
	}
	
	//------ Porcupine Javascript (Picovoice.ai) ------
	
	var ppKeywordIDs = {
		'hey sepia': new Uint8Array([
			0xE0, 0x33, 0x02, 0xB3, 0x7D, 0x67, 0xEC, 0xA6, 0x39, 0x01, 0x70, 0x44, 
			0x70, 0xB2, 0xCE, 0x48, 0x05, 0xE5, 0x45, 0x72, 0xC4, 0x8E, 0x03, 0xBF, 
			0x32, 0x90, 0x33, 0xA9, 0x9E, 0x8A, 0x53, 0x17, 0x00, 0x69, 0x26, 0x2F, 
			0x7E, 0xF4, 0xDD, 0x9B, 0x8A, 0xF4, 0xAC, 0x9B, 0x51, 0x99, 0xEC, 0x33, 
			0x68, 0xFF, 0xEB, 0x72, 0x7D, 0x10, 0x0B, 0xAD, 0xD2, 0x1F, 0xD9, 0x0C, 
			0x54, 0x0E, 0xF9, 0xBF, 0x6B, 0xB3, 0x21, 0xD4, 0x59, 0xBD, 0xFF, 0x4E, 
			0x18, 0x4B, 0xCE, 0x31, 0xBC, 0x4F, 0xBC, 0xF4, 0xDA, 0xA6, 0x0D, 0x6C, 
			0x5D, 0xA5, 0x50, 0x0F])
    };
	var ppSensitivities = new Float32Array([0.50]); 	//1: low threshold, 0.1: high threshold
	var ppKeywordNames = Object.keys(ppKeywordIDs);
	var ppIsListening = false;
	SepiaFW.animate.wakeWord.inactive();
	
	var ppAudioManager;
	
	function ppSetWakeWordSensitivities(newValues, onSuccessCallback, onErrorCallback){
		ppSensitivities =  new Float32Array(newValues);
		if (onSuccessCallback) onSuccessCallback();
	}
	function ppGetWakeWordSensitivities(){
		return ppSensitivities;
	}

    function ppListenToWakeWords(onSuccessCallback, onErrorCallback){
		if (!onSuccessCallback) onSuccessCallback = defaultPpSuccessCallback;
		if (!onErrorCallback) onErrorCallback = defaultPpErrorCallback;
		
		ppIsListening = true;
		if (!ppAudioManager){
			ppAudioManager = new PicovoiceAudioManager();
		}
		ppAudioManager.start(Porcupine.create(Object.values(ppKeywordIDs), ppSensitivities), onSuccessCallback, onErrorCallback);
		SepiaFW.animate.wakeWord.active();
	}

    function ppStopListeningToWakeWords(onSuccessCallback, onErrorCallback){
		if (!ppAudioManager){
			if (onErrorCallback) onErrorCallback();
		}else{
			ppAudioManager.stop();
		}
		//can this throw an error?
		setTimeout(function(){
			//give the audio manager some time to react
			ppIsListening = false;
			if (onSuccessCallback) onSuccessCallback();
			SepiaFW.animate.wakeWord.inactive();
		}, 300);
    }
	
	function defaultPpSuccessCallback(keywordIndex){
		if (keywordIndex === -1) {
            return;
        }else{
			var keyword = ppKeywordNames[keywordIndex];
			//console.log('Wake-word close window.');		//NOTE: we let the keyword evaluation (e.g. toggleMic handle the stop)
			broadcastWakeWordTrigger(keyword);
		}
    }
	function defaultPpErrorCallback(ex){
		ppIsListening = false;
		SepiaFW.animate.wakeWord.inactive();
		var errMsg = "?";
		if (ex && typeof ex == "string"){
			errMsg = ex;
		}else if (ex && typeof ex == "object" && (ex.error || ex.message || ex.msg)){
			errMsg = ex.error || ex.message || ex.msg;
		}else if (ex && typeof ex == "object"){
			try {
				errMsg = JSON.stringify(ex);
			}catch(err){}
		}
		SepiaFW.debug.error("Porcupine: " + errMsg);
		SepiaFW.ui.showPopup("Porcupine error: " + errMsg);
    };
	
	//-------------------------------------------------
	
	return WakeTriggers;
}