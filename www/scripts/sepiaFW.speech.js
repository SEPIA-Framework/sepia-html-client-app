//ASR and TTS
function sepiaFW_build_speech(){
	var Speech = {};
	Speech.Interface = {};
	
	//Parameters and states
	
	//Common
	var speechLanguage = SepiaFW.config.appLanguage;
	var speechCountryCode = "";
	Speech.getLanguage = function(){
		return speechLanguage;
	}
	Speech.setLanguage = function(newLang){
		speechLanguage = newLang;
	}
	Speech.setCountryCode = function(countryCode){
		speechCountryCode = countryCode;
	}
	//it might be necessary to use the long codes
	function getLongLanguageCode(langCodeShort){
		if (langCodeShort.length === 2){
			if (langCodeShort.toLowerCase() === "de"){
				return "de-DE";
			}else{
				return "en-US";
			}
		}
	}
	function getLanguageForASR(){
		if (speechCountryCode){
			return speechCountryCode;
		}else if (speechLanguage === "de"){
			return "de-DE";
		}else{
			return "en-US";
		}
	}
	Speech.getLongLanguageCode = getLongLanguageCode;
	Speech.getLanguageForASR = getLanguageForASR;
		
	//ASR
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
		Speech.isWebSocketAsrSupported = (SepiaFW.speechWebSocket && SepiaFW.speechWebSocket.isAsrSupported);
		Speech.isAsrSupported = (Speech.isWebKitAsrSupported || Speech.isWebSocketAsrSupported);
		SepiaFW.debug.log("ASR: Supported interfaces: webSpeechAPI=" + Speech.isWebKitAsrSupported 
			+ " (cordova=" + hasCordovaSpeechApiSupport + "), webSocketAsr=" + Speech.isWebSocketAsrSupported + ".");
	}
	Speech.testAsrSupport();

	//ASR - engine - currently: native (webSpeechKit or Cordova), socket (SEPIA server or e.g. Microsoft)
	var engines = [];
	var engineNames = {};
	Speech.asrEngine = SepiaFW.data.get('speech-asr-engine') || '';
	Speech.getAsrEngine = function(){
		return Speech.asrEngine;
	}
	Speech.setAsrEngine = function(asrEngine){
		if (asrEngine == 'native'){
			if (!Speech.isWebKitAsrSupported){
				SepiaFW.debug.err("ASR: Tried to set native ASR engine but it is not supported by this client!");
				asrEngine = "";
			}
		}else if (asrEngine == 'socket'){
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
				asrEngine = 'socket';
			}
		}
		if (asrEngine){
			SepiaFW.data.set('speech-asr-engine', asrEngine);
			Speech.asrEngine = asrEngine;
			SepiaFW.debug.log("ASR: Using '" + asrEngine + "' engine.");
		}
	} 
	Speech.setAsrEngine(Speech.asrEngine);

	//get ASR engines - load them and return a select element to show them somewhere
	Speech.getSttEngines = function(){
		var sttSelector = document.getElementById('sepiaFW-menu-select-stt') || document.createElement('select');
		sttSelector.id = 'sepiaFW-menu-select-stt';
		$(sttSelector).find('option').remove();
		engines = [];
		engineNames = {};
		//first option is select
		var headerOption = document.createElement('option');
		headerOption.selected = true;
		headerOption.disabled = true;
		headerOption.innerHTML = "- select -";
		sttSelector.appendChild(headerOption);
		//check others
		if (Speech.isWebKitAsrSupported){
			engines.push("native");
			engineNames["native"] = "Native";
		}
		if (Speech.isWebSocketAsrSupported){
			engines.push("socket");
			engineNames["socket"] = "Custom (WebSocket)";
		}
		engines.forEach(function(engine){
			var option = document.createElement('option');
			option.value = engine;
			option.innerHTML = engineNames[engine];
			sttSelector.appendChild(option);
			if (Speech.asrEngine == engine){
				option.selected = true;
				headerOption.selected = false;
			}
		});
		SepiaFW.debug.info('STT engines available: ' + engines.length);
		//add button listener
		$(sttSelector).off().on('change', function() {
			Speech.setAsrEngine($('#sepiaFW-menu-select-stt').val());
		});
		if (engines.length === 0){
			var option = document.createElement('option');
			option.value = '';
			option.innerHTML = 'not supported';
			sttSelector.appendChild(option);
		}
		return sttSelector;
	}
	
	var recognition = null;
	if (Speech.isWebKitAsrSupported){
		recognition = (SepiaFW.ui.isCordova)? (new SpeechRecognition()) : (new webkitSpeechRecognition());
	}
	var	isRecognizing = false;					
	var recognizerWaitingForResult = false;
	Speech.Interface.isRecognizing = function(is){	isRecognizing = is; } 		//poor workaround to set isRecognizing from e.g. webSocket ASR
	
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
        		SepiaFW.ui.toggleMicButton(useConfirmationSound);
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
	
	//TTS
	var synthID = 0;
	var voiceEngines = [];
	var voiceEngineNames = {};
	var voices = [];
	var selectedVoice = '';
	var selectedVoiceObject;
	var isTssInitialized = false;
	var isSpeaking = false;
	var speechWaitingForResult = false;
	var speechWaitingForStop = false;
	var stopSpeechTimeout;
	Speech.isNativeTtsSupported = (SepiaFW.ui.isCordova)? ('TTS' in window) : ('speechSynthesis' in window);
	Speech.isHtmlTtsSupported = ($('#sepiaFW-audio-speaker').length && $('#sepiaFW-audio-speaker')[0].canPlayType && $('#sepiaFW-audio-speaker')[0].canPlayType("audio/mp3"));
	Speech.isTtsSupported = Speech.isNativeTtsSupported || Speech.isHtmlTtsSupported;
	SepiaFW.debug.log("TTS: Supported interfaces: native=" + Speech.isNativeTtsSupported + ", sepia=" + Speech.isHtmlTtsSupported + ".");
	Speech.voiceEngine = SepiaFW.data.get('speech-voice-engine') || '';
	Speech.skipTTS = false;		//skip TTS but trigger 'success' callback

	//get TTS engines - load them and return a select element to show them somewhere
	Speech.getTtsEngines = function(){
		var ttsSelector = document.getElementById('sepiaFW-menu-select-voice-engine') || document.createElement('select');
		ttsSelector.id = 'sepiaFW-menu-select-voice-engine';
		$(ttsSelector).find('option').remove();
		voiceEngines = [];
		voiceEngineNames = {};
		//first option is select
		var headerOption = document.createElement('option');
		headerOption.selected = true;
		headerOption.disabled = true;
		headerOption.innerHTML = "- select -";
		ttsSelector.appendChild(headerOption);
		//check others
		if (Speech.isNativeTtsSupported){
			voiceEngines.push("native");
			voiceEngineNames["native"] = "Native";
		}
		if (Speech.isHtmlTtsSupported){
			voiceEngines.push("sepia");
			voiceEngineNames["sepia"] = "Custom (Stream)";
		}
		voiceEngines.forEach(function(engine){
			var option = document.createElement('option');
			option.value = engine;
			option.innerHTML = voiceEngineNames[engine];
			ttsSelector.appendChild(option);
			if (Speech.voiceEngine == engine){
				option.selected = true;
				headerOption.selected = false;
			}
		});
		SepiaFW.debug.info('TTS engines available: ' + voiceEngines.length);
		//add button listener
		$(ttsSelector).off().on('change', function() {
			var reloadVoices = true;
			Speech.setVoiceEngine($('#sepiaFW-menu-select-voice-engine').val(), reloadVoices);
		});
		if (voiceEngines.length === 0){
			var option = document.createElement('option');
			option.value = '';
			option.innerHTML = 'not supported';
			ttsSelector.appendChild(option);
		}
		return ttsSelector;
	}
	Speech.getVoiceEngine = function(){
		return Speech.voiceEngine;
	}
	Speech.setVoiceEngine = function(voiceEngine, reloadVoices){
		Speech.useSepiaServerTTS = false;
		if (voiceEngine == 'native'){
			if (!Speech.isNativeTtsSupported){
				SepiaFW.debug.err("TTS: Tried to set 'native' voice engine but it is not supported by this client!");
				voiceEngine = "";
			}
		}else if (voiceEngine == 'sepia'){
			if (!Speech.isHtmlTtsSupported){
				SepiaFW.debug.err("TTS: Tried to set 'SEPIA server' TTS engine but it is not supported by this client!");
				voiceEngine = "";
			}
		}
		if (!voiceEngine){
			//voiceEngine not known or not given, set default
			if (Speech.isNativeTtsSupported){
				voiceEngine = 'native';
			}else if (Speech.isHtmlTtsSupported){
				voiceEngine = 'sepia';
			}
		}
		if (voiceEngine){
			SepiaFW.data.set('speech-voice-engine', voiceEngine);
			Speech.voiceEngine = voiceEngine;
			SepiaFW.debug.log("TTS: Using '" + voiceEngine + "' engine.");
			if (voiceEngine == 'sepia'){
				Speech.useSepiaServerTTS = true;
			}
		}
		if (reloadVoices){
			//clean settings - TODO: keep settings for each engine
			selectedVoice = "";
			selectedVoiceObject = {};
			SepiaFW.local.getSupportedAppLanguages().forEach(function(langObj){
				SepiaFW.data.delPermanent(langObj.value + "-voice");
			});
			//load new
			Speech.getVoices();
		}
	} 
	Speech.setVoiceEngine(Speech.voiceEngine, false);

	Speech.isSpeaking = function(){
		return isSpeaking;
	}
	Speech.isWaitingForSpeech = function(){
		return speechWaitingForResult;
	}

	//BOTH:

	//Input, output or waiting for action?
	Speech.isSpeakingOrListening = function(){
		return (isSpeaking || speechWaitingForResult || isRecognizing || recognizerWaitingForResult || speechWaitingForStop);
	}
	
	//--------broadcast methods----------
	
	//ASR
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
	function broadcastWrongAsrSettings(){
		//EXAMPLE:
		SepiaFW.ui.showInfo(SepiaFW.local.g('asrSettingsProblem'));
	}
	function broadcastNoAsrSupport(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('asrNoSupport');
		var msg = SepiaFW.local.g('noAsrSupport');
		if (!SepiaFW.ui.isSecureContext){
			msg += " " + SepiaFW.local.g('possible_reason_origin_unsecure') 
				+ " - <a href='https://github.com/SEPIA-Framework/sepia-docs/wiki/SSL-for-your-Server' target=_blank style='color: inherit;'>" 
				+ SepiaFW.local.g('help') + "!</a>";
		}
		SepiaFW.ui.showInfo(msg);
	}
	
	//TTS
	function broadcastTtsRequested(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.loading();
		if (SepiaFW.audio){
			SepiaFW.audio.fadeOut();
		}
	}
	function broadcastTtsFinished(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('ttsFinished');
	}
	function broadcastTtsSkipped(){
		//EXAMPLE: 
		//SepiaFW.animate.assistant.idle('ttsSkipped');
	}
	function broadcastTtsStarted(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.speaking();
	}
	function broadcastTtsError(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('ttsError');
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
		if (isSpeaking){
			Speech.stopSpeech();	//note: this is in the client button action aswell, I'll leave it here just in case
		}
		if (isRecognizing){
			Speech.stopRecognition();
		}else{
			Speech.startRecognition(callback_final, callback_interim, error_callback, log_callback);
		}
	}
	//start continous speech recognition - submit callbacks
	//UNDER DEVELOPMENT - this method is not working properly yet
	Speech.toggleContinousRecognition = function (callback_final, callback_interim, error_callback, log_callback){
		if (isRecognizing){
			Speech.stopRecognition();
		}else{
			var quit_on_final_result = false;
			recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result);
		}
	}

	//start speech recognition or do nothing
	Speech.startRecognition = function(callback_final, callback_interim, error_callback, log_callback){
		if (!Speech.isAsrSupported){
			//Error: no ASR service
			broadcastNoAsrSupport();
			broadcastAsrNoResult();
			error_callback("E00 - Speech recognition not supported by your client :-(");
		}
		if (!isRecognizing){
			if (Speech.asrEngine == "native"){
				//WEB SPEECH KIT
				var quit_on_final_result = true;
				recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result);
			
			}else if (Speech.asrEngine == "socket"){
				//WEBSOCKET ASR
				SepiaFW.speechWebSocket.startRecording(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result);
			}
		}
	}
	//stop speech recognition
	Speech.stopRecognition = function(){
		if (Speech.asrEngine == "native"){
			//WEB SPEECH KIT
			broadcastRequestedAsrStop();
			asrAutoStop = false;
			stopSpeechRecognition();
		
		}else if (Speech.asrEngine == "socket"){
			//WEBSOCKET ASR
			SepiaFW.speechWebSocket.stopRecording();
		}
	}
	//abort speech recognition
	Speech.abortRecognition = function(){
		if (Speech.asrEngine == "native"){
			//WEB SPEECH KIT
			abortRecognition = true;
			broadcastRequestedAsrStop();
			asrAutoStop = false;
			stopSpeechRecognition();
		
		}else if (Speech.asrEngine == "socket"){
			//WEBSOCKET ASR
			SepiaFW.speechWebSocket.abortRecording();
		}
	}
	
	//reset all states of speech
	Speech.reset = function(){
		Speech.skipCurrentSmartMicToggle();
		Speech.stopSpeech();
		Speech.stopRecognition();
		isSpeaking = false;
		recognizerWaitingForResult = false;
		isRecognizing = false;
		if (Speech.asrEngine == "native"){
			recognition = (SepiaFW.ui.isCordova)? (new SpeechRecognition()) : (new webkitSpeechRecognition());
		}
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
			return true;
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
				},asrAutoStopDelay);
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
	function recognizeSpeech(callback_final, callback_interim, error_callback, log_callback, quit_on_final_result)
	{
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
		var partialWasTriggered = false;	//sometimes partial result is triggered with empty result (that leads to an error)
		var ignore_onend = false;		//used to ignore callback_final on error
		var restart_anyway = false;		//used to restart 'always-on' after auto-abort and no-speech
		var start_timestamp;
		var wait_timestamp = 0;
		var maxAsrResultWait = 3000;
		var waitTimeout = '';
		
		function resetsOnUnexpectedEnd(){
			ignore_onend = true;
			asrAutoStop = false;
			wait_timestamp = 0;
			clearTimeout(waitTimeout);
			recognition = (SepiaFW.ui.isCordova)? (new SpeechRecognition()) : (new webkitSpeechRecognition());
			//TODO: add more?
		}

		if (!Speech.isAsrSupported){
			//Error: no ASR service
			broadcastNoAsrSupport();
			before_error(error_callback, "E00 - Speech recognition not supported by your client :-( (Chrome usually works well).");
		
		}else{
			if (!recognition) recognition = (SepiaFW.ui.isCordova)? (new SpeechRecognition()) : (new webkitSpeechRecognition());
			recognition.continuous = true;		//we always use this and abort manually if required. "quit_on_final_result" will also influence this.
			
			//workaround till bugfix comes - note: does not work ...
			if (SepiaFW.ui.isAndroid && !SepiaFW.ui.isCordova){
				before_error(error_callback, "E05 - Limited browser support for ASR :-(");
				recognition.interimResults = false;
			}else{
				recognition.interimResults = true;
			}			
			
			//ON START
			recognition.onstart = function(event) {
				eventCorrected = {};
				if ((event && !event.timeStamp) || !event) eventCorrected.timeStamp = new Date().getTime();
				if (eventCorrected.length > 0) event = eventCorrected;
				isRecognizing = true;
				recognizerWaitingForResult = false;
				asrAutoStop = false;
				log_callback('-LOG- REC START');
				broadcastAsrMicOpen();
				start_timestamp = event.timeStamp;
				ignore_onend = false;
				restart_anyway = false;
				final_transcript = '';
				interim_transcript = '';
				partialWasTriggered = false;
			};
			
			//ON MY ABORT
			recognition.onmyabort = function(event) {
				eventCorrected = {};
				if (event && !event.timeStamp) eventCorrected.timeStamp = new Date().getTime();
				if (eventCorrected.length > 0) event = eventCorrected;
				quit_on_final_result = true;
				recognizerWaitingForResult = true;
				wait_timestamp = new Date().getTime();
				broadcastAsrWaitingForResult();
				asrAutoStop = false;
				log_callback('-LOG- ABORT REQUESTED');
				recognition.stop();
			};
			
			//ON ERROR
			recognition.onerror = function(event) {
				//reset recognizer
				resetsOnUnexpectedEnd();

				if (event == undefined){
					//No event likely just means no result due to abort
					SepiaFW.debug.err('ASR: unknown ERROR, no error event data!');
					before_error(error_callback, 'E0? - unknown ERROR, no error event data!');
					return;
				}
				var orgEvent = event;
				eventCorrected = {};
				if (event && !event.timeStamp) eventCorrected.timeStamp = new Date().getTime();
				if (event && !event.error) eventCorrected.error = event;
				if (eventCorrected.length > 0) event = eventCorrected;
				
				//light errors
				if (event.error == 'no-speech' || event.error == 1 || event.error == 2 || event.error == 4 || event.error == 6 || event.error == 7 || event.error == 8) {
					before_error(error_callback, 'E01 - no speech detected!');
					if (!quit_on_final_result){	
						restart_anyway = true;
					}
				}
				//severe errors
				else if (event.error == 'audio-capture' || event.error == 3 || event.error == 5) {
					broadcastWrongAsrSettings();
					before_error(error_callback, 'E02 - no microphone found!');
				}
				else if (event.error == 'not-allowed' || event.error == 9) {
					broadcastWrongAsrSettings();
					if (event.timeStamp - start_timestamp < 100) {
						before_error(error_callback, 'E03 - Permission to use microphone was blocked!'); //<br>To change that plz go to chrome://settings/contentExceptions#media-stream');
					} else {
						before_error(error_callback, 'E03 - Permission to use microphone was denied!'); //<br>To change that plz go to chrome://settings/contentExceptions#media-stream');
					}
				}
				else {
					if (orgEvent && typeof orgEvent == "object"){
						var err = JSON.stringify(orgEvent);
						if (err != '{"type":"error"}'){		//usually happens when you simply abort recording
							SepiaFW.debug.err('ASR: unknown ERROR!');
							console.log(err);
						}
					}else{
						SepiaFW.debug.err('ASR: unknown ERROR!');
					    console.log(orgEvent);
					}
					//TODO: do something here!	
					before_error(error_callback, 'E0? - unknown error!');
					return;
				}
			};
			
			//ON END
			recognition.onend = function() {
				asrAutoStop = false;
				//check for ignore and log error or check for empty result
				if (ignore_onend & !restart_anyway) {
					isRecognizing = false;
					recognizerWaitingForResult = false;
					log_callback('-LOG- REC END. input ignored');		//only an ERROR can lead here that has been broadcasted before so we just LOG and go
					return;
				}
				if (!final_transcript & quit_on_final_result) {			//this will trigger aswell if final result is empty
					//we might need to go in a loop here since onend can fire before final result (e.g. on Android)
					if (interim_transcript || partialWasTriggered){
						recognizerWaitingForResult = true;
						if (!wait_timestamp || wait_timestamp == 0){
							wait_timestamp = new Date().getTime();
						}
						broadcastAsrWaitingForResult();
						if ((new Date().getTime() - wait_timestamp) < maxAsrResultWait){
							clearTimeout(waitTimeout);
							waitTimeout = setTimeout(function(){
								recognition.onend();
							}, 334);
							return;
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
					log_callback('-LOG- REC END. auto-restart for "always-on"');
					recognition.start();
				}else{
					log_callback('-LOG- REC END. sending final result');
					if (!abortRecognition){
						broadcastAsrFinished();
						callback_final(mobileChromeFix(final_transcript));
					}else{
						//broadcastAsrFinished();
						broadcastRequestedAsrStop();
						callback_interim(mobileChromeFix(final_transcript));
					}
				}
			};

			//ON (PARTIAL) RESULT
			recognition.onpartialresult = function(event) {
				var iosPlugin = (typeof event.results == "undefined") ? true : false;
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
			recognition.onresult = function(event) {
				//console.log(event);					//DEBUG
				var iosPlugin = (typeof event.results == "undefined") ? true : false;
				if (iosPlugin && event.message){
					//rebuild as default result
					var item = { transcript:event.message, final:true };
					var resN = [item];
					event = {};
					event.timeStamp = new Date().getTime();
					event.resultIndex = 0;
					event.results = [resN];
				}
				
				eventCorrected = {};
				if (event && !event.timeStamp) eventCorrected.timeStamp = new Date().getTime();
				if (eventCorrected.length > 0) event = eventCorrected;
				
				interim_transcript = '';
				var mod_str = '';
				for (var i = (event.resultIndex || 0); i < event.results.length; ++i) {
					partialWasTriggered = true;
					//console.log('ASR RES: ' + JSON.stringify(event.results[i][0]));			//DEBUG
					if (event.results[i].isFinal || event.results[i][0]['final']) {
						asrAutoStop = false;
						//interim_transcript = '';
						mod_str = event.results[i][0].transcript;

						if (quit_on_final_result){
							final_transcript += mod_str;
							//recognition.onend();
							if (!recognizerWaitingForResult){
								recognizerWaitingForResult = true;
								wait_timestamp = new Date().getTime();
								broadcastAsrWaitingForResult();
								log_callback('-LOG- STOP REQUESTED');
								recognition.stop();
							}
							return;
						}else{
							final_transcript = mod_str;
							broadcastAsrFinished();
							callback_final(mobileChromeFix(final_transcript));
							final_transcript = '';
						}
					} else {
						interim_transcript += event.results[i][0].transcript;
					}
				}
				asrLastInput = new Date().getTime();
				asrAutoStop = true; 		//it CAN be used now ...
				if (quit_on_final_result){
					autoStopASR();			//... but we use it only in this case 
				}
				callback_interim(interim_transcript);
			};
			
			recognition.lang = getLanguageForASR();
			recognition.maxAlternatives = 1;
			recognition.start();
		}
	}
	
	//workarounds ASR:
	
	//remove double-reco text (its a mobile-chrome bug)
	function mobileChromeFix(text){
		if (SepiaFW.ui.isAndroid && (text.length > 0) && (text.length % 2 == 0)){
			var index = (text.length/2);
			var firstHalf = text.substr(0, index);
			var secondHalf = text.substr(index);
			if (firstHalf === secondHalf){
				return firstHalf;
			}
		}
		return text;
	}
	
	// ------------- TTS ---------------

	//Enable/disable TTS - NOTE: will not set menu button to correct state :-(
	Speech.enableVoice = function(skipStore){
		Speech.skipTTS = false;
		if (!skipStore)	SepiaFW.data.set('skipTTS', false);
		SepiaFW.debug.info("TTS is ON");
	}
	Speech.disableVoice = function(skipStore){
		Speech.skipTTS = true;
		if (!skipStore)	SepiaFW.data.set('skipTTS', true);
		SepiaFW.debug.info("TTS is OFF");
	}
	
	//get voices - load them and return a select element to show them somewhere
	Speech.getVoices = function(){
		var voiceSelector = document.getElementById('sepiaFW-menu-select-voice') || document.createElement('select');
		voiceSelector.id = 'sepiaFW-menu-select-voice';
		$(voiceSelector).find('option').remove();
		voices = [];
		//first option is select
		var headerOption = document.createElement('option');
		headerOption.selected = true;
		headerOption.disabled = true;
		headerOption.innerHTML = "- select -";
		voiceSelector.appendChild(headerOption);

		if (Speech.useSepiaServerTTS){
			//SEPIA server
			var option = document.createElement('option');
			option.value = "";
			option.innerHTML = "- automatic -";
			voiceSelector.appendChild(option);
			//TODO: 
			//load from server

		}else if (Speech.isTtsSupported && !SepiaFW.ui.isCordova){
			//Web Speech API
			voices = window.speechSynthesis.getVoices();
			if (voices.length === 0){
				var option = document.createElement('option');
				option.value = '';
				option.innerHTML = '- no voices -';
				voiceSelector.appendChild(option);
			}else{
				var option = document.createElement('option');
					option.value = "";
					option.innerHTML = "- automatic -";
					voiceSelector.appendChild(option);
				voices.forEach(function(voice){
					var option = document.createElement('option');
					option.value = voice.name;
					option.innerHTML = voice.name; //.replace(/(microsoft|google|apple)/ig, '').replace(/(\(.*?\))/g, '').trim();
					voiceSelector.appendChild(option);
				});
			}
			SepiaFW.debug.info('TTS voices available: ' + voices.length);
			//add button listener
			$(voiceSelector).off();
			$(voiceSelector).on('change', function() {
				Speech.setVoice($('#sepiaFW-menu-select-voice').val());
				SepiaFW.debug.info('TTS voice set: ' + selectedVoice);
			});

		}else if (Speech.isTtsSupported && SepiaFW.ui.isCordova){
			//Cordova system voices not yet implemented
			var option = document.createElement('option');
			option.value = '';
			option.innerHTML = '- system -';
			voiceSelector.appendChild(option);
		}

		if (voices.length > 0){
			setVoiceOnce();
		}
		//refresh selector once more?
		$(voiceSelector).val(Speech.getActiveVoice());

		return voiceSelector;
	}
	
	//Chrome loads voices asynchronously so keep an eye on that:
	if (window.speechSynthesis){
		window.speechSynthesis.onvoiceschanged = function(){
			Speech.getVoices();
		};
	}
	
	//set a voice
	Speech.setVoice = function(newVoice){
		if (Speech.isTtsSupported){
			if (SepiaFW.ui.isCordova){
				//TODO: implement
			}else{
				selectedVoice = newVoice;
				if (selectedVoice){
					var selectedVoiceObjectArray = speechSynthesis.getVoices().filter(function(voice){
						return (voice && voice.name && (voice.name === selectedVoice));
					});
					if (selectedVoiceObjectArray.length == 0){
						selectedVoiceObject = {};	
					}else{
						selectedVoiceObject = selectedVoiceObjectArray[0];
					}
				}else{
					selectedVoiceObject = {};
				}
				SepiaFW.debug.log("TTS voice set: " + ((selectedVoiceObject.name)? selectedVoiceObject.name : "undefined"));
				if (!selectedVoice || selectedVoiceObject.name){
					$('#sepiaFW-menu-select-voice').val(selectedVoice);
					SepiaFW.data.setPermanent(Speech.getLanguage() + "-voice", selectedVoice);
				}
			}
		}
	}
	Speech.getActiveVoice = function(){
		return selectedVoice;
	}
	Speech.refreshVoice = function(){
		if (voices && voices.length > 0){
			selectedVoice = undefined;
			setVoiceOnce();
		}
	}
	
	//speak an utterance
	Speech.speak = function(text, finishedCallback, errorCallback, startedCallback){
		
		//stop running stuff
		if (isSpeaking){
			Speech.stopSpeech();
			clearTimeout(stopSpeechTimeout);
			stopSpeechTimeout = setTimeout(function(){
				Speech.speak(text, finishedCallback, errorCallback, startedCallback);
			}, 500);
			return;
		}
		clearTimeout(stopSpeechTimeout);
		
		//some engine settings
		if (Speech.useSepiaServerTTS){
			//load settings by voice
			SepiaFW.audio.tts.setup({		//TODO: update with actual data from server
				voice: selectedVoice
			});		
			//chunk text if there is a limit
			if (SepiaFW.audio.tts.maxChunkLength){
				text = chunkUtterance(text, SepiaFW.audio.tts.maxChunkLength);
			}
		}else{
			//chunk text if there is a limit - TODO: 'isChromeDesktop' is not the entire truth, it depends on the selected voice!
			if (SepiaFW.ui.isChromeDesktop && text && !Speech.skipTTS && Speech.isTtsSupported){
				text = chunkUtterance(text);
			}
		}
		
		//skip but send success
		if (!text || Speech.skipTTS || !Speech.isTtsSupported){
			if (finishedCallback){
				broadcastTtsSkipped();
				finishedCallback();
			}
			return;
		}

		//SEPIA server
		if (Speech.useSepiaServerTTS){
			broadcastTtsRequested();
			speechWaitingForResult = true;
			synthID++;
			SepiaFW.audio.tts.speak(text, function(e){
				//onStart
				var event = {};
				event.msg = e;
				onTtsStart(event, startedCallback, errorCallback);
			}, function(e){
				//onEnd
				var event = {};
				event.msg = e;
				onTtsEnd(event, finishedCallback);
			}, function(reason){
				//onError
				var event = {};
				event.msg = reason;
				onTtsError(event, errorCallback);
			});
		
		//NATIVE-TTS
		}else if (SepiaFW.ui.isCordova){
			broadcastTtsRequested();
			speechWaitingForResult = true;
			synthID++;
			onTtsStart(undefined, startedCallback, errorCallback);
			TTS.speak({
				text: text,
				locale: getLongLanguageCode(Speech.getLanguage()),
				rate: 1.00
				
			}, function () {
				var event = {};
				event.msg = "all good";
				onTtsEnd(event, finishedCallback);
				
			}, function (reason) {
				var event = {};
				event.msg = reason;
				onTtsError(event, errorCallback);
			});
		
		//WEB-SPEECH-API
		}else{
			window.sepia_tts_utterances = []; 		//This is a bug-fix to prevent utterance from getting garbage collected
			var utterance = new SpeechSynthesisUtterance();
			utterance.text = text;
			utterance.lang = getLongLanguageCode(Speech.getLanguage());
			if (selectedVoice) utterance.voice = selectedVoiceObject;
			utterance.pitch = 1.0;  	//accepted values: 0-2 inclusive, default value: 1
			utterance.rate = 1.0; 		//accepted values: 0.1-10 inclusive, default value: 1
			utterance.volume = 1.0; 	//accepted values: 0-1, default value: 1

			//lastUtterance = utterance;
			//window.speechSynthesis.speak(utterance);
			
			utterance.onend = function(event){
				onTtsEnd(event, finishedCallback);
			}
			utterance.onstart = function(event){
				onTtsStart(event, startedCallback, errorCallback);
				//observer synth for Chrome bug?
				if (SepiaFW.ui.isChromeDesktop){
					var thisSynthID = synthID;
					observeTTsOutput(thisSynthID, 200, utterance, errorCallback);
				}
			}
			utterance.onerror = function(event){
				onTtsError(event, errorCallback);
			}
			utterance.onpause = function(event){
				synthID++;
				SepiaFW.debug.info('TTS: pause');
			}
			utterance.onboundary = function(event) {
				SepiaFW.debug.info('TTS: onboundary');
			}
			
			setTimeout(function(){
				broadcastTtsRequested();
				speechWaitingForResult = true;
				window.sepia_tts_utterances.push(utterance); 	//bug-fix see above
				window.speechSynthesis.speak(utterance);
			}, 0);
		}
	}	
	function onTtsStart(event, startedCallback, errorCallback){
		speechWaitingForStop = false;
		speechWaitingForResult = false;
		isSpeaking = true;
		broadcastTtsStarted();
		if (startedCallback){
			startedCallback();
		}
		SepiaFW.debug.info('TTS: started');
	}
	function onTtsEnd(event, finishedCallback){
		speechWaitingForStop = false;
		speechWaitingForResult = false;
		isSpeaking = false;
		broadcastTtsFinished();
		if (finishedCallback){
			finishedCallback();
		}
		SepiaFW.debug.info('TTS: ended');
		synthID++;
	}
	function onTtsError(event, errorCallback){
		synthOnError(event, errorCallback);
	}
	
	//Error method for TTS to be called outside as well
	function synthOnError(event, errorCallback){
		speechWaitingForStop = false;
		speechWaitingForResult = false;
		isSpeaking = false;
		broadcastTtsError();
		if (errorCallback){
			errorCallback(event);
		}
		SepiaFW.debug.err('TTS: '); // + (event)? ((event.error)? event.error : event) : 'unknown error');
		SepiaFW.debug.object(event, 'err');		//SepiaFW.debug.object(event.utterance, 'err');
		synthID++;
	}
	
	//stop speech
	Speech.stopSpeech = function(){
		if (speechWaitingForStop){
			return;
		}
		if (Speech.isTtsSupported && isSpeaking){
			speechWaitingForStop = true;

			//SEPIA server
			if (Speech.useSepiaServerTTS){
				SepiaFW.audio.tts.stop();
				waitForTtsStop(function(){
					return SepiaFW.audio.tts.isSpeaking;
				});
			
			//NATIVE-TTS
			}else if (SepiaFW.ui.isCordova){
				TTS.speak({	text: ''}, function () {
					//TODO: onEnd might be fired twice now ...
					if (isSpeaking){
						onTtsEnd();
					}
				}, function (reason) {
					var event = {};
					event.msg = reason;
					onTtsError(event);
				});

			//WEB-SPEECH-API
			}else{
				window.speechSynthesis.cancel();
				waitForTtsStop(function(){
					return window.speechSynthesis.speaking;
				});
			}
		}
	}	
	function waitForTtsStop(testFun){
		var maxWait = 40;
		var waited = 0;
		var timer = setInterval(function(){
			if (!testFun()){
				if (isSpeaking){
					onTtsEnd();
				}
				clearInterval(timer);
			}else if (waited > maxWait){
				var event = {};
				event.msg = "timeout";
				onTtsError(event);
				clearInterval(timer);
			}
			waited++;
		}, 100);
	}
	
	//workarounds TTS:
	
	//doublecheck if TTS is aborted without error
	function observeTTsOutput(currentSynthID, maxExe, utterance, errorCallback){
		if (currentSynthID != synthID){
			return;
		}
		setTimeout(function(){
			if (maxExe > 0){
				/*if (isSpeaking && !window.speechSynthesis.speaking){
					var evt = {};	evt.error = 'TTS missing onend event';
					synthOnError(evt, errorCallback);
				}else if (window.speechSynthesis.speaking){*/
				if (isSpeaking){
					//console.log(currentSynthID + ": " + window.speechSynthesis.speaking);
					observeTTsOutput(currentSynthID, maxExe-1, utterance, errorCallback);
				}
			}else{
				var evt = {};	evt.error = 'TTS missing onend event';
				synthOnError(evt, errorCallback);
			}
		}, 100);
	}
	
	//speech init. on iOS
	Speech.initTTS = function(){
		if (!isTssInitialized && Speech.isTtsSupported){
			if (SepiaFW.ui.isCordova){
				//TTS.speak('');		//TODO: do we need it?
				isTssInitialized = true;
			}else if ('speechSynthesis' in window){
				window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));	//silent activation
				isTssInitialized = true;
			}else{
				isTssInitialized = true;	//we just assume the rest works O_O
			}
		}
	}
	
	//set a preselected voice (e.g. in Edge)
	function setVoiceOnce(){
		//stored?
		var storedVoice = SepiaFW.data.getPermanent(Speech.getLanguage() + "-voice");
		if (storedVoice){
			Speech.setVoice(storedVoice);

		//some defaults
		}else if (!selectedVoice && !Speech.useSepiaServerTTS){
			if (SepiaFW.ui.isEdge){
				if (SepiaFW.config.appLanguage === "de"){
					Speech.setVoice('Microsoft Katja Mobile - German (Germany)');
				}else if(SepiaFW.config.appLanguage === "en"){
					Speech.setVoice('Microsoft Zira Mobile - English (United States)');
				}
			
			}else if (SepiaFW.ui.isChromeDesktop){
				if (SepiaFW.config.appLanguage === "de"){
					Speech.setVoice('Google Deutsch');
				}else if(SepiaFW.config.appLanguage === "en"){
					Speech.setVoice('Google UK English Female');
				}
			}
		}
	}
	
	//chunk text
	function chunkUtterance(text, chunkLength){
		if (chunkLength == undefined) chunkLength = 160;
		if (text.length < chunkLength){
			return text;
		}
        var pattRegex = new RegExp('^[\\s\\S]{' + Math.floor(chunkLength / 2) + ',' + chunkLength + '}[.!?,]{1}|^[\\s\\S]{1,' + chunkLength + '}$|^[\\s\\S]{1,' + chunkLength + '} ');
        var chunkArr = text.match(pattRegex);
        if (chunkArr[0] === undefined || chunkArr[0].length <= 2) {
            return text.substring(0, chunkLength);
        }else{
			return chunkArr[0];
		}
	}
	
	return Speech;
}
