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
	var activeAudioModuleCapabilities = {};		//e.g.: resample, wakeWordDetection, vad, encode, volume
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
			resamplerQuality: micAudioRecorderOptions.resamplerQuality
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
		resamplerQuality: webAudioOptions.resamplerQuality || 3
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

	function defaultOnProcessorReady(sepiaWebAudioProcessor, msg){
		console.log("onProcessorReady", sepiaWebAudioProcessor, msg);
	}
	function defaultOnProcessorInitError(err){
		console.error("onProcessorInitError", err);
	}

	AudioRecorder.createWebAudioRecorder = function(options, onProcessorReady, onProcessorInitError){
		if (!onProcessorReady) onProcessorReady = defaultOnProcessorReady;
		if (!onProcessorInitError) onProcessorInitError = defaultOnProcessorInitError;
		if (sepiaWebAudioProcessor){
			onProcessorInitError({name: "ProcessorInitError", message: "SEPIA Web Audio Processor already exists. Release old one before creating new."});
			return;
		}
		if (!options) options = {};
		prepareSepiaWebAudioProcessor(options, onProcessorReady, onProcessorInitError);
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
	AudioRecorder.startWebAudioRecorder = function(successCallback, errorCallback){
		if (sepiaWebAudioProcessor){
			sepiaWebAudioProcessor.start(successCallback);
		}else{
			if (errorCallback) errorCallback({name: "ProcessorInitError", message: "SEPIA Web Audio Processor doesn't exist yet."});
		}
	}
	AudioRecorder.stopWebAudioRecorder = function(callback){
		if (sepiaWebAudioProcessor){
			sepiaWebAudioProcessor.stop(callback);
		}else{
			if (callback) callback();	//if it doesn't exist its quasi-stopped ;-)
		}
	}
	AudioRecorder.releaseWebAudioRecorder = function(callback){
		if (sepiaWebAudioProcessor){
			sepiaWebAudioProcessor.release(function(){
				sepiaWebAudioProcessor = undefined;
				if (callback) callback();
			});
		}else{
			if (callback) callback();	//if it doesn't exist its quasi-released ;-)
		}
	}
	//stop and release if possible or confirm right away
	AudioRecorder.stopAndReleaseIfActive = function(callback){
		if (AudioRecorder.isWebAudioRecorderActive()){
			AudioRecorder.stopWebAudioRecorder(function(){
				AudioRecorder.releaseWebAudioRecorder(function(){
					if (callback) callback();
				});
			});
		}else if (AudioRecorder.isWebAudioRecorderReady()){
			AudioRecorder.releaseWebAudioRecorder(function(){
				if (callback) callback();
			});
		}else{
			if (callback) callback();
		}
	}

	//Build modules and custom-source (if required)
	function prepareSepiaWebAudioProcessor(options, onProcessorReady, onProcessorInitError){
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
		var resampler;
		var resamplerQuality = micAudioRecorderOptions.resamplerQuality;
		var resamplerBufferSize = micAudioRecorderOptions.processorBufferSize;
		var resamplerGain = micAudioRecorderOptions.gain;
		function onResamplerMessage(data){
			//TODO: implement
			//console.log("onResamplerMessage", data); 		//DEBUG
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
							gain: resamplerGain
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
							gain: resamplerGain
						}
					}
				}
			}
			activeAudioModules.push(resampler);
			activeAudioModuleCapabilities.resample = true;
		}

		//--- Wake-word detection
		var wakeWordDetector;
		var wakeWordDetectorIndex;
		if (SepiaFW.wakeTriggers.engineModule){
			wakeWordDetector = SepiaFW.wakeTriggers.engineModule;
			activeAudioModules.push(wakeWordDetector);
			wakeWordDetectorIndex = activeAudioModules.length;
			//add wwd to resampler output
			resampler.settings.sendToModules.push(wakeWordDetectorIndex);
			activeAudioModuleCapabilities.wakeWordDetection = true;
		}

		//--- TODO: add more modules later like VAD, WaveEncoder, ASR, etc.

		//Source adjustments
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
				createSepiaWebAudioProcessor(onProcessorReady, onProcessorInitError);
			}).catch(function(err){
				onProcessorInitError(err);
			});
		}else{
			//continue with default
			createSepiaWebAudioProcessor(onProcessorReady, onProcessorInitError);
		}
	}
	//Create processor (init. modules etc.)
	function createSepiaWebAudioProcessor(onProcessorReady, onProcessorInitError){
		//Create processor
		sepiaWebAudioProcessor = new SepiaFW.webAudio.Processor({
			onaudiostart: function(msg){ dispatchRecorderEvent({ event: "audiostart", data: msg });},
			onaudioend: function(msg){ dispatchRecorderEvent({ event: "audioend", data: msg });},	//TODO: should e.g. stop WW and stuff
			onrelease: function(msg){ dispatchRecorderEvent({ event: "release", data: msg });},		//TODO: should e.g. stop WW and stuff
			onerror: function(err){ dispatchRecorderEvent({ event: "error", error: msg });},		//TODO: consequences?
			//targetSampleRate: micAudioRecorderOptions.targetSampleRate,
			modules: activeAudioModules,
			destinationNode: undefined,		//defaults to: new "blind" destination (mic) or audioContext.destination (stream)
			startSuspended: true,
			debugLog: console.log,
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
			//dispatch global event (this can actually happen before)
			dispatchRecorderEvent({
				event: "initError",
				error: err
			});
		});
	}
	function dispatchRecorderEvent(data){
		//console.error("WebAudio recorder event", data);		//DEBUG
		document.dispatchEvent(new CustomEvent('sepia_web_audio_recorder', { detail: data}));
	}
	function createLegacyScriptProcessorSource(){
		return SepiaFW.webAudio.createLegacyMicrophoneScriptProcessor({
			targetSampleRate: micAudioRecorderOptions.targetSampleRate,		//NOTE: we use native resampling here if possible
			bufferSize: micAudioRecorderOptions.processorBufferSize
		});	//Note: Promise
	}
	function createFileSource(fileUrl){
		return SepiaFW.webAudio.createFileSource(fileUrl, {
			targetSampleRate: micAudioRecorderOptions.targetSampleRate
		});	//Note: Promise
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