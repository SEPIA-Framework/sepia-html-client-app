//imports
importScripts('./shared/common.js');
importScripts('./shared/ring-buffer.min.js');
importScripts('./speex/speex-resampler-interface.min.js');
importScripts('./speex/speex-resampler-wasm.js');

var speexModule;

onmessage = function(e) {
    //Audio worker interface
	//if (doDebug) console.log("SpeexResampleWorker - onmessage", e.data);		//DEBUG
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
				console.log("SpeexResampleWorker - Unknown control message:", e.data);
				break;
		}
	}
};

let workerId = "speex-resample-worker-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
let doDebug = false;
let wasConstructorCalled = false;
let isReadyForProcessing = false;

let sourceSamplerate;
let inputSampleSize;
let targetSampleRate;
let resampleQuality;		//number from 1 to 10, 1 is fast but of bad quality, 10 is slow but best quality (less noise/aliasing, a higher complexity and a higher latency)
let emitterBufferSize;
let channelCount;
let calculateRmsVolume;
let gain;
let _hasGain;

let _bytesPerSample = 2;	//for buffer (aka Xint8 Array) length is in bytes (8bit), so *2 to get 16bit length;
let resamplingMode;			//resampling - modes 0: no change, -1: downsampling, 1: upsampling
let resampleRatio;
let resampler;

let _outputRingBuffer;
let _newInputBuffer;
let _newOutputBuffer;

let _isFirstValidProcess;
let _emitterSqrSum;
let _emitterSamples;

function init(){
	//RingBuffers - alloc. space for emitter
	var expectedSizeAfterResampling = Math.ceil(inputSampleSize * resampleRatio);
	if (expectedSizeAfterResampling > emitterBufferSize){
		//TODO: if we don't use a string this shows up as "Uncaught [object ...]" in worker.onerror ?! :-/
		throw JSON.stringify(new BufferSizeException("Output buffer has to be bigger than (resampleRatio*inputSampleSize)! Currently: " + expectedSizeAfterResampling + " > " + emitterBufferSize));
	}
	var ringBufferSize = expectedSizeAfterResampling + emitterBufferSize;			//this should be a safe size
	_outputRingBuffer = new RingBuffer(ringBufferSize, channelCount, "Int16");		//TODO: check size again

	//Input and output (for each channel) - TODO: set size, one for each channel
	_newInputBuffer = [new Int16Array(inputSampleSize)];		
	_newOutputBuffer = [new Int16Array(emitterBufferSize)];
	
	_isFirstValidProcess = true;
	_emitterSqrSum = 0;
	_emitterSamples = 0;
	_hasGain = (gain < 1 || gain > 1);
}
function ready(skipResampler){
	if (!skipResampler){
		//use new resampler for every instance - it keeps data from previous calls to improve the resampling
		resampler = new SpeexResampler(
			channelCount, sourceSamplerate, targetSampleRate, resampleQuality
		);
	}
	isReadyForProcessing = true;
	postMessage({
		moduleState: 1,
		moduleInfo: {
			moduleId: workerId,
			sourceSamplerate: sourceSamplerate,
			inputSampleSize: inputSampleSize,
			targetSampleRate: targetSampleRate,
			emitterBufferSize: emitterBufferSize,
			calculateRmsVolume: calculateRmsVolume,
			channelCount: channelCount,
			resamplingMode: resamplingMode,
			gain: gain
		}
	});
}

function constructWorker(options) {
	if (wasConstructorCalled){
		console.error("SpeexResampleWorker - Constructor was called twice! 2nd call was ignored but this should be fixed!", "-", workerId);	//DEBUG
		return;
	}else{
		wasConstructorCalled = true;
	}
	doDebug = options.setup.doDebug || false;
	sourceSamplerate = options.setup.ctxInfo.sampleRate;
	inputSampleSize = options.setup.inputSampleSize || 512;
	targetSampleRate = options.setup.targetSampleRate || options.setup.ctxInfo.targetSampleRate || 16000;
	resampleQuality = (options.setup.resampleQuality != undefined)? options.setup.resampleQuality : 7;
	emitterBufferSize = options.setup.bufferSize || inputSampleSize;
	channelCount = 1;	//options.setup.channelCount || 1;		//TODO: only MONO atm
	
	calculateRmsVolume = (options.setup.calculateRmsVolume != undefined)? options.setup.calculateRmsVolume : true;
	gain = options.setup.gain || 1.0;		//TODO: keep?
	
	resamplingMode = (targetSampleRate < sourceSamplerate? -1 : (targetSampleRate > sourceSamplerate? 1 : 0));
	resampleRatio = targetSampleRate/sourceSamplerate;
	init();
	
	function onSpeexLog(msg){
		if (doDebug) console.error("SpeexResampleWorker - SpeexModuleLog -", msg, "-", workerId);			//DEBUG (use postMessage?)
	}
	//function onSpeexError(msg){}		//TODO: we could wrap the 'resampler.processChunk' function in try-catch and log the error here
	
	//prepare
	if (resamplingMode){
		if (!speexModule){
			onSpeexLog("Init. Speex WASM module");
			SpeexResampler.initPromise = Speex().then(function(s){
				onSpeexLog("Speex WASM module ready");
				speexModule = s;	//NOTE: used inside Speex
				ready(false);
			});
		}else{
			onSpeexLog("Speex WASM moduel already loaded");
			ready(false);
		}
	}else{
		onSpeexLog("Speex WASM module not needed");
		ready(true);
	}
}

function getEmitterRms() {
	if (calculateRmsVolume){
		let rms = Math.sqrt(_emitterSqrSum / _emitterSamples);
		_emitterSqrSum = 0;
		_emitterSamples = 0;
		return rms;
	}else{
		return 0;
	}
}

function process(data) {
	if (!isReadyForProcessing){
		console.error("SpeexResampleWorker - Module wasn't ready for processing! Input was ignored!", "-", workerId);	//DEBUG
		return;
	}
	//expected: data.samples, data.sampleRate, data.targetSampleRate, data.channels, data.type
	if (data && data.samples){
		//Use 1st input and output only
		let input = data.samples;
		let thisInputSampleSize = input[0].length;
		
		if (_isFirstValidProcess){
			_isFirstValidProcess = false;
			//check inputSampleSize - TODO: this requires constant size? adapt to first value?
			if (thisInputSampleSize != inputSampleSize){
				let msg = "Sample size is: " + thisInputSampleSize + ", expected: " + inputSampleSize + ". Need code adjustments!";
				console.error("Audio Worker sample size exception - Msg.: " + msg);
				throw new SampleSizeException(msg);		//TODO: same as above, this probably needs to be a string to show up in worker.onerror properly :-/
			}
		}
		
		//transfer input to 16bit signed, interleaved (channels) PCM output - TODO: ONLY MONO so far!
		let sqrSum = 0;
		for (let i = 0; i < thisInputSampleSize; ++i){
			//gain
			if (_hasGain) input[0][i] = input[0][i] * gain;
			
			//float to 16Bit interleaved PCM
			floatTo16BitInterleavedPCM(input, _newInputBuffer, i);
			
			//calc. sum for RMS
			if (calculateRmsVolume){
				_emitterSqrSum += (input[0][i] ** 2);
			}
		}
		_emitterSamples += thisInputSampleSize;
		
		if (resamplingMode != 0){
			let processed = resampler.processChunk(_newInputBuffer[0]);
			_outputRingBuffer.push([processed]);			//TODO: is MONO
		}else{
			_outputRingBuffer.push([_newInputBuffer[0]]);	//TODO: is MONO
		}
		
		//Process if we have enough frames for the kernel.
		if (_outputRingBuffer.framesAvailable >= emitterBufferSize) {
			//pull samples
			_outputRingBuffer.pull(_newOutputBuffer);

			//Send info
			postMessage({
				rms: getEmitterRms(),
				samples: _newOutputBuffer,
				sampleRate: targetSampleRate,
				channels: channelCount,
				type: _newOutputBuffer[0].constructor.name
			});
		}
	}
}

function handleEvent(data){
	//data that should not be processed but might trigger an event
}

function start(options) {
    //TODO: anything to do?
	//NOTE: timing of this signal is not very well defined, use only for gating or similar stuff!
}
function stop(options) {
	//NOTE: timing of this signal is not very well defined
    //send out the remaining buffer data here
	if (_outputRingBuffer.framesAvailable){
		//pull last samples
		var lastSamples = [new Int16Array(_outputRingBuffer.framesAvailable)];
		_outputRingBuffer.pull(lastSamples);

		//Send info
		postMessage({
			rms: getEmitterRms(),
			samples: lastSamples,
			sampleRate: targetSampleRate,
			channels: channelCount,
			type: lastSamples[0].constructor.name,
			isLast: true
		});
	}
}
function reset(options) {
    //TODO: clean up worker and prep. for restart
	init();
}
function release(options){
	//destroy
	_outputRingBuffer = null;
	_newInputBuffer = null;
	_newOutputBuffer = null;
	resampler = null;
	speexModule = null;
	isReadyForProcessing = false;
}

//--- helpers ---

function floatTo16BitInterleavedPCM(inFloat32, outInt16, i){
	let sampleVal = Math.max(-1, Math.min(1, inFloat32[0][i]));		//we need -1 to 1 - If this is the first processor we could skip clipping
	outInt16[0][i] = sampleVal < 0 ? sampleVal * 0x8000 : sampleVal * 0x7FFF;
}