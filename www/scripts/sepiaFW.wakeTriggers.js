//Handle wake triggers like "Hey SEPIA" wake-word.
function sepiaFW_build_wake_triggers() {
	var WakeTriggers = {};
	
	WakeTriggers.useWakeWord = false;		//allows to use client side and remote wake-word trigger
	WakeTriggers.autoLoadWakeWord = false;	//load wake-word on app start?
	WakeTriggers.allowWakeWordDuringStream = false;		//activate wake-word during audio streaming (e.g. music)?
	WakeTriggers.engine = "Porcupine";		//active engine
	WakeTriggers.engineLoaded = false;
	WakeTriggers.engineModule;

	function logInfo(info, isError){
        if (SepiaFW.wakeWordSettings){
            SepiaFW.wakeWordSettings.debugLog(info, isError);
        }else{
            console.log("WakeTriggers", info);
        }
    }

	var isListening = false;
	WakeTriggers.isListening = function(){
		return isListening;
	}

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
		logInfo('KEYWORD: ' + keyword);
		
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
		logInfo('ERROR: ' + error, true);
	}
	//NOTE: active, inactive: see ui.animate.wakeWord...
	
	//Interface 

	WakeTriggers.initialize = function(){
		//allowed?
		WakeTriggers.useWakeWord = SepiaFW.data.get('useWakeWord');
		if (typeof WakeTriggers.useWakeWord == 'undefined') WakeTriggers.useWakeWord = false;
		SepiaFW.debug.info("Wake-word is " + ((WakeTriggers.useWakeWord)? "ALLOWED" : "NOT ALLOWED"));
		//auto-load?
		WakeTriggers.autoLoadWakeWord = SepiaFW.data.get('autoloadWakeWord');
		if (typeof WakeTriggers.autoLoadWakeWord == 'undefined') WakeTriggers.autoLoadWakeWord = false;
		SepiaFW.debug.info("Wake-word will " + ((WakeTriggers.autoLoadWakeWord)? "be LOADED" : "NOT be LOADED"));
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
								&& !WakeTriggers.isListening() && state == "idle"){		//Note: if not idle it will be triggerd on state change
							SepiaFW.wakeTriggers.listenToWakeWords(undefined, undefined, true);
						}
					});
				});
			}, 50);
		}
	}

	//build SEPIA Web Audio module for Porcupine
	function buildPorcupineSepiaWebAudioModule(porcupineVersion, wasmFile, keywordsArray, keywordsData, sensitivities){
		var porcupineWorker = {
			name: 'porcupine-wake-word-worker',
			type: 'worker',
			preLoad: {
				wasmFile: wasmFile //e.g. 'audio-modules/picovoice/porcupine-14.wasm'
			},
			settings: {
				onmessage: function(msg){
					if (msg && msg.keyword){
						broadcastWakeWordTrigger(msg.keyword);
					}
				},
				onerror: function(err){
					var errMsg = (err && err.message? err.message : "?");
					SepiaFW.debug.error("Porcupine: " + errMsg);
					SepiaFW.ui.showPopup("Porcupine error: " + errMsg);
					broadcastWakeWordError(errMsg);
					WakeTriggers.stopListeningToWakeWords();
				},
				//sendToModules: (doUseWaveEncoder? [waveEncoderIndex] : []),
				options: {
					setup: {
						inputSampleRate: 16000,		//TODO: load from somewhere else
						inputSampleSize: 512,		// "	 "
						//bufferSize: 512,			//this has no effect yet (samples will be processed in 'inputSampleSize' chunks)
						version: porcupineVersion,	//e.g. 14 or 19
						keywords: keywordsArray, 	//e.g. ["Hey SEPIA"] or ["Computer", "Jarvis", "Picovoice"]
						keywordsData: keywordsData,
						sensitivities: sensitivities
					}
				}
			}
		};
		logInfo('CREATED SEPIA Web Audio Picovoice module');
		logInfo('inputSampleRate: ' + porcupineWorker.settings.options.setup.inputSampleRate);
		logInfo('inputSampleSize: ' + porcupineWorker.settings.options.setup.inputSampleSize);
		return porcupineWorker;
	}
	//open/close wake-word module gate
	function setWakeWordModuleGateState(state){
		if (!WakeTriggers.engineModule) return;
		WakeTriggers.engineModule.handle.sendToModule({gate: state});
		//if (state == "open"){...}
		//TODO: track somehow
	}
	
	WakeTriggers.setupWakeWords = function(onFinishCallback){
		//load Porcupine engine to JS
		if (!WakeTriggers.engineLoaded && WakeTriggers.engine == "Porcupine"){
			SepiaFW.tools.loadJS("xtensions/picovoice/wakeWords.js", function(){
				//restore from client storage (higher priority)
				var porcupineVersion = SepiaFW.data.getPermanent('wakeWordVersion');
				var porcupineWakeWords = SepiaFW.data.getPermanent('wakeWordNames');
				var porcupineSensitivities = SepiaFW.data.getPermanent('wakeWordSensitivity');
				if (porcupineVersion) WakeTriggers.porcupineVersion = porcupineVersion;
				if (porcupineWakeWords) WakeTriggers.porcupineWakeWords = porcupineWakeWords;
				if (porcupineSensitivities) WakeTriggers.porcupineSensitivities = porcupineSensitivities;
				//load ww and engine
				if (WakeTriggers.porcupineWakeWords){
					//version and WASM file
					var wasmFile;
					if (WakeTriggers.porcupineVersionsDownloaded){
						if (WakeTriggers.porcupineVersion == "1.4" || WakeTriggers.porcupineVersion == "14"){	//...for legacy reasons
							wasmFile = porcupineExtensionFolder + "pv_porcupine.wasm";												//DOWNLOADED
						}else{
							wasmFile = porcupineExtensionFolder + "pv_porcupine_" + WakeTriggers.porcupineVersion + ".wasm";		//DOWNLOADED
						}
					}else if (WakeTriggers.porcupineWasmRemoteUrl){
						wasmFile = SepiaFW.files.replaceSystemFilePath(WakeTriggers.porcupineWasmRemoteUrl);					//ONLINE - CUSTOM
					}else{
						wasmFile = "https://sepia-framework.github.io/files/porcupine/" + version + "/pv_porcupine.wasm";		//ONLINE - DEFAULT
					}
					//sanitize
					if (typeof WakeTriggers.porcupineWakeWords == "string"){
						WakeTriggers.porcupineWakeWords = [WakeTriggers.porcupineWakeWords];
					}
					//Uint8Array data instead of names?
					var keywordsData;
					if (!Array.isArray(WakeTriggers.porcupineWakeWords)){
						keywordsData = WakeTriggers.porcupineWakeWords;
						WakeTriggers.porcupineWakeWords = Object.keys(WakeTriggers.porcupineWakeWords);
					}
					//make sure sensitivities fit
					if (typeof WakeTriggers.porcupineSensitivities == "number"){
						WakeTriggers.porcupineSensitivities = [WakeTriggers.porcupineSensitivities];
					}
					WakeTriggers.porcupineSensitivities = sanitizeSensitivities(WakeTriggers.porcupineSensitivities, WakeTriggers.porcupineWakeWords.length);
					//build module
					WakeTriggers.engineModule = buildPorcupineSepiaWebAudioModule(
						WakeTriggers.porcupineVersion, wasmFile, WakeTriggers.porcupineWakeWords, keywordsData, WakeTriggers.porcupineSensitivities
					);
					//DONE
					WakeTriggers.engineLoaded = true;
					SepiaFW.debug.log("WakeTriggers - Picovoice Porcupine engine module setup complete.");
					SepiaFW.debug.log("WakeTriggers - Set wake words: " + JSON.stringify(WakeTriggers.porcupineWakeWords));
					SepiaFW.debug.log("WakeTriggers - Wake word sensitivities: [" + WakeTriggers.porcupineSensitivities.toString() + "]");
					SepiaFW.wakeWordSettings.refreshUi("Engine");
					//start listening?
					setTimeout(function(){
						if (WakeTriggers.useWakeWord){
							SepiaFW.debug.log("WakeTriggers - Starting wake-word listener.");
							WakeTriggers.listenToWakeWords();
						}
						if (onFinishCallback) onFinishCallback();
					}, 3000);
				}
			});
		}else{
			if (onFinishCallback) onFinishCallback();
		}
	}
	
	WakeTriggers.listenToWakeWords = function(onSuccessCallback, onErrorCallback, doDelayAndCheck){
		if (isListening){
			if (onSuccessCallback) onSuccessCallback();		//TODO: use success or error or none?
			return;
		}
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
			//check requirements
			if (!WakeTriggers.engineLoaded || !WakeTriggers.engineModule){
				var msg = "Missing engine module or engine not ready (yet?).";
				logInfo('ERROR: ' + msg, true);
				if (onErrorCallback) onErrorCallback({name: "WakeTriggerError", message: msg});
				return;
			}
			if (!SepiaFW.audioRecorder.existsWebAudioRecorder()){
				logInfo('CREATING wake-Word listener...');
				SepiaFW.audioRecorder.createWebAudioRecorder({}, function(sepiaWebAudioProcessor, info){
					WakeTriggers.listenToWakeWords(onSuccessCallback, onErrorCallback, doDelayAndCheck);
				}, onErrorCallback);
				return;
			}
			if (!SepiaFW.audioRecorder.webAudioHasCapability("wakeWordDetection")){
				//TODO: release old and make new recorder
				var msg = "Active processor is missing capability 'wakeWordDetection'. Consider release + new create.";
				logInfo('ERROR: ' + msg, true);
				if (onErrorCallback) onErrorCallback({name: "WebAudioCapabilityError", message: msg});
				return;
			}
			//START
			SepiaFW.debug.info('Starting wake-word listener ...'); 		//DEBUG
			logInfo('STARTING wake-Word listener...');
			SepiaFW.audioRecorder.startWebAudioRecorder(function(){
				logInfo('STARTED wake-Word listener');
				setWakeWordModuleGateState("open");
				isListening = true;
				SepiaFW.animate.wakeWord.active();
			}, onErrorCallback);
		}
	}
	
	WakeTriggers.stopListeningToWakeWords = function(onSuccessCallback, onErrorCallback){
		if (switchOnWakeWordTimer) clearTimeout(switchOnWakeWordTimer);
		if (!isListening){
			if (onSuccessCallback) onSuccessCallback();		//TODO: use success or error or none?
			return;
		}
		//STOP
		SepiaFW.debug.info('Stopping wake-word listener ...'); 		//DEBUG
		SepiaFW.audioRecorder.stopWebAudioRecorder(function(){
			logInfo('STOPPED wake-Word listener');
			setWakeWordModuleGateState("close");
			isListening = false;
			SepiaFW.animate.wakeWord.inactive();
			setTimeout(function(){
				//give the audio manager some time to react - TODO: do we still need this?
				if (onSuccessCallback) onSuccessCallback();
			}, 300);
		});
	}
	
	WakeTriggers.getWakeWords = function(){
		if (!WakeTriggers.engineLoaded) return ["-NOT-LOADED-"];
		//Porcupine integration
		if (typeof WakeTriggers.porcupineWakeWords == "string"){
			return [WakeTriggers.porcupineWakeWords];
		}else if (WakeTriggers.porcupineWakeWords && !Array.isArray(WakeTriggers.porcupineWakeWords)){
			return Object.keys(WakeTriggers.porcupineWakeWords);
		}else{
			return WakeTriggers.porcupineWakeWords;
		}
	}
	WakeTriggers.getWakeWordVersion = function(){
		if (!WakeTriggers.engineLoaded) return "0";
		//Porcupine integration
		return WakeTriggers.porcupineVersion;
	}
	WakeTriggers.setWakeWord = function(namesArray, version){
		if (!namesArray || !version){
			//reset
			SepiaFW.data.setPermanent('wakeWordNames', "");
			SepiaFW.data.setPermanent('wakeWordVersion', "");
		}else{
			SepiaFW.data.setPermanent('wakeWordNames', namesArray);
			SepiaFW.data.setPermanent('wakeWordVersion', version);
		}
		//TODO: reload module
	}
	
	WakeTriggers.setWakeWordSensitivities = function(newValues){
		SepiaFW.data.setPermanent('wakeWordSensitivity', newValues);
		//TODO: reload module
	}
	WakeTriggers.getWakeWordSensitivities = function(){
		if (!WakeTriggers.engineLoaded) return new Float32Array([0.0]);
		//Porcupine integration
		if (typeof WakeTriggers.porcupineSensitivities == "number"){
			return [WakeTriggers.porcupineSensitivities];
		}else{
			return WakeTriggers.porcupineSensitivities;
		}
	}

	WakeTriggers.getEngineInfo = function(){
		return WakeTriggers.engineModule;
	}
	WakeTriggers.setWakeWordBufferSize = function(newBufferSize){
		//Porcupine integration
		if (!newBufferSize){
			SepiaFW.data.delPermanent("porcupine-ww-buffer-length");
		}else{
			SepiaFW.data.setPermanent("porcupine-ww-buffer-length", newBufferSize);
		}
		//TODO: FIX and reload module
	}

	//fill sensitivity array as needed
	function sanitizeSensitivities(newValues, n){
		if (newValues.length < n){
			var newArray = [];
			for (var i=newValues.length-1; i<newValues.length; i++){
				newArray.push(newValues[i]);
			}
			for (var i=newValues.length; i<keywords.length; i++){
				newArray.push(newValues[0]);
			}
			return new Float32Array(newArray);
		}else{
			return new Float32Array(newValues);
		}
	}
	
	//------ Porcupine Javascript (Picovoice.ai) ------
	
	//some defaults
	var porcupineExtensionFolder = "xtensions/picovoice/";
	
	//-------------------------------------------------

	//start inactive
	SepiaFW.animate.wakeWord.inactive();
	
	return WakeTriggers;
}