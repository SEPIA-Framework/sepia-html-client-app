//WEBSOCKET SPEECH RECOGNITION
//NOTE: this is experimental and not standardized yet
//Info about Microsoft implementation: https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/websocketprotocol

function sepiaFW_build_speechWebSocket(){
	var Speech = {};
	var isSocketAsrAllowed = true; 		//read only (change by hand to disable)
	
	//Parameters and states
	
	Speech.socketURI = SepiaFW.data.get('speech-websocket-uri') || '';		//add your ASR WebSocket server here
	Speech.setSocketURI = function(socketURI){
		SepiaFW.data.set('speech-websocket-uri', socketURI);
		Speech.socketURI = socketURI;
		Speech.isAsrSupported = testWebSocketAsrSupport();
		//refresh speech info
		SepiaFW.speech.testAsrSupport();
	} 		

	function testStreamRecorderSupport(){
		isMediaDevicesSupported = (window.AudioContext || window.webkitAudioContext)
			&& ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
		isCordovaAudioinputSupported = (window.cordova && window.audioinput);
		return !!isMediaDevicesSupported || isCordovaAudioinputSupported;
	}
	function testWebSocketAsrSupport(){
		return testStreamRecorderSupport() && isSocketAsrAllowed;
	}
	var isMediaDevicesSupported = undefined;
	var isCordovaAudioinputSupported = undefined;
	
	Speech.isAsrSupported = testWebSocketAsrSupport();
	Speech.isStreamRecorderSupported = testStreamRecorderSupport();
	
	//--------------------------------
	
	var websocket = null;
	var finalTranscript = "";
	var partialTranscript = "";
	var partialPersistentTranscript = ""; 	//same as partialTranscript but only reset on mic activation
	var isRecording = false;
	var isWaitingToRecord = false;
	
	var abortRecognition = false;		//TODO: test implementation

	//MediaDevices interface stuff
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = null;
	if (AudioContext && !isCordovaAudioinputSupported) {
		audioContext = new AudioContext();
	}
	var audioSource = null;
	
	//Recorder.js
	var audioRecorder = null;
	
	var callback_final;
	var callback_interim;
	var error_callback;
	var log_callback;
	var quit_on_final_result = true;
	
	//--------broadcast methods----------

	//NOTE: this is a clone of SepiaFW.speech broadcasting ... we should access the originals directly
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
		SepiaFW.ui.showInfo(SepiaFW.local.g('noAsrSupport'));
	}
	function broadcastMissingServerInfo(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('asrMissingServer');
		SepiaFW.ui.showInfo("ASR - " + SepiaFW.local.g('asrMissingServer'));
	}
	function broadcastConnectionError(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('noConnectionToServer');
		SepiaFW.ui.showInfo("ASR - " + SepiaFW.local.g('noConnectionToServer'));
	}
	
	//---------------- INTERFACE ------------------
	
	Speech.startRecording = function(callbackFinal, callbackInterim, errorCallback, logCallback, quitOnFinalResult){
		broadcastRequestedAsrStart();
		isWaitingToRecord = true;
		
		callback_final = callbackFinal || function(){};
		callback_interim = callbackInterim || function(){};
		error_callback = errorCallback || function(){};
		log_callback = logCallback || function(){};
		quit_on_final_result = quitOnFinalResult || true;
		
		if (!Speech.isAsrSupported){
			broadcastNoAsrSupport();
			error_callback("E00 - Speech recognition not supported by your client :-(");
			broadcastAsrNoResult();
		}
		if (!Speech.socketURI){
			broadcastMissingServerInfo();
			error_callback("E00 - Speech recognition not activated, please select an STT server for the 'socket' engine (settings).");
			broadcastAsrNoResult();
		}

		//Get audio recorder and start socket transfer
		Speech.getAudioRecorder(function(audioRecorder){
			//Start stream to socket
			startWebSocketForMic();		//note: we use global audio-recorder (same object)

		}, function(err){
			//Failed
			SepiaFW.debug.err(err.name + ": " + err.message);
			broadcastWrongAsrSettings();
			broadcastAsrNoResult();
			error_callback('E03 - Permission to use microphone was denied or there was a problem with the audio interface!');
		});
	}

	Speech.stopRecording = function(){
		if (isRecording || isWaitingToRecord){
			isRecording = false;	SepiaFW.speech.Interface.isRecognizing(false);
			isWaitingToRecord = false;
			broadcastRequestedAsrStop();
			
			//Audioinput plugin
            if (isCordovaAudioinputSupported){
                setTimeout(function(){
                    audioinputStopCapture();
                }, 100);
            
			//MediaDevices interface
			}else if (isMediaDevicesSupported){
				if (audioSource && (audioSource.getAudioTracks || audioSource.stop)){
					if (audioSource.getAudioTracks){
						audioSource.getAudioTracks()[0].stop();
					}else{
						audioSource.stop();
					}
				}
			}
			
			//Recorder.js
			if (audioRecorder && audioRecorder.stop){
				audioRecorder.stop();
			}
			
			//Stop stream to socket
			stopWebSocket();
			
			if (finalTranscript){
				if (!abortRecognition){
					broadcastAsrFinished();
				}else{
					//all good
				}
			}else if (partialTranscript || partialPersistentTranscript){
				if (!abortRecognition){
					broadcastAsrFinished();
					callback_final(partialPersistentTranscript);
				}else{
					//error_callback('E0? - unknown error!');
					//all good I guess
				}
			}else{
				error_callback('E01 - no speech detected!');
				broadcastAsrNoResult();
			}
		}else{
			broadcastAsrNoResult();
		}
	}
	Speech.abortRecording = function(){
		abortRecognition = true;
		Speech.stopRecording();
	}

	function stopWebSocket(){
		if (websocket){
			websocket.onmessage = function(){};
			websocket.onerror = function(){};
			websocket.onclose = function(){};
			websocket.close();
		}
	}

	// ---------------- Audio Recorder (Recorder.js) ----------------------

	Speech.getAudioRecorder = function(callback, errorCallback){
		//Create a new audio recorder. 
		//NOTE: audioRecorder is a global variable (inside this scope) because we can't have 2 anyway (I guess..)

		if (!Speech.isStreamRecorderSupported){
			errorCallback({name: "ASR: Stream recorder not supported", message: "Cannot create an audio stream recorder!"});
			return;
		}
		
		//Audioinput plugin
		if (isCordovaAudioinputSupported){
            setTimeout(function(){
				audioinputGetStreamRecorder(function(audioRecorder){
					callback(audioRecorder);
				});
            }, 100);
        
		//Official MediaDevices interface
        }else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
			navigator.mediaDevices.getUserMedia({ video : false, audio: true }).then(function(stream) {
				getStreamRecorder(stream, function(audioRecorder){
					callback(audioRecorder);
				});
			}).catch(function(err) {
				errorCallback(err);
			});
		
		//Older version of getUserMedia
		}else{
			var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
			getUserMedia({
				"audio": true,
				"video": false,
			}, function(stream){
				getStreamRecorder(stream, function(audioRecorder){
					callback(audioRecorder);
				});
			}, function(e){
				errorCallback(err);
			});
		}
	}
	
	// ---------------- MediaDevices interface stuff ----------------------
	
	function getStreamRecorder(stream, callback){
		audioSource = stream;
		var inputPoint = audioContext.createGain();
		audioContext.createMediaStreamSource(audioSource).connect(inputPoint);
		audioRecorder = new RecorderJS(inputPoint);
		if (callback) callback(audioRecorder);
	}

	// ---------------- Audioinput plugin stuff ----------------------

    var audioInputPluginIsSet = false;
	var audioInputPluginHasPermission = false;
	//Init
    function initAudioinputPlugin(){
        if (isCordovaAudioinputSupported){
            window.addEventListener('audioinputerror', onAudioInputError, false);
            audioInputPluginIsSet = true;
        }
	}
	//Errors
    function onAudioInputError(error){
		SepiaFW.debug.err("ASR error (audioinput plugin): " + JSON.stringify(error));
        broadcastWrongAsrSettings();
        broadcastAsrNoResult();
        error_callback('E03 - Permission to use microphone was denied or audio-input interface failed!');
    }
	//Check permission
	function checkAudioinputPermission(successCallback, errorCallback){
		//First check whether we already have permission to access the microphone.
		window.audioinput.checkMicrophonePermission(function(hasPermission) {
			if (hasPermission){
				audioInputPluginHasPermission = true;
				if (successCallback) successCallback();
			}else{
				// Ask the user for permission to access the microphone
				window.audioinput.getMicrophonePermission(function(hasPermission, message){
					if (hasPermission) {
						SepiaFW.debug.log("ASR (audioinput plugin): User granted access to microphone :-)");
						audioInputPluginHasPermission = true;
						if (successCallback) successCallback();
					}else{
						SepiaFW.debug.err("ASR error (audioinput plugin): User refused access to microphone :-(");
						audioInputPluginHasPermission = false;
						if (errorCallback) errorCallback({name: "ASR: permission denied", message: "User refused access to microphone :-("});
					}
				});
			}
		});
	}
    //Start
    var audioinputGetStreamRecorder = function(successCallback){
        if (!audioInputPluginIsSet){
            initAudioinputPlugin();
			if (!audioInputPluginHasPermission){
				checkAudioinputPermission(function(){
					audioinputGetStreamRecorder(successCallback);
				}, onAudioInputError);
				return;
			}
        }
		if (!audioInputPluginHasPermission){
			onAudioInputError({name: "ASR: permission denied", message: "Not allowed to access microphone :-("});
			return;
		}
        try {
            if (!audioinput.isCapturing()){
                //Start with default values and let the plugin handle conversion from raw data to web audio
                window.audioinput.start({ streamToWebAudio: true });
				//Get input for the recorder
                var inputPoint = window.audioinput.getAudioContext().createGain();
                window.audioinput.connect(inputPoint);
                audioRecorder = new RecorderJS(inputPoint);
				//Done! User audioRecorder to continue
				if (successCallback) successCallback(audioRecorder);
            }else{
				SepiaFW.debug.err("ASR error (audioinput plugin): Tried to capture audio but was already running!");
				onAudioInputError({name: "ASR: not started!", message: "Audio capture was already running."});
            }
        }catch(error){
            SepiaFW.debug.err("ASR error (audioinput plugin) unknown exception. The following error might be displayed twice.");
			onAudioInputError(error);
        }
    };
    //Stop
    var audioinputStopCapture = function(successCallback){
        if (window.audioinput && window.audioinput.isCapturing()){
			window.audioinput.stop();
			//we release the audioContext here to be sure
			setTimeout(function(){
				//window.audioinput.getAudioContext().close();
				window.audioinput.getAudioContext().suspend();
				if (successCallback) successCallback();
			},100);
        }
    };
    
    // --------------------------------------

	function startWebSocketForMic(){
		//stopWebSocket();
		//Speech.stopRecording();
		
		var language = SepiaFW.speech.getLongLanguageCode(SepiaFW.speech.language);
		
		//WebSocket URI - TODO: handle parameters variable
		var uri = Speech.socketURI + ('?language=' + language);
				
		websocket = new WebSocket(uri);
		
		websocket.onopen = function(){
			//console.log('ASR WebSocket: onopen'); 											//DEBUG
			finalTranscript = '';
			partialTranscript = '';
			partialPersistentTranscript = '';
			audioRecorder.sendHeader(websocket);

			//assign active audioContext
			var activeAudioContext = undefined;
			if (isCordovaAudioinputSupported){
				activeAudioContext = window.audioinput.getAudioContext();
			}else if (isMediaDevicesSupported){
				activeAudioContext = audioContext;
			}

			//check audio context state
			if (activeAudioContext && (activeAudioContext.state == 'suspended' || activeAudioContext.state == 'interrupted')) {
				//console.log('AudioContext suspended or interrupted -> resume');								//DEBUG
				activeAudioContext.resume().then(function() {
					if (isWaitingToRecord){
						isRecording = true;		SepiaFW.speech.Interface.isRecognizing(true);
						isWaitingToRecord = false;
						audioRecorder.record(websocket);
						abortRecognition = false;
						broadcastAsrMicOpen();
					}else{
						//TODO: this might go rouge if not properly canceled on fail
					}
				}).catch(function(event){
					SepiaFW.debug.err('ASR WebSocket: onerror ' + ((event && event.error)? event.error : event)); 		//DEBUG
					Speech.abortRecording();
				});
			}else{
				//console.log('AudioContext not suspended -> go');								//DEBUG
				isRecording = true;		SepiaFW.speech.Interface.isRecognizing(true);
				isWaitingToRecord = false;
				audioRecorder.record(websocket);
				abortRecognition = false;
				broadcastAsrMicOpen();
			}
		};
		
		websocket.onerror = function(event){
			//console.log('ASR WebSocket: onerror ' + ((event && event.error)? event.error : event)); 		//DEBUG
			Speech.stopRecording();
			websocket.close();
			broadcastConnectionError();
		};

		websocket.onmessage = function(event){
			//console.log('ASR WebSocket: onmessage'); 		//DEBUG
			var data = event.data.toString();
			if (data == null || data.length <= 0){
				return;
			
			}else if (data == "Throttled" || data == "Captcha Fail"){
				websocket.onerror(event);
				//reCaptchaSdk.ProcessReCaptchaStateCode(data, 'reCaptcha-Speech2Text-demo');
				return;
			
			}else{
				partialPersistentTranscript = partialTranscript;
				partialTranscript = '';
				//reCaptchaSdk.RemoveReCaptcha();
			}

			var ch = data.charAt(0);
			
			if (ch == 'e') {
				Speech.stopRecording();
			
			}else{
				var message = data.substring(1);
				
				//PARTIAL
				partialTranscript += message;
				callback_interim(partialTranscript);
				
				if (ch == 'f'){
					//FINAL
					if (quit_on_final_result){
						finalTranscript = partialTranscript + " ";
						Speech.stopRecording();
						if (!abortRecognition){
							callback_final(finalTranscript);
						}else{
							callback_interim(finalTranscript);
						}
					}
				}
			}
		};

		websocket.onclose = function(event){
			//console.log('ASR WebSocket: onclose ' + ((event && event.message)? event.message : '')); 		//DEBUG
			Speech.stopRecording();
		};
	}
	
	//--------------------------------
	
	return Speech;
}
