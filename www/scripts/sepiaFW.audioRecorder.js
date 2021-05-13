//AUDIO RECORDER (requires SEPIA WebAudio Lib)
function sepiaFW_build_audio_recorder(){
	var AudioRecorder = {};
	
	//Parameters and states
	AudioRecorder.isRecording = false;
	
	//AudioContext stuff - we support only one
	var recorderAudioContext; 	//Primary AudioContext for recorder
	var recorderAudioSource;	//Primary Source of recorder
	var audioRec;				//Primary Recorder.js instance
	
	//---- broadcasting -----
	
	function broadcastRecorderRequested(){
		//console.log('broadcastRecorderRequested');
	}
	function broadcastRecorderStopRequested(){
		//console.log('broadcastRecorderStopRequested');
	}
	function broadcastRecorderClosed(){
		//console.log('broadcastRecorderClosed');
	}
	function broadcastRecorderStarted(){
		//console.log('broadcastRecorderStarted');
	}
	function broadcastRecorderStopped(){
		//console.log('broadcastRecorderStopped');
	}
	function broadcastRecorderError(e){
		//console.log('broadcastRecorderError');
	}
	
	//------ SEPIA Web Audio Processor ------

	SepiaFW.webAudio.defaultProcessorOptions.moduleFolder = "audio-modules";
	var sepiaWebAudioProcessor;

	var activeAudioModules = [];
	var activeAudioModuleCapabilities = {};		//e.g.: resample, wakeWordDetection, vad, waveEncoding, volume, speechRecognition
	AudioRecorder.webAudioHasCapability = function(testCap){
		return !!activeAudioModuleCapabilities[testCap];
	}
	AudioRecorder.webAudioCapabilities = function(){
		return JSON.parse(JSON.stringify(activeAudioModuleCapabilities));
	}
	var customSepiaWebAudioSource;

	//Mic options (combined 'micAudioConstraintOptions' and 'micAudioRecorderOptions')
	AudioRecorder.setMicrophoneOption = function(key, value, optionType){
		if (optionType == "context"){
			AudioRecorder.setWebAudioConstraint(key, value);
			SepiaFW.debug.log("AudioRecorder - Set mic. constraint '" + key + "' to:", value);
		}else if (optionType == "processor"){
			AudioRecorder.setWebAudioRecorderOption(key, value);
			SepiaFW.debug.log("AudioRecorder - Set audio processor option '" + key + "' to:", value);
		}else if (optionType == "source"){
			AudioRecorder.setWebAudioRecorderOption(key, value);
			SepiaFW.debug.log("AudioRecorder - Set mic. source option '" + key + "' to:", value);
		}else{
			SepiaFW.debug.error("AudioRecorder - Unknown mic. option type: " + optionType);
		}
	}
	//store and restore (used below)
	AudioRecorder.storeMicrophoneSettings = function(){
		SepiaFW.data.setPermanent("microphoneSettings", {
			//constraints
			noiseSuppression: micAudioConstraintOptions.noiseSuppression,
			autoGainControl: micAudioConstraintOptions.autoGainControl,
			echoCancellation: micAudioConstraintOptions.echoCancellation,
			//options
			sourceType: micAudioRecorderOptions.sourceType,
			targetSampleRate: micAudioRecorderOptions.targetSampleRate,
			processorBufferSize: micAudioRecorderOptions.processorBufferSize,
			gain: micAudioRecorderOptions.gain,
			resamplerQuality: micAudioRecorderOptions.resamplerQuality,
			tryNativeResampling: micAudioRecorderOptions.tryNativeResampling
		});
		//NOTE: device label is stored via 'SepiaFW.audio.storeMediaDevicesSetting()'
	}
	AudioRecorder.resetMicrophoneSettings = function(){
		SepiaFW.data.delPermanent("microphoneSettings");	//NOTE: reload client after reset
	}
	var webAudioOptions = SepiaFW.data.getPermanent("microphoneSettings") || {};

	//Constraints set during audio-context load
	var micAudioConstraintOptions = {
		deviceId: "",						//NOTE: this is set via 'Sepia.audio.mediaDevicesSelected'
		//sampleRate: targetSampleRate,		//NOTE: use 'micAudioRecorderOptions.targetSampleRate' instead
		channelCount: 1						//NOTE: this is currently fixed
	};
	//Some constraints that might or might not exist
	if (webAudioOptions.noiseSuppression != undefined) micAudioConstraintOptions.noiseSuppression = webAudioOptions.noiseSuppression;
	if (webAudioOptions.autoGainControl != undefined) micAudioConstraintOptions.autoGainControl = webAudioOptions.autoGainControl;
	if (webAudioOptions.echoCancellation != undefined) micAudioConstraintOptions.echoCancellation = webAudioOptions.echoCancellation;
	//set/get
	AudioRecorder.setWebAudioConstraint = function(optionName, value){
		micAudioConstraintOptions[optionName] = value;
	}
	AudioRecorder.getWebAudioConstraints = function(){
		return JSON.parse(JSON.stringify(micAudioConstraintOptions));
	}

	//options applied to recorder source or modules
	var micAudioRecorderOptions = {
		sourceType: webAudioOptions.sourceType || "audioWorklet",		//"audioWorklet", "scriptProcessor" (legacy SP)
		targetSampleRate: webAudioOptions.targetSampleRate || 16000,
		processorBufferSize: webAudioOptions.processorBufferSize || 512,
		gain: webAudioOptions.gain || 1.0,
		resamplerQuality: webAudioOptions.resamplerQuality || 3,
		tryNativeResampling: (webAudioOptions.tryNativeResampling != undefined)? webAudioOptions.tryNativeResampling : false
	}
	//set/get
	AudioRecorder.setWebAudioRecorderOption = function(optionName, value){
		micAudioRecorderOptions[optionName] = value;
	}
	AudioRecorder.getWebAudioRecorderOptions = function(){
		return JSON.parse(JSON.stringify(micAudioRecorderOptions));
	}

	var useLegacyMicInterface = (typeof window.AudioWorkletNode !== 'function' || !("audioWorklet" in (window.AudioContext || window.webkitAudioContext).prototype));
	if (useLegacyMicInterface) micAudioRecorderOptions.sourceType = "scriptProcessor";
	//var legacyScriptProcessorBufferSize = 512;		//use 'micAudioRecorderOptions.processorBufferSize'

	//event dispatcher
	function dispatchRecorderEvent(data){
		//console.error("WebAudio recorder event", data);		//DEBUG
		document.dispatchEvent(new CustomEvent('sepia_web_audio_recorder', { detail: data}));
	}

	function defaultOnProcessorReady(sepiaWebAudioProcessor, msg){
		SepiaFW.debug.info("AudioRecorder - onProcessorReady", sepiaWebAudioProcessor, msg);	//DEBUG
	}
	function defaultOnProcessorInitError(err){
		SepiaFW.debug.error("AudioRecorder - onProcessorInitError", err);
	}

	AudioRecorder.createWebAudioRecorder = function(options, onProcessorReady, onProcessorInitError, onProcessorRuntimeError){
		if (!onProcessorReady) onProcessorReady = defaultOnProcessorReady;
		if (!onProcessorInitError) onProcessorInitError = defaultOnProcessorInitError;
		if (sepiaWebAudioProcessor){
			onProcessorInitError({name: "ProcessorInitError", message: "SEPIA Web Audio Processor already exists. Release old one before creating new."});
			return;
		}
		if (!options) options = {};
		prepareSepiaWebAudioProcessor(options, onProcessorReady, onProcessorInitError, onProcessorRuntimeError);
	}
	AudioRecorder.existsWebAudioRecorder = function(){
		return !!sepiaWebAudioProcessor;
	}
	AudioRecorder.isWebAudioRecorderReady = function(){
		return (!!sepiaWebAudioProcessor && sepiaWebAudioProcessor.isInitialized());
	}
	AudioRecorder.isWebAudioRecorderActive = function(){
		return (!!sepiaWebAudioProcessor && sepiaWebAudioProcessor.isInitialized() && sepiaWebAudioProcessor.isProcessing());
	}
	AudioRecorder.startWebAudioRecorder = function(successCallback, noopCallback, errorCallback){
		if (sepiaWebAudioProcessor){
			sepiaWebAudioProcessor.start(successCallback, noopCallback, errorCallback);
		}else{
			if (errorCallback) errorCallback({name: "ProcessorInitError", message: "SEPIA Web Audio Processor doesn't exist yet."});
		}
	}
	AudioRecorder.stopWebAudioRecorder = function(stopCallback, noopCallback, errorCallback){
		if (sepiaWebAudioProcessor){
			sepiaWebAudioProcessor.stop(stopCallback, noopCallback, errorCallback);
		}else{
			if (noopCallback) noopCallback();
		}
	}
	AudioRecorder.releaseWebAudioRecorder = function(releaseCallback, noopCallback, errorCallback){
		if (sepiaWebAudioProcessor){
			sepiaWebAudioProcessor.release(function(){
				sepiaWebAudioProcessor = undefined;
				if (releaseCallback) releaseCallback();
			}, function(){
				sepiaWebAudioProcessor = undefined;
				if (noopCallback) noopCallback();
			}, function(err){
				sepiaWebAudioProcessor = undefined;
				if (errorCallback) errorCallback(err);
			});
		}else{
			if (noopCallback) noopCallback();
		}
	}
	//stop and release if possible or confirm right away
	AudioRecorder.stopIfActive = function(callback){
		if (AudioRecorder.isWebAudioRecorderActive()){
			AudioRecorder.stopWebAudioRecorder(callback, callback, undefined);
		}else{
			if (callback) callback();
		}
	}
	AudioRecorder.stopAndReleaseIfActive = function(callback){
		AudioRecorder.stopIfActive(function(){
			if (AudioRecorder.isWebAudioRecorderReady()){
				AudioRecorder.releaseWebAudioRecorder(callback, callback, undefined);
			}else{
				sepiaWebAudioProcessor = undefined;
				if (callback) callback();
			}	
		});
	}

	//Build modules and custom-source (if required)
	function prepareSepiaWebAudioProcessor(options, onProcessorReady, onProcessorInitError, onRuntimeError){
		//Collect active modules:
		broadcastRecorderRequested();
		activeAudioModules = [];
		activeAudioModuleCapabilities = {};

		//mic constraints
		Object.keys(micAudioConstraintOptions).forEach(function(key){
			//This is the 'brute-force' method to set microphone constraints ... but they are not yet accessible via options
			SepiaFW.webAudio.overwriteSupportedAudioConstraints[key] = micAudioConstraintOptions[key];
		});
		
		//--- Resampler
		SepiaFW.webAudio.tryNativeStreamResampling = micAudioRecorderOptions.tryNativeResampling;
		var resampler;
		var resamplerQuality = micAudioRecorderOptions.resamplerQuality;
		var resamplerBufferSize = micAudioRecorderOptions.processorBufferSize;
		var resamplerGain = micAudioRecorderOptions.gain;
		function onResamplerMessage(data){
			//console.log("onResamplerMessage", data); 		//DEBUG
			if (options.onResamplerMessage) options.onResamplerMessage(data);
		}
		var useLegacySp = micAudioRecorderOptions.sourceType == "scriptProcessor" || options.forceLegacyMicInterface;
		if (useLegacySp){
			resampler = {
				name: 'speex-resample-worker',
				type: 'worker',
				settings: {
					onmessage: onResamplerMessage,
					sendToModules: [],
					options: {
						setup: {
							targetSampleRate: micAudioRecorderOptions.targetSampleRate,
							inputSampleSize: resamplerBufferSize,
							resampleQuality: resamplerQuality,
							bufferSize: resamplerBufferSize,
							calculateRmsVolume: true,
							gain: resamplerGain,
							doDebug: false
						}
					}
				}
			}
			activeAudioModules.push(resampler);
			activeAudioModuleCapabilities.resample = true;
		}else{
			resampler = {
				name: 'speex-resample-switch',
				settings: {
					onmessage: onResamplerMessage,
					sendToModules: [],
					options: {
						setup: {
							targetSampleRate: micAudioRecorderOptions.targetSampleRate,
							resampleQuality: resamplerQuality,
							bufferSize: resamplerBufferSize,
							passThroughMode: 1,		//0: none, 1: original (float32), 2: 16Bit PCM - NOTE: NOT resampled
							calculateRmsVolume: true,
							gain: resamplerGain,
							doDebug: false
						}
					}
				}
			}
			activeAudioModules.push(resampler);
			activeAudioModuleCapabilities.resample = true;
		}

		//--- VAD module
		if (options.addVadModule){
			//TODO: add default VAD module
		}

		//--- Wake-word detection
		var wakeWordDetector;
		var wakeWordDetectorIndex;
		if (options.wakeWordModule != undefined){
			//add custom module
			wakeWordDetector = options.wakeWordModule;
		}else if (SepiaFW.wakeTriggers.engineModule){
			//integrated module
			wakeWordDetector = SepiaFW.wakeTriggers.engineModule;
		}
		if (wakeWordDetector){
			activeAudioModules.push(wakeWordDetector);
			wakeWordDetectorIndex = activeAudioModules.length;
			//add wwd to resampler output
			resampler.settings.sendToModules.push(wakeWordDetectorIndex);
			activeAudioModuleCapabilities.wakeWordDetection = true;
		}

		//--- SpeechRecognition
		var speechRecModule;
		var speechRecModuleIndex;
		if (options.speechRecognitionModule != undefined){
			//add custom module
			speechRecModule = options.speechRecognitionModule;
		}else if ((SepiaFW.speech.asrEngine == "socket" || SepiaFW.speech.asrEngine == "sepia") 
				&& SepiaFW.speechWebSocket.recognitionModule){
			//integrated module
			speechRecModule = SepiaFW.speechWebSocket.recognitionModule;
		}
		if (speechRecModule){
			activeAudioModules.push(speechRecModule);
			speechRecModuleIndex = activeAudioModules.length;
			//add asr to resampler output
			resampler.settings.sendToModules.push(speechRecModuleIndex);
			activeAudioModuleCapabilities.speechRecognition = true;
		}

		//--- WaveEncoder
		var waveEncoder;
		var waveEncoderIndex;
		if (options.waveEncoderModule != undefined){
			//add custom module
			waveEncoder = options.waveEncoderModule;
		}else if (options.addWaveEncoderModule){
			//add default wave-encoder module
			waveEncoder = AudioRecorder.createDefaultWaveEncoderModule(options.onWaveEncoderMessage);
		}
		if (waveEncoder){
			activeAudioModules.push(waveEncoder);
			waveEncoderIndex = activeAudioModules.length;
			//add encoder to resampler output
			resampler.settings.sendToModules.push(waveEncoderIndex);
			activeAudioModuleCapabilities.waveEncoding = true;
		}

		//--- TODO: add more modules like ASR, etc.

		//Source adjustments
		customSepiaWebAudioSource = undefined;
		var customSourcePromise;
		if (options.fileSourceUrl){
			//file
			customSourcePromise = createFileSource(options.fileSourceUrl);
		}else if (useLegacySp){
			//legacy mic
			customSourcePromise = createLegacyScriptProcessorSource();
		}
		if (customSourcePromise){
			//wait for promise
			customSourcePromise.then(function(customSource){
				customSepiaWebAudioSource = customSource;
				createSepiaWebAudioProcessor(onProcessorReady, onProcessorInitError, onRuntimeError);
			}).catch(function(err){
				onProcessorInitError(err);
				//dispatch global event (this can actually happen in prep. already)
				dispatchRecorderEvent({event: "initError", error: err});
			});
		}else{
			//continue with default
			createSepiaWebAudioProcessor(onProcessorReady, onProcessorInitError, onRuntimeError);
		}
	}
	//Create processor (init. modules etc.)
	function createSepiaWebAudioProcessor(onProcessorReady, onProcessorInitError, onRuntimeError){
		//Create processor
		sepiaWebAudioProcessor = new SepiaFW.webAudio.Processor({
			onaudiostart: function(msg){ dispatchRecorderEvent({ event: "audiostart", data: msg });},
			onaudioend: function(msg){ dispatchRecorderEvent({ event: "audioend", data: msg });},
			onrelease: function(msg){ dispatchRecorderEvent({ event: "release", data: msg });},
			onerror: function(err){ 
				//consequences? stop it not explicitly prevented
				var stopNow = true;
				if (onRuntimeError){
					stopNow = onRuntimeError(err);
				}
				if (stopNow == undefined || stopNow){
					AudioRecorder.stopIfActive();
				}
				dispatchRecorderEvent({ event: "error", error: err });
			},
			debugLog: console.log,			//TODO: keep? replace with SepiaFW.debug.info?
			targetSampleRate: micAudioRecorderOptions.targetSampleRate,		//NOTE: we use native resampling here if possible and allowed
			modules: activeAudioModules,
			destinationNode: undefined,		//defaults to: new "blind" destination (mic) or audioContext.destination (stream)
			startSuspended: true,
			customSourceTest: false,
			customSource: customSepiaWebAudioSource
			
		}, function(msg){
			//Init. ready
			onProcessorReady(sepiaWebAudioProcessor, msg);
			//dispatch global event
			dispatchRecorderEvent({
				event: "ready",
				data: msg
			});
			
		}, function(err){
			//Init. error
			onProcessorInitError(err);
			//dispatch global event (this can actually happen in prep. already)
			dispatchRecorderEvent({
				event: "initError",
				error: err
			});
		});
	}
	function createLegacyScriptProcessorSource(){
		return SepiaFW.webAudio.createLegacyMicrophoneScriptProcessor({
			startSuspended: true,
			targetSampleRate: micAudioRecorderOptions.targetSampleRate,		//NOTE: we use native resampling here if possible and allowed
			bufferSize: micAudioRecorderOptions.processorBufferSize
		});	//Note: Promise
	}
	function createFileSource(fileUrl){
		return SepiaFW.webAudio.createFileSource(fileUrl, {
			targetSampleRate: micAudioRecorderOptions.targetSampleRate
		});	//Note: Promise
	}

	AudioRecorder.createDefaultWaveEncoderModule = function(onWaveEncoderMessage, options){
		if (!options) options = {};
		return {
			name: 'wave-encoder',
			type: 'worker',
			settings: {
				onmessage: onWaveEncoderMessage || function(msg){},
				//onerror: function(err){},
				options: {
					setup: {
						inputSampleRate: options.inputSampleRate || micAudioRecorderOptions.targetSampleRate,
						inputSampleSize: options.inputSampleSize || micAudioRecorderOptions.processorBufferSize,
						lookbackBufferMs: options.lookbackBufferMs,			//default: off, good value e.g. 2000
						recordBufferLimitMs: options.recordBufferLimitMs,	//default: use 5MB limit, good value e.g. 6000
						recordBufferLimitKb: options.recordBufferLimitKb, 	//default: 5MB (overwritten by ms limit), good value e.g. 600
						doDebug: false	//TODO: set to false when ready
					}
				}
			}
		}
	}

	//---------------------------------------
	
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var isMediaDevicesSupported = undefined;
	var isCordovaAudioinputSupported = undefined;

	function testStreamRecorderSupport(){
		isMediaDevicesSupported = !!AudioContext && (
			(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
			navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
		);
		isCordovaAudioinputSupported = (window.cordova && window.audioinput);
		return !!isMediaDevicesSupported || isCordovaAudioinputSupported;
	}
	
	AudioRecorder.isStreamRecorderSupported = testStreamRecorderSupport(); 		//set once on start
	
	//set default parameters for audio recorder
	AudioRecorder.setup = function(successCallback, errorCallback){
		//... ?
	}
	
	//STOP recorder
	AudioRecorder.stop = function(closeAfterStop, successCallback, errorCallback){
		if (!AudioRecorder.isRecording){
			//clean up?
			//...
			if (closeAfterStop){
				closeAudioContext(recorderAudioContext, successCallback, errorCallback);
			}else{
				if (successCallback) successCallback();
			}
			return;
		}
		broadcastRecorderStopRequested();

		//If the recorder itself has a stop function call it first, e.g. Recorder.js websocket
		if (audioRec && audioRec.stop){
			audioRec.stop();
		}

		//stop audio source and suspend context
		setTimeout(function(){
			//Audioinput plugin
			if (isCordovaAudioinputSupported){
				if (window.audioinput && window.audioinput.isCapturing()){
					window.audioinput.stop();
				}
			
			//MediaDevices interface
			}else if (isMediaDevicesSupported){
				if (recorderAudioSource && (recorderAudioSource.getAudioTracks || recorderAudioSource.stop)){
					if (recorderAudioSource.getAudioTracks){
						recorderAudioSource.getAudioTracks()[0].stop();
					}else{
						recorderAudioSource.stop();
					}
				}
			}
			//We release the audioContext here to be sure
			if (recorderAudioContext){
				setTimeout(function(){
					recorderAudioContext.suspend().then(function() {	//Note: a promise that can fail ...
						//console.log('SUSPENDED audio-context');
						if (closeAfterStop){
							closeAudioContext(recorderAudioContext, successCallback, errorCallback);
						}else{
							if (successCallback) successCallback();
						}
					}).catch(function(e){
						broadcastRecorderError(e);
						if (errorCallback) errorCallback(e);
					});
				},100);
			}else{
				if (successCallback) successCallback();
			}
		}, 100);

		AudioRecorder.isRecording = false;			//TODO: this probably has to wait for callbacks to be safe
		broadcastRecorderStopped();
	}
	function closeAudioContext(audioContext, success, error){
		if (audioContext){
			if (audioContext.state == "closed"){
				if (success) success();
			}else{
				audioContext.close().then(function() {
					//console.log('CLOSED audio-context');
					broadcastRecorderClosed();
					if (success) success();
				}).catch(function(e){
					broadcastRecorderError(e);
					if (error) error(e);
				});
			}
		}else{
			broadcastRecorderClosed();
			if (success) success();
		}
	}
	
	//START recorder
	AudioRecorder.start = function(successCallback, errorCallback){
		if (AudioRecorder.isRecording){
			//clean up?
			//...
			SepiaFW.debug.err("AudioRecorder error: Tried to capture audio but was already running!");
			errorCallback({name: "AudioRecorder: not started!", message: "Audio capture was already running."});
			return;
		}
		broadcastRecorderRequested();
		AudioRecorder.isRecording = true;			//TODO: this probably should be updated in callbacks

		//If the recorder itself has a start function call it first
		if (audioRec && audioRec.start){
			audioRec.start();
		}

		//assign active audioContext
		var activeAudioContext = recorderAudioContext; 		//this should always be the recent one set in getRecorder

		//check audio context state
		if (activeAudioContext && (activeAudioContext.state == 'suspended' || activeAudioContext.state == 'interrupted')) {
			//console.log('AudioContext suspended or interrupted -> resume');				//DEBUG
			activeAudioContext.resume().then(function() {
				broadcastRecorderStarted();
				//we deliver the context and the recorder
				successCallback(activeAudioContext, audioRec);

			}).catch(function(event){
				errorCallback(event);
				broadcastRecorderError(event);
				AudioRecorder.isRecording = false;
			});
		}else{
			//console.log('AudioContext not suspended -> go');								//DEBUG
			broadcastRecorderStarted();
			//we deliver the context and the recorder
			successCallback(activeAudioContext, audioRec);
		}
	}

	// ---------------- Audio Recorder (Recorder.js) ----------------------

	AudioRecorder.getRecorder = function(RecorderInstance, callback, errorCallback){
		//Create a new audio recorder. 
		//NOTE: audioRec is a global variable (inside this scope) because we can't have 2 anyway (I guess..)

		if (!AudioRecorder.isStreamRecorderSupported){
			errorCallback({name: "AudioRecorder: Stream recorder not supported", message: "Cannot create an audio stream recorder!"});
			return;
		}

		//TODO: check if RecorderInstance has changed and if so recreate the whole (context?) thing ... 
		if (audioRec){
			var sameRecorder = (RecorderInstance.name == audioRec.constructor.name);
			//console.log("Same recorder type: " + sameRecorder);	//DEBUG
			if (!sameRecorder){
				var closeAfterStop = true;
				AudioRecorder.stop(closeAfterStop, function(){
					//console.log("Get NEW RECORDER");				//DEBUG
					audioRec = undefined;
					AudioRecorder.getRecorder(RecorderInstance, callback, errorCallback);
				}, errorCallback);
				return;
			}
		}
		
		//Audioinput plugin
		if (isCordovaAudioinputSupported){
			setTimeout(function(){
				audioinputGetStreamRecorder(RecorderInstance, function(audioRec){
					callback(audioRec);
				}, errorCallback);
			}, 100);
		
		//Official MediaDevices interface
		}else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
			navigator.mediaDevices.getUserMedia({ video : false, audio: true }).then(function(stream) {
				getStreamRecorder(RecorderInstance, stream, function(audioRec, streamSource){
					callback(audioRec, streamSource);
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
				getStreamRecorder(RecorderInstance, stream, function(audioRec, streamSource){
					callback(audioRec, streamSource);
				});
			}, function(e){
				errorCallback(err);
			});
		}
	}
	
	// ---------------- MediaDevices interface stuff ----------------------

	function createOrUpdateAudioContext(){
		if (recorderAudioContext){
			//TODO: clean up old context and sources?
			if (recorderAudioContext.state == "closed"){
				recorderAudioContext = new AudioContext();
			}
		}else{
			recorderAudioContext = new AudioContext();
		}
		return recorderAudioContext;
	}
	
	function getStreamRecorder(RecorderInstance, stream, callback){
		if (!RecorderInstance) RecorderInstance = RecorderJS;
		recorderAudioContext = createOrUpdateAudioContext();
		recorderAudioSource = stream;
		var inputPoint = recorderAudioContext.createMediaStreamSource(recorderAudioSource);
		audioRec = new RecorderInstance(inputPoint);
		if (callback) callback(audioRec, inputPoint);
	}

	// ---------------- Audioinput plugin stuff ----------------------

	var audioInputPluginIsSet = false;
	var audioInputPluginHasPermission = false;
	var audioInputPluginErrorCallback = undefined; 		//reset on every call - TODO: lost when 2 errors are queued ...

	//AudioProcessor (replacement for scriptProcessor of AudioContext)
	function AudioInputPluginProcessor(){
		var self = this;
		self.onaudioprocess = function(inputAudioFrame){
			//to be defined by RecorderInstance
		};
		self.onaudioreceive = function(evt){
			self.onaudioprocess(evt.data);
		};
	}
	
	//Init
	function initAudioinputPlugin(){
		if (isCordovaAudioinputSupported){
			window.addEventListener('audioinputerror', onAudioInputError, false);
			audioInputPluginIsSet = true;
		}
	}
	
	//Errors
	function onAudioInputError(error){
		SepiaFW.debug.err("AudioRecorder error (audioinput plugin): " + JSON.stringify(error));
		if (audioInputPluginErrorCallback) audioInputPluginErrorCallback(error);
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
						SepiaFW.debug.log("AudioRecorder (audioinput plugin): User granted access to microphone :-)");
						audioInputPluginHasPermission = true;
						if (successCallback) successCallback();
					}else{
						SepiaFW.debug.err("AudioRecorder error (audioinput plugin): User refused access to microphone :-(");
						audioInputPluginHasPermission = false;
						if (errorCallback) errorCallback({name: "AudioRecorder: permission denied", message: "User refused access to microphone :-("});
					}
				});
			}
		});
	}
	//Get a recorder
	var audioinputGetStreamRecorder = function(RecorderInstance, successCallback, errorCallback){
		if (errorCallback) audioInputPluginErrorCallback = errorCallback;
		else errorCallback = undefined;

		if (!audioInputPluginIsSet){
			initAudioinputPlugin();
			if (!audioInputPluginHasPermission){
				checkAudioinputPermission(function(){
					audioinputGetStreamRecorder(RecorderInstance, successCallback, errorCallback);
				}, onAudioInputError);
				return;
			}
		}
		if (!audioInputPluginHasPermission){
			var errMsg = {name: "AudioRecorder: permission denied", message: "Not allowed to access microphone :-("};
			onAudioInputError(errMsg);
			return;
		}
		try {
			if (!window.audioinput.isCapturing()){
				if (!RecorderInstance) RecorderInstance = RecorderJS;
				//--- build audioinput replacement for audio context ---
				/* ------ OLD ------
				//Reset context?
				recorderAudioContext = createOrUpdateAudioContext();
				//Start with default values and let the plugin handle conversion from raw data to web audio
				if (recorderAudioContext){
					window.audioinput.start({
						streamToWebAudio: true,
						audioContext: recorderAudioContext
					});
				}else{
					window.audioinput.start({ 
						streamToWebAudio: true
					});
					recorderAudioContext = window.audioinput.getAudioContext();
				}
				//Get input for the recorder
				var inputPoint = recorderAudioContext.createGain();
				window.audioinput.connect(inputPoint);
				*/
				var sourceConfig = {
					sampleRate: 16000,
					bufferSize: RecorderInstance.defaultBufferLength || 4096,
					channels: 1,
					format: audioinput.FORMAT.PCM_16BIT,
					audioSourceType: audioinput.AUDIOSOURCE_TYPE.VOICE_COMMUNICATION,	//VOICE_COMMUNICATION UNPROCESSED DEFAULT
					normalize: true,
					streamToWebAudio: false
				};
				var audioProc = new AudioInputPluginProcessor();
				audioRec = new RecorderInstance(sourceConfig, audioProc, function(){
					//start fun (listen to audioinput events)
					window.addEventListener("audioinput", audioProc.onaudioreceive, false);
					window.audioinput.start(sourceConfig);
				}, function(){
					//stop fun
					window.audioinput.stop();
					window.removeEventListener("audioinput", audioProc.onaudioreceive);
				});
				//--- Done! Use audioRecorder to continue
				if (successCallback) successCallback(audioRec);
			}else{
				SepiaFW.debug.err("AudioRecorder error (audioinput plugin): Tried to capture audio but was already running!");
				onAudioInputError({name: "AudioRecorder: not started!", message: "Audio capture was already running."});
			}
		}catch(error){
			SepiaFW.debug.err("AudioRecorder error (audioinput plugin) unknown exception. The following error might be displayed twice.");
			onAudioInputError(error);
		}
	};
	
	// --------------------------------------

	return AudioRecorder;
}