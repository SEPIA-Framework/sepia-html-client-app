//imports
importScripts('./shared/common.js');
importScripts('./shared/ring-buffer.min.js');

importScripts('./picovoice/porcupine-wasm-interface.js');
var PorcupineKeywords = {
	v14: {},
	v15: {},
	v16: {},
	v19: {}
}

onmessage = function(e){
    //Audio worker interface
	//console.log("PorcupineWorker onmessage", e.data);		//DEBUG
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
	//Custom interface
	if (e.data.gate != undefined){
		console.error("Message", e.data);			//DEBUG
		gateControl(e.data.gate && e.data.gate == "open", e.data.gateOptions);
	}
};

let workerId = "porcupine-wake-word-worker-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
//let doDebug = false;
//let wasConstructorCalled = false;
//let isReadyForProcessing = false;		//TODO: implement this ?

let porcupine;
let porcupineVersion;
let _Porcupine;

let inputSampleRate;
let channelCount;
let inputSampleSize;
let processBufferSize;	//defines '_processRingBuffer' size together with 'inputSampleSize'

let keywords;
let sensitivities;

let gateIsOpen = false;
let _gateOpenTS = 0;
let _gateCloseTS = 0;

let _isFirstValidProcess = true;

function init(){
	if (inputSampleSize > processBufferSize){
		throw JSON.stringify(new BufferSizeException("Processor 'bufferSize' has to be bigger than 'inputSampleSize'! Currently: " + inputSampleSize + " > " + processBufferSize));
		//NOTE: this needs to be a string to show up in worker.onerror properly :-/
	}
	if (inputSampleRate != 16000){
		throw JSON.stringify(new SampleRateException("Input sample-rate needs to be 16000! Currently: " + inputSampleRate));
	}
	if (channelCount != 1){
		throw JSON.stringify(new ChannelCountException("Input needs to be MONO! Current channel-count: " + channelCount));
	}
	
	_isFirstValidProcess = true;
	gateIsOpen = false;
	_gateOpenTS = 0;
	_gateCloseTS = 0;
}
function ready(){
	postMessage({
		moduleState: 1,
		moduleInfo: {
			moduleId: workerId,
			inputSampleRate: inputSampleRate,
			channelCount: channelCount,
			inputSampleSize: inputSampleSize,
			processBufferSize: processBufferSize,
			porcupineVersion: porcupineVersion,
			keywords: keywords,
			sensitivities: sensitivities
		}
	});
}

function gateControl(open, gateOptions){
	if (!gateOptions) gateOptions = {}; 		//TODO: use e.g. for (lookbackBufferNeedsReset = false)
	var msg = {
		moduleEvent: true,		//use 'moduleEvent' to distinguish from normal processing result
		gate: {}
	};
	if (open){
		_gateOpenTS = Date.now();
		gateIsOpen = true;
		msg.gate.openedAt = _gateOpenTS;
	}else{
		_gateCloseTS = Date.now();
		gateIsOpen = false;
		msg.gate.openedAt = _gateOpenTS;
		msg.gate.closedAt = _gateCloseTS;
	}
	msg.gate.isOpen = gateIsOpen;
	postMessage(msg);
}

//Interface

function constructWorker(options) {
    inputSampleRate = options.setup.inputSampleRate || options.setup.ctxInfo.targetSampleRate || options.setup.ctxInfo.sampleRate;
	channelCount = options.setup.channelCount || 1;
	
	inputSampleSize = options.setup.inputSampleSize || 512;
	processBufferSize = options.setup.bufferSize || inputSampleSize;
	
	porcupineVersion = ((options.setup.version || options.setup.porcupineVersion || 19) + "").replace(".", "").trim();
	porcupineVersion = +porcupineVersion || 19;		//... because we support "19", "1.9", 1.9 and 19 ...
	if (porcupineVersion <= 16){
		importScripts('./picovoice/porcupine-wasm-module-' + "14" + '.js');		//we assume this works for 14-16?
	}else{
		importScripts('./picovoice/porcupine-wasm-module-' + "19" + '.js');
	}
	
	keywords = options.setup.keywords || ["Computer"];
	keywords.forEach(function(kw){
		importScripts('./picovoice/porcupine-keywords/' + kw.replace(/\s+/, "_").toLowerCase() + "_wasm_" + porcupineVersion + '.js');
	});
	//TODO: use 'options.setup.keywordsData'
	sensitivities = options.setup.sensitivities || [0.5];
	
	var wasmFileArrayBuffer = options.preLoadResults.wasmFile || options.preLoadResults.wasmBase64;
	var defaultWasmBinaryFile = "";		//don't change	
	PorcupineBuilder(wasmFileArrayBuffer, defaultWasmBinaryFile, function(buildResult){
		_Porcupine = buildResult;
		
		var keywordsWithData = PorcupineKeywords["v" + porcupineVersion];
		keywords = Object.keys(keywordsWithData);
		porcupine = _Porcupine.create(Object.values(keywordsWithData), new Float32Array(sensitivities));
		
		init();
		
		ready();
	});
}

function process(data) {
	//data, e.g.: samples, sampleRate, parameters
	if (data && data.samples){
		if (_isFirstValidProcess){
			//console.error("data info", data);		//DEBUG
			_isFirstValidProcess = false;
			//check: inputSampleRate, inputSampleSize, channelCount, float32
			if (data.sampleRate != inputSampleRate){
				var msg = "Sample-rate mismatch! Should be '" + inputSampleRate + "' is '" + data.sampleRate + "'";
				console.error("Audio Worker sample-rate exception - Msg.: " + msg);
				throw JSON.stringify(new SampleRateException(msg));			//NOTE: this needs to be a string to show up in worker.onerror properly :-/
				return;
			}
			var inputArrayType = data.type || data.samples[0].constructor.name;
			if (inputArrayType.indexOf("Int16") != 0){
				var msg = "Array type mismatch! Input samples are of type '" + inputArrayType + "' but expected Int16";
				console.error("Audio Worker type exception - Msg.: " + msg);
				throw JSON.stringify(new ArrayTypeException(msg));
				return;
			}
		}
		if (gateIsOpen){
			let keywordIndex = porcupine.process(data.samples[0]);
			if (keywordIndex !== -1) {
				postMessage({
					keyword: keywords[keywordIndex]
				});
			}			
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
    //TODO: anything to do?
	//NOTE: timing of this signal is not very well defined, use only for gating or similar stuff!
}
function reset(options) {
    //TODO: clean up worker and prep. for restart
}
function release(options){
	//TODO: clean up worker and close
	keywords = null;
	sensitivities = null;
	if (porcupine) porcupine.release();
	porcupine = null;
	_Porcupine = null;
}
