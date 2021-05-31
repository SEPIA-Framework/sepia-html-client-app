//AUDIO RECORDER (requires SEPIA WebAudio Lib)
function sepiaFW_build_audio_recorder(){
	var AudioRecorder = {};
	
	//Parameters and states
	AudioRecorder.isRecording = false;

	//set default parameters for audio recorder
	AudioRecorder.setup = function(successCallback, errorCallback){
		//... ?
	}
	
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

	if (SepiaFW.webAudio.defaultProcessorOptions){
		SepiaFW.webAudio.defaultProcessorOptions.moduleFolder = "audio-modules";
	}
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
		/*if (AudioRecorder.isRecording){
			SepiaFW.debug.err("AudioRecorder error: Tried to capture audio but was already running!");
			errorCallback({name: "AudioRecorder: not started!", message: "Audio capture was already running."});
			return;
		}*/
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
		var vadModule;
		var vadModuleIndex;
		if (options.vadModule){
			//add custom module
			vadModule = options.vadModule;
		}else if (options.addVadModule){
			//TODO: what to do with default VAD module?
			SepiaFW.debug.error("AudioRecorder - Default VAD module not yet implemented. Use custom for now.");
			/*
			vadModule = AudioRecorder.createDefaultVadModule(undefined, undefined, undefined, 
				onSequenceStart, undefined, onMaxVoice, onSequenceComplete, {
					maxSequenceTime: 6000,
					minSequenceTime: 600
			});
			*/
		}
		if (vadModule){
			activeAudioModules.push(vadModule);
			vadModuleIndex = activeAudioModules.length;
			//add VAD to resampler output
			resampler.settings.sendToModules.push(vadModuleIndex);
			activeAudioModuleCapabilities.vad = true;
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
				&& SepiaFW.speechAudioProcessor.recognitionModule){
			//integrated module
			speechRecModule = SepiaFW.speechAudioProcessor.recognitionModule;
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

	AudioRecorder.createSepiaSttSocketModule = function(onMessage, options){
		if (!options) options = {};
		return {
			name: 'stt-socket',
			type: 'worker',
			settings: {
				onmessage: onMessage || function(msg){},
				//onerror: function(err){},
				options: {
					setup: {
						inputSampleRate: options.inputSampleRate || micAudioRecorderOptions.targetSampleRate,
						inputSampleSize: options.inputSampleSize || micAudioRecorderOptions.processorBufferSize,
						lookbackBufferMs: options.lookbackBufferMs,			//default: off, good value e.g. 2000
						recordBufferLimitMs: options.recordBufferLimitMs,	//default: use 5MB limit, good value e.g. 6000
						recordBufferLimitKb: options.recordBufferLimitKb, 	//default: 5MB (overwritten by ms limit), good value e.g. 600
						socketUrl: SepiaFW.speechAudioProcessor.getSocketURI(),		//NOTE: if set to 'debug' it will trigger "dry run" (wav file + pseudo res.)
						returnAudioFile: false,		//NOTE: can be enabled via "dry run" mode
						doDebug: true,				//TODO: set to false when ready
					}
				}
			}
		}
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
		//Note: you can request a WAV via 'module.handle.sendToModule({request: {get: "wave"}});'
	}

	AudioRecorder.createDefaultVadModule = function(voiceActivityCallback, voiceEnergyCallback, 
			onVoiceStart, onSequenceStart, onVoiceFinish, onMaxVoice, onSequenceComplete, options){
		if (!options) options = {};
		return {
			name: 'webrtc-vad-worker',
			type: 'worker',
			settings: {
				onmessage: function(data){
					//console.log("vad", data);
					if (data.voiceActivity != undefined){
						if (voiceActivityCallback) voiceActivityCallback(data.voiceActivity);
					}
					if (data.voiceEnergy != undefined){
						if (voiceEnergyCallback) voiceEnergyCallback(data.voiceEnergy);
					}
					if (data.vadSequenceCode != undefined){
						console.log("VAD sequence event: " + data.vadSequenceMsg);		//DEBUG
						//1: voice start, 2: sequence started, 3: voice finished, 4: voice finished max. time, 5: full sequence complete
						if (data.vadSequenceCode == 1){
							if (onVoiceStart) onVoiceStart();			//NOTE: this will trigger often
						}else if (data.vadSequenceCode == 2){
							if (onSequenceStart) onSequenceStart();
						}else if (data.vadSequenceCode == 3){
							if (onVoiceFinish) onVoiceFinish();			//NOTE: this will trigger often
						}else if (data.vadSequenceCode == 4){
							if (onMaxVoice) onMaxVoice();
						}else if (data.vadSequenceCode == 5){
							if (onSequenceComplete) onSequenceComplete(data.vadSequenceStarted, data.vadSequenceEnded);
						}
					}
				},
				//onerror: function(err){},
				options: {
					setup: {
						inputSampleRate: options.inputSampleRate || micAudioRecorderOptions.targetSampleRate,
						inputSampleSize: options.inputSampleSize || micAudioRecorderOptions.processorBufferSize,
						bufferSize: options.vadBufferSize || (480*2),		//TODO: 480 is the 30ms window for WebRTC VAD 16k, SEPIA VAD needs 512 I think!?
						vadMode: options.vadMode || 3,
						//voiceEnergyCap: 50,
						//voiceEnergyDropRate: 2,
						sequence: {
							//voiceActivationTime: 250,
							//voiceResetTime: 1500,
							silenceActivationTime: 500, //250,
							maxSequenceTime: options.maxSequenceTime || 6000,
							minSequenceTime: options.minSequenceTime || 600,
							//doDebug: false
						}
					}
				}
			}
		}
	}

	return AudioRecorder;
}