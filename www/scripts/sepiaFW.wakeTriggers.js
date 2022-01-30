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
	var isStopping = false;
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
				SepiaFW.ui.toggleMicButton(useConfirmationSound, "wake-word");
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

	var hasAudioPlayerEventListeners = false;

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
		if (hasAudioPlayerEventListeners){
			SepiaFW.debug.error("WakeTriggers - Tried to initialize audio-player event listeners twice! This should never happen!");
		}else{
			hasAudioPlayerEventListeners = true;
			document.addEventListener('sepia_audio_player_event', function(e){
				if (e.detail){
					//console.error("WakeTriggers - sepia_audio_player_event", e.detail);		//DEBUG
					//NOTE: this can be the embedded player as well (and it could be remote actually)
					if (WakeTriggers.useWakeWord && WakeTriggers.engineLoaded){
						//Audio player start
						if (e.detail.action == "prepare" || e.detail.action == "start" || e.detail.action == "resume"){
							if (!isStopping && WakeTriggers.isListening() && !WakeTriggers.allowWakeWordDuringStream){
								SepiaFW.debug.info("WakeTriggers - Stopping wake-word listener due to audio player '" + e.detail.action + "' event");
								WakeTriggers.stopListeningToWakeWords();	//note without 'keepalive' this is RELEASE
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
	}
	function wakeTriggersOnActiveAction(){
		//start setup?
		if (WakeTriggers.autoLoadWakeWord){ 		//Client.onActive good place?
			setTimeout(function(){
				var skipAutostart = false;			//we start directly ('cause we assume this is called onActive)
				WakeTriggers.setupWakeWords(function(){
					//now we can install the permanent 'onActive' event (because it will be closed during 'client.broadcastOnActiveReset')
					SepiaFW.client.addOnActiveAction(function(){
						var state = SepiaFW.animate.assistant.getState();
						if (WakeTriggers.useWakeWord && WakeTriggers.engineLoaded 
								&& !WakeTriggers.isListening() && state == "idle"){		//Note: if not idle it will be triggerd on state change
							SepiaFW.wakeTriggers.listenToWakeWords(undefined, undefined, true);
						}
					});
				}, skipAutostart);
			}, 50);
		}
	}

	//re-build last module
	var rebuildPreviousSepiaWebAudioModule = undefined; 	//will be available after first module creation

	//build SEPIA Web Audio module for Porcupine
	function buildPorcupineSepiaWebAudioModule(porcupineVersion, wasmFile, keywordsArray, keywordsData, sensitivities, accessKey){
		var preLoad = {};
		if (wasmFile.match(/.*\.b64$/)){
			preLoad.wasmBase64 = wasmFile;		//e.g. 'xtensions/picovoice/porcupine-19.b64'
		}else{
			preLoad.wasmFile = wasmFile;		//e.g. '<assist_server>/files/wake-words/porcupine/porcupine-14.wasm'
		}
		var porcupineLanguage = "";
		if (porcupineVersion.indexOf("_") > 0){
			var ppvAndLang = porcupineVersion.split("_");
			porcupineVersion = ppvAndLang[0];
			porcupineLanguage = ppvAndLang[1].toLowerCase();
		}
		var keywordsRemoteLocation = SepiaFW.config.replacePathTagWithActualPath("<assist_server>/files/wake-words/porcupine/");
		var porcupineWorker = {
			name: 'porcupine-wake-word-worker',
			type: 'worker',
			preLoad: preLoad,
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
						inputSampleSize: 512,		//TODO: 	"	  "
						//bufferSize: 512,			//this has no effect yet (samples will be processed in 'inputSampleSize' chunks)
						version: porcupineVersion,		//e.g. 1.4, 1.5, 1.6, 1.9, 2.0 or 14, 15, ...
						keywords: keywordsArray, 		//e.g. ["Hey SEPIA"] or ["Computer", "Jarvis", "Picovoice"]
						keywordsData: keywordsData,
						sensitivities: sensitivities,
						porcupineLanguage: porcupineLanguage,	//v2.0: "en", "de", "es", "fr"
						porcupineAccessKey: accessKey,
						keywordsRemoteLocation: keywordsRemoteLocation	//alternative location for "server: xy" keywords
					}
				}
			}
		};
		logInfo('CREATED SEPIA Web Audio Picovoice module');
		logInfo('inputSampleRate: ' + porcupineWorker.settings.options.setup.inputSampleRate);
		logInfo('inputSampleSize: ' + porcupineWorker.settings.options.setup.inputSampleSize);
		
		rebuildPreviousSepiaWebAudioModule = function(){
			return buildPorcupineSepiaWebAudioModule(porcupineVersion, wasmFile, keywordsArray, keywordsData, sensitivities, accessKey);
		}
		return porcupineWorker;
	}

	//open/close wake-word module gate
	function setWakeWordModuleGateState(state){
		if (!WakeTriggers.engineModule) return;
		WakeTriggers.engineModule.handle.sendToModule({gate: state});
		//if (state == "open"){...}
		//TODO: track somehow
	}
	
	WakeTriggers.setupWakeWords = function(onFinishCallback, skipAutostart, customAutostartDelay){
		//load Porcupine engine to JS
		if (!WakeTriggers.engineLoaded && WakeTriggers.engine == "Porcupine"){
			SepiaFW.tools.loadJS(PORCUPINE_FOLDER + "wakeWords.js", function(){
				//restore from client storage (higher priority)
				var porcupineVersion = SepiaFW.data.getPermanent('wakeWordVersion');
				if (porcupineVersion) WakeTriggers.porcupineVersion = porcupineVersion;
				var porcupineWakeWords = SepiaFW.data.getPermanent('wakeWordNames');
				if (porcupineWakeWords) WakeTriggers.porcupineWakeWords = porcupineWakeWords;
				var porcupineSensitivities = SepiaFW.data.getPermanent('wakeWordSensitivity');
				if (porcupineSensitivities) WakeTriggers.porcupineSensitivities = porcupineSensitivities;
				var porcupineVersionsDownloaded = SepiaFW.data.getPermanent('wakeWordIsLocal');
				if (porcupineVersionsDownloaded != undefined) WakeTriggers.porcupineVersionsDownloaded = porcupineVersionsDownloaded;
				var porcupineWasmRemoteUrl = SepiaFW.data.getPermanent('wakeWordRemoteUrl');
				if (porcupineWasmRemoteUrl) WakeTriggers.porcupineWasmRemoteUrl = porcupineWasmRemoteUrl;
				var porcupineAccessKey = SepiaFW.data.getPermanent('wakeWordAccessKeyPorcupine');
				if (porcupineAccessKey) WakeTriggers.porcupineAccessKey = porcupineAccessKey;
				//load ww and engine
				if (WakeTriggers.porcupineWakeWords){
					//version and WASM file
					var wasmFile;
					if (WakeTriggers.porcupineVersion == PORCUPINE_DEFAULT_VERSION){
						wasmFile = PORCUPINE_FOLDER + "pv_porcupine.wasm";												//DEFAULT (INCLUDED)
					}else if (WakeTriggers.porcupineVersionsDownloaded){
						wasmFile = PORCUPINE_FOLDER + "pv_porcupine_" + WakeTriggers.porcupineVersion + ".wasm";		//DOWNLOADED
					}else if (!WakeTriggers.porcupineWasmRemoteUrl || WakeTriggers.porcupineWasmRemoteUrl == "<sepia_website>"){
						wasmFile = SepiaFW.config.replacePathTagWithActualPath("<sepia_website>"
								+ "/files/porcupine/" + WakeTriggers.porcupineVersion + "/pv_porcupine.wasm");				//ONLINE - SEPIA Website
					}else{
						//e.g.: "<assist_server>/files/wake-words/porcupine/" or maybe even "<custom_data>/porcupine-19.b64" ?
						if (!!WakeTriggers.porcupineWasmRemoteUrl.match(/.*\.(wasm|b64)$/)){
							//file URL
							wasmFile = SepiaFW.config.replacePathTagWithActualPath(WakeTriggers.porcupineWasmRemoteUrl);	//ONLINE - CUSTOM (FILE)
						}else{
							//folder URL
							wasmFile = SepiaFW.config.replacePathTagWithActualPath(WakeTriggers.porcupineWasmRemoteUrl)		//ONLINE - CUSTOM (FOLDER)
								+ WakeTriggers.porcupineVersion + "/pv_porcupine.wasm";
						}
					}
					logInfo('ENGINE URL: ' + wasmFile, false);
					//sanitize
					if (typeof WakeTriggers.porcupineWakeWords == "string"){
						if (WakeTriggers.porcupineWakeWords.indexOf(",")){
							WakeTriggers.porcupineWakeWords = WakeTriggers.porcupineWakeWords.split(/\s*,\s*/);
						}else{
							WakeTriggers.porcupineWakeWords = [WakeTriggers.porcupineWakeWords];
						}
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
						WakeTriggers.porcupineVersion, wasmFile, WakeTriggers.porcupineWakeWords, keywordsData, WakeTriggers.porcupineSensitivities, WakeTriggers.porcupineAccessKey
					);
					//DONE
					WakeTriggers.engineLoaded = true; 	//TODO: This doesn't mean the 'wasmFile' is in cache yet ... the rest can still timeout!
					SepiaFW.debug.log("WakeTriggers - Picovoice Porcupine engine module setup complete.");
					SepiaFW.debug.log("WakeTriggers - Set wake words: " + JSON.stringify(WakeTriggers.porcupineWakeWords));
					SepiaFW.debug.log("WakeTriggers - Wake word sensitivities: [" + WakeTriggers.porcupineSensitivities.toString() + "]");
					SepiaFW.wakeWordSettings.refreshUi("Engine");
					//start listening?
					if (!skipAutostart){
						setTimeout(function(){
							if (WakeTriggers.useWakeWord){
								SepiaFW.debug.log("WakeTriggers - Starting wake-word listener.");
								WakeTriggers.listenToWakeWords();
							}
						}, customAutostartDelay || 3000);
						if (onFinishCallback) onFinishCallback();	//NOTE: this will trigger BEFORE auto-start
					}else{
						if (onFinishCallback) onFinishCallback();
					}
				}
			});
		}else{
			if (onFinishCallback) onFinishCallback();
		}
	}
	
	WakeTriggers.listenToWakeWords = function(onSuccessCallback, onErrorCallback, doDelayAndCheck, triedToRecreate){
		if (triedToRecreate == undefined) triedToRecreate = 0;
		if (isListening){
			if (onSuccessCallback) onSuccessCallback();		//TODO: use success or error or none?
			return;
		}
		if (doDelayAndCheck){
			if (switchOnWakeWordTimer) clearTimeout(switchOnWakeWordTimer);
			//set delay time depending on device type
			var switchOnWakeWordTimerDelay = 2250;		//wait ~2s before auto-start (previously we checked 'isMobile' to set delay)
			switchOnWakeWordTimer = setTimeout(function(){
				var isAudioStreamActive = SepiaFW.audio.isAnyAudioSourceActive();
				//console.error("Audio playing? " + isAudioStreamActive);		//DEBUG
				if (isAudioStreamActive && !WakeTriggers.allowWakeWordDuringStream){
					return;
				}else if (WakeTriggers.useWakeWord && WakeTriggers.engineLoaded && !WakeTriggers.isListening() && (SepiaFW.animate.assistant.getState() == "idle")){
					//call without delay NOW
					WakeTriggers.listenToWakeWords(onSuccessCallback, onErrorCallback, false, triedToRecreate);
				}
			}, switchOnWakeWordTimerDelay);
		}else{
			//check requirements
			if (!WakeTriggers.engineLoaded || (!WakeTriggers.engineModule && typeof rebuildPreviousSepiaWebAudioModule != "function")){
				var msg = "Engine not loaded (yet?).";
				logInfo('ERROR: ' + msg, true);
				if (onErrorCallback) onErrorCallback({name: "WakeTriggerError", message: msg});
				return;
			}
			if (!WakeTriggers.engineModule){
				//re-build module
				logInfo('RE-BUILDING Wake-Word module...');
				WakeTriggers.engineModule = rebuildPreviousSepiaWebAudioModule();
			}
			if (!SepiaFW.audioRecorder.existsWebAudioRecorder() && triedToRecreate <= 3){
				logInfo('CREATING Wake-Word listener...');
				triedToRecreate++;
				SepiaFW.audioRecorder.createWebAudioRecorder({
					wakeWordModule: WakeTriggers.engineModule,		//NOTE: we could leave this empty to use default (same atm.)
					speechRecognitionModule: false
				}, function(sepiaWebAudioProcessor, info){
					WakeTriggers.listenToWakeWords(onSuccessCallback, onErrorCallback, doDelayAndCheck, triedToRecreate);
				}, function(err){
					//'onProcessorInitError'
					if (onErrorCallback){
						onErrorCallback(err);
					}else{
						logInfo('INIT-ERROR: ' + (err? (err.message || err.name || err.type) : "unknown"), true);
						SepiaFW.debug.error("WakeTriggers - onProcessorInitError", err);
					}
				}, function(err){
					//'onProcessorRuntimeError' (with return false/true to stop recorder on error)
					if (onErrorCallback){
						onErrorCallback(err);
					}
					return true;
				});
				return;
			}
			if (!SepiaFW.audioRecorder.webAudioHasCapability("wakeWordDetection")){
				if (triedToRecreate <= 3){
					SepiaFW.audioRecorder.stopAndReleaseIfActive(function(){
						triedToRecreate++;
						WakeTriggers.listenToWakeWords(onSuccessCallback, onErrorCallback, doDelayAndCheck, triedToRecreate);
					});
					return;
				}else{
					//TODO: release old and make new recorder
					var msg = "Active processor is missing capability 'wakeWordDetection'. Consider manual release + new create.";
					logInfo('ERROR: ' + msg, true);
					if (onErrorCallback) onErrorCallback({name: "WebAudioCapabilityError", message: msg});
					return;
				}
			}
			//START
			SepiaFW.debug.info('Starting wake-word listener ...'); 		//DEBUG
			logInfo('STARTING Wake-Word listener...');
			SepiaFW.audioRecorder.startWebAudioRecorder(function(){
				logInfo('STARTED Wake-Word listener');
				setWakeWordModuleGateState("open");
				isStopping = false;
				isListening = true;
				SepiaFW.animate.wakeWord.active();
				if (onSuccessCallback) onSuccessCallback();
			}, undefined, onErrorCallback);
		}
	}

	WakeTriggers.checkPossibilityToSwitchOnWakeWord = function(source){
		//check and schedule
		if ((SepiaFW.client.isActive() || SepiaFW.client.isDemoMode())
				&& WakeTriggers.useWakeWord && WakeTriggers.engineLoaded 
				&& !WakeTriggers.isListening()){
			//console.log('Wake-word window - source: ' + source); 	//TODO: use?
			WakeTriggers.listenToWakeWords(undefined, undefined, true);
		}
	}
	
	WakeTriggers.stopListeningToWakeWords = function(onSuccessCallback, onErrorCallback, keepInstanceAlive){
		if (switchOnWakeWordTimer) clearTimeout(switchOnWakeWordTimer);
		if (!isListening){
			if (onSuccessCallback) onSuccessCallback();		//TODO: use success or error or none?
			return;
		}
		//STOP
		isStopping = true;
		SepiaFW.debug.info('Stopping wake-word listener ...'); 		//DEBUG
		SepiaFW.audioRecorder.stopWebAudioRecorder(function(){
			logInfo('STOPPED Wake-Word listener');
			setWakeWordModuleGateState("close");
			isStopping = false;
			isListening = false;
			SepiaFW.animate.wakeWord.inactive();
			if (!keepInstanceAlive){
				//release the recorder (usually we recreate anyway)
				SepiaFW.audioRecorder.releaseWebAudioRecorder(function(){
					logInfo('RELEASED Wake-Word listener');
					WakeTriggers.engineModule = undefined;
					if (onSuccessCallback) onSuccessCallback();
				}, undefined, 				//this 'noop' should in theory never happen
				onErrorCallback);
			}else{
				//keep the module instance alive
				setTimeout(function(){
					//give the audio manager some time to react - TODO: do we still need this?
					if (onSuccessCallback) onSuccessCallback();
				}, 150);	//300 ?
			}
		}, undefined, onErrorCallback); 	//NOTE: we ignore the noopCallback atm but listen to 'sepia_web_audio_recorder' events
	}

	WakeTriggers.releaseWakeWordEngine = function(onFinishCallback, noopCallback, onErrorCallback){
		//make sure its stopped
		WakeTriggers.stopListeningToWakeWords(function(){
			//release the recorder
			SepiaFW.audioRecorder.releaseWebAudioRecorder(function(){
				WakeTriggers.engineModule = undefined;
				if (onFinishCallback) onFinishCallback();
			}, function(){
				WakeTriggers.engineModule = undefined;
				if (noopCallback) noopCallback();
			}, onErrorCallback);
		}, onErrorCallback);
	}

	WakeTriggers.unloadEngine = function(onFinishCallback, onErrorCallback){
		if (!WakeTriggers.engineLoaded){
			if (onFinishCallback) onFinishCallback();
			return;
		}
		WakeTriggers.releaseWakeWordEngine(function(){
			finalizeWwRelease();
			if (onFinishCallback) onFinishCallback();
		}, function(){
			//NOOP - TODO: use 'finalizeWwRelease' and 'onFinishCallback' or not?
			finalizeWwRelease();
			if (onFinishCallback) onFinishCallback();
			//NOTE: we use noopCallback atm because 'sepia_web_audio_recorder' events might not be enough!?
		}, onErrorCallback);
	}
	function finalizeWwRelease(){
		WakeTriggers.engineLoaded = false;		//NOTE: only "setup" can restore this via "onActive" event
		//TODO: do a better clean up?
	}

	//listen to global events to make sure state is updated correctly
	document.addEventListener("sepia_web_audio_recorder", wakeTriggersRecoderEventListener);
	function wakeTriggersRecoderEventListener(e){
		var data = e.detail;
		if (!data || !data.event) return;
		if (data.event == "release" && isListening && !isStopping){
			//reset state
			isStopping = false;
			isListening = false;
			SepiaFW.animate.wakeWord.inactive();
			WakeTriggers.engineModule = undefined;

		}else if (data.event == "audioend" && isListening && !isStopping){
			//reset state
			setWakeWordModuleGateState("close");		//TODO: can this cause a race condition if followed quickly by release?
			isStopping = false;
			isListening = false;
			SepiaFW.animate.wakeWord.inactive();
		}
		//TODO: 'initError' event might be relevant here
		if (SepiaFW.wakeWordSettings.isOpen) SepiaFW.wakeWordSettings.onBackgroundEvent(data.event);
	}
	
	WakeTriggers.getWakeWords = function(){
		if (!WakeTriggers.engineLoaded) return [];
		//Porcupine integration
		if (typeof WakeTriggers.porcupineWakeWords == "string"){
			return [WakeTriggers.porcupineWakeWords];
		}else if (WakeTriggers.porcupineWakeWords && !Array.isArray(WakeTriggers.porcupineWakeWords)){
			return Object.keys(WakeTriggers.porcupineWakeWords);
		}else{
			return WakeTriggers.porcupineWakeWords;
		}
	}
	WakeTriggers.getAvailableWakeWords = function(){
		//Porcupine integration
		return WakeTriggers.porcupineAvailableKeywords;
	}
	WakeTriggers.getWakeWordVersion = function(){
		if (!WakeTriggers.engineLoaded) return "";
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
	WakeTriggers.setWakeWordRemoteDownloadUrl = function(newUrl){
		if (newUrl === ""){
			SepiaFW.data.delPermanent('wakeWordRemoteUrl');
		}else{
			SepiaFW.data.setPermanent('wakeWordRemoteUrl', newUrl);
		}
	}
	WakeTriggers.getWakeWordRemoteDownloadUrl = function(){
		//Porcupine integration
		return WakeTriggers.porcupineWasmRemoteUrl;
	}
	WakeTriggers.setWakeWordBufferSize = function(newBufferSize){
		//Porcupine integration
		if (!newBufferSize){
			SepiaFW.data.delPermanent("porcupine-ww-buffer-length");
		}else{
			//TODO: implement when available - for now its disabled
			SepiaFW.debug.error("Wake-word buffer-size not yet supported. Use general input buffer of audio-interface!");
			logInfo('ERROR: custom buffer-size not supported yet. Use audio-interface buffer instead.', true);
			//SepiaFW.data.setPermanent("porcupine-ww-buffer-length", newBufferSize);
		}
	}

	WakeTriggers.setWakeWordAccessKey = function(newKey){
		//Porcupine integration
		if (newKey === ""){
			SepiaFW.data.delPermanent('wakeWordAccessKeyPorcupine');
		}else{
			SepiaFW.data.setPermanent('wakeWordAccessKeyPorcupine', newKey);
		}
	}
	WakeTriggers.getWakeWordAccessKey = function(){
		//Porcupine integration
		return WakeTriggers.porcupineAccessKey;
	}

	//fill sensitivity array as needed
	function sanitizeSensitivities(givenValues, n){
		if (givenValues.length < n){
			var newArray = [];
			for (var i=0; i<n; i++){
				newArray.push(givenValues[i] || givenValues[0]);
			}
			return new Float32Array(newArray);
		}else{
			return new Float32Array(givenValues);
		}
	}
	
	//------ Porcupine Javascript (Picovoice.ai) ------
	
	//some defaults
	var PORCUPINE_FOLDER = "xtensions/picovoice/";
	var PORCUPINE_DEFAULT_VERSION = "1.4";
	
	//-------------------------------------------------

	//start inactive
	SepiaFW.animate.wakeWord.inactive();
	
	return WakeTriggers;
}