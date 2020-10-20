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
			keyword: keyword,
			state: "triggered"
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
	function broadcastWakeWordError(error){
		//dispatch event
		var event = new CustomEvent('sepia_wake_word', { detail: {
			msg: error,
			state: "error"
		}});
		document.dispatchEvent(event);
	}
	//NOTE: active, inactive: see ui.animate.wakeWord...
	
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
		SepiaFW.client.addOnActiveOneTimeAction(wakeTriggersOnActiveAction);		//Note: we reset this to 'addOnActive' after setup (below)
		
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
				WakeTriggers.setupWakeWords(function(){
					//now we can install the permanent 'onActive' event (because it will be closed during 'client.broadcastOnActiveReset')
					SepiaFW.client.addOnActiveAction(function(){
						var state = SepiaFW.animate.assistant.getState();
						if (WakeTriggers.useWakeWord && WakeTriggers.engineLoaded 
								&& !WakeTriggers.isListening() && state == "idle"){		//NOte: if not idle it will be triggerd on state change
							SepiaFW.wakeTriggers.listenToWakeWords(undefined, undefined, true);
						}
					});
				});
			}, 50);
		}
	}
	
	WakeTriggers.setupWakeWords = function(onFinishCallback){
		//load Porcupine engine to JS
		if (!WakeTriggers.engineLoaded){
			SepiaFW.tools.loadJS("xtensions/picovoice/wakeWords.js", function(){
				//restore from client storage
				var porcupineWakeWords = SepiaFW.data.getPermanent('wakeWordNames');
				var porcupineVersion = SepiaFW.data.getPermanent('wakeWordVersion');
				if (porcupineWakeWords) WakeTriggers.porcupineWakeWords = porcupineWakeWords;
				if (porcupineVersion) WakeTriggers.porcupineVersion = porcupineVersion;
				//load ww and engine
				if (WakeTriggers.porcupineWakeWords){
					var setupSuccessCallback = function(){
						WakeTriggers.engineLoaded = true;
						//start listening?
						setTimeout(function(){
							if (WakeTriggers.useWakeWord){
								SepiaFW.debug.log("WakeTriggers - Starting wake-word listener.");
								WakeTriggers.listenToWakeWords();
							}
							if (onFinishCallback) onFinishCallback();
						}, 3000);	
					}
					//type A: name + version 
					if (Array.isArray(WakeTriggers.porcupineWakeWords)){
						//we can only load one here - TODO: extend for many?
						var name = WakeTriggers.porcupineWakeWords[0];
						var version = WakeTriggers.porcupineVersion;
						if (name.replace(/_/g, " ").toLowerCase() == "hey sepia"){
							//default "Hey SEPIA" (no change)
							SepiaFW.debug.log("WakeTriggers - Loaded wake words: " + JSON.stringify(ppKeywordNames));
							SepiaFW.debug.log("WakeTriggers - Wake word sensitivities: " + JSON.stringify(ppSensitivities));
							loadPpEngine(setupSuccessCallback);
						}else{
							//try to read from file
							var apply = true;
							WakeTriggers.readPorcupineWwFromFile(version, name, apply, setupSuccessCallback);
						}
					//type B: Uint8Array data
					}else{
						WakeTriggers.setPorcupineLibForVersion(WakeTriggers.porcupineVersion);
						ppReloadWakeWords(WakeTriggers.porcupineWakeWords);
						loadPpEngine(setupSuccessCallback);
					}
				}
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
			SepiaFW.debug.info('Starting wake-word listener ...'); 		//DEBUG
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
	WakeTriggers.getWakeWordVersion = function(){
		//Porcupine integration
		return ppKeywordVersion;
	}
	WakeTriggers.setWakeWord = function(name, version){
		if (!name || !version){
			//reset
			SepiaFW.data.setPermanent('wakeWordNames', "");
			SepiaFW.data.setPermanent('wakeWordVersion', "");
		}else{
			//Porcupine integration
			WakeTriggers.readPorcupineWwFromFile(version, name, true, function(newPpKeywordIDs){
				if (newPpKeywordIDs){
					var namesArray = Object.keys(newPpKeywordIDs);
					if (namesArray && namesArray.length > 0){
						SepiaFW.data.setPermanent('wakeWordNames', namesArray);
						SepiaFW.data.setPermanent('wakeWordVersion', version);
					}
				}
			});
		}
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

	function loadPpEngine (successCallback){
		SepiaFW.tools.loadJS("xtensions/picovoice/pv_porcupine_mod.js", function(){
			SepiaFW.tools.loadJS("xtensions/picovoice/porcupine.js", function(){
				SepiaFW.tools.loadJS("xtensions/picovoice/picovoiceAudioManager.js", function(){
					SepiaFW.debug.log("WakeTriggers - Loaded Picovoice Porcupine engine.");
					SepiaFW.wakeWordSettings.refreshUi("Engine");
					if (successCallback) successCallback();
				});
			});
		});
	}
	
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
	var ppFileUrl = "pv_porcupine.wasm";
	var ppKeywordVersion = "1.4";
	
	function ppReloadWakeWords(newPpKeywordIDs){
		ppKeywordIDs = newPpKeywordIDs;
		ppKeywordNames = Object.keys(ppKeywordIDs);
		WakeTriggers.porcupineWakeWords = ppKeywordIDs;
		WakeTriggers.porcupineVersion = ppKeywordVersion;
		ppSetWakeWordSensitivities(ppSensitivities);
		SepiaFW.debug.log("WakeTriggers - Loaded wake words: " + JSON.stringify(ppKeywordNames));
		SepiaFW.debug.log("WakeTriggers - Wake word sensitivities: " + JSON.stringify(ppSensitivities));
		SepiaFW.wakeWordSettings.refreshUi("Wake-Word");
	}

	WakeTriggers.setPorcupineLibForVersion = function(version){
		if (version == "1.4"){
			ppFileUrl = "pv_porcupine.wasm";					//DEFAULT FILE
		}else if (WakeTriggers.porcupineVersionsDownloaded){
			ppFileUrl = "pv_porcupine_" + version + ".wasm";	//DOWNLOADED
		}else{
			ppFileUrl = "https://sepia-framework.github.io/files/porcupine/" + version + "/pv_porcupine.wasm";		//ONLINE
		}
		ppKeywordVersion = version;
	}
	WakeTriggers.readPorcupineWwFromFile = function(version, name, doApply, customSuccessCallback){
		if (ppWwReadRetryCounter > 3){
			SepiaFW.debug.error("Wake-word read request failed too often and has been blocked! Please restart client to reset.");
			return;
		}
		if (doApply){
			//switch off first
			if (WakeTriggers.isListening()){
				WakeTriggers.stopListeningToWakeWords(function(){
					ppWwReadRetryCounter++;
					WakeTriggers.readPorcupineWwFromFile(version, name, doApply, customSuccessCallback);
				}, function(){
					SepiaFW.debug.error("Failed to read wake-word: " + name);
				});
				return;
			}
		}
		var filePath = "xtensions/picovoice/keywords/" + version + "/" + name.replace(/\s+/g, "_").toLowerCase() + "_wasm.ppn";
		SepiaFW.files.fetchLocal(filePath, function(data){
			var uint8;
			if (doApply){
				WakeTriggers.setPorcupineLibForVersion(version);
			}
			if (!!data.match(/0x..,(\s|)0x..,.*/)){
				var strArr = data.split(/,/g);
				uint8 = new Uint8Array(new ArrayBuffer(strArr.length));
				for (var i = 0; i < strArr.length; i += 1) {
					uint8[i] = parseInt(strArr[i]);
				}
			}else{
				SepiaFW.debug.error("Cannot convert binary format of Porcupine wake-word engine! Please convert in Linux via 'xxd -i -g 1 [file]'");
				ppWwReadRetryCounter++;
				return;
				//uint8 = SepiaFW.tools.convertStringToUint8(data);
			}
			//console.log(uint8);		//DEBUG
			//overwrite
			var newPpKeywordIDs = {};
			newPpKeywordIDs[name] = uint8;
			if (doApply && newPpKeywordIDs){
				ppReloadWakeWords(newPpKeywordIDs);
				loadPpEngine(function(){
					ppWwReadRetryCounter = 0;
					if (customSuccessCallback) customSuccessCallback(newPpKeywordIDs);
				});
			}else{
				ppWwReadRetryCounter = 0;
				if (customSuccessCallback) customSuccessCallback(newPpKeywordIDs);
			}
		}, function(err){
			SepiaFW.debug.error("Failed to read wake-word file. Msg.: ", err);
			ppWwReadRetryCounter++;
		});
	}
	var ppWwReadRetryCounter = 0;


	WakeTriggers.getPorcupineWwData = function(){
		return {
			engineFile: ppFileUrl,
			engineVersion: ppKeywordVersion,
			ids: ppKeywordIDs,
			sensitivities: ppSensitivities
		}
	}

	SepiaFW.animate.wakeWord.inactive();
	
	var ppAudioManager;
	
	function ppSetWakeWordSensitivities(newValues, onSuccessCallback, onErrorCallback){
		if (newValues.length < ppKeywordNames.length){
			var newArray = [];
			for (var i=newValues.length-1; i<newValues.length; i++){
				newArray.push(newValues[i]);
			}
			for (var i=newValues.length; i<ppKeywordNames.length; i++){
				newArray.push(newValues[0]);
			}
			ppSensitivities =  new Float32Array(newArray);
		}else{
			ppSensitivities =  new Float32Array(newValues);
		}
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
		ppAudioManager.start(ppKeywordIDs, ppSensitivities, onSuccessCallback, onErrorCallback);
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
		broadcastWakeWordError(errMsg);
    };
	
	//-------------------------------------------------
	
	return WakeTriggers;
}