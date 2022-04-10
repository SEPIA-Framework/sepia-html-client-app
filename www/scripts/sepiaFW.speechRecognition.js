//TTS - Part 1 of SepiaFW.speech
function sepiaFW_build_speech_recognition(Speech){
	
	//SETUP
	Speech.testAsrSupport = function(){
		var hasCordovaSpeechApiSupport = SepiaFW.ui.isCordova && ('SpeechRecognition' in window);
		var hasGeneralWebSpeechKitSupport = ('webkitSpeechRecognition' in window);
		//at some point 'webkitSpeechRecognition' will become 'SpeechRecognition'
		if (!hasGeneralWebSpeechKitSupport && !SepiaFW.ui.isCordova && ('SpeechRecognition' in window)){
			window.webkitSpeechRecognition = window.SpeechRecognition;
			hasGeneralWebSpeechKitSupport = true;
			console.error("NOTE: SepiaFW.speech has unexpectedly found 'SpeechRecognition' in this browser. Support might be experimental!");
		}
		Speech.isWebKitAsrSupported = (hasCordovaSpeechApiSupport || hasGeneralWebSpeechKitSupport);			//TODO: this should be renamed to 'webSpeechAsr'
		Speech.isWebSocketAsrSupported = (SepiaFW.speechAudioProcessor && SepiaFW.speechAudioProcessor.isAsrSupported && SepiaFW.speechAudioProcessor.isWebSocketAsr);
		Speech.isAsrSupported = (Speech.isWebKitAsrSupported || Speech.isWebSocketAsrSupported);
		SepiaFW.debug.log("ASR: Supported interfaces: webSpeechAPI=" + Speech.isWebKitAsrSupported 
			+ " (cordova=" + hasCordovaSpeechApiSupport + "), webSocketAsr=" + Speech.isWebSocketAsrSupported + ".");
	}
	Speech.testAsrSupport();

	//ASR - engine - currently: native (webSpeechKit or Cordova), socket (SEPIA legacy server or e.g. Microsoft), sepia (SEPIA v2)
	var engines = [];
	var engineNames = {};
	Speech.asrEngine = SepiaFW.data.getPermanent('asrEngine') || SepiaFW.data.get('speech-asr-engine') || '';	//2nd is legacy support
	Speech.getAsrEngine = function(){
		return Speech.asrEngine;
	}
	Speech.setAsrEngine = function(asrEngine, asrEngineInfo){
		if (recognition) recognition = null;	//make sure this is reloaded later

		if (asrEngine == 'native'){
			if (!Speech.isWebKitAsrSupported){
				SepiaFW.debug.err("ASR: Tried to set native ASR engine but it is not supported by this client!");
				asrEngine = "";
			}
		}else if (asrEngine == 'socket' || asrEngine == 'sepia'){
			if (!Speech.isWebSocketAsrSupported){
				SepiaFW.debug.err("ASR: Tried to set (SEPIA compatible) socket ASR engine but it is not supported by this client!");
				asrEngine = "";
			}
		}
		if (!asrEngine){
			//asrEngine not known or not given, set default
			if (Speech.isWebKitAsrSupported){
				asrEngine = 'native';
			}else if (Speech.isWebSocketAsrSupported){
				asrEngine = 'sepia';	//'socket' (legacy) or 'sepia' ?
			}
		}
		if (asrEngine){
			SepiaFW.data.setPermanent('asrEngine', asrEngine);
			Speech.asrEngine = asrEngine;
			SepiaFW.debug.log("ASR: Using '" + asrEngine + "' engine.");
			//refresh settings
			if (asrEngine != 'native'){
				SepiaFW.speechAudioProcessor.refreshEngineSettings(asrEngine, Speech.getLanguage());
			}
			//overwrite some?
			if (asrEngineInfo){
				if (asrEngineInfo.url) SepiaFW.speechAudioProcessor.setSocketURI(asrEngineInfo.url);
				//TODO: support more parameters (e.g. asr model)
			}
		}
		//refresh UI
		$('#sepiaFW-menu-select-stt').val(asrEngine);
		
		return asrEngine;
	} 
	Speech.setAsrEngine(Speech.asrEngine);

	//get ASR engines - load them and return a select element to show them somewhere
	Speech.getSttEnginesSelector = function(onChange){
		var sttSelector = document.getElementById('sepiaFW-menu-select-stt') || document.createElement('select');
		sttSelector.id = 'sepiaFW-menu-select-stt';
		$(sttSelector).find('option').remove();
		engines = [];
		engineNames = {};
		//first option is select
		var headerOption = document.createElement('option');
		headerOption.selected = true;
		headerOption.disabled = true;
		headerOption.textContent = "- select -";
		sttSelector.appendChild(headerOption);
		//check others
		if (Speech.isWebKitAsrSupported){
			engines.push("native");
			engineNames["native"] = "Native";
		}
		if (Speech.isWebSocketAsrSupported){
			engines.push("sepia");
			engineNames["sepia"] = "SEPIA (Socket v2)";
			engines.push("socket");
			engineNames["socket"] = "Legacy (Socket v1)";
		}
		engines.forEach(function(engine){
			var option = document.createElement('option');
			option.value = engine;
			option.textContent = engineNames[engine];
			sttSelector.appendChild(option);
			if (Speech.asrEngine == engine){
				option.selected = true;
				headerOption.selected = false;
			}
		});
		SepiaFW.debug.info('STT engines available: ' + engines.length);
		//add button listener
		$(sttSelector).off().on('change', function(){
			var selectedEngine = $('#sepiaFW-menu-select-stt').val(); 
			Speech.setAsrEngine(selectedEngine);
			if (onChange) onChange(selectedEngine);
		});
		if (engines.length === 0){
			var option = document.createElement('option');
			option.value = '';
			option.textContent = 'not supported';
			sttSelector.appendChild(option);
		}
		return sttSelector;
	}

	//create recognizer for right engine
	function newRecognizer(event, logFunction){
		//check engine
		if (Speech.asrEngine == "native"){
			//TODO: check event: onprepare, onstart, onreset
			if (SepiaFW.ui.isCordova){
				//CORDOVA PLUGINS (e.g. Android recognizer)
				return new SpeechRecognition();
			}else{
				//WEB SPEECH API
				return new webkitSpeechRecognition();
			}
		}else if (Speech.asrEngine == "sepia" || Speech.asrEngine == "socket"){
			//TODO: check event: onprepare, onstart, onreset
			return SepiaFW.speechAudioProcessor.getRecognizer(logFunction);
		}
	}
	
	var recognition = null;
	//TODO: introduce some "onprepare" event after Speech is fully loaded?
	
	var	isRecognizing = false;					
	var recognizerWaitingForResult = false;
	var showedAsrLimitInfo = false;
	
	Speech.isRecognizing = function(){
		return isRecognizing;
	}
	Speech.isWaitingForResult = function(){
		return recognizerWaitingForResult;
	}
	
	var abortRecognition = false;

	//handle smart-mic auto-toggle - activate mic automatically in certain situations (e.g. after question via voice)
	Speech.useSmartMicToggle = false; 	//note: overwritten by settings
	Speech.toggleSmartMic = function(){
		if (smartMicStartTimer) clearTimeout(smartMicStartTimer);
		//console.log('Microphone smart-trigger: sheduled'); 			//DEBUG
		smartMicStartTimer = setTimeout(function(){
			if (!Speech.isWaitingForSpeech() && !Speech.isSpeaking()
				&& !Speech.isWaitingForResult() && !Speech.isRecognizing()
				&& (SepiaFW.assistant && SepiaFW.assistant.isWaitingForDialog)
			){
				var useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
        		SepiaFW.ui.toggleMicButton(useConfirmationSound, "smart-mic");
			}else{
				//console.log('Microphone smart-trigger: skipped'); 	//DEBUG
			}
		}, Speech.smartMicDelay)
	}
	Speech.skipCurrentSmartMicToggle = function(){
		if (smartMicStartTimer) clearTimeout(smartMicStartTimer);
	}
	Speech.smartMicDelay = 1000;
	var smartMicStartTimer = undefined;
	
	//handle auto-stop ASR
	var asrAutoStop = false; 			//note: it is a state not a setting
	var useCustomAutoStop = true;		//this is the setting
	var asrAutoStopDelay = 3000; 		//this should be platform dependent!
	var asrLastInput = new Date().getTime();
	
	Speech.useCustomAutoStop = function(useIt){
		useCustomAutoStop = useIt;
	}
	Speech.setCustomAutoStopDelay = function(delay){
		asrAutoStopDelay = delay;
	}

	//--------broadcast methods----------
	
	function broadcastRequestedAsrStart(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.loading();
	}
	function broadcastAsrMicOpen(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.listening();
	}
	function broadcastRequestedAsrStop(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.loading();
	}
	function broadcastAsrWaitingForResult(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.loading();
	}
	function broadcastAsrFinished(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('asrFinished');
	}
	function broadcastAsrNoResult(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('asrNoResult');
	}
	function broadcastWrongAsrSettings(isMicPermission){
		//EXAMPLE:
		var msg = SepiaFW.local.g(isMicPermission? 'asrMicProblem' : 'asrSettingsProblem');
		if (!SepiaFW.ui.isSecureContext){
			msg += " " + SepiaFW.local.g('possible_reason_origin_unsecure') 
				+ " - <a href='https://github.com/SEPIA-Framework/sepia-docs/wiki/SSL-for-your-Server' target=_blank style='color: inherit;'>" 
				+ SepiaFW.local.g('help') + "!</a>";
		}
		SepiaFW.ui.showInfo(msg);
		Speech.dispatchSpeechEvent("asr_error", msg);
	}
	function broadcastNoAsrSupport(msg){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('asrNoSupport');
		if (!msg){
			msg = SepiaFW.local.g('noAsrSupport');
			if (!SepiaFW.ui.isSecureContext){
				msg += " " + SepiaFW.local.g('possible_reason_origin_unsecure')
					+ " - <a href='https://github.com/SEPIA-Framework/sepia-docs/wiki/SSL-for-your-Server' target=_blank style='color: inherit;'>" 
					+ SepiaFW.local.g('help') + "!</a>";
			}
		}
		SepiaFW.ui.showInfo(msg);
		Speech.dispatchSpeechEvent("asr_error", msg);
	}

	//TODO: use
	function broadcastMissingServerInfo(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('asrMissingServer');
		SepiaFW.ui.showInfo("ASR - " + SepiaFW.local.g('asrMissingServer'));
		Speech.dispatchSpeechEvent("asr_error", "missing server info");
	}
	function broadcastConnectionError(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('noConnectionToServer');
		SepiaFW.ui.showInfo("ASR - " + SepiaFW.local.g('noConnectionToServer'));
		Speech.dispatchSpeechEvent("asr_error", "no connection to server");
	}

	function broadcastUnknownAsrError(err, additionalInfoMsg){
		var msg = SepiaFW.local.g('asrOtherError') + " Error: '" + (err || "unknown") + "'";
		if (additionalInfoMsg) msg += " - " + additionalInfoMsg;
		SepiaFW.ui.showInfo(msg);
		Speech.dispatchSpeechEvent("asr_error", msg);
	}
		
	//--------- ASR INTERFACE -----------
	//note: use only these methods in the UI

	//setup ASR - not in use 
	/*
	var recognitionMethod;
	Speech.setupRecognition = function(recoMethod){
		recognitionMethod = recoMethod;
	}
	*/

	//start speech recognition for a single sentence - submit callbacks
	Speech.toggleRecognition = function (callback_final, callback_interim, error_callback, log_callback){
		if (SepiaFW.wakeTriggers && SepiaFW.wakeTriggers.isListening()){
			SepiaFW.animate.assistant.loading();
			SepiaFW.wakeTriggers.stopListeningToWakeWords(function(){
				//Use the success-callback here to introduce a proper wait
				Speech.toggleRecognition(callback_final, callback_interim, error_callback, log_callback);
			}, function(e){
				//Error
				if (error_callback) error_callback(e);
			});
			return;
		}
		if (Speech.isSpeaking()){
			Speech.stopSpeech();	//note: this is in the client button action aswell, I'll leave it here just in case
		}
		if (isRecognizing){
			Speech.stopRecognition();
		}else{
			Speech.startRecognition(callback_final, callback_interim, error_callback, log_callback);
		}
	}
	//start continous speech recognition - submit callbacks
	//UNDER CONSTRUCTION - this method is not implemented yet
	Speech.toggleContinousRecognition = function (callback_final, callback_interim, error_callback, log_callback){
		//TODO: TBD
	}

	//start speech recognition or do nothing
	Speech.startRecognition = function(callback_final, callback_interim, error_callback, log_callback){
		if (!Speech.isAsrSupported){
			//Error: no ASR service
			broadcastNoAsrSupport();
			broadcastAsrNoResult();
			error_callback("E00 - Speech recognition not supported by your client :-(");
		}
		var quit_on_final_result = true;
		if (!isRecognizing && !recognizerWaitingForResult){
			//Native should make sure audioRecorder is off (to prevent channel confusion)
			if (Speech.asrEngine == "native" && SepiaFW.audioRecorder.isWebAudioRecorderReady()){
				SepiaFW.audioRecorder.releaseWebAudioRecorder(function(){
					//ALL ENGINES
					recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result);
				}, function(){
					//ALL ENGINES
					recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result);
				}, function(err){
					error_callback('E0? - Unknown recorder ERROR.');
					SepiaFW.debug.error("AudioRecorder failed to release!", err);
				});
			}else{
				//ALL ENGINES
				recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result);
			}
		}
	}
	//stop speech recognition
	Speech.stopRecognition = function(){
		//ALL ENGINES
		broadcastRequestedAsrStop();
		asrAutoStop = false;
		stopSpeechRecognition();
	}
	//abort speech recognition
	Speech.abortRecognition = function(){
		//ALL ENGINES
		abortRecognition = true;
		broadcastRequestedAsrStop();
		asrAutoStop = false;
		stopSpeechRecognition();
	}
	
	//reset all states of speech STT
	Speech.resetRecognition = function(finishCallback, logCallback){
		Speech.skipCurrentSmartMicToggle();
		Speech.stopRecognition();
		recognizerWaitingForResult = false;
		isRecognizing = false;
		if (recognition && recognition.clearWaitTimeoutAndIgnoreEnd){
			recognition.clearWaitTimeoutAndIgnoreEnd();
		}
		SepiaFW.audioRecorder.stopAndReleaseIfActive(function(){
			recognition = newRecognizer("onreset", logCallback);
			SepiaFW.wakeTriggers.checkPossibilityToSwitchOnWakeWord("resetRecognition");
			if (finishCallback) finishCallback();
		});
		//recognition = newRecognizer("onreset");
	}

	//some implementations have there own trigger confirmation sound
	Speech.shouldPlayConfirmation = function(){
		//Android with native ASR
		if (SepiaFW.ui.isAndroid && Speech.asrEngine == "native"){
			return false;
		//iOS is quirky too
		}else if (SepiaFW.ui.isIOS){
			return false;
		//Everything else
		}else{
			if (!SepiaFW.audio.micConfirmSound || SepiaFW.audio.micConfirmSound.indexOf("empty.mp3") >= 0){
				return false;
			}else{
				return true;
			}
		}
	}
	
	//----------helpers-----------

	//auto stopping of speech recognition after a period of no results
	function autoStopASR(){
		if (useCustomAutoStop && asrAutoStop){
			var now = new Date().getTime();
			if ((now - asrLastInput) > asrAutoStopDelay){
				Speech.stopRecognition();
			}else{
				setTimeout(function (){
					autoStopASR();
				}, asrAutoStopDelay);
			}
		}
	}
	
	//stop speech recognition
	function stopSpeechRecognition(){
		if (recognition && recognition.onmyabort){
			recognition.onmyabort();
		}else{
			broadcastAsrNoResult();
		}
	}
	//start speech recognition with callbacks
	function recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result){
		if (!log_callback) log_callback = function(){};
		
		broadcastRequestedAsrStart();
		
		var before_error = function (error_callback, msg){
			broadcastAsrNoResult();
			error_callback(msg);
		}
		
		isRecognizing = false;
		recognizerWaitingForResult = false;
		asrAutoStop = false;
		abortRecognition = false;
		var final_transcript = '';
		var interim_transcript = '';
		var lastResultType = '';
		var partialWasTriggered = false;	//sometimes partial result is triggered with empty result (that leads to an error)
		var resultWasNeverCalled = true;	//on some engines there is no partial result AND onend is called BEFORE onresult
		var onEndWasAlreadyCalled = false;	//	"	"	"
		var onErrorWasAlreadyCalled = false;	//	"	"	"
		var ignore_onend = false;		//used to ignore callback_final on error
		var restart_anyway = false;		//used to restart 'always-on' after auto-abort and no-speech
		var start_timestamp;
		var wait_timestamp = 0;
		var maxAsrResultWait = 5000;
		var waitTimeout = '';

		var onAudioEndSafetyTimer;
		var onAudioEndSafetyTime = 3000;
		
		function resetsOnUnexpectedEnd(){
			ignore_onend = true;
			asrAutoStop = false;
			wait_timestamp = 0;
			clearTimeout(waitTimeout);
			clearTimeout(onAudioEndSafetyTimer);
			log_callback('STT ENGINE RESET');
			recognition = newRecognizer("onreset", log_callback);		//NOTE: after this we cannot get any other events anymore!
		}

		if (!Speech.isAsrSupported){
			//Error: no ASR service
			broadcastNoAsrSupport();
			before_error(error_callback, "E00 - Speech recognition not supported by your client :-(");
		
		}else{
			if (!recognition){
				log_callback('STT ENGINE CREATE');
				recognition = newRecognizer("onstart", log_callback);
			}
			//Default recognition setting:
			recognition.interimResults = true;
			recognition.continuous = false;

			//Client specific optimizations:
			
			//- SEPIA STT server (any client)
			if (Speech.asrEngine == "sepia" || Speech.asrEngine == "socket"){
				//use defaults
				//NOTE: 'continuous = true' can be too agressive for some ASR engines throwing final results more frequently. Anyway it was always just a WebSpeech hack here ^^.

			//- Native STT on Cordova
			}else if (SepiaFW.ui.isCordova){
				//use defaults
				//we trust that the native app can handle it (or will ignore the flags)

			//- Native STT on Chromium desktop (not mobile)
			}else if (SepiaFW.ui.isChromiumDesktop && SepiaFW.ui.isChrome){
				recognition.continuous = true;
				//NOTE: Improves performance in "real" Chrome (untested in others) - try to use this and abort manually, "quit_on_final_result" will handle it
			
			//- Native STT on any Android browser
			}else if (SepiaFW.ui.isAndroid){
				//use default - Note: in the old days 'interimResults' were problematic ... I think its fine now (if it works at all)
				//recognition.interimResults = false;
			}

			//A warning - TODO: Edge is still buggy and Safari crashes a lot when other audio is used as well :-/
			if ((SepiaFW.ui.isEdge || SepiaFW.ui.isSafari) && Speech.asrEngine == "native"){	//add later? !SepiaFW.ui.isCordova
				if (!showedAsrLimitInfo){
					SepiaFW.ui.showInfo("Note: Native speech recognition on this device is still new and not thoroughly tested yet.", false, "", true);
					SepiaFW.debug.log("ASR: Experimental Web Speech API support.");
					showedAsrLimitInfo = true;
				}
			}

			log_callback('STT REC. SETTINGS - interimResults: ' + recognition.interimResults + ", continuous: " + recognition.continuous);
			
			//ON START
			recognition.onstart = function(event){
				if (!event) event = {};
				if (!event.timeStamp) event.timeStamp = new Date().getTime();
				isRecognizing = true;
				recognizerWaitingForResult = false;
				asrAutoStop = false;
				log_callback('STT REC. START');
				broadcastAsrMicOpen();
				start_timestamp = event.timeStamp;
				ignore_onend = false;
				restart_anyway = false;
				final_transcript = '';
				interim_transcript = '';
				lastResultType = '';
				partialWasTriggered = false;
				resultWasNeverCalled = true;
				onEndWasAlreadyCalled = false;
				onErrorWasAlreadyCalled = false;
			};
			//SPEECH START (might not be supported by all engines!)
			recognition.onspeechstart = function(){
				log_callback('STT REC-ONSPEECHSTART');
			}
			//other start events tbd
			/*
			recognition.onaudiostart = function(e){
				console.error("onaudiostart", e); 		//DEBUG
			}
			recognition.onsoundstart = function(){
				console.error("onsoundstart"); 			//DEBUG
			}
			*/
			
			//ON MY ABORT
			recognition.onmyabort = function(event){
				//NOTE: this is a custom method
				if (!event) event = {};
				if (!event.timeStamp) event.timeStamp = new Date().getTime();
				quit_on_final_result = true;
				recognizerWaitingForResult = true;
				wait_timestamp = new Date().getTime();
				broadcastAsrWaitingForResult();
				asrAutoStop = false;
				log_callback('STT REC. ABORT REQUESTED');
				recognition.stop();			//TODO: currently on Edge this will break successive calls of 'recognition.abort'
			};
			recognition.clearWaitTimeoutAndIgnoreEnd = function(){
				//NOTE: this is a custom method
				clearTimeout(waitTimeout);
				ignore_onend = true;
			}
			
			//ON ERROR
			recognition.onerror = function(event){
				log_callback('STT REC-ONERROR');
				//reset recognizer
				resetsOnUnexpectedEnd();	//NOTE: after this we cannot get 'onend' event anymore!
				isRecognizing = false;		//  ... so implementations need to MAKE SURE audio ends
				recognizerWaitingForResult = false;

				onErrorWasAlreadyCalled = true;		//TODO: has this become redundant now?

				if (event == undefined){
					//No event likely just means no result due to abort
					SepiaFW.debug.err('ASR: unknown ERROR, no error event data!');
					var err_msg = 'E0? - Unknown ERROR, no error event data!';
					broadcastUnknownAsrError(err_msg);
					before_error(error_callback, err_msg);
					return;
				}
				if (!event) event = {error: "unknown"};
				else if (typeof event == "string") event = {error: event};
				if (!event.timeStamp) event.timeStamp = new Date().getTime();

				//INFO - Android error codes: https://developer.android.com/reference/android/speech/SpeechRecognizer
				
				//light errors
				if (event.error == 'no-speech' || event.error == 4 || event.error == 6 || event.error == 7 || event.error == 8){
					before_error(error_callback, 'E01 - No speech detected!');
					if (!quit_on_final_result){	
						restart_anyway = true;
					}
				}else if (event.error == 'aborted'){
					before_error(error_callback, 'E01 - Speech input aborted.');
				
				//severe errors
				}else if (event.error == 'audio-capture' || event.error == 3 || event.error == 5){
					broadcastWrongAsrSettings();
					before_error(error_callback, 'E02 - There was a problem with the microphone or audio processing pipeline!');
				
				}else if (event.error == 'not-allowed' || event.error == 9){
					//TODO: this can be an authentication problem as well ... not only microphone permission
					broadcastWrongAsrSettings(true);
					if (event.timeStamp - start_timestamp < 100) {
						before_error(error_callback, 'E03 - Permission to use microphone was blocked!'); //<br>To change that plz go to chrome://settings/contentExceptions#media-stream');
					} else {
						before_error(error_callback, 'E03 - Permission to use microphone was denied!'); //<br>To change that plz go to chrome://settings/contentExceptions#media-stream');
					}

				//connection or connection settings
				}else if (event.error == 'network' || event.error == 1 || event.error == 2){
					if (event.sepiaCode && event.sepiaCode == 1){
						broadcastMissingServerInfo();
						before_error(error_callback, event.message || 'E00 - No server for speech recognition defined!');
					}else{
						broadcastConnectionError();
						before_error(error_callback, event.message || 'E04 - Network problem or connection issues!');
					}
				//something is not supported (e.g. ASR engine or ASR in general)
				}else if (event.error == 'not-supported'){
					broadcastNoAsrSupport(event.message);
					before_error(error_callback, event.message || "E00 - Speech recognition not supported by your client or with the current settings.");
				
				//}else if (event.error == 'not-allowed' || event.error == 'service-not-allowed'){}
				//}else if (event.error == 'language-not-supported'){}
				}else{
					SepiaFW.debug.err('ASR: '+ (event.error? event.error : 'Unknown ERROR!'), event);
					//TODO: do something here!
					var errorMsg = 'E0? - ' + (event.error? event.error : 'Unknown ERROR!');
					var orgMsg = (event.message)? ((event.name || "Info") + ": " + event.message) : "";
					broadcastUnknownAsrError(errorMsg, orgMsg);
					before_error(error_callback, errorMsg);
					return;
				}
			};
			
			//ON END
			/*
			recognition.onnomatch = function(e){	//TODO: if this exists we should redirect to error, maybe "no-speech"
				console.error("onnomatch", e); 		//DEBUG
			}
			recognition.onsoundend = function(){
				console.error("onsoundend"); 		//DEBUG
			}
			recognition.onspeechend = function(){
				console.error("onspeechend"); 		//DEBUG
			}
			*/
			recognition.onaudioend = function(e){
				log_callback('STT REC-ONAUDIOEND');
				//console.error("onaudioend", e); 			//DEBUG
				onAudioEndSafetyTimer = setTimeout(function(){
					if (recognizerWaitingForResult && recognition.onend){
						SepiaFW.debug.error("Speech: Had to force 'onend' event via abort because it did not trigger.");
						log_callback("STT REC. msg: Had to force 'onend' event via abort");
						if (!!recognition.abort) recognition.abort();
						//recognition.onend();
						//recognition.onerror();
					}
				}, onAudioEndSafetyTime);
			}
			recognition.onend = function(e){
				log_callback('STT REC-ONEND');
				//console.error("onend", e); 				//DEBUG - TODO: this will not fire reliably on Edge
				clearTimeout(onAudioEndSafetyTimer);
				onEndWasAlreadyCalled = true;
				asrAutoStop = false;
				//check for ignore and log error or check for empty result
				if (ignore_onend && !restart_anyway) {
					isRecognizing = false;
					recognizerWaitingForResult = false;
					log_callback('STT REC. END - input ignored');		//only an ERROR can lead here that has been broadcasted before so we just LOG and go
					return;
				}
				if (!final_transcript && lastResultType != "final" && quit_on_final_result){	//NOTE: 'lastResultType' prevents trigger for empty final result
					//we might need to go in a loop here since onend can fire before final result (e.g. on Android or SEPIA STT, although it shouldn't for WebSpeechAPI)
					if (interim_transcript || partialWasTriggered || (resultWasNeverCalled && !onErrorWasAlreadyCalled)){
						if (!wait_timestamp || wait_timestamp == 0){
							wait_timestamp = new Date().getTime();
						}
						if (!recognizerWaitingForResult){
							recognizerWaitingForResult = true;
							broadcastAsrWaitingForResult();
						}
						if ((new Date().getTime() - wait_timestamp) < maxAsrResultWait){
							clearTimeout(waitTimeout);
							waitTimeout = setTimeout(function(){
								if (recognition.onend){
									recognition.onend();
								}else{
									SepiaFW.debug.err("ASR: tried to call 'onend' but was already killed");
								}
							}, 334);
							return;
						}else{
							log_callback('STT REC-ONEND TIMEOUT');
							//make sure recognizer is properly stopped
							if (!!recognition.abort) recognition.abort();	//NOTE: not to be confused with 'abortRecognition'
							ignore_onend = true;
							//continue below
						}
					}else{
						resetsOnUnexpectedEnd();
						isRecognizing = false;
						recognizerWaitingForResult = false;
						before_error(error_callback, 'E04 - no final result');
						return;
					}
				}
				clearTimeout(waitTimeout);
				isRecognizing = false;
				recognizerWaitingForResult = false;
				
				//restart for 'always on' or send result
				if (!quit_on_final_result){
					log_callback('STT REC. END - auto-restart for "always-on"');
					recognition.start();
				}else{
					log_callback('STT REC. END - sending final result');
					if (!abortRecognition){
						if (lastResultType == "final" && !final_transcript){	//!onErrorWasAlreadyCalled
							SepiaFW.debug.error("WARNING - ASR result was empty but no error was thrown! Expected: 'nomatch' or 'no-speech'");
						}
						broadcastAsrFinished();
						var final_fixed = postProcessTranscription(final_transcript);
						callback_final(final_fixed);
						Speech.dispatchSpeechEvent("asr_result", final_fixed);
					}else{
						//broadcastAsrFinished();
						broadcastRequestedAsrStop();
						callback_interim(postProcessTranscription(final_transcript));
					}
				}
			};

			//ON (PARTIAL) RESULT
			recognition.onpartialresult = function(event){
				//NOTE: this is a non-standard method
				resultWasNeverCalled = false;
				var iosPlugin = (typeof event.results == "undefined") ? true : false;	//TODO: move or remove
				if (iosPlugin && event.message){
					//rebuild as default result
					var item = { transcript:event.message, final:false };
					var resN = [item];
					event = {};
					event.timeStamp = new Date().getTime();
					event.resultIndex = 0;
					event.results = [resN];
				}
				recognition.onresult(event);
			}
			recognition.onresult = function(event){
				if (!event) event = {};
				resultWasNeverCalled = false;
				var iosPlugin = (typeof event.results == "undefined")? true : false;	//TODO: move or remove
				if (iosPlugin && event.message){
					//rebuild as default result
					var item = {transcript: event.message, final: true};
					var resN = [item];
					event = {};
					event.timeStamp = new Date().getTime();
					event.resultIndex = 0;
					event.results = [resN];
				}
				
				if (!event.timeStamp) event.timeStamp = new Date().getTime();
				
				interim_transcript = '';
				var mod_str = '';
				var n = 0; //(event.resultIndex || 0);	//NOTE: this should probably be 0 always
				var N = event.results.length;		//NOTE: this will probably be required if we have multiple final res.
				//console.log('ASR RES resultIndex: ' + event.resultIndex);			//DEBUG
				for (var i = n; i < N; ++i){
					partialWasTriggered = true;
					//console.log('ASR RES ' + i + ":", event.results[i]);			//DEBUG
					if (event.results[i].isFinal || event.results[i][0]['final']){
						log_callback('STT REC-FINAL');
						lastResultType = 'final';
						asrAutoStop = false;
						mod_str = event.results[i][0].transcript;

						if (quit_on_final_result){
							final_transcript += mod_str;
							//recognition.onend();
							if (!recognizerWaitingForResult){
								recognizerWaitingForResult = true;
								wait_timestamp = new Date().getTime();
								broadcastAsrWaitingForResult();
								log_callback('STT REC. STOP REQUESTED');
								if (recognition.continuous) recognition.stop();
							}
							return;
						}else{
							final_transcript = postProcessTranscription(mod_str);
							broadcastAsrFinished();
							callback_final(final_transcript);
							Speech.dispatchSpeechEvent("asr_result", final_transcript);
							final_transcript = '';
						}
					}else{
						lastResultType = 'partial';
						//var confidence = event.results[i][0].confidence;
						//if (!confidence || confidence > 0.1){
							//take if confidence is undefined or actually is bigger than x
							//..
						//}
						interim_transcript += event.results[i][0].transcript;
					}
				}
				asrLastInput = new Date().getTime();
				asrAutoStop = true; 		//it CAN be used now ...
				if (quit_on_final_result && !onEndWasAlreadyCalled && !onErrorWasAlreadyCalled){
					autoStopASR();			//... but we use it only in this case 
				}
				callback_interim(interim_transcript);
			};
			
			recognition.lang = Speech.getLongLanguageCode();
			recognition.maxAlternatives = 1;
			recognition.start();
		}
	}
	
	//Post-processing:
	
	function postProcessTranscription(text){
		//TODO: anything right now?
		return text;
		/* remove double-reco text (it was a mobile-chrome bug)
		if (SepiaFW.ui.isAndroid && (text.length > 0) && (text.length % 2 == 0)){
			var index = (text.length/2);
			var firstHalf = text.substr(0, index);
			var secondHalf = text.substr(index);
			if (firstHalf === secondHalf){
				return firstHalf;
			}
		}*/
	}
}
