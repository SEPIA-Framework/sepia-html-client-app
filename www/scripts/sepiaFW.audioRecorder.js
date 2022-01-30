//AUDIO RECORDER (requires SEPIA WebAudio Lib)
function sepiaFW_build_audio_recorder(){
	var AudioRecorder = {};

	//Debug modules and interfaces?
	AudioRecorder.debugInterfaces = false;
	AudioRecorder.debuggerLogFunction = undefined;	//set this in your debug script (and remove it later)

	//set default parameters for audio recorder
	AudioRecorder.setup = function(successCallback, errorCallback){
		//... ?
	}
	
	//---- broadcasting -----
	
	//TODO: do we still need these events? (check below: 'dispatchRecorderEvent')
	function broadcastRecorderRequested(){}
	function broadcastRecorderStopRequested(){}
	function broadcastRecorderClosed(){}
	function broadcastRecorderStarted(){}
	function broadcastRecorderStopped(){}
	function broadcastRecorderError(e){
		//console.log('broadcastRecorderError');
	}
	
	//------ SEPIA Web Audio Processor ------

	if (SepiaFW.webAudio.defaultProcessorOptions){
		SepiaFW.webAudio.defaultProcessorOptions.moduleFolder = "audio-modules";
	}
	if (SepiaFW.webAudio.contentFetchTimeout != undefined){
		SepiaFW.webAudio.contentFetchTimeout = 10000;
	}

	//event dispatcher
	function dispatchRecorderEvent(data){
		//console.error("WebAudio recorder event", data);		//DEBUG
		document.dispatchEvent(new CustomEvent('sepia_web_audio_recorder', { detail: data}));
	}

	//The one and ONLY recorder instance:
	var sepiaWebAudioProcessor;

	//should run parallel to AudioPlayer output?
	AudioRecorder.mayMicRunParallelToAudioOut = function(){
		return !SepiaFW.ui.isMobile;	//mobile is ATM usually not good with Input + Output at same time
		//NOTE: for wake-word we check 'WakeTriggers.allowWakeWordDuringStream' and user can force this
	}

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
			tryNativeResampling: micAudioRecorderOptions.tryNativeResampling,
			//selected modules
			vadModule: micAudioRecorderOptions.vadModule
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
		tryNativeResampling: (webAudioOptions.tryNativeResampling != undefined)? webAudioOptions.tryNativeResampling : false,
		//selected modules
		vadModule: (webAudioOptions.vadModule != undefined)? webAudioOptions.vadModule : "webrtc-vad-worker"
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
	AudioRecorder.getActiveWebAudioRecorder = function(){
		return sepiaWebAudioProcessor;
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
			debugLog: processorDebugLog,
			targetSampleRate: micAudioRecorderOptions.targetSampleRate,		//NOTE: we use native resampling here if possible and allowed
			modules: activeAudioModules,
			destinationNode: undefined,		//defaults to: new "blind" destination (mic) or audioContext.destination (stream)
			startSuspended: true,
			customSourceTest: false,
			customSource: customSepiaWebAudioSource,
			initializerTimeout: 4000		//TODO: use 'WebAudio.contentFetchTimeout' / 'WakeTriggers.useWakeWord' / 'WakeTriggers.engineLoaded' ?
			
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
	function processorDebugLog(){
		if (AudioRecorder.debugInterfaces){
			console.log("WebAudioProcessor - LOG:");
			console.log.apply(console, arguments);
			if (AudioRecorder.debuggerLogFunction) AudioRecorder.debuggerLogFunction("WebAudioProcessor - LOG:", arguments);
		}
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
						//rec. options
						inputSampleRate: options.inputSampleRate || micAudioRecorderOptions.targetSampleRate,
						inputSampleSize: options.inputSampleSize || micAudioRecorderOptions.processorBufferSize,
						lookbackBufferMs: options.lookbackBufferMs,			//default: off, good value e.g. 2000
						recordBufferLimitMs: options.recordBufferLimitMs,	//default: use 5MB limit, good value e.g. 6000
						recordBufferLimitKb: options.recordBufferLimitKb, 	//default: 5MB (overwritten by ms limit), good value e.g. 600
						//ASR server options
						messageFormat: options.messageFormat || "webSpeechApi",		//use events in 'webSpeechApi' compatible format
						socketUrl: options.socketUrl,	//NOTE: if set to 'debug' it will trigger "dry run" (wav file + pseudo res.)
						clientId: options.clientId,
						accessToken: options.accessToken,
						language: options.language || SepiaFW.speech.getLongLanguageCode() || "",	//ASR model language
						continuous: (options.continuous != undefined? options.continuous : false),	//one final result only or allow multiple?
						engineOptions: options.engineOptions || {},		//any specific engine options (e.g. ASR model, optimizeFinalResult)
						//other
						returnAudioFile: false,		//NOTE: can be enabled via "dry run" mode
						doDebug: AudioRecorder.debugInterfaces,		//for debugging
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
						doDebug: AudioRecorder.debugInterfaces		//for debugging
					}
				}
			}
		}
		//Note: you can request a WAV via 'module.handle.sendToModule({request: {get: "wave"}});'
	}

	AudioRecorder.createDefaultVadModule = function(voiceActivityCallback, voiceEnergyCallback, 
			onVoiceStart, onSequenceStart, onVoiceFinish, onMaxVoice, onSequenceComplete, options){
		if (!options) options = {};
		var moduleName = options.moduleName || micAudioRecorderOptions.vadModule;
		if (!moduleName){
			return false;	//disabled
		}
		var defaultVadBuffer = (moduleName == 'webrtc-vad-worker')? (480*2) : (512*1);	//480 is the 30ms window for WebRTC VAD 16k, SEPIA VAD needs power of 2 value
		var defaultVadMode = (moduleName == 'webrtc-vad-worker')? 3 : 2;
		return {
			name: moduleName,
			type: 'worker',
			settings: {
				onmessage: function(data){
					if (data.voiceActivity != undefined){
						if (voiceActivityCallback) voiceActivityCallback(data.voiceActivity);
					}
					if (data.voiceEnergy != undefined){
						if (voiceEnergyCallback) voiceEnergyCallback(data.voiceEnergy);
					}
					if (data.vadSequenceCode != undefined){
						//1: voice start, 2: sequence started, 3: voice finished, 4: voice finished max. time, 5: full sequence complete
						//console.log("VAD sequence event: " + data.vadSequenceMsg);		//DEBUG
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
						bufferSize: options.vadBufferSize || defaultVadBuffer,
						vadMode: options.vadMode || defaultVadMode,
						//voiceEnergyCap: 50,
						//voiceEnergyDropRate: 2,
						sequence: {
							//voiceActivationTime: 250,
							//voiceResetTime: 1500,
							silenceActivationTime: 450, //250,
							maxSequenceTime: options.maxSequenceTime || 6000,
							minSequenceTime: options.minSequenceTime || 600
						},
						doDebug: AudioRecorder.debugInterfaces	//for debugging
					}
				}
			}
		}
	}

	//---- TEST METHODS ----

	AudioRecorder.testMicrophone = function(state, recLimit, resultHandler, wavDataHandler, volumeHandler, vadDataHandler, logFun, errorLog){
		if (!recLimit) recLimit = 8000;
		if (recLimit < 4000) recLimit = 4000;
		if (!state) state = {};
		if (!logFun) logFun = console.log;
		if (!errorLog) errorLog = console.error;
		if (!resultHandler) resultHandler = console.log;
		state.waveEncoderGateIsOpen = false;
		state.startedRecording = undefined;
		state.recordingDuration = undefined;
		state.rmsData = { points:[], sum: 0 };
		state.vadData = { points:[], sum: 0, speechStart: 0, speechEnd: 0 };
		logFun("Stopping existing recorders...");
		AudioRecorder.stopAndReleaseIfActive(function(){
			var procInfo;	//NOTE: use for player? (sample-rate etc.)
			logFun("Creating new recorder...");
			var waveEncModule = AudioRecorder.createDefaultWaveEncoderModule(function(msg){
				if (msg){
					if (msg.gate && msg.gate.isOpen == false && state.waveEncoderGateIsOpen){
						state.waveEncoderGateIsOpen = false;
						if (state.startedRecording && msg.gate.closedAt){
							state.recordingDuration = msg.gate.closedAt - state.startedRecording;
						}
						logFun("Recorder closed. Duration (ms): " + state.recordingDuration + ". Generating wave file.");
						AudioRecorder.stopIfActive(function(){
							//stopped
							state.waveEncModule.handle.sendToModule({request: {get: "wave"}});
						});
					}else if (msg.output && msg.output.wav){
						logFun("Evaluating result...");
						AudioRecorder.stopAndReleaseIfActive(function(){
							//handle wav data
							if (typeof wavDataHandler == "function"){
								wavDataHandler(msg.output.wav);
							}else if (typeof wavDataHandler == "string" && wavDataHandler == "player"){
								var wbsPlayer;
								var sourceLoop = false; 	//play once
								SepiaFW.webAudio.createAudioBufferSource(msg.output.wav.buffer, {}, sourceLoop, function(){
									//source stream ended
									logFun("Recording ended");
									//clean up
									wbsPlayer.stop(function(){
										wbsPlayer.release();
									});
								}).then(function(source){
									wbsPlayer = SepiaFW.webAudio.createSourceAudioPlayer(source, {
										onerror: function(err){
											errorLog("SourceAudioPlayerError", "Audio player error: " + (err? (err.message || err.name || "?") : "?"));
										}
									}, [], function(){
										logFun("Playing recording...");
										wbsPlayer.start();
									}, function(err){
										errorLog("SourceAudioPlayerInitError", "Audio player failed to init.: " + (err? (err.message || err.name || "?") : "?"));
									});
								}).catch(function(err){
									errorLog("AudioBufferSourceError", "Failed to decode buffer: " + (err? (err.message || err.name || "?") : "?"));
								});
							}
							//evaluate data
							if (state.rmsData.points.length){
								var maxRms = Math.max(...state.rmsData.points).toFixed(4);
								var minRms = Math.min(...state.rmsData.points).toFixed(4);
								resultHandler({
									maxRms: maxRms,
									minRms: minRms,
									avgRms: (state.rmsData.sum/state.rmsData.points.length).toFixed(4),
									durationGood: state.recordingDuration < (recLimit*1.1) && state.recordingDuration > (recLimit * 0.9),
									maxVolGood: maxRms > 0.06,
									minVolGood: minRms/maxRms < 0.2,
									vadSpeechStart: state.vadData.speechStart,
									vadSpeechEnd: state.vadData.speechEnd
								});
							}
							//TODO: mark clipped audio?
						});
					}
				}
			}, {
				recordBufferLimitMs: recLimit
			});
			state.waveEncModule = waveEncModule;
			SepiaFW.audioRecorder.createWebAudioRecorder({
				vadModule: SepiaFW.audioRecorder.createDefaultVadModule(undefined, function(energy){
					if (energy != undefined){
						state.vadData.points.push(energy);
						state.vadData.sum += energy;
						if (vadDataHandler) vadDataHandler(energy);
					}
				}, undefined, function(){
					logFun("VAD - Speech input block detected.");
					state.vadData.speechStart = new Date().getTime() - state.startedRecording;
				}, undefined, undefined, function(started, ended){
					logFun("VAD - Speech input block ended.");
					state.vadData.speechStart = started - state.startedRecording;	//overwrite
					state.vadData.speechEnd = ended - state.startedRecording;
				}, {
					maxSequenceTime: recLimit,
					minSequenceTime: 600
				}),
				wakeWordModule: false,		//block default module
				waveEncoderModule: waveEncModule,
				onResamplerMessage: function(msg){
					//if (msg.rms == undefined) console.log("DEBUG --- onResamplerMessage msg", msg);		//DEBUG
					if (msg && msg.rms != undefined){
						state.rmsData.points.push(msg.rms);
						state.rmsData.sum += msg.rms;
						if (volumeHandler) volumeHandler(msg.rms);
					}
				}
			}, function(audioProcessor, info){
				//on init
				procInfo = info;
				//console.log("procInfo", procInfo);				//DEBUG
				logFun("Recorder ready. Recording starts in 3s.");
				//start
				state.micStartTimer = setTimeout(function(){
					SepiaFW.audioRecorder.startWebAudioRecorder(function(){
						state.waveEncModule.handle.sendToModule({gate: "open"});
						state.waveEncoderGateIsOpen = true;
						state.startedRecording = new Date().getTime();
						logFun("Recorder started. Please speak for about " + Math.round((recLimit - 2000)/1000) + "s then wait another 2s.");
					});
				}, 3000);
			}, function(initErr){
				//on init err.
				errorLog("InitError", "Recorder init. error!" 
					+ (initErr && initErr.message? (" - Msg.: " + initErr.message) : "")
					+ (initErr && initErr.info? (" - Info: " + initErr.info.name + " - " + initErr.info.message) : ""));
			}, function(runtimeErr){
				//on runtime err.
				errorLog("RuntimeError", "Recorder runtime error."
					+ (runtimeErr && runtimeErr.message? (" - Msg.: " + runtimeErr.message) : "")
					+ (runtimeErr && runtimeErr.info? (" - Info: " + runtimeErr.info.name + " - " + runtimeErr.info.message) : ""));
				return true;
			});
		});
	}

	return AudioRecorder;
}