//imports
importScripts('./shared/common.js');
importScripts('./shared/ring-buffer.min.js');
importScripts('./shared/meyda.min.compressed.js');

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

let workerId = "speia-vad-worker-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
//let doDebug = false;
//let wasConstructorCalled = false;
//let isReadyForProcessing = false;		//TODO: implement this ?

let inputSampleRate;
let channelCount;
let inputSampleSize;
let processBufferSize;	//defines '_processRingBuffer' size together with 'inputSampleSize'
let vadMode;
let vadThreshold;
let vadDefaultThresholds = {
	1: 1.5,
	2: 3.5,
	3: 3.5
}
let isFloat32Input;		//default false

let voiceEnergy;
let voiceEnergyCap = 42;
let voiceEnergyDropRate = 2;
let _samplesToTimeMsFactor;

let _processRingBuffer;		//holds multiple vadFrames
let _vadFrames;				//each frame processes one chunk of '_vadBufferSize' as long as '_processRingBuffer' has enough samples
let _vadFrameTimeMs;		//real time (ms) of one vadFrame (defined by sample-rate and buffer size)
let _vadBufferSize;			//size of a single vadFrame (restrictions apply)
let _vadBuffer;
//let _previousVadBuffer;
let _transferFun;

//parameters to calculate vad
let movingAvgLoudness;
let maxLoudness = 0;
let _movingAvgLoudnessWeight = 400;		//TODO: make variable and normalize with sample-rate
let _mfccDynamicWeightsArray;
let _mfccLastArray;
let _warmUpFrames;
let _totalFrames;

//sequence control
let useSequenceAnalyzer = false;
let voiceActivationTime;
let voiceResetTime;
let silenceActivationTime;
let maxSequenceTime;
let minSequenceTime;
let sequenceTimeForTrigger = 1100;		//TODO: make variable
let mfccSequenceStartBuffer;
let loudnessSequenceStartBuffer;
let feature1SequenceStartBuffer;
let feature2SequenceStartBuffer;
let feature3SequenceStartBuffer;

let _sequenceVoiceTime;
let _sequenceSilenceTime;
let _sequenceSawVoice, _sequenceSawSilenceAfterVoice, _sequenceFinishedVoice;
let _sequenceIsActive, _sequenceIsDone, _sequenceStartedAt, _sequenceCheckedTrigger;

let _isFirstValidProcess;

function init(){
	if (inputSampleSize > processBufferSize){
		throw JSON.stringify(new BufferSizeException("Processor 'bufferSize' has to be bigger than 'inputSampleSize'! Currently: " + inputSampleSize + " > " + processBufferSize));
		//NOTE: this needs to be a string to show up in worker.onerror properly :-/
	}
	//requirements for sampleRate: 8000-48000 - sampleLength: sampleRate/1000 * (10|20|30) => 48k - 480, 960, 1440 ; 16k - 160, 320, 480;
	if (inputSampleRate < 8000 || inputSampleRate > 48000){
		throw JSON.stringify(new SampleRateException("For this module sample-rate has to be between 8000 and 48000 Hz."));
	}
	var allowedBufferSizes = [8192, 4096, 2048, 1024, 512, 256, 128];		//recommended: 10-30ms frame length, e.g. 512/16000 = 32ms (recommended)
	_vadBufferSize = 0;
	for (let i=0; i<allowedBufferSizes.length; i++){
		//common cases
		if (inputSampleRate == 16000 && processBufferSize >= 512){
			_vadBufferSize = 512;
			
		//best fallback
		}else{
			if (processBufferSize == allowedBufferSizes[i] || processBufferSize % allowedBufferSizes[i] == 0){
				_vadBufferSize = allowedBufferSizes[i];
				break;
			}
		}
	}
	if (_vadBufferSize == 0){
		throw JSON.stringify(new BufferSizeException("The 'bufferSize' has to be equal or a multiple of: " + allowedBufferSizes.join(", ")));
	}else{
		_vadFrames = processBufferSize / _vadBufferSize;
		_samplesToTimeMsFactor = 1000/inputSampleRate;
		_vadFrameTimeMs = Math.round(_vadBufferSize * _samplesToTimeMsFactor);
		if (_vadFrameTimeMs < 5 || _vadFrameTimeMs > 86){
			throw JSON.stringify(new BufferSizeException("Frame length (bufferSize/sampleRate * 1000) is '" + _vadFrameTimeMs + "ms' but should be in the range of 10-30ms and cannot be below 5ms or above 86ms)."));
		}
	}
	var ringBufferSize = processBufferSize + inputSampleSize;		//TODO: check size again
	_processRingBuffer = new RingBuffer(ringBufferSize, channelCount, "Float32");
	_vadBuffer = [new Float32Array(_vadBufferSize)];
	//_previousVadBuffer = [new Float32Array(_vadBufferSize)];
	if (isFloat32Input){
		//we need flot32 for Meyda so this is all good
		_transferFun = function(thisArray, channel, i){
			return thisArray[channel][i];
		}
	}else{
		//... but here we need to transform (NOTE: exprects Int16Array)
		_transferFun = function(thisArray, channel, i){
			return CommonConverters.singleSampleInt16ToFloat32BitAudio(thisArray[channel][i]);
		}
	}
	
	//Meyda requirements (2)
	Meyda.sampleRate = inputSampleRate;
	Meyda.bufferSize = _vadBufferSize;
	if (!Meyda.bufferSize || (Meyda.bufferSize & (Meyda.bufferSize -1) != 0)){
		throw JSON.stringify({name: "VadModuleMeydaError", message: "Meyda buffer-size must be power of 2, e.g. 128, 256, 512, 1024, ..."});
	}
	
	movingAvgLoudness = undefined;
	maxLoudness = 0;
	_mfccDynamicWeightsArray = ArrayOps.newCommon1dArray(Meyda.numberOfMFCCCoefficients, 1);
	_mfccLastArray = ArrayOps.newCommon1dArray(Meyda.numberOfMFCCCoefficients, 0);
	
	if (useSequenceAnalyzer){
		//Buffer the start of a sequence to analyze for keywords/trigger/wake-words etc.
		let sequenceStartFrames = Math.round((sequenceTimeForTrigger + 1000)/1000 * (inputSampleRate/_vadBufferSize));		//TODO: why is this almost 2 times more than expected?
		mfccSequenceStartBuffer = ArrayOps.newCommon2dArray(sequenceStartFrames, Meyda.numberOfMFCCCoefficients, 0);
		loudnessSequenceStartBuffer = ArrayOps.newCommon1dArray(sequenceStartFrames, 0);
		feature1SequenceStartBuffer = ArrayOps.newCommon1dArray(sequenceStartFrames, 0);
		feature2SequenceStartBuffer = ArrayOps.newCommon1dArray(sequenceStartFrames, 0);
		feature3SequenceStartBuffer = ArrayOps.newCommon1dArray(sequenceStartFrames, 0);
	}
	
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
			vadMode: vadMode,
			vadThreshold: vadThreshold,
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
	processBufferSize = options.setup.bufferSize || inputSampleSize;
	vadMode = options.setup.vadMode || 3;
	vadThreshold = options.setup.vadThreshold || vadDefaultThresholds[vadMode] || 3;
	_warmUpFrames = Math.round(2*inputSampleRate/inputSampleSize);		//input- or processBufferSize? We want ~2s so input makes sense
	_totalFrames = 0;
	
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
		//TODO: add sequenceTimeForTrigger
	}else{
		useSequenceAnalyzer = false;
	}
	
	//Meyda options and defaults
	Meyda.melBands = 40; //40 26;
	Meyda.numberOfMFCCCoefficients = 20; //13;
	Meyda.windowingFunction = "hanning";	//"hamming"
	var meydaRequiredFeatures = ["mfcc", "loudness"];		
	//https://meyda.js.org/audio-features.html: "spectralCentroid", "spectralFlatness", "spectralFlux" (requires previous spec. but is buggy!?)
	var meydaAnalyzer = options.setup.meydaAnalyzer || {};
	var meydaFeatures = [];
	var meydaSettingsKeys = Object.keys(meydaAnalyzer);
	if (meydaSettingsKeys.length > 0){
		//setup
		meydaSettingsKeys.forEach(function(k, i){
			if (k == "features"){
				meydaFeatures = meydaAnalyzer[k];
			}else{
				Meyda[k] = meydaAnalyzer[k];
			}
		});
	}
	//Meyda requirements (1)
	if (!meydaFeatures){
		Meyda.features = meydaRequiredFeatures;
	}else{
		Meyda.features = meydaFeatures;
		meydaRequiredFeatures.forEach(function(f, i){
			if (!Meyda.features.includes(f)){
				Meyda.features.push(f);
			}
		});
	}
	
	init();
	ready();
}

