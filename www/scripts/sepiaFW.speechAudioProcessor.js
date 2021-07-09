//WEBSOCKET SPEECH RECOGNITION V2
function sepiaFW_build_speech_audio_proc(){
	var SpeechRecognition = {};
	var isSocketAsrAllowed = true; 		//read only (change by hand to disable)
	
	//Parameters and states
	
	SpeechRecognition.isWebSocketAsr = true;	//just a type lable for main speech class
	SpeechRecognition.socketURI = SepiaFW.data.getPermanent('asrServerURI') ||
			SepiaFW.data.get('speech-websocket-uri') || '';		//ASR WebSocket server (2nd value is legacy support)
	SpeechRecognition.serverUser = SepiaFW.data.getPermanent('asrServerUser') || "";
	SpeechRecognition.serverToken = SepiaFW.data.getPermanent('asrServerToken') || "";		//TODO: should this be hidden somehow?
	
	SpeechRecognition.getSocketURI = function(){
		var url = SpeechRecognition.socketURI;
		if (!url){
			var assistAPI = SepiaFW.config.assistAPI;
			if (SepiaFW.tools.endsWith(assistAPI, "/assist/")){
				url = assistAPI.replace(/\/assist\/$/, "/stt");
			}else if (SepiaFW.tools.endsWith(assistAPI, ":20721/")){
				url = assistAPI.replace(/20721\/$/, "20741");
			}else{
				url = "http://localhost:20741";
			}
			SpeechRecognition.socketURI = url;
		}
		return url;
	}
	SpeechRecognition.setSocketURI = function(socketURI){
		SepiaFW.data.setPermanent('asrServerURI', socketURI);
		SpeechRecognition.socketURI = socketURI;
		SpeechRecognition.isAsrSupported = testWebSocketAsrSupport();
		//refresh speech info
		SepiaFW.speech.testAsrSupport();
		//refresh UI
		$('#sepiaFW-menu-stt-socket-url').val(SpeechRecognition.socketURI);
	}

	function testWebSocketAsrSupport(){
		return (SepiaFW.webAudio && SepiaFW.webAudio.isStreamRecorderSupported)  
			&& isSocketAsrAllowed;
	}
	
	SpeechRecognition.isAsrSupported = testWebSocketAsrSupport();

	SpeechRecognition.setServerUser = function(user){
		SepiaFW.data.setPermanent('asrServerUser', user);
		SpeechRecognition.serverUser = user;
	}
	SpeechRecognition.setServerToken = function(token){
		SepiaFW.data.setPermanent('asrServerToken', token);
		SpeechRecognition.serverToken = token;
	}

	//Server settings

	var asrModels = [];
	var selectedAsrModelName;
	var optimizeFinalResult = true;		//TODO: store/restore this setting

	SpeechRecognition.refreshEngineSettings = function(asrEngine, langCode){
		//if (asrEngine == "sepia"){}
		selectedAsrModelName = SepiaFW.data.getPermanent(langCode + "-asr-model") || "";
		SepiaFW.debug.log("ASR (Socket) - Set model: " + ((selectedAsrModelName)? selectedAsrModelName : "undefined"));
	}

	SpeechRecognition.getServerSettings = function(successCallback, errorCallback){
		if (SepiaFW.speech.getAsrEngine() == "sepia"){
			var httpUrl = SpeechRecognition.getSocketURI().replace(/^ws(s|):/, "http$1:").replace(/\/$/, "") + "/settings";
			function success(json){
				if (json && json.settings){
					asrModels = json.settings.models;
					if (successCallback) successCallback(json.settings);
				}else{
					SepiaFW.debug.error("ASR (Socket) - Server info was empty");
					if (successCallback) successCallback({});
				}
			}
			function error(err){
				SepiaFW.debug.error("ASR (Socket) - Failed to load server info.", err);
				if (errorCallback) errorCallback(
					{name: "SttConnectionError", message: ("Failed to load server info. URL: " + httpUrl)}
				);
			}
			$.ajax({
				method: "GET",
				url: httpUrl,
				dataType: "json",
				timeout: 8000,
				success: success,
				error: error
			});
		}else{
			if (errorCallback) errorCallback(
				{name: "NotSupported", message: "'getServerSettings' not yet supported for selected engine."}
			);
		}
	}

	SpeechRecognition.setAsrModel = function(newModel){
		if (!asrModels || !asrModels.length || asrModels.indexOf(newModel) < 0){
			//console.error("MODEL NOT FOUND, setting empty");		//DEBUG
			newModel = "";
		}
		if (SpeechRecognition.isAsrSupported){
			if (SepiaFW.speech.getAsrEngine() == "sepia"){
				//custom model
				selectedAsrModelName = newModel;
				SepiaFW.debug.log("ASR (Socket) - Set model: " + ((newModel)? newModel : "undefined"));
				//store in any case
				SepiaFW.data.setPermanent(SepiaFW.speech.getLanguage() + "-asr-model", newModel);
			}else{
				selectedAsrModelName = "";
				SepiaFW.debug.error("ASR (Socket) - 'setAsrModel' not supported by engine: " + SepiaFW.speech.getAsrEngine());
			}
		}
	}
	SpeechRecognition.getActiveAsrModel = function(){
		return selectedAsrModelName;
	}

	SpeechRecognition.setOptimizeFinalResult = function(val){
		optimizeFinalResult = val;
	}
	SpeechRecognition.getOptimizeFinalResult = function(){
		return optimizeFinalResult;
	}
	
	//--------------------------------

	var Recognizer = {};
	var _asrLogCallback;

	//equivalent to: new webkitSpeechRecognition()
	SpeechRecognition.getRecognizer = function(logCallback){
		//Events: 
		//audiostart (mic on) -> soundstart (first non-null audio data) -> speechstart (client VAD)
		//-> start (transcriber active) -> result (partial)
		//-> speechend (client or server VAD) -> soundend -> audioend -> result (final) -> end

		_asrLogCallback = logCallback || function(msg){
			if (SepiaFW.audioRecorder.debugInterfaces) console.error("STT - LOG -", msg);
		}
		
		//Common WebSpeechAPI settings
		Recognizer.continuous = false;			//NOTE: compared to WebSpeechAPI this usually makes finalResult more agressive/frequent
		Recognizer.interimResults = true;
		Recognizer.lang = SepiaFW.speech.getLongLanguageCode();
		Recognizer.maxAlternatives = 1;

		/*
		Recognizer.onsoundstart = function(){}
		Recognizer.onsoundend = function(){}
		*/

		Recognizer.onaudiostart = undefined;
		Recognizer.onspeechstart = undefined;	//NOTE: this will be a few ms behind actual speech
		Recognizer.onstart = undefined;
		Recognizer.onspeechend = undefined;
		Recognizer.onaudioend = undefined;
		Recognizer.onend = undefined;

		Recognizer.onerror = console.error;
		Recognizer.onresult = undefined;
		Recognizer.onnomatch = undefined;

		Recognizer.start = function(){
			startRecording();
		}
		Recognizer.stop =  function(){
			stopRecording();
		}
		Recognizer.abort =  function(){
			abortRecording();
		}

		return Recognizer;
	}

	//--------------------------------

	SpeechRecognition.recognitionModule;

	var maxRecordingMs = 10000;
	var maxRecordingMsNoVad = 5000;
	var maxVadTime = 10000;
	
	var isWaitingToRecord = false;		//use for..?
	//var recognizerWaitingForResult = false;	//TODO: implement?

	var asrModuleGateIsOpen = false;	//equivalent to: 'isRecording'
	var abortRecognition = false;
	var startedRecordingAt = 0;

	//build SEPIA Web Audio module for custom socket ASR
	function buildWebSocketAsrModule(){
		var hasVad = !!SepiaFW.audioRecorder.getWebAudioRecorderOptions().vadModule;
		var socketAsrModule = SepiaFW.audioRecorder.createSepiaSttSocketModule(function(msg){
			if (!msg) return;
			if (msg.gate){
				//gate closed
				if (msg.gate.isOpen == false && asrModuleGateIsOpen){
					asrModuleGateIsOpen = false;
					//STATE: streamend
					onStreamEnd();
					SepiaFW.audioRecorder.stopIfActive(function(){
						//STATE: audioend
						onAudioEnd();
					});
				//gate opened
				}else if (msg.gate.isOpen == true && !asrModuleGateIsOpen){
					//STATE: streamstart
					onStreamStart();
					asrModuleGateIsOpen = true;
				}
			}
			if (msg.recognitionEvent && !abortRecognition){
				onAsrResult(msg.recognitionEvent);
			}
			//In debug or test-mode the module might send the recording:
			if (msg.output && msg.output.wav){
				SepiaFW.ui.cards.addWaveCardToView(msg.output.wav);
			}
		}, {
			//recorder
			recordBufferLimitMs: hasVad? maxRecordingMs : maxRecordingMsNoVad,
			//server
			socketUrl: SpeechRecognition.getSocketURI(), 	//NOTE: if set to 'debug' it will trigger "dry run" (wav file + pseudo res.)
			clientId: SpeechRecognition.serverUser,
			accessToken: SpeechRecognition.serverToken,
			//ASR model
			language: Recognizer.lang,
			continuous: Recognizer.continuous,
			engineOptions: {	//TODO: add supported for scoped options (e.g. in frames)
				interimResults: Recognizer.interimResults,
				alternatives: Recognizer.maxAlternatives,
				optimizeFinalResult: optimizeFinalResult,
				model: selectedAsrModelName
			}
		});
		return socketAsrModule;
	}
	//open/close wake-word module gate
	function setAsrModuleGateState(state){
		if (!SpeechRecognition.recognitionModule) return;
		SpeechRecognition.recognitionModule.handle.sendToModule({gate: state});
	}

	function onAsrResult(event){
		//EVENTS: result, nomatch, error
		var eventName = event.name || event.type;

		if (eventName == "result"){
			_asrLogCallback('ASR RESULT');
			if (Recognizer.onresult){
				Recognizer.onresult(event);
			}

		}else if (eventName == "nomatch"){
			_asrLogCallback('ASR RESULT NOMATCH');
			if (Recognizer.onnomatch){
				Recognizer.onnomatch({
					//TODO: no event?
				});
			}else if (Recognizer.onerror){
				Recognizer.onerror({
					error: "no-speech",	//if there is no 'nospeech' defined we redirect
					timeStamp: new Date().getTime()
				});
			}

		}else if (eventName == "error"){
			_asrLogCallback('ASR RESULT ERROR');
			if (Recognizer.onerror) Recognizer.onerror({
				error: event.error || "",
				message: event.message || "",
				timeStamp: event.timeStamp || new Date().getTime()
			});
			
		}else{
			//TODO: implement or ignore?
		}
	}

	function onStreamStart(){
		_asrLogCallback('ASR STREAM-START');
		if (Recognizer.onstart){
			Recognizer.onstart({
				//TODO: define event
			});
		}
	}
	function onStreamEnd(ev){
		_asrLogCallback('ASR STREAM-END');
		if (Recognizer.onend){
			Recognizer.onend({
				//TODO: define event
			});
		}
	}

	function onSpeechStart(ev){
		_asrLogCallback('REC SPEECH-START');
		if (Recognizer.onspeechstart){
			Recognizer.onspeechstart({
				//TODO: define event
			});
		}
	}
	function onSpeechEnd(ev){
		if (ev.hitLimit){
			_asrLogCallback('REC SPEECH-END - LIMIT');
		}else{
			_asrLogCallback('REC SPEECH-END');
		}
		if (Recognizer.onspeechend){
			Recognizer.onspeechend({
				//TODO: define event
			});
		}
		stopRecording();
	}

	function onAudioStart(ev){
		_asrLogCallback('REC AUDIO-START - OPENING ASR');
		//new states
		isWaitingToRecord = false;
		startedRecordingAt = new Date().getTime();

		if (Recognizer.onaudiostart){
			Recognizer.onaudiostart({
				timeStamp: startedRecordingAt
			});
		}
	}
	function onAudioEnd(ev){
		_asrLogCallback('REC AUDIO-END');
		if (Recognizer.onaudioend){
			Recognizer.onaudioend({
				//TODO: define event
			});
		}
		if (abortRecognition){
			onAsrErrorAbort("aborted", 
				"E01 - Speech recognition was aborted by client");
			return;
		}
	}

	//handle error
	function onAsrErrorAbort(eventName, msg, sepiaCode){
		_asrLogCallback('ASR ERROR - ABORT');
		//reset states
		isWaitingToRecord = false;
		asrModuleGateIsOpen = false;	//TODO: can we trust this?

		if (Recognizer.onerror){
			Recognizer.onerror({
				error: eventName,
				message: msg,
				sepiaCode: sepiaCode,
				timeStamp: new Date().getTime()
			});
		}
	}
	
	//START	
	function startRecording(){
		//states set 1 - prepare
		isWaitingToRecord = true;
		startedRecordingAt = 0;

		//check requirements
		if (!SpeechRecognition.isAsrSupported){
			onAsrErrorAbort("not-supported", 
				"E00 - Speech recognition not supported by your client :-(");
			return;
		}
		if (SepiaFW.speech.getAsrEngine() == "socket"){
			onAsrErrorAbort("not-supported", 
				"E00 - Sorry, but the legacy 'socket' STT server is not supported anymore by your client. " 
					+ "Please visit the <a href='https://github.com/SEPIA-Framework/sepia-stt-server' target=_blank style='color: inherit;'>SEPIA STT Server</a> " 
					+ "page to learn how to easily convert old models for the new server.");
			return;
		}
		if (!SpeechRecognition.getSocketURI()){
			onAsrErrorAbort("network", 
				"E00 - Speech recognition not activated, please set the STT server for the custom engine first (settings).", 1);
			return;
		}
		/* -- TODO: we skip these for the test phase atm:
		if (!SpeechRecognition.recognitionModule){
			//TODO: what if we killed it on purpose? Automatically recreate?
			SepiaFW.debug.error("ASR (Socket) - Missing recognition module.");
			onAsrErrorAbort("audio-capture", 
				"E02 - There was a problem with the audio-capture interface (missing module)!");
			return;
		}
		if (!SepiaFW.audioRecorder.existsWebAudioRecorder()){
			//TODO: create
			return;
		}
		if (!SepiaFW.audioRecorder.webAudioHasCapability("speechRecognition")){
			//TODO: release old and make new recorder
			SepiaFW.debug.error("ASR (Socket) - Active processor is missing capability 'speechRecognition'.");
			onAsrErrorAbort("audio-capture", 
				"E02 - There was a problem with the audio-capture interface (missing capability)!");
			return;
		}
		*/

		//for now: always stop and release existing recorders
		_asrLogCallback('REC CLEAN-UP');
		SepiaFW.audioRecorder.stopAndReleaseIfActive(function(){
			
			_asrLogCallback('REC CREATE');
			SpeechRecognition.recognitionModule = buildWebSocketAsrModule();

			//states set 2 - start
			abortRecognition = false;
			asrModuleGateIsOpen = false;
			
			SepiaFW.audioRecorder.createWebAudioRecorder({
				vadModule: SepiaFW.audioRecorder.createDefaultVadModule(undefined, function(energy){
					if (energy != undefined){}		//use?
				}, undefined, function(){
					onSpeechStart();
				}, undefined, function(){
					//max speech
					onSpeechEnd({start: vadSequenceStarted, end: vadSequenceEnded, hitLimit: true});
				}, function(vadSequenceStarted, vadSequenceEnded){
					onSpeechEnd({start: vadSequenceStarted, end: vadSequenceEnded, hitLimit: false});
				}, {
					maxSequenceTime: maxVadTime,
					minSequenceTime: 600
				}),
				wakeWordModule: false,								//TODO: allow default ww module?
				speechRecognitionModule: SpeechRecognition.recognitionModule
				//onResamplerMessage: function(msg){}				//NOTE: can be used to check volume
			}, function(audioProcessor, info){
				//on init
				_asrLogCallback('REC READY - STARTING');
				//start
				SepiaFW.audioRecorder.startWebAudioRecorder(function(){
					//STATE: audiostart
					onAudioStart();
					setAsrModuleGateState("open");
				});
			}, function(initErr){
				//on init err.
				SepiaFW.debug.error("ASR (Socket) - Init. error:", initErr);
				onAsrErrorAbort("audio-capture",
					"E03 - Permission to use microphone was denied or there was a problem with the audio interface!");
			
			}, function(runtimeErr){
				//on runtime err.
				SepiaFW.debug.error("ASR (Socket) - Runtime error:", runtimeErr);
				onAsrErrorAbort("audio-capture",
					"E02 - There was a problem with the microphone or audio processing pipeline!");
				return true;
			});
		});
	}

	function stopRecording(){
		//TODO: fix according to spec
		_asrLogCallback('REC STOPPING');
		if (asrModuleGateIsOpen){
			setAsrModuleGateState("close");
			//NOTE: this should trigger stop if gate events still arrive
		}else{
			//AudioRecorder stop
			SepiaFW.audioRecorder.stopIfActive(function(){
				//TODO: and now? just wait for result? what if errorCallback triggers?
				//STATE: audioend
				onAudioEnd();	//trigger or not?
			});
		}
	}

	function abortRecording(){
		//TODO: end all connections, reset states, don't allow old events
		abortRecognition = true;
		stopRecording();
		//NOTE: expected to send END event - should be triggered by stop
	}

	//listen to global events to make sure state is updated correctly
	document.addEventListener("sepia_web_audio_recorder", recoderEventListener);
	function recoderEventListener(e){
		var data = e.detail;
		if (!data || !data.event) return;
		
		//TODO: is this correct?
		if (data.event == "release" && (asrModuleGateIsOpen || isWaitingToRecord)){
			//reset state
			asrModuleGateIsOpen = false;
			isWaitingToRecord = false;
			SpeechRecognition.recognitionModule = undefined;

		}else if (data.event == "audioend" && (asrModuleGateIsOpen || isWaitingToRecord)){
			//reset state
			setAsrModuleGateState("close");
			asrModuleGateIsOpen = false;
			isWaitingToRecord = false;
		}
	}
		
	return SpeechRecognition;
}
