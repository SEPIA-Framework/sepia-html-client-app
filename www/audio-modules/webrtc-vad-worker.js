//imports
importScripts('./shared/common.js');
importScripts('./shared/ring-buffer.min.js');
importScripts('./webrtc-vad/webrtc-vad-interface.min.js');
importScripts('./webrtc-vad/webrtc-vad-wasm.js');
//importScripts('./shared/meyda.min.compressed.js');	//we import this on demand below

var vadModule;

onmessage = function(e) {
    //Audio worker interface
	//console.log("WebRtcVadWorker onmessage", e.data);		//DEBUG
	if (e.data.ctrl){
		switch (e.data.ctrl.action){
			case "construct":
				constructWorker(e.data.ctrl.options);
				break;
			case "process":
				process(e.data.ctrl.data);
				break;
			case "handle":
				handleEvent(e.data.ctrl.data);
				break;
			case "start":
				start(e.data.ctrl.options);
				break;
			case "stop":
				stop(e.data.ctrl.options);
				break;
			case "reset":
				reset(e.data.ctrl.options);
				break;
			case "release":
			case "close":
				release(e.data.ctrl.options);
				break;
			default:
				console.log("Unknown control message:", e.data);
				break;
		}
	}
};

let workerId = "webrtc-vad-worker-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
//let doDebug = false;
//let wasConstructorCalled = false;
//let isReadyForProcessing = false;		//TODO: implement

let inputSampleRate;
let channelCount;
let inputSampleSize;
let processBufferSize;	//defines '_processRingBuffer' size together with 'inputSampleSize'
let vadMode;
let isFloat32Input;		//default false

let voiceEnergy;
let voiceEnergyCap = 50;
let voiceEnergyDropRate = 2;
let _samplesToTimeMsFactor;

let meydaAnalyzer;
let _meydaFeatures;

let _processRingBuffer;		//holds multiple vadFrames
let _vadFrames;				//each frame processes one chunk of '_vadBufferSize' as long as '_processRingBuffer' has enough samples
let _vadFrameTimeMs;		//real time (ms) of one vadFrame (defined by sample-rate and buffer size)
let _vadBufferSize;			//size of a single vadFrame (restrictions apply)
let _vadBuffer;
let _int16InputBuffer;		//used only if input is float32

//sequence control
let useSequenceAnalyzer = false;
let voiceActivationTime;
let voiceResetTime;
let silenceActivationTime;
let maxSequenceTime;
let minSequenceTime;

let _sequenceVoiceTime;
let _sequenceSilenceTime;
let _sequenceSawVoice, _sequenceSawSilenceAfterVoice, _sequenceFinishedVoice;
let _sequenceIsActive, _sequenceIsDone, _sequenceStartedAt;

let _isFirstValidProcess;

function init(){
	if (inputSampleSize > processBufferSize){
		throw JSON.stringify(new BufferSizeException("Processor 'bufferSize' has to be bigger than 'inputSampleSize'! Currently: " + inputSampleSize + " > " + processBufferSize));
		//NOTE: this needs to be a string to show up in worker.onerror properly :-/
	}
	//requirements for sampleRate: 8000, 16000, 32000, 48000 - sampleLength: sampleRate/1000 * (10|20|30) => 48k - 480, 960, 1440 ; 16k - 160, 320, 480;
	if (![8000, 16000, 32000, 48000].includes(inputSampleRate)){
		throw JSON.stringify(new SampleRateException("For this module sample-rate has to be one of: 8000, 16000, 32000, 48000"));
	}
	var allowedBufferSizes = [inputSampleRate/1000 * 30, inputSampleRate/1000 * 20, inputSampleRate/1000 * 10];		//10, 20 and 30ms frames
	_vadBufferSize = 0;
	for (let i=0; i<allowedBufferSizes.length; i++){
		if (processBufferSize == allowedBufferSizes[i] || processBufferSize % allowedBufferSizes[i] == 0){
			_vadFrames = processBufferSize / allowedBufferSizes[i];
			_vadBufferSize = allowedBufferSizes[i];
			break;
		}
	}
	if (_vadBufferSize == 0){
		throw JSON.stringify(new BufferSizeException("For sample-rate '" + inputSampleRate + "' the 'bufferSize' has to be equal or a multiple of: " + allowedBufferSizes.join(", ")));
	}
	var ringBufferSize = processBufferSize + inputSampleSize;		//TODO: check size again
	_processRingBuffer = new RingBuffer(ringBufferSize, channelCount, "Int16");
	_vadBuffer = [new Int16Array(_vadBufferSize)];
	if (isFloat32Input){
		_int16InputBuffer = [new Int16Array(inputSampleSize)];
	}
	
	_samplesToTimeMsFactor = 1000/inputSampleRate;
	_vadFrameTimeMs = Math.round(_vadBufferSize * _samplesToTimeMsFactor);
	
	resetSequence();
	
	_isFirstValidProcess = true;
}
function ready(){
	postMessage({
		moduleState: 1,
		moduleInfo: {
			moduleId: workerId,
			inputSampleRate: inputSampleRate,
			channelCount: channelCount,
			inputSampleSize: inputSampleSize,
			inputIsFloat32: isFloat32Input,
			processBufferSize: processBufferSize,
			vadMode: vadModule.getMode(),
			vadFramesMax: _vadFrames,
			vadBufferSize: _vadBufferSize,
			vadFrameTimeMs: _vadFrameTimeMs,
			voiceEnergyCap: voiceEnergyCap,
			voiceEnergyDropRate: voiceEnergyDropRate,
			useSequenceAnalyzer: useSequenceAnalyzer
		}
	});
}

function constructWorker(options) {
	inputSampleRate = options.setup.inputSampleRate || options.setup.ctxInfo.targetSampleRate || options.setup.ctxInfo.sampleRate;
	channelCount = 1;	//options.setup.channelCount || 1;		//TODO: only MONO atm
	inputSampleSize = options.setup.inputSampleSize || 512;
	processBufferSize = options.setup.bufferSize || (inputSampleRate/1000 * 30 * 2);	//2 windows of 30ms by default
	vadMode = (options.setup.vadMode != undefined)? options.setup.vadMode : 3;
	isFloat32Input = (options.setup.isFloat32 != undefined)? options.setup.isFloat32 : false;
	
	if (options.setup.voiceEnergyCap != undefined) voiceEnergyCap = options.setup.voiceEnergyCap;
	if (options.setup.voiceEnergyDropRate) voiceEnergyDropRate = options.setup.voiceEnergyDropRate;
	if (options.setup.sequence){
		useSequenceAnalyzer = true;
		voiceActivationTime = options.setup.sequence.voiceActivationTime || 250;
		voiceResetTime = options.setup.sequence.voiceResetTime || 1500;
		silenceActivationTime = options.setup.sequence.silenceActivationTime || 250;
		maxSequenceTime = options.setup.sequence.maxSequenceTime || 6000;
		minSequenceTime = options.setup.sequence.minSequenceTime || 600;
	}else{
		useSequenceAnalyzer = false;
	}
	
	//TODO: unused so far ... keep or remove?
	meydaAnalyzer = options.setup.meydaAnalyzer || {};
	var meydaSettingsKeys = Object.keys(meydaAnalyzer);
	if (meydaSettingsKeys.length > 0){
		//import on demand
		importScripts('./shared/meyda.min.compressed.js');
		//setup
		meydaSettingsKeys.forEach(function(k, i){
			if (k == "features"){
				_meydaFeatures = meydaAnalyzer[k];
			}else{
				Meyda[k] = meydaAnalyzer[k];
			}
		});
		Meyda.sampleRate = targetSampleRate;
		Meyda.bufferSize = inputSampleSize;
		if (!Meyda.bufferSize || (Meyda.bufferSize & (Meyda.bufferSize -1) != 0)){
			throw {name: "VadModuleMeydaError", message: "Meyda buffer-size must be power of 2, e.g. 128, 256, 512, 1024, ..."};
		}
	}
	
	init();
	
	function onVadLog(msg){
		console.error("VadModuleLog -", msg);			//DEBUG (use postMessage?)
	}
	function onVadError(msg){
		console.error("VadModuleError -", msg);
		throw {name: "VadModuleError", message: msg};	//TODO: this probably needs to be a string to show up in worker.onerror properly :-/
	}
	
	//prepare
	if (!vadModule){
		onVadLog("Init. WebRTC VAD WASM module");		//DEBUG
		new WebRtcVoiceActivityDetector({
			onInfo: onVadLog,
			onError: onVadError,
			onStatusMessage: onVadLog,
			mode: vadMode
		}, function(v){
			onVadLog("WebRTC VAD ready");				//DEBUG
			vadModule = v;
			ready();
		});
	}else{
		onVadLog("WebRTC VAD module already loaded");		//DEBUG
		ready();
	}
}

//sequence block
function sequenceDetector(voiceActivity){
	if (voiceActivity == 0){
		if (_sequenceSawVoice){
			_sequenceSilenceTime += _vadFrameTimeMs;
			if (_sequenceSilenceTime > voiceResetTime){
				_sequenceSawSilenceAfterVoice = true;
			}else if (_sequenceSilenceTime > silenceActivationTime){
				_sequenceVoiceTime = 0;
			}
		}
	}else{
		_sequenceVoiceTime += _vadFrameTimeMs;
		if (!_sequenceSawVoice && _sequenceVoiceTime > voiceActivationTime){
			_sequenceSawVoice = true;
			registerEvent(1, 'voice_start');
		}else if (_sequenceVoiceTime > voiceActivationTime){
			_sequenceSilenceTime = 0;
		}
	}
	
	if (_sequenceSawVoice && _sequenceSawSilenceAfterVoice){
		_sequenceFinishedVoice = true;
	}else if (_sequenceSawVoice && (_sequenceVoiceTime > minSequenceTime)){
		if (!_sequenceIsActive){
			_sequenceIsActive = true;
			_sequenceStartedAt = Date.now();
			registerEvent(2, 'sequence_started');
		}
	}

	if (_sequenceFinishedVoice){
		_sequenceIsDone = true;
		registerEvent(3, 'finished_voice');

	}else if (_sequenceSawVoice){
		if (_sequenceIsActive && ((Date.now() - _sequenceStartedAt) > maxSequenceTime)) {
			_sequenceIsDone = true;
			registerEvent(4, 'finished_voice_maxtime');
		}
	}
		
	if (_sequenceIsDone){
		if (_sequenceIsActive) registerEvent(5, 'sequence_complete');
		resetSequence();
	}
}
function resetSequence(){
	voiceEnergy = 0;
	_sequenceSawVoice = false;
	_sequenceFinishedVoice = false;
	_sequenceSawSilenceAfterVoice = false;
	_sequenceVoiceTime = 0;
	_sequenceSilenceTime = 0;
	_sequenceIsActive = false;
	_sequenceStartedAt = 0;
	_sequenceIsDone = false;
}
function registerEvent(code, msg, data){
	var msg = {
		vadSequenceCode: code,
		vadSequenceMsg: msg
	};
	switch (code){
		//case 1: voice start
		//case 2: sequence start
		//case 3: case 4: finished voice
		case 5:
			//sequence complete
			msg.vadSequenceStarted = _sequenceStartedAt;
			msg.vadSequenceEnded = Date.now();
			break;
		default:
			break;
	}
	//Send info
	postMessage(msg);
}

function process(data) {
	//expected: data.samples, data.sampleRate, data.channels, data.type
	//might have: data.rms	-	TODO: make use of?
	if (data && data.samples){
		//Use 1st input and output only
		let input = data.samples;
		let thisInputSampleSize = input[0].length;
		
		if (_isFirstValidProcess){
			_isFirstValidProcess = false;
			//check: inputSampleRate, inputSampleSize, channelCount, float32
			if (data.sampleRate != inputSampleRate){
				var msg = "Sample-rate mismatch! Should be '" + inputSampleRate + "' is '" + data.sampleRate + "'";
				console.error("Audio Worker sample-rate exception - Msg.: " + msg);
				throw JSON.stringify(new SampleRateException(msg));			//NOTE: this needs to be a string to show up in worker.onerror properly :-/
				return;
			}
			let inputArrayType = data.type || data.samples[0].constructor.name;
			let isFloat32 = (inputArrayType.indexOf("Float32") >= 0);
			if (isFloat32 != isFloat32Input){
				var msg = "Array type mismatch! Input samples are of type '" + inputArrayType + "' but expected: " + (isFloat32Input? "Float32" : "Int16");
				console.error("Audio Worker type exception - Msg.: " + msg);
				throw JSON.stringify(new ArrayTypeException(msg));			//NOTE: this needs to be a string to show up in worker.onerror properly :-/
				return;
			}
			//TODO: should we re-init. instead of fail?
		}
		
		//TODO: is MONO
		if (isFloat32Input){
			CommonConverters.floatTo16BitPCM(_int16InputBuffer[0], input[0]);
			_processRingBuffer.push([_int16InputBuffer[0]]);
		}else{
			_processRingBuffer.push(input);
		}
		
		//Process if we have enough frames
		var vadResults = [];
		while (_processRingBuffer.framesAvailable >= _vadBufferSize) {
			//pull samples
			_processRingBuffer.pull(_vadBuffer);
			
			//activity check
			var voiceActivity = vadModule.getVoiceActivity(inputSampleRate, _vadBuffer[0]);		//TODO: is MONO
			vadResults.push(voiceActivity);
			
			//voice energy and sequence check
			if (voiceActivity){
				voiceEnergy++;
				if (voiceEnergyCap && voiceEnergy > voiceEnergyCap) voiceEnergy = voiceEnergyCap;
			}else{
				voiceEnergy = voiceEnergy - voiceEnergyDropRate;
				if (voiceEnergy < 0) voiceEnergy = 0;
			}
			if (useSequenceAnalyzer){
				sequenceDetector(voiceActivity);
			}
		}
		if (vadResults.length > 0){
			//Send info
			postMessage({
				voiceActivity: vadResults,
				voiceEnergy: voiceEnergy
			});
		}
	}
	return true;
}

function handleEvent(data){
	//data that should not be processed but might trigger an event
}

function start(options) {
    //TODO: anything to do?
	//NOTE: timing of this signal is not very well defined, use only for gating or similar stuff!
	resetSequence();
}
function stop(options) {
	//TODO: anything to do?
	//NOTE: timing of this signal is not very well defined
}
function reset(options) {
    //TODO: clean up worker and prep. for restart
	init();
}
function release(options){
	//destroy
	_processRingBuffer = null;
	_vadBuffer = null;
	_int16InputBuffer = null;
	vadModule = null;		//TODO: is there any other 'destroy'' function?
	//notify processor that we can terminate now
	postMessage({
		moduleState: 9
	});
}

//--- helpers ---
//...
