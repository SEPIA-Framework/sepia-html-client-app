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

	function testWebSocketAsrSupport(){
		return (SepiaFW.audioRecorder && SepiaFW.audioRecorder.isStreamRecorderSupported)  
			&& isSocketAsrAllowed;
	}
	
	Speech.isAsrSupported = testWebSocketAsrSupport();
	
	//--------------------------------
	
	var websocket = null;
	var finalTranscript = "";
	var partialTranscript = "";
	var partialPersistentTranscript = ""; 	//same as partialTranscript but only reset on mic activation
	var isRecording = false;
	var isWaitingToRecord = false;
	
	var abortRecognition = false;		//TODO: test implementation
	
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

		//Get audio recorder and start socket transfer - RecorderInstance: RecorderJS (SEPIA version for sockets)
		SepiaFW.audioRecorder.getRecorder(RecorderJS, function(audioRecorder){
			//Start stream to socket
			startWebSocketForMic(audioRecorder);		//note: uses internal global audio-recorder

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
			
			//AudioRecorder stop
			var closeAfterStop = false;
			SepiaFW.audioRecorder.stop(closeAfterStop); 		//TODO: what if errorCallback triggers?
			
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

	function startWebSocketForMic(audioRecorder){
		//stopWebSocket();
		//Speech.stopRecording();
		
		var language = SepiaFW.speech.getLanguageForASR();
		
		//WebSocket URI - TODO: handle parameters variable
		var uri = Speech.socketURI + ('?language=' + language);
				
		websocket = new WebSocket(uri);
		
		websocket.onopen = function(){
			//console.log('ASR WebSocket: onopen'); 											//DEBUG
			finalTranscript = '';
			partialTranscript = '';
			partialPersistentTranscript = '';
			audioRecorder.sendHeader(websocket); 		//NOTE: this is specific for Recorder.js instance

			SepiaFW.audioRecorder.start(function(audioContext, audioRec){
				if (isWaitingToRecord){
					isRecording = true;		SepiaFW.speech.Interface.isRecognizing(true);
					isWaitingToRecord = false;
					audioRecorder.record(websocket);	//NOTE: websocket is specific for Recorder.js instance
					abortRecognition = false;
					broadcastAsrMicOpen();
				}else{
					//TODO: this might go rouge if not properly canceled on fail
				}
			}, function(event){
				SepiaFW.debug.err('ASR WebSocket: onerror ' + ((event && event.error)? event.error : event)); 		//DEBUG
				Speech.abortRecording();
			});
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
