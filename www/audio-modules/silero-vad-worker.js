//imports
importScripts('./shared/common.js');
importScripts('./shared/ring-buffer.min.js');
importScripts('./silero-vad/silero-vad-interface.js');

var vadModule;

onmessage = function(e) {
    //Audio worker interface
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

const MODEL_PATH = "./silero-vad/";		//relative to this worker, holds '<model>.bin'
const DEFAULT_MODEL = "silero-vad-16k-f16";	//"silero-vad-16k-f32": exact weights, twice the size
const VAD_FRAME_SIZE = 512;		//Silero at 16 kHz takes exactly this, 32 ms

let workerId = "silero-vad-worker-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
let doDebug = false;
let wasConstructorCalled = false;

let inputSampleRate;
let channelCount;
let inputSampleSize;
let processBufferSize;	//defines '_processRingBuffer' size together with 'inputSampleSize'
let vadThreshold;		//speech probability (0..1) from which a frame counts as voice
let isFloat32Input;		//default false
let modelName;
let modelInfo;
let modelUrl;			//null if the weights came as preLoad 'modelFile'

let voiceEnergy;
let voiceEnergyCap = 50;
let voiceEnergyDropRate = 2;

let _processRingBuffer;
let _vadFrames;				//frames that fit into 'processBufferSize'
let _vadFrameTimeMs;
let _vadBuffer;
let _float32InputBuffer;	//used only if input is Int16

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
	if (inputSampleRate != 16000){
		throw JSON.stringify(new SampleRateException("For this module sample-rate has to be 16000"));
	}
	if (processBufferSize % VAD_FRAME_SIZE != 0){
		throw JSON.stringify(new BufferSizeException("For this module the 'bufferSize' has to be equal or a multiple of: " + VAD_FRAME_SIZE));
	}
	_vadFrames = processBufferSize / VAD_FRAME_SIZE;
	_processRingBuffer = new RingBuffer(processBufferSize + inputSampleSize, channelCount, "Float32");
	_vadBuffer = [new Float32Array(VAD_FRAME_SIZE)];
	if (!isFloat32Input){
		_float32InputBuffer = [new Float32Array(inputSampleSize)];
	}
	_vadFrameTimeMs = Math.round(VAD_FRAME_SIZE * 1000/inputSampleRate);

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
			vadThreshold: vadThreshold,
			vadFramesMax: _vadFrames,
			vadBufferSize: VAD_FRAME_SIZE,
			vadFrameTimeMs: _vadFrameTimeMs,
			voiceEnergyCap: voiceEnergyCap,
			voiceEnergyDropRate: voiceEnergyDropRate,
			useSequenceAnalyzer: useSequenceAnalyzer,
			model: modelName,
			modelRelease: modelInfo.release,
			modelDtype: modelInfo.dtype,
			fetched: modelUrl
		}
	});
}
function sendError(name, message){
	console.error(name + " -", message);
	postMessage({moduleState: 10, error: {name: name, message: message}});
}

function constructWorker(options) {
	if (wasConstructorCalled){
		console.error("VadModuleError - Constructor was called twice! 2nd call was ignored but this should be fixed!", "-", workerId);	//DEBUG
		return;
	}else{
		wasConstructorCalled = true;
	}
	doDebug = options.setup.doDebug || false;
	inputSampleRate = options.setup.inputSampleRate || options.setup.ctxInfo.targetSampleRate || options.setup.ctxInfo.sampleRate;
	channelCount = 1;	//options.setup.channelCount || 1;		//TODO: only MONO atm
	inputSampleSize = options.setup.inputSampleSize || 512;
	processBufferSize = options.setup.bufferSize || VAD_FRAME_SIZE;
	vadThreshold = options.setup.vadThreshold || 0.5;
	isFloat32Input = (options.setup.isFloat32 != undefined)? options.setup.isFloat32 : false;
	modelName = options.setup.model || DEFAULT_MODEL;

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

	init();

	//A modelFile from a preLoad is used as given and should fit 'setup.model', it is not checked.
	var preLoads = options.preLoadResults || {};
	modelUrl = preLoads.modelFile? null : (MODEL_PATH + modelName + ".bin");
	var modelReady = preLoads.modelFile? Promise.resolve(preLoads.modelFile)
		: fetch(modelUrl).then(function(res){
			if (!res.ok) throw new Error("HTTP " + res.status + " for '" + modelUrl + "'");
			return res.arrayBuffer();
		});
	modelReady.then(function(bytes){
		modelInfo = SileroVad.load(bytes);
		vadModule = new SileroVad.Vad();
		if (doDebug) console.log("SileroVadModule - ready");		//DEBUG
		ready();
	}).catch(function(err){
		sendError("VadModuleError", "Silero VAD could not be loaded: " + ((err && err.message) || err));
	});
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
	//the first chunks can arrive before the model is built, they are dropped
	if (data && data.samples && vadModule){
		//Use 1st input and output only
		let input = data.samples;

		if (_isFirstValidProcess){
			_isFirstValidProcess = false;
			//check: inputSampleRate, float32
			if (data.sampleRate != inputSampleRate){
				var msg = "Sample-rate mismatch! Should be '" + inputSampleRate + "' is '" + data.sampleRate + "'";
				console.error("Audio Worker sample-rate exception - Msg.: " + msg);
				throw JSON.stringify(new SampleRateException(msg));			//NOTE: this needs to be a string to show up in worker.onerror properly :-/
			}
			let inputArrayType = data.type || data.samples[0].constructor.name;
			let isFloat32 = (inputArrayType.indexOf("Float32") >= 0);
			if (isFloat32 != isFloat32Input){
				var msg = "Array type mismatch! Input samples are of type '" + inputArrayType + "' but expected: " + (isFloat32Input? "Float32" : "Int16");
				console.error("Audio Worker type exception - Msg.: " + msg);
				throw JSON.stringify(new ArrayTypeException(msg));			//NOTE: this needs to be a string to show up in worker.onerror properly :-/
			}
		}

		//TODO: is MONO
		if (isFloat32Input){
			_processRingBuffer.push(input);
		}else{
			let source = input[0];
			let target = (_float32InputBuffer[0].length == source.length)? _float32InputBuffer[0] : new Float32Array(source.length);
			for (let i = 0; i < source.length; i++){
				target[i] = CommonConverters.singleSampleInt16ToFloat32BitAudio(source[i]);
			}
			_processRingBuffer.push([target]);
		}

		//Process if we have enough frames
		var vadResults = [];
		var vadProbabilities = [];
		while (_processRingBuffer.framesAvailable >= VAD_FRAME_SIZE) {
			_processRingBuffer.pull(_vadBuffer);

			var probability = vadModule.process(_vadBuffer[0]);
			var voiceActivity = (probability >= vadThreshold)? 1 : 0;
			vadResults.push(voiceActivity);
			vadProbabilities.push(probability);

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
				voiceProbability: vadProbabilities,
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
	//NOTE: timing of this signal is not very well defined, use only for gating or similar stuff!
	resetSequence();
}
function stop(options) {
	//NOTE: timing of this signal is not very well defined
}
function reset(options) {
	init();
	if (vadModule) vadModule.reset();
}
function release(options){
	//destroy
	_processRingBuffer = null;
	_vadBuffer = null;
	_float32InputBuffer = null;
	vadModule = null;
	//notify processor that we can terminate now
	postMessage({
		moduleState: 9
	});
}