//averages
function getWeightedMovingAverage(prevAvg, nextValue, weight){
	//if (prevAvg == undefined){
	//	return nextValue;
	//}else{
		return (prevAvg + (nextValue - prevAvg)/weight);
	//}
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
		if (_sequenceIsActive){
			let timePassed = (Date.now() - _sequenceStartedAt);
			if (timePassed > maxSequenceTime){
				_sequenceIsDone = true;
				registerEvent(4, 'finished_voice_maxtime');
			}else if (!_sequenceCheckedTrigger && timePassed >= sequenceTimeForTrigger){
				sequenceTriggerAnalyzer();
				_sequenceCheckedTrigger = true;
				registerEvent(6, 'sequence_trigger_result');
			}
		}
	}
		
	if (_sequenceIsDone){
		if (_sequenceIsActive) registerEvent(5, 'sequence_complete');
		resetSequence();
	}
}
function sequenceTriggerAnalyzer(){
	//TODO
	var sqVoiceActivity = feature1SequenceStartBuffer;
	var sqVoiceEnergy = feature2SequenceStartBuffer;
	var rangeStart = 0;
	var rangeEnd = sqVoiceEnergy.length;
	//find largest activity block - TODO: not good enough, 0 is possible (try 'hey computer')
	var bestRange = {start: 0, end: 0, range: 0};
	var nextRange = {start: 0, end: 0, range: 0};
	for (let i=0; i<sqVoiceEnergy.length; i++){
		if (nextRange.range == 0 && sqVoiceEnergy[i] > 0){
			nextRange.start = i;
			nextRange.range++;
		}else if (sqVoiceEnergy[i] > 0){
			nextRange.range++;
		}else{
			nextRange.end = i;
			if (nextRange.range > bestRange.range){
				bestRange = nextRange;
				nextRange = {start: 0, end: 0, range: 0};
			}
		}
	}
	if (bestRange.range){
		//var reducedMfccBuffer = mfccSequenceStartBuffer.slice(bestRange.start, bestRange.end);
	}
}
function resetSequence(){
	//vad
	voiceEnergy = 0;
	_sequenceSawVoice = false;
	_sequenceFinishedVoice = false;
	_sequenceSawSilenceAfterVoice = false;
	_sequenceVoiceTime = 0;
	_sequenceSilenceTime = 0;
	_sequenceIsActive = false;
	_sequenceStartedAt = 0;
	_sequenceIsDone = false;
	_sequenceCheckedTrigger = false;
}
function registerEvent(code, _msg, data){
	var msg = {
		vadSequenceCode: code,
		vadSequenceMsg: _msg
	}
	switch (code){
		//case 1: voice start
		//case 2: sequence start
		//case 3: case 4: finished voice
		case 5:
			//sequence complete
			msg.vadSequenceStarted = _sequenceStartedAt;
			msg.vadSequenceEnded = Date.now();
			break;
		case 6:
			//sequence trigger-check phase data
			msg.vadSequenceStarted = _sequenceStartedAt;
			msg.mfccProfile = mfccSequenceStartBuffer;
			msg.loudnessProfile = loudnessSequenceStartBuffer;
			msg.featuresArray = [feature1SequenceStartBuffer, feature2SequenceStartBuffer, feature3SequenceStartBuffer];
			msg.avgLoudness = movingAvgLoudness;
		default:
			break;
	}
	//Send info
	postMessage(msg);
}

//classify voice activity
function getVoiceActivity(mfccArray, loudnessNorm, averageLoudness){
	if (vadMode == 3){
		var sum = 0;
		for (let i=0; i<mfccArray.length; i++){
			let change = Math.abs(mfccArray[i]/_mfccLastArray[i] - 1);
			if (change < 0.20){
				_mfccDynamicWeightsArray[i] = _mfccDynamicWeightsArray[i] * 0.66;
			}else{
				_mfccDynamicWeightsArray[i] = 1.0; //Math.min(1.0, _mfccDynamicWeightsArray[i] + 0.75);
			}
			_mfccLastArray[i] = mfccArray[i];
			sum += Math.abs(mfccArray[i] * _mfccDynamicWeightsArray[i]);
		}
		var signal = sum/mfccArray.length - averageLoudness;
		return (signal > vadThreshold? 1 : 0);		
	}else{
		return (loudnessNorm > vadThreshold? 1 : 0);
	}
}

function process(data) {
	//expected: data.samples, data.sampleRate, data.channels, data.type
	//might have: data.rms	-	TODO: make use of?
	if (data && data.samples){
		//Use 1st input and output only
		let input = data.samples;
		let thisInputSampleSize = input[0].length;
		_totalFrames++;
		
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
			let isFloat32 = (inputArrayType.indexOf("Float32") == 0);
			let isInt16 = (inputArrayType.indexOf("Int16") == 0)
			if ((isFloat32 != isFloat32Input) || (!isFloat32Input && !isInt16)){
				var msg = "Array type mismatch! Input samples are of type '" + inputArrayType + "' but expected: " + (isFloat32Input? "Float32" : "Int16");
				console.error("Audio Worker type exception - Msg.: " + msg);
				throw JSON.stringify(new ArrayTypeException(msg));			//NOTE: this needs to be a string to show up in worker.onerror properly :-/
				return;
			}
		}
		
		//TODO: is MONO
		_processRingBuffer.push(input, _transferFun);
		
		//Process if we have enough frames
		let vadFramesAvailable = Math.floor(_processRingBuffer.framesAvailable/_vadBufferSize);
		let vadResults = new Array(vadFramesAvailable);
		let loudnessResults = new Array(vadFramesAvailable);
		let mfcc = new Array(vadFramesAvailable);
		//let moreFeatures = new Array(vadFramesAvailable);
		let n = 0;
		while (_processRingBuffer.framesAvailable >= _vadBufferSize){
			//pull samples
			_processRingBuffer.pull(_vadBuffer);
			
			//Meyda features
			let features = Meyda.extract(Meyda.features, _vadBuffer[0]);	//we don't add '_previousVadBuffer[0]' because it saves time and 'spectralFlux' is buggy
			//console.log("features_meyda", features);
			
			let loudness;
			//loudness = (features.loudness.specific[1] + features.loudness.specific[2] + features.loudness.specific[3]); //'specific' shows each loudness on bark scale, 'total' is the sum
			//loudness = features.loudness.total;
			if (vadMode == 1){
				loudness = features.loudness.specific.slice(1, 5).reduce(function(a, b){ return a + b; });		//1-5 on the bark scale
			}else{
				loudness = features.mfcc.reduce(function(a, c){ return (a + Math.abs(c)); })/features.mfcc.length;	//avg(...abs(MFCC[i]))
			}
			maxLoudness = Math.max(maxLoudness, loudness);
			if (movingAvgLoudness == undefined){
				movingAvgLoudness = loudness * vadThreshold;
			}
			if (_totalFrames < _warmUpFrames){
				movingAvgLoudness = getWeightedMovingAverage(movingAvgLoudness, loudness, 10);
			}else{
				movingAvgLoudness = getWeightedMovingAverage(movingAvgLoudness, loudness, _movingAvgLoudnessWeight);
			}
			
			//activity check
			let loudnessNorm = (loudness - movingAvgLoudness);
			let voiceActivity = getVoiceActivity(features.mfcc, loudnessNorm, movingAvgLoudness);
			vadResults[n] = voiceActivity;
			loudnessResults[n] = loudness;
			mfcc[n] = features.mfcc;
			//moreFeatures[n] = [];
			
			//voice energy and sequence check
			if (voiceActivity){
				voiceEnergy++;
				if (voiceEnergyCap && voiceEnergy > voiceEnergyCap) voiceEnergy = voiceEnergyCap;
			}else{
				voiceEnergy = voiceEnergy - voiceEnergyDropRate;
				if (voiceEnergy < 0) voiceEnergy = 0;
			}
			if (useSequenceAnalyzer){
				ArrayOps.pushAndShift(mfccSequenceStartBuffer, features.mfcc);
				ArrayOps.pushAndShift(loudnessSequenceStartBuffer, loudnessNorm); //(loudnessNorm > 1)? (loudnessNorm-1) : 0);	//loudness
				ArrayOps.pushAndShift(feature1SequenceStartBuffer, voiceActivity);
				ArrayOps.pushAndShift(feature2SequenceStartBuffer, voiceEnergy);
				ArrayOps.pushAndShift(feature3SequenceStartBuffer, features.loudness.specific);
				sequenceDetector(voiceActivity);
			}
			n++;
		}
		if (n > 0){
			//Send info
			//console.log("features", vadResults, loudnessResults, movingAvgLoudness, maxLoudness);
			postMessage({
				voiceActivity: vadResults,
				voiceEnergy: voiceEnergy,
				voiceLoudness: loudnessResults,
				mfcc: mfcc,
				movingAvgLoudness: movingAvgLoudness,
				maxLoudness: maxLoudness
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
	//_previousVadBuffer = null;
	_totalFrames = 0;
	mfccSequenceStartBuffer = null;
	_mfccDynamicWeightsArray = null;
	loudnessSequenceStartBuffer = null;
	feature1SequenceStartBuffer = null;
	feature2SequenceStartBuffer = null;
	feature3SequenceStartBuffer = null;
	//notify processor that we can terminate now
	postMessage({
		moduleState: 9
	});
}

//--- helpers ---
//...
