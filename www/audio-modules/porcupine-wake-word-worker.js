//imports
importScripts('./shared/common.js');
importScripts('./shared/ring-buffer.min.js');

var PorcupineKeywords = {
	v14: {},
	v15: {},
	v16: {},
	v19: {},
	v20_en: {},
	v20_de: {},
	v20_es: {},
	v20_fr: {},
	v21_en: {},
	v21_de: {},
	v21_es: {},
	v21_fr: {}
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
		//console.error("Message", e.data);			//DEBUG
		gateControl(e.data.gate && e.data.gate == "open", e.data.gateOptions);
	}
};

let workerId = "porcupine-wake-word-worker-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
//let doDebug = false;
//let wasConstructorCalled = false;
//let isReadyForProcessing = false;		//TODO: implement this ?

let porcupine;
let porcupineVersion;
let porcupineLanguage;
let porcupineVersionAndLang;
let porcupineAccessKey;
let _Porcupine;

let inputSampleRate;
let channelCount;
let inputSampleSize;
let processBufferSize;	//defines '_processRingBuffer' size together with 'inputSampleSize'

let keywords;
let sensitivities;
let keywordsRemoteLocation;

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
			porcupineLanguage: porcupineLanguage,
			porcupineAccessKey: !!porcupineAccessKey,
			keywords: keywords,
			sensitivities: sensitivities
		}
	});
}
function sendError(err){
	postMessage({
		moduleState: 10,
		error: err
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
	
	var wasmFileArrayBuffer = options.preLoadResults.wasmFile || options.preLoadResults.wasmBase64;
	var defaultWasmBinaryFile = "";		//don't change
	var isBase64Mode = !!options.preLoadResults.wasmBase64;		//NOTE: this is still experimental support (default is .wasm file)
	
	porcupineVersion = ((options.setup.version || options.setup.porcupineVersion || 19) + "").replace(".", "").trim();
	porcupineVersion = +porcupineVersion || 19;		//... because we support "19", "1.9", 1.9 and 19 ...
	porcupineLanguage = (options.setup.language || options.setup.porcupineLanguage || "en").toLowerCase().trim();
	porcupineAccessKey = (options.setup.accessKey || options.setup.porcupineAccessKey || "").trim();
	
	keywords = options.setup.keywords || ["Computer"]; 			//TODO: use 'options.setup.keywordsData'?
	sensitivities = options.setup.sensitivities || [0.5];
	keywordsRemoteLocation = options.setup.keywordsRemoteLocation;
	
	//load module
	if (porcupineVersion <= 16){
		//no language support - reset to default
		porcupineLanguage = "en";
		porcupineVersionAndLang = porcupineVersion;
		importScripts('./picovoice/porcupine-wasm-module-' + "14" + '.js');		//we assume this works for 14-16?
		importScripts('./picovoice/porcupine-wasm-interface.js');		//PorcupineBuilder
	}else if (porcupineVersion <= 19){
		//legacy language support
		porcupineVersionAndLang = porcupineVersion;
		if (porcupineLanguage != "en"){
			porcupineVersionAndLang = porcupineVersion + "_" + porcupineLanguage;
		}
		if (isBase64Mode){
			importScripts('./picovoice/porcupine-wasm-module-' + porcupineVersionAndLang + "_b64" + '.js');
		}else{
			importScripts('./picovoice/porcupine-wasm-module-' + porcupineVersionAndLang + '.js');
		}
		importScripts('./picovoice/porcupine-wasm-interface.js');		//PorcupineBuilder
	}else{
		//full language support since v20
		porcupineVersionAndLang = porcupineVersion + "_" + porcupineLanguage;
		importScripts('./picovoice/porcupine-wasm-interface-v2.js');	//PorcupineBuilder v2 (includes module)
	}
	
	//load keywords (into 'PorcupineKeywords')
	var kwLoadErrors = false;
	keywords.forEach(function(kw){
		kw = kw.toLowerCase().trim();
		//support custom paths
		if (kw.indexOf("server:") == 0 || kw.indexOf("remote:") == 0){
			if (keywordsRemoteLocation){
				kw = kw.toLowerCase().replace(/^(server|remote):/, "").trim();
				var dotVersion = +porcupineVersion/10 + "";
				if (dotVersion.indexOf(".") < 0) dotVersion = dotVersion + ".0";	//Note to myself: supporting two different notations for version was a terrible idea!! (2.0 and 20 etc.)
				importScripts(keywordsRemoteLocation.replace(/\/$/, "") + "/" + porcupineVersionAndLang.replace(/\d+/, dotVersion) + "/keywords/" + kw.replace(/\s+/, "_") + "_wasm_" + porcupineVersionAndLang + '.js');
			}else{
				kwLoadErrors = true;
			}
		}else{
			importScripts('./picovoice/porcupine-keywords/' + kw.replace(/\s+/, "_") + "_wasm_" + porcupineVersionAndLang + '.js');
		}
	});
	if (kwLoadErrors){
		sendError({name: "PorcupineModuleException", message: "Failed to load one or more keywords (missing 'keywordsRemoteLocation' info?)"});
		return;
	}
		
	//build Porcupine
	PorcupineBuilder(wasmFileArrayBuffer, defaultWasmBinaryFile, function(buildResult){
		_Porcupine = buildResult;
		if (!_Porcupine){
			sendError({name: "PorcupineModuleException", message: "'Porcupine' failed to build"});
			return;
		}
		
		var keywordsWithData = PorcupineKeywords["v" + porcupineVersionAndLang];
		keywords = Object.keys(keywordsWithData);
		
		//Interface V1
		if (porcupineVersion <= 19){
			porcupine = _Porcupine.create(Object.values(keywordsWithData), new Float32Array(sensitivities));
			
			init();
			ready();
			
		//Interface V2
		}else{
			var keywordsBase64 = [];
			keywords.forEach(function(kwName, i){
				keywordsBase64.push({
					custom: kwName,
					sensitivity: sensitivities[i],
					base64: CommonConverters.uint8ArrayToBase64String(keywordsWithData[kwName])
				});
			});
			_Porcupine.create(porcupineAccessKey, keywordsBase64).then(function(pp){
				if (!pp){
					throw JSON.stringify({name: "PorcupineModuleException", message: "Failed to create module."});
				}else{
					porcupine = pp;
					try {
						init();		//has its own exceptions
						ready();
					}catch(err){
						sendError(err);
					}
				}
			}).catch(function(err){
				var msg = "Failed to create module.";
				if (err && err.name) msg += " - Name: " + err.name;
				if (err && err.message) msg += " - Message: " + err.message;
				sendError({name: "PorcupineModuleException", message: msg, info: err});
			});
		}
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
			if (porcupineVersion >= 20){
				//v2
				porcupine.process(data.samples[0]).then(function(keywordIndex){
					sendResult(keywordIndex);
				}).catch(function(err){
					console.error("Porcupine processing exception, gate closing! Err.:", err);
					gateControl(false);
				});
			}else{
				//v1.4 - 1.9
				let keywordIndex = porcupine.process(data.samples[0]);
				sendResult(keywordIndex);
			}
		}
	}
}
function sendResult(keywordIndex){
	if (keywordIndex !== -1) {
		postMessage({
			keyword: keywords[keywordIndex]
		});
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
	//notify processor that we can terminate now
	postMessage({
		moduleState: 9
	});
}
