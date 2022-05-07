//SEPIA WEB AUDIO LIB
function sepiaFW_build_web_audio(){
	var WebAudio = {};
	
	//--- START: Copy of SEPIA Web-Audio Lib --->
	
	WebAudio.version = "0.9.11";
	
	//Preparations
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var isMediaDevicesSupported = undefined;
	var isCordovaAudioinputSupported = undefined;

	function testStreamRecorderSupport(){
		isMediaDevicesSupported = (!!AudioContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
		//isCordovaAudioinputSupported = (window.cordova && window.audioinput);		//TODO: implement (import ... "./plugins/cordova-audio-input.js")
		return !!isMediaDevicesSupported || isCordovaAudioinputSupported;
	}
	
	WebAudio.isStreamRecorderSupported = testStreamRecorderSupport(); 		//set once at start
	WebAudio.isNativeStreamResamplingSupported = true; 	//will be tested on first media-stream creation
	WebAudio.tryNativeStreamResampling = true;			//overwrite to force-ignore native resampling
	WebAudio.contentFetchTimeout = 8000;	//used e.g. for WASM pre-loads etc.
	
	WebAudio.defaultProcessorOptions = {
		moduleFolder: "modules",
		initSuccessCallback: console.log,
		initErrorCallback: console.error,
		//modules: [],
		//onaudiostart: console.log,
		//onaudioend: console.log,		//NOTE: this only triggers if 'stop' is called not if stream ends etc. - compare: 'onEndCallback' of source
		//onrelease: console.log,
		onerror: console.error
		//debugLog: console.log
	}

	//Cache
	var preLoadCache = {};
	
	WebAudio.clearPreLoadCache = function(){
		preLoadCache = {};
	}

	//Media constraints
	WebAudio.getSupportedAudioConstraints = function(){
		var sc = navigator.mediaDevices.getSupportedConstraints();		//TODO: can fail due to non-SSL (secure context)
		var c = {}, owc = WebAudio.overwriteSupportedAudioConstraints;
		if (sc.deviceId) c.deviceId = (owc.deviceId != undefined)? owc.deviceId : undefined;
		if (sc.channelCount) c.channelCount = (owc.channelCount != undefined)? owc.channelCount : 1;
		if (sc.noiseSuppression) c.noiseSuppression = (owc.noiseSuppression != undefined)? owc.noiseSuppression : true;
		if (sc.autoGainControl) c.autoGainControl = (owc.autoGainControl != undefined)? owc.autoGainControl : false;
		if (sc.echoCancellation) c.echoCancellation = (owc.echoCancellation != undefined)? owc.echoCancellation : false;
		if (sc.sampleRate) c.sampleRate = (owc.sampleRate != undefined)? owc.sampleRate : 48000;
		//other options: latency: double, sampleSize: 16
		return c;
	};
	WebAudio.overwriteSupportedAudioConstraints = {};
	
	//Mime types
	WebAudio.defaultMimeTypesForCodecs = {
		ogg: "audio/ogg",
		ogg_opus: "audio/ogg;codecs=opus",
		ogg_vorbis: "audio/ogg;codecs=vorbis",
		ogg_speex: "audio/ogg;codecs=speex",
		opus: "audio/opus",
		vorbis: "audio/vorbis",
		speex: "audio/speex",
		wav: "audio/wav",
		raw: "audio/wav",
		webm_ogg_opus: "audio/webm;codecs=opus",
		webm_ogg_vorbis: "audio/webm;codecs=vorbis",
		webm_mkv_pcm: "audio/webm;codecs=pcm",		//this is kind of weird stuff ^^
		mp3: "audio/mpeg",
		mp4: "audio/mp4",
		flac: "audio/flac",
		mpeg: "audio/mpeg"
	}
	WebAudio.getSupportedMediaRecorderCodecs = function(){
		var codecs = {};
		if (window.MediaRecorder){
			Object.keys(WebAudio.defaultMimeTypesForCodecs).forEach(function(codec){
				var mimeType = WebAudio.defaultMimeTypesForCodecs[codec];
				if (window.MediaRecorder.isTypeSupported(mimeType)){
					codecs[codec] = mimeType;
				}
			});
		}
		return codecs;
	};
	
	//AudioContext creator
	WebAudio.createAudioContext = function(options, ignoreOptions){
		var contextOptions = {};
		if (!ignoreOptions && options.targetSampleRate){
			//NOTE: currently (Dec 2020) only Chromium can do this:
			contextOptions.sampleRate = options.targetSampleRate;
		}
		var ac = new AudioContext(contextOptions);
		//TODO: on some freaky circumstances ac.state can be faulty as seen in iOS (shows 'suspended' but await ac.suspend() never resolves)
		//console.log("AC STATE: " + ac.state);		//TODO: this can be suspended if the website is restrict and the user didn't interact with it yet
		return ac;
	};
	
	//Processor class
	
	WebAudio.Processor = function(options, initSuccessCallback, initErrorCallback){
		var thisProcessor = this;
		if (!initErrorCallback) initErrorCallback = WebAudio.defaultProcessorOptions.initErrorCallback;
		if (!initSuccessCallback) initSuccessCallback = WebAudio.defaultProcessorOptions.initSuccessCallback;
		if (!options) options = {};
		//TODO: add mic sinkId option
		
		var onProcessorError = options.onerror || WebAudio.defaultProcessorOptions.onerror;
		var moduleFolder = (options.moduleFolder || WebAudio.defaultProcessorOptions.moduleFolder).replace(/\/$/, "") + "/";
		
		var inputSampleRate;
		var sampleRateMismatch = 0;
		
		var mainAudioContext;
		var startFun;
		var stopFun;
		var releaseFun;
		var isProcessing = false;
		
		//Internal functions
		
		var isInitialized = false;
		var isInitPending = false;
		var initTimeout = options.initializerTimeout || 3000;
		var initTimeoutTimer;
		var initConditions = {};
		var sourceInitInfo = {};
		var modulesInitInfo = [];
		function addInitCondition(tag){
			if (options.debugLog) options.debugLog("Started init. condition: " + tag);
			initConditions[tag] = 1;
		}
		function completeInitCondition(tag){
			if (initConditions[tag]){
				delete initConditions[tag];
				if (options.debugLog) options.debugLog("Completed init. condition: " + tag);
				if (Object.keys(initConditions).length == 0){
					if (!isInitialized){
						clearTimeout(initTimeoutTimer);
						isInitialized = true;
						isInitPending = false;
						initSuccessCallback({
							name: "ProcessorReady", 
							message: "Processor is ready for action",
							inputSampleRate: inputSampleRate, 
							targetSampleRate: (options.targetSampleRate || inputSampleRate),
							sourceInfo: sourceInitInfo,
							modulesInfo: modulesInitInfo
						});
					}
				}
			}
		}
		function resetInitializer(){
			clearTimeout(initTimeoutTimer);
			isInitialized = false;
			isInitPending = false;
			//Define some conditions in advance
			initConditions = {};
			addInitCondition("sourceSetup");
			addInitCondition("modulesSetup");
		}
		function initializerError(err){
			//TODO: trigger 'thisProcessor.release' ?
			resetInitializer();
			initErrorCallback(err);
		}
		resetInitializer();		//make sure we start clean
		isInitPending = true;
		initTimeoutTimer = setTimeout(function(){
			initializerError({message: "Initialization took too long! If you expect long running init. process use option 'initializerTimeout' (ms).", name: "ProcessorInitTimeout"});
		}, initTimeout);
		
		async function createOrUpdateAudioContext(forceNew, ignoreOptions){
			if (mainAudioContext && forceNew){
				if (mainAudioContext.state != "closed"){
					await mainAudioContext.close();
				}
				mainAudioContext = null;
			}
			if (!mainAudioContext || mainAudioContext.state == "closed"){
				//TODO: clean up old context and sources?
				mainAudioContext = WebAudio.createAudioContext(options, ignoreOptions);
				if (options.startSuspended == undefined || options.startSuspended){
					try { await mainAudioContext.resume(); } catch(error){};		//TODO: prevent quirky stuff on e.g. iOS
					await mainAudioContext.suspend();
				}else{
					await mainAudioContext.resume();
				}
			}
			return mainAudioContext;
		}
		async function createModules(){
			if (!options.modules){
				return;
			}
			for (let i=0; i<options.modules.length; i++){
				let module = options.modules[i];
				let info = getModuleInfo(module);
				let moduleType = info.moduleType;	//1: AudioWorklet, 2: Web Worker, 3: Script Processor (legacy), 4: Audio Node (legacy)
				let moduleName = info.moduleName;
				if (moduleType == 1){
					//TODO: add option "pathUrl"?
					let modulePath = moduleFolder + moduleName + ".js";
					if (options.debugLog) options.debugLog("Adding audioWorklet module: " + modulePath);
					try {
						await mainAudioContext.audioWorklet.addModule(modulePath);
					}catch(e){
						console.error(e);
						if (options.debugLog) options.debugLog("FAILED to add audioWorklet module: " + modulePath + " - Msg.: " + e.name + ", " + e.message);
					}
				}else if (moduleType == 2){
					let modulePath = moduleFolder + moduleName.replace(/-worker$/, "") + '-worker.js';
					if (options.debugLog) options.debugLog("Adding worker module: " + modulePath);
					
				}else if (moduleType == 3){
					//TODO: ...
					throw {name: "CreateModuleError", message: "ScriptProcessor nodes are currently not supported as modules (only source)."};
				
				}else if (moduleType == 4){
					//TODO: ...
					throw {name: "CreateModuleError", message: "AudioNodes are currently not supported as modules (you can use them as custom source)."};
				
				}else{
					throw {name: "CreateModuleError", message: "Module type unknown."};
				}
			}
		}
		function getModuleInfo(module){
			//supports "string" (name) or "object" with options
			var moduleType, moduleName, moduleSetup, modulePreLoads;
			if (typeof module == "object"){
				//1: AudioWorklet, 2: Web Worker, 3: Script Processor (legacy), 4: Audio Node (legacy)
				if ((module.type && module.type == "worker") || module.isWorker){
					moduleType = 2;
				}else if (module.type && module.type == "scriptProcessor"){
					moduleType = 3;
				}else if (module.type && module.type == "audioNode"){
					moduleType = 4;
				}else{
					moduleType = 1;
				}
				moduleName = module.name;
				moduleSetup = module.setup || module.settings;
				modulePreLoads = module.preLoad || {};
			}else{
				moduleType = 1;
				moduleName = module;
				moduleSetup = {};
				modulePreLoads = {};
			}
			return {moduleType: moduleType, moduleName: moduleName, moduleSetup: moduleSetup, modulePreLoads: modulePreLoads};
		}
		
		//States
		
		function setStateProcessing(){
			isProcessing = true;
		}
		function setStateProcessingStop(){
			isProcessing = false;
		}
		//function setStateProcessorReleased(){} //already handled in 'resetInitializer'
			
		//Supported?
		if (!WebAudio.isStreamRecorderSupported && !options.customSourceTest && !options.customSource){
			var err = {name: "NotSupportedError", message: "Cannot create audio stream recorder because there are no compatible interfaces!"};
			initializerError(err);
			return;
		}
		
		//Add audio worklets
		function addModules(processNodes, sourceHasWorkletSupport, completeCallback){
			var startIndex = processNodes.length;
			if (options.modules && options.modules.length){
				var initInfo = new Array(options.modules.length);
				var N = options.modules.length;
				options.modules.forEach(async function(module, i){
					if (!isInitPending){
						//already failed so ignore rest
						return;
					}
					addInitCondition("module-" + i);
					
					var info = getModuleInfo(module);
					var moduleType = info.moduleType;	//1: AudioWorklet, 2: Web Worker, 3: Script Processor (legacy), 4: Audio Node (legacy)
					var moduleName = info.moduleName;
					var moduleSetup = info.moduleSetup;
					
					//pre-loads - NOTE: there might be room for optimizations here ... - TODO: can/should we cache preloads globally?
					var preLoads = {};
					var preLoadKeys = Object.keys(info.modulePreLoads);
					try{
						await Promise.all(preLoadKeys.map(async function(plKey, j){
							var plPath = info.modulePreLoads[plKey];	//NOTE: this can be a string or an object ({type: 2, path: 'url'})
							var plType = 1;		//1: text, 2: arraybuffer
							var convert = undefined;
							if (typeof plPath == "object"){
								plType = (plPath.type && (plPath.type == 2 || plPath.type.toLowerCase() == "arraybuffer"))? 2 : 1;
								plPath = plPath.path || plPath.url;
							}else if (plKey.indexOf("wasmFile") == 0){
								plType = 2;
							}else if (plKey.indexOf("wasmBase64") == 0){
								plType = 1;
								convert = convertBase64ToUint8Array;
							}
							var cachePath = plKey + "_" + plPath;
							if (preLoadCache[cachePath]){
								preLoads[plKey] = preLoadCache[cachePath];
							}else{
								try{
									var data;
									if (!plPath || plType > 2){
										throw {name: "PreLoadError", message: "Missing 'path' (url) or unsupported type (use 1=text or 2=arraybuffer)"};
									}else if (plType == 1){
										data = await textLoaderPromise(plPath);
									}else if (plType == 2){
										data = await arrayBufferLoaderPromise(plPath);
									}
									if (typeof convert == "function"){
										data = convert(data);
									}
									preLoads[plKey] = data;
									preLoadCache[cachePath] = data;
								}catch (err){
									throw {name: "AddModuleError", message: ("Failed to pre-load data: " + plKey + " - name: " + moduleName), info: err};
								}
							}
						}));
					}catch (err){
						initializerError(err);
						return;
					}
					//add some context info
					var fullOptions =  moduleSetup.options || {};
					fullOptions.preLoadResults = preLoads;
					
					var thisProcessNode;

					function onMessage(event){
						if (!event || event.data == undefined){
							//TODO: simply ignore?
						}else if (event.data.moduleState == 1){
							//STATE: READY
							thisProcessNode.isReady = true;
							completeInitCondition("module-" + i);
							if (event.data.moduleInfo) thisProcessNode.moduleInfo = event.data.moduleInfo;
							initInfo[i] = {
								moduleName: thisProcessNode.moduleName,
								moduleInfo: thisProcessNode.moduleInfo
							};
							if (--N == 0){
								completeCallback(initInfo);
							}
						}else if (event.data.moduleState == 9 && !thisProcessNode.isTerminated){
							//STATE: READY TO BE TERMINATED
							if (typeof thisProcessNode.terminate == "function"){
								try {
									thisProcessNode.isTerminated = true;
									thisProcessNode.terminate();	
								}catch (err){
									thisProcessNode.isTerminated = true;	//we need this to prevent follow up errors
									onError({name: "TerminateError", message: "Failed to terminate module", info: err});
								}
							}
						}else if (event.data.moduleState == 10){
							//STATE: CUSTOM INIT. ERROR
							event.data.error.target = event.target;
							onError(event.data.error);
							
						}else if (event.data.moduleResponse){
							//RESPONSE to "on-demand" request
							//TODO: ignore?
						}else if (moduleSetup.sendToModules){		//TODO: when do we best clean-up 'sendToModules' to avoid empty loops (processNodes[n] = null)?
							//data for processing or custom event?
							if (event.data.moduleEvent){
								//EVENT
								moduleSetup.sendToModules.forEach(function(n){
									if (processNodes[n] && !processNodes[n].ignoreSendToModules) processNodes[n].sendToModule({ctrl: {action: "handle", data: event.data}});
								});
							}else{
								//PROCESS (default)
								moduleSetup.sendToModules.forEach(function(n){
									if (processNodes[n] && !processNodes[n].ignoreSendToModules) processNodes[n].sendToModule({ctrl: {action: "process", data: event.data}});
								});
							}
						}
						if (moduleSetup.onmessage){
							moduleSetup.onmessage(event.data, processNodes);
						}
					}
					function onError(err){
						//TODO: do something with 'completeInitCondition("module-" + i)' or abort whole processor?
						var errorMessage;
						if (err.message && err.message.indexOf("Uncaught {") == 0){
							err.preventDefault();
							errorMessage = JSON.parse(err.message.replace(/^Uncaught /, ""));
							err.message = errorMessage;
						}else{
							errorMessage = err;
						}
						onProcessorError({
							name: "AudioModuleProcessorException",
							message: ("Error in module: " + err.target.moduleName + " - " + (errorMessage && errorMessage.message? errorMessage.message : "Check console for details.")),
							module: err.target.moduleName,
							info: errorMessage
						});
						if (isInitPending && !isInitialized){
							//completeInitCondition("module-" + i);
							initializerError({message: "Error during setup of module: " + thisProcessNode.moduleName, name: "ProcessorInitError", info: errorMessage});
						}
						if (moduleSetup.onerror){
							moduleSetup.onerror(err);
						}
					}

					//AudioWorkletProcessor
					if (moduleType == 1){
						if (!sourceHasWorkletSupport){
							initializerError({name: "AddModuleError", message: ("Source does not support 'AudioWorkletProcessor' (use only workers instead) - name: " + moduleName)});
							return;
						}
						if (!fullOptions.processorOptions) fullOptions.processorOptions = fullOptions.setup || {};	//common field is "setup"
						if (!fullOptions.processorOptions.ctxInfo){
							fullOptions.processorOptions.ctxInfo = {
								sampleRate: mainAudioContext.sampleRate,
								targetSampleRate: options.targetSampleRate
							}
						}
						thisProcessNode = new AudioWorkletNode(mainAudioContext, moduleName, fullOptions);
						thisProcessNode.isReady = false;
						thisProcessNode.moduleName = moduleName;
						thisProcessNode.port.onmessage = onMessage;
						thisProcessNode.onprocessorerror = onError;
						thisProcessNode.sendToModule = function(msg){ 
							if (!thisProcessNode.isReady){
								onProcessorError({
									name: "AudioModuleProcessorException",
									message: "'sendToModule' was called before module was actually ready. Consider 'startSuspended' option maybe.'",
									module: thisProcessNode.moduleName
								});
							}else{
								thisProcessNode.port.postMessage(msg);
							}
						};
					
					//Web Worker
					}else if (moduleType == 2){
						if (!fullOptions.setup) fullOptions.setup = {};
						if (!fullOptions.setup.ctxInfo){
							fullOptions.setup.ctxInfo = {
								sampleRate: mainAudioContext.sampleRate,
								targetSampleRate: options.targetSampleRate
							}
						}
						thisProcessNode = new Worker(moduleFolder + moduleName.replace(/-worker$/, "") + '-worker.js'); 	//NOTE: a worker has to be named "-worker.js"!
						thisProcessNode.isReady = false;
						thisProcessNode.moduleName = moduleName;
						thisProcessNode.onmessage = onMessage;
						thisProcessNode.onerror = onError;
						thisProcessNode.sendToModule = function(msg){ 
							if (!thisProcessNode.isReady){
								if (msg && msg.ctrl && msg.ctrl.action == "construct") thisProcessNode.postMessage(msg); 	//TODO: consider transerf option: (msg, [transfer]);
								else onProcessorError({
									name: "AudioModuleProcessorException",
									message: "'sendToModule' was called before module was actually ready. Consider 'startSuspended' option maybe.",
									module: thisProcessNode.moduleName
								});
							}else{
								thisProcessNode.postMessage(msg);
							}
						};
						thisProcessNode.sendToModule({ctrl: {action: "construct", options: fullOptions}});
					
					//Script Processor
					}else if (moduleType == 3){
						initializerError({name: "AddModuleError", message: "ScriptProcessor nodes are currently not supported as modules (only source)."});
						return;
					
					//Audio Node
					}else if (moduleType == 4){
						initializerError({name: "AddModuleError", message: "AudioNodes are currently not supported as modules (you can use them as custom source)."});
						return;
					
					}else{
						initializerError({name: "AddModuleError", message: "Unknown module type."});
						return;
					}
					thisProcessNode.moduleType = moduleType;
					thisProcessNode.ignoreSendToModules = false;	//this is most useful for workers to prevent serialization if message is not processed anyway
					thisProcessNode.deactivate = function(){
						thisProcessNode.ignoreSendToModules = true;		//prevent all other modules to send messages to this one
						if (isProcessing){
							//stop and reset if processor is running
							thisProcessNode.sendToModule({ctrl: {action: "stop"}});
							thisProcessNode.sendToModule({ctrl: {action: "reset"}});
						}
					}
					thisProcessNode.activate = function(){
						thisProcessNode.ignoreSendToModules = false;
						if (isProcessing){
							//start if processor is already running
							thisProcessNode.sendToModule({ctrl: {action: "start"}});
						}
					}
					module.handle = thisProcessNode;
					
					//adapt module to first non-worklet source?
					if (!sourceHasWorkletSupport && i == 0){
						var source = processNodes[0];
						if (!source.onmessage){
							initializerError({name: "AddModuleError", message: "If source is not compatible to 'AudioWorklet' it has to have a 'onmessage' event to get the processed data."});
							return;
						}
						source.onmessage = function(e){
							//like 'sendToModules' this can be event or data for processing
							if (!e || e.data == undefined){
								//TODO: ignore?
							}else if (e.data.moduleEvent || e.data.sourceEvent){
								//EVENT
								thisProcessNode.sendToModule({ctrl: {action: "handle", data: e.data}});
							}else{
								//PROCESS (default)
								thisProcessNode.sendToModule({ctrl: {action: "process", data: e.data}});
							}
						}
					}

					processNodes[startIndex + i] = thisProcessNode;
				});
			}else{
				completeCallback([]);
			}
		}			

		//AUDIO SOURCE HANDLER
		
		function sourceHandler(source, controls, metaInfo){
			inputSampleRate = mainAudioContext.sampleRate;
			if (!metaInfo) metaInfo = {};
			if (options.targetSampleRate && options.targetSampleRate != inputSampleRate){
				WebAudio.isNativeStreamResamplingSupported = false;
				sampleRateMismatch = inputSampleRate - options.targetSampleRate;
			}
									
			//Primary node
			var processNodes = [source];	//TODO: handle this for workers as well
			var audioWorkletNodes = [];		//all worklets will be connected in row
			
			//check 'metaInfo.type' and 'metaInfo.hasWorkletSupport'
			var sourceHasWorkletSupport = true;
			if (metaInfo.hasWorkletSupport != undefined){
				sourceHasWorkletSupport = metaInfo.hasWorkletSupport;
			}else if (metaInfo.type == "scriptProcessor"){
				sourceHasWorkletSupport = false;
			}
			//TODO: use sourceHasWorkletSupport
			
			//Connect other modules (nodes/workers)?
			addModules(processNodes, sourceHasWorkletSupport, function(info){
				//complete the rest:
				modulesInitInfo = info;
				completeInitCondition("modulesSetup");
				thisProcessor.processNodes = processNodes;
				
				let hasResampler = false;
				processNodes.forEach(function(node, i){
					if (sourceHasWorkletSupport && (!node.moduleType || node.moduleType == 1)){
						audioWorkletNodes.push(node);
					}
					if (node.moduleInfo && node.moduleInfo["resamplingMode"]) hasResampler = true;
				});

				if (sampleRateMismatch && !hasResampler){
					initializerError({message: "Samplerate mismatch and no resampler found!", name: "ProcessorInitError"});
					return;
				}
			});
			
			//Destination node?
			var destinationNode = options.destinationNode || mainAudioContext.destination;
			
			//source info
			thisProcessor.mainAudioContext = mainAudioContext;
			thisProcessor.source = source;
			thisProcessor.sourceInfo = metaInfo;
			sourceInitInfo = metaInfo;
			
			//controls
			if (!controls) controls = {};	//e.g.: onBeforeStart, onAfterStart, onBeforeStop, onAfterStop, onBeforeRelease, onAfterRelease
			
			//START
			startFun = function(startCallback, errorCallback){
				Promise.resolve((controls.onBeforeStart || noop)())
				.then(function(){
					return mainAudioContext.resume();
				})
				.then(function(){
					//connect worklets
					if (audioWorkletNodes.length > 1){
						for (var i=1; i<audioWorkletNodes.length; i++){
							audioWorkletNodes[i-1].connect(audioWorkletNodes[i]);
						}
						audioWorkletNodes[i-1].connect(destinationNode);
					}else if (audioWorkletNodes.length == 1){
						audioWorkletNodes[0].connect(destinationNode);		//TODO: what if there is no workletNode ...
					}else if (processNodes[0].connect){
						processNodes[0].connect(destinationNode);			//TODO: ... is this ok?
					}
					//signal
					processNodes.forEach(function(node){
						if (node.sendToModule) node.sendToModule({ctrl: {action: "start", options: {}}});	//TODO: add options from moduleOptions?
					});
					if (controls.onAfterStart){
						return Promise.resolve(controls.onAfterStart());
					}
				})
				.then(startCallback)
				.catch(function(err){
					onProcessorError({name: "ProcessorStartError", message: (err.name + " - Message: " + (err.message || err))});
					if (errorCallback) errorCallback(err);
				});
			}
			//STOP
			stopFun = function(stopCallback, errorCallback){
				Promise.resolve((controls.onBeforeStop || noop)())
				.then(function(){
					//disconnect and signal
					processNodes.forEach(function(node, i){
						//if (!node.moduleType || node.moduleType == 1) node.disconnect();		//TODO: should we do this check?
						if (node.disconnect) node.disconnect();
						if (node.sendToModule) node.sendToModule({ctrl: {action: "stop", options: {}}});	//TODO: add options from moduleOptions?
					});
					return mainAudioContext.suspend();
				})
				.then(function(){
					if (controls.onAfterStop){
						return Promise.resolve(controls.onAfterStop());
					}
				})
				.then(stopCallback)
				.catch(function(err){
					onProcessorError({name: "ProcessorStopError", message: (err.name + " - Message: " + (err.message || err))});
					if (errorCallback) errorCallback(err);
				});
			}
			//RELEASE
			releaseFun = function(releaseCallback, errorCallback){
				Promise.resolve((controls.onBeforeRelease || noop)())
				.then(function(){
					//signal
					processNodes.forEach(function(node, i){
						if (node.sendToModule) node.sendToModule({ctrl: {action: "release", options: {}}});		//TODO: add options from moduleOptions?
						processNodes[i] = null;
						//TODO: wait for result, confirm?
					});
					thisProcessor.processNodes = null;
					thisProcessor.source = null;
					//TODO: check state before calling close?
					return mainAudioContext.close();
				})
				.then(function(){
					if (controls.onAfterRelease){
						return Promise.resolve(controls.onAfterRelease());
					}
				})
				.then(releaseCallback)
				.catch(function(err){
					onProcessorError({name: "ProcessorReleaseError", message: (err.name + " - Message: " + (err.message || err))});
					if (errorCallback) errorCallback(err);
				});
			}
			
			completeInitCondition("sourceSetup");
		}
		
		//SOURCE(S)
		
		//Custom source test
		if (options.customSourceTest){
			//NOTE: This is just for testing!
			let thisProcessNode;
			WebAudio.createWhiteNoiseGeneratorNode(0.1, {
				targetSampleRate: options.targetSampleRate
			})
			.then(function(processNode){
				//Audio context and source node
				thisProcessNode = processNode;
				mainAudioContext = processNode.context;
				return createModules();
				
			}).then(function(){
				//continue with source handler
				sourceHandler(thisProcessNode, {}, {
					type: "whiteNoiseGenerator"		//TODO: add more?
				});
				
			}).catch(function(err){
				initializerError(err);
				return;
			});
			
		//Custom source node
		}else if (options.customSource){
			//Get audio context and source node then add modules
			let thisProcessNode = options.customSource.node;
			mainAudioContext = thisProcessNode.context;
			createModules().then(function(){
				//continue with source handler
				sourceHandler(thisProcessNode, {
					onBeforeStart: options.customSource.beforeStart,
					onAfterStart: options.customSource.start || options.customSource.afterStart,
					onBeforeStop: options.customSource.stop || options.customSource.beforeStop,
					onAfterStop: options.customSource.afterStop,
					onBeforeRelease: options.customSource.beforeRelease,
					onAfterRelease: options.customSource.release || options.customSource.afterRelease
				},{
					type: (options.customSource.type || "custom"),		//TODO: add more?
					typeData: options.customSource.typeData,
					hasWorkletSupport: (options.customSource.hasWorkletSupport != undefined)? 
						options.customSource.hasWorkletSupport : true
				});
				
			}).catch(function(err){
				initializerError(err);
				return;
			});
			
		//Cordova Audioinput plugin
		//}else if (isCordovaAudioinputSupported){
			//TODO: implement?
		
		//Official MediaDevices interface using microphone
		}else{
			let micRes;
			WebAudio.getMicrophone(options, createOrUpdateAudioContext).then(function(res){
				//add modules (mainAudioContext is already set)
				micRes = res;
				return createModules();
				
			}).then(function(){
				//continue with source handler
				sourceHandler(micRes.source, micRes.controls || {}, micRes.info);
				
			}).catch(function(err){
				if (typeof err == "string"){
					initializerError({message: err, name: "ProcessorInitError"});
				}else{
					initializerError({message: err.message, name: err.name, ref: err});	//should be err.name = "NotAllowedError", "NotFoundError", "TimeoutError"
				}
				return;
			});
		}
		
		//INTERFACE
		
		thisProcessor.start = function(startCallback, noopCallback, errorCallback){		
			//NOTE: callback management is a bit tricky here - most of the time you should use the common processor callbacks ...
			//... but in some situations you need a more direct feedback. Error here might not call all async. module errors though.
			if (isInitialized && !isProcessing){
				startFun(function(){
					var startTime = new Date().getTime();	//TODO: is this maybe already too late?
					setStateProcessing();
					if (options.onaudiostart) options.onaudiostart({
						startTime: startTime
					});
					if (startCallback) startCallback();
				}, errorCallback);
			}else{
				if (noopCallback) noopCallback();
			}
		}
		
		thisProcessor.stop = function(stopCallback, noopCallback, errorCallback){
			//NOTE: see notes above about callbacks
			if (isProcessing){
				stopFun(function(){
					var endTime = new Date().getTime();		//TODO: is this maybe already too late?
					setStateProcessingStop();
					if (options.onaudioend) options.onaudioend({
						endTime: endTime
					});
					if (stopCallback) stopCallback();
				}, errorCallback);
			}else{
				if (noopCallback) noopCallback();
			}
		}
		
		thisProcessor.release = function(releaseCallback, noopCallback, errorCallback){
			//NOTE: see notes above about callbacks
			if (isInitialized && releaseFun){
				releaseFun(function(){
					resetInitializer();
					if (options.onrelease) options.onrelease();
					if (releaseCallback) releaseCallback();
				}, errorCallback);
			}else if (isInitPending){
				initializerError({message: "Release was called before initialization was complete.", name: "ProcessorInitError"});
			}else{
				if (noopCallback) noopCallback();
			}
		}

		thisProcessor.isInitialized = function(){
			return isInitialized;
		}
		thisProcessor.isInitPending = function(){
			return isInitPending;
		}
		thisProcessor.isProcessing = function(){
			return isProcessing;
		}
	}
	
	//Get audio devices (in and out)
	WebAudio.getAudioDevices = function(timeout){
		return new Promise(function(resolve, reject){
			(async function(){
				if (!navigator.mediaDevices.enumerateDevices){
					return reject({message: "MediaDevices 'enumerateDevices' is not available! Check if context is secure (SSL, HTTPS, etc.).", name: "NotSupportedError"});
				}
				//List media devices - NOTE: if the user does not answer the permission request this will never resolve ... so we fake a timeout
				var didTimeout = false;
				var timeoutTimer = undefined;
				navigator.mediaDevices.enumerateDevices().then(function(devices){
					if (didTimeout)	return;	//NOT reject
					else clearTimeout(timeoutTimer);
					//look for audio in/out
					var audioIn = {};
					var audioOut = {};
					devices.forEach(function(device){
						//console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
						if (device.kind == "audioinput"){
							audioIn[device.label] = device.deviceId;
						}else if (device.kind == "audiooutput"){
							audioOut[device.label] = device.deviceId;
						}
					});
					return resolve({input: audioIn, output: audioOut});
					
				}).catch(function(err) {
					return reject(err);
				});
				timeoutTimer = setTimeout(function(){
					didTimeout = true;
					return reject({message: "Media device enumeration timeout. Permission might require user interaction.", name: "TimeoutError"});
				}, timeout || 5000);
			})();
		});
	};
	
	//Get microphone via MediaDevices interface
	WebAudio.getMicrophone = function(options, asyncCreateOrUpdateAudioContext, timeout){
		if (!options) options = {};		//e.g.: 'targetSampleRate'
		if (!asyncCreateOrUpdateAudioContext){
			asyncCreateOrUpdateAudioContext = async function(forceNew, ignoreOptions){
				var audioContext = WebAudio.createAudioContext(options, ignoreOptions);
				if (options.startSuspended == undefined || options.startSuspended){
					try { await audioContext.resume(); } catch (error){};		//TODO: prevent quirky stuff on e.g. iOS
					await audioContext.suspend();
				}else{
					await audioContext.resume();
				}
				return audioContext;
			};
		}
		return new Promise(function(resolve, reject){
			(async function(){
				var constraints = JSON.parse(JSON.stringify(WebAudio.getSupportedAudioConstraints()));
				//TODO: make microphone constraints accessible via options
				if (constraints.sampleRate && options.targetSampleRate) constraints.sampleRate = options.targetSampleRate;
				//other options: latency: double, sampleSize: 16
				var audioVideoConstraints = { 
					video : false, audio: (Object.keys(constraints).length? constraints : true)
				};
				//'getUserMedia' can be empty in unsecure context!
				if (!navigator.mediaDevices.getUserMedia){
					return reject({message: "MediaDevices 'getUserMedia' is not available! Check if context is secure (SSL, HTTPS, etc.).", name: "NotSupportedError"});
				}
				//NOTE: if the user does not answer the permission request this will never resolve ... so we fake a timeout
				var didTimeout = false;
				var timeoutTimer = undefined;
				navigator.mediaDevices.getUserMedia(audioVideoConstraints).then(async function(stream){
					if (didTimeout)	return;	//NOT reject
					else clearTimeout(timeoutTimer);
					
					//Audio context and source node
					var audioContext;
					if (WebAudio.tryNativeStreamResampling && WebAudio.isNativeStreamResamplingSupported){
						audioContext = await asyncCreateOrUpdateAudioContext(false, false);		//Try native resampling first
					}else{
						audioContext = await asyncCreateOrUpdateAudioContext(false, true);
					}
					
					var source;
					try {
						source = audioContext.createMediaStreamSource(stream);
					}catch(e){
						audioContext = await asyncCreateOrUpdateAudioContext(true, true);
						source = audioContext.createMediaStreamSource(stream);
						if (e && e.name && e.name == "NotSupportedError"){
							WebAudio.isNativeStreamResamplingSupported = false;
							if (options.debugLog) options.debugLog("Native stream resampling has been deactivated - Info: " + e.message);
						}
					}
					
					if (!options.destinationNode){
						options.destinationNode = audioContext.createMediaStreamDestination();
					}
					
					var info = { type: "mic" };
					var track0;
					if (source.mediaStream && source.mediaStream.getAudioTracks){
						try {
							track0 = source.mediaStream.getAudioTracks()[0];
							info.label = track0.label;
							if (track0.getSettings) info.settings = track0.getSettings();
							else info.settings = {};
							info.settings.sampleRate = audioContext.sampleRate;
						}catch(e){};
					}

					var controlEvents = {
						//onBeforeStart, onAfterStart, onBeforeStop, onAfterStop, onBeforeRelease, onAfterRelease
						onBeforeStart: function(){},
						onAfterStop: function(){},
						onAfterRelease: function(){
							//release mic resources
							if (track0 && typeof track0.stop == "function" && track0.readyState == "live"){
								track0.stop();
							}
						}
					}
					
					return resolve({
						source: source,
						controls: controlEvents,
						info: info
					});
					
				}).catch(function(err){
					return reject(err);
				});
				timeoutTimer = setTimeout(function(){
					didTimeout = true;
					return reject({message: "Media 'getUserMedia' timeout. Permission might require user interaction.",	name: "TimeoutError"});
				}, timeout || 5000);
			})();
		});
	};
	
	//Builders
	
	//MediaRecorder
	WebAudio.createAudioRecorder = function(stream, sourceInfo, recorderOptions){
		if (!recorderOptions) recorderOptions = {};		//TODO: option 'decodeToAudioBuffer' is still experimental
		if (!recorderOptions.codec) recorderOptions.codec = "webm_ogg_opus";
		return new Promise(function(resolve, reject){
			(async function(){
				try {
					var sampleRate = sourceInfo.settings.sampleRate;
					if (!sampleRate){
						return reject({message: "Sample-rate unknown! Please add correct 'sourceInfo'.", name: "AudioRecorderError"});
					}
					var channels = sourceInfo.settings.channelCount;
					if (channels > 1){
						//TODO: we only support MONO atm
						return reject({message: "Sorry, but this recorder only supports MONO audio at the moment.", name: "NotSupportedError"});
					}
					var mimeType = recorderOptions.mimeType || WebAudio.defaultMimeTypesForCodecs[recorderOptions.codec] || WebAudio.defaultMimeTypesForCodecs["webm_ogg_opus"];
					var sampleTime = recorderOptions.sampleTime || (recorderOptions.chunkSize? Math.floor(1000/sampleRate * recorderOptions.chunkSize) : 0);
					if (sampleTime && recorderOptions.decodeToAudioBuffer){
						console.error("WARNING: Partial decoding is not supported at the moment! It is possible but requires adding custom headers for each blob!");
						//TODO: try adding custom blob headers (proof of concept: add the first 2 ogg blobs to every following blob)
					}
					//var chunks = [];
					if (!window.MediaRecorder){
						return reject({message: "'MediaRecorder' is not available!", name: "NotSupportedError"});
					}else if (!MediaRecorder.isTypeSupported(mimeType)){
						return reject({message: ("MIME-Type '" + mimeType + "' is not supported!"), name: "NotSupportedError"});
					}else{
						var mediaRecorder = new MediaRecorder(stream, {
							mimeType: mimeType,
							bitsPerSecond: (sampleRate * 2 * channels)
						});
						var startedTS, stoppedTS;
						var triggeredLastData = false;
						
						mediaRecorder.onerror = recorderOptions.onerror || console.error;
						if (recorderOptions.onstart) mediaRecorder.onstart = recorderOptions.onstart;
						if (recorderOptions.onpause) mediaRecorder.onpause = recorderOptions.onpause;
						if (recorderOptions.onresume) mediaRecorder.onresume = recorderOptions.onresume;
						var onStop = recorderOptions.onstop;
						mediaRecorder.onstop = function(e){
							//var blob = new Blob(chunks, {'type' : mimeType});
							//chunks = [];
							//console.log("onstop", "state", mediaRecorder.state);		//DEBUG
							if (onStop && !recorderOptions.decodeToAudioBuffer){
								onStop();		//TODO: we delay stop if we need to decode the blob first to keep original order
							}
						}
						var onDataAvailable = recorderOptions.ondataavailable || recorderOptions.onprocess;
						if (recorderOptions.decodeToAudioBuffer){
							//decode chunks
							if (onDataAvailable) mediaRecorder.ondataavailable = function(e){
								//catch last 'ondataavailable' and delay stop
								//console.log("ondataavailable", "state", mediaRecorder.state);		//DEBUG
								if (mediaRecorder.state == "inactive") triggeredLastData = true;
								if (e && e.data){
									let startDecode = Date.now();
									WebAudio.offlineAudioContextBlobDecoder(sampleRate, channels, e.data, function(audioBuffer){
										if (audioBuffer){
											onDataAvailable({data: audioBuffer.getChannelData(0), decodeTime: (Date.now() - startDecode)});		//TODO: is MONO
										}
										if (!triggeredLastData && recorderOptions.recordLimitMs && ((Date.now() - startedTS) >= recorderOptions.recordLimitMs)){
											stop();
										}else if (triggeredLastData){
											if (onStop) onStop();		//NOTE: we have not stop-event here, but is there anything we need?
										}
									});
								}
							}
						}else{
							if (onDataAvailable) mediaRecorder.ondataavailable = function(e){
								//chunks.push(e.data);
								onDataAvailable(e);
								if (recorderOptions.recordLimitMs && ((Date.now() - startedTS) >= recorderOptions.recordLimitMs)){
									stop();
								}
							}
						}
						var stopTimer;
						var stop = function(){
							if (stopTimer) clearTimeout(stopTimer);
							stoppedTS = Date.now();
							//console.log("AudioRecorder state:", mediaRecorder.state);		//DEBUG
							if (mediaRecorder.state != "inactive") mediaRecorder.stop();
						};
						var start = function(){
							startedTS = Date.now();
							stoppedTS = undefined;
							triggeredLastData = false;
							if (sampleTime){
								mediaRecorder.start(sampleTime);
							}else{
								mediaRecorder.start();
								if (recorderOptions.recordLimitMs){
									stopTimer = setTimeout(stop, recorderOptions.recordLimitMs);	//NOTE: we need this because we have no intermediate results
								}
							}
						};
						return resolve({
							getMediaRecorder: function(){ return mediaRecorder; }, mimeType: mimeType, sourceInfo: sourceInfo, 
							sampleTime: sampleTime,
							start: start, stop: stop
						});
					}
				}catch (err){
					console.error("AudioRecorder", err);
					return reject(err);
				}
			})();
		});
	};
	WebAudio.offlineAudioContextBlobDecoder = function(sampleRate, channels, encodedBlob, callback){
		blobToArray(encodedBlob, function(encodedArray){
			if (!encodedArray){
				callback();
			}else{
				var offlineAudioContext = new OfflineAudioContext(channels, encodedArray.byteLength, sampleRate);
				offlineAudioContext.decodeAudioData(encodedArray, function(audioBuffer){
					callback(audioBuffer);
				}, function(err){
					console.error("offlineAudioContext.decodeAudioData ERROR", err);
					callback();
				});
			}
		});
	}
	function blobToArray(blobData, callback){
		if (!blobData || !blobData.size){
			callback();
		}else if (typeof blobData.arrayBuffer == "function"){
			blobData.arrayBuffer().then(function(buffer){
				callback(buffer);
			}).catch(function(err){
				console.error("blobToArray '.arrayBuffer' ERROR", err);
				callback();
			});
		}else{
			var fr = new FileReader();
			fr.onload = function(){
				callback(fr.result);
			};
			fr.onerror = function(event){
				console.error("blobToArray 'FileReader' ERROR", reader.error, event);
				callback();
			};
			fr.readAsArrayBuffer(blobData);
		}
	}
	WebAudio.blobToArray = blobToArray;
	
	//Legacy script processor node
	WebAudio.createLegacyMicrophoneScriptProcessor = function(options){
		if (!options) options = {};		//e.g. 'destinationNode', 'targetSampleRate' and 'bufferSize' (see 'getMicrophone' for more)
		return WebAudio.getMicrophone(options, undefined).then(function(res){
			//get context
			var source = res.source;
			var audioContext = source.context;
			var sampleRate = audioContext.sampleRate;

			var bufferSize = options.bufferSize || 2048;	//TODO: set undefined for auto-size?
			//for webkit?: bufferSize = 4096 * Math.pow(2, Math.ceil(Math.log(this.sampler.resampleRatio) / Math.log(2))); //2, 4, 8,...
			var channels = 1; //options.channels || 1;		//TODO: only MONO
			//var targetSampleRate = options.targetSampleRate;
			
			var processNode = audioContext.createScriptProcessor(bufferSize, channels, channels);	//bufferSize, numberOfInputChannels, numberOfOutputChannels
			
			source.connect(processNode);
			
			var customSource = {
				node: processNode,
				type: "scriptProcessor",
				typeData: res.info,
				hasWorkletSupport: false, 	//does not fit into audio processing thread (normal worklets)
				start: function(){
					//overwrites afterStart
					if (res.controls.onAfterStart) res.controls.onAfterStart();
				},
				stop: function(){
					//overwrites beforeStop
					if (res.controls.onBeforeStop) res.controls.onBeforeStop();
				},
				release: function(){
					//overwrites afterRelease
					if (res.controls.onAfterRelease) res.controls.onAfterRelease();
				}
				//TODO: implement more?!?
			}
			//remaining controlEvents - beforeStart, afterStart, beforeStop, afterStop, beforeRelease, afterRelease
			if (res.controls){
				if (res.controls.onBeforeStart) customSource.beforeStart = res.controls.onBeforeStart;
				//if (res.controls.onAfterStart) customSource.afterStart = res.controls.onAfterStart;
				//if (res.controls.onBeforeStop) customSource.beforeStop = res.controls.onBeforeStop;
				if (res.controls.onAfterStop) customSource.afterStop = res.controls.onAfterStop;
				if (res.controls.onBeforeRelease) customSource.beforeRelease = res.controls.onBeforeRelease;
				//if (res.controls.onAfterRelease) customSource.afterRelease = res.controls.onAfterRelease;
			}

			if (options.onaudioprocess){
				//this is the classic script processor callback
				processNode.onaudioprocess = options.onaudioprocess;
				//NOTE: we don't assign 'onmessage' here to make sure the module processor throws an error ... because it never gets called
			}else{
				//this resembles the module interface
				function convertEvent(e){
					if (e && e.inputBuffer){
						var samples = [e.inputBuffer.getChannelData(0)];	//TODO: only MONO
						processNode.onmessage({
							data: {
								samples: samples,
								sampleRate: sampleRate,
								channels: channels,
								//isLast: false,
								type: samples[0].constructor.name
							}
						});		
					}
				}
				processNode.onaudioprocess = function(e){ convertEvent(e); };
				processNode.onmessage = options.onmessage || function(e){};
			}
			
			return customSource;
		});
	}
	
	//White-noise-generator node for testing
	WebAudio.createWhiteNoiseGeneratorNode = function(noiseGain, ctxOptions, onMessageCallback){
		if (!ctxOptions) ctxOptions = {};		//e.g. 'targetSampleRate'
		var moduleFolder = WebAudio.defaultProcessorOptions.moduleFolder.replace(/\/$/, "") + "/";
		return new Promise(function(resolve, reject){
			(async function(){
				try {
					//Audio context and source node
					var audioContext = WebAudio.createAudioContext(ctxOptions);
					try { await audioContext.resume(); } catch(error){};		//TODO: prevent quirky stuff on e.g. iOS
					await audioContext.suspend();
					
					var modulePath = moduleFolder + "white-noise-generator.js";
					await audioContext.audioWorklet.addModule(modulePath);

					var thisProcessNode = new AudioWorkletNode(audioContext, "white-noise-generator", {
						//settings
						processorOptions: {
							gain: (noiseGain || 0.1)
						}
					});
					if (onMessageCallback){
						//just in case
						thisProcessNode.port.onmessage = onMessageCallback;
					}
					resolve(thisProcessNode);
					
				}catch (err){
					return reject(err);
				}
			})();
		});
	};
	
	//File AudioBufferSourceNode with start/stop/release
	WebAudio.createFileSource = function(fileUrl, ctxOptions, loop, onEndCallback){
		if (!ctxOptions) ctxOptions = {};		//e.g.: 'targetSampleRate'
		return new Promise(function(resolve, reject){
			try {
				function errorCallback(err){
					reject(err);
				}
				function successCallback(arrayBuffer){
					WebAudio.createAudioBufferSource(arrayBuffer, ctxOptions, loop, onEndCallback)
					.then(function(res){
						res.typeData = {
							fileUrl: fileUrl
						}
						resolve(res);
					})
					.catch(errorCallback);
				}
				WebAudio.readFileAsBuffer(fileUrl, successCallback, errorCallback);
				
			}catch (err){
				reject(err);
			}
		});
	}
	//Direct AudioBufferSourceNode with start/stop/release
	WebAudio.createAudioBufferSource = function(audioBuffer, ctxOptions, loop, onEndCallback){
		if (!ctxOptions) ctxOptions = {};		//e.g.: 'targetSampleRate'
		return new Promise(function(resolve, reject){
			(async function(){
				try {
					//AudioContext and AudioBufferSourceNode - NOTE: maybe useful: new OfflineAudioContext(1, 128, 16000);
					var audioContext = WebAudio.createAudioContext(ctxOptions);
					try { await audioContext.resume(); } catch(error){};		//TODO: prevent quirky stuff on e.g. iOS
					await audioContext.suspend();
					var audioBufferSourceNode = audioContext.createBufferSource();
					//decode to get buffer
					audioContext.decodeAudioData(audioBuffer, function(buffer){
						audioBufferSourceNode.buffer = buffer;
						audioBufferSourceNode.loop = (loop != undefined)? loop : true;
						if (onEndCallback) audioBufferSourceNode.onended = onEndCallback;	//NOTE: req. loop=false
						return resolve({
							node: audioBufferSourceNode,
							type: "fileAudioBuffer",
							typeData: {},
							start: function(){ audioBufferSourceNode.start(); },
							stop: function(){ audioBufferSourceNode.stop(); },
							release: function(){}	//TODO: ?!?
						});
					}, function(err){ 
						return reject(err);
					});
				}catch (err){
					return reject(err);
				}
			})();
		});
	}
	
	//Create player for source nodes (e.g. audio URL or buffer nodes)
	WebAudio.createSourceAudioPlayer = function(source, options, audioModules, onInit, onInitError){
		if (!options) options = {};
		options.modules = audioModules || [];
		options.customSource = source;	//important source prop.: 'loop' and 'onended'
		if (options.startSuspended == undefined) options.startSuspended = true;
		var webAudioProcessor = new WebAudio.Processor(options, onInit, onInitError);
		return webAudioProcessor;
	}
	
	//Encode buffer to wave
	WebAudio.encodeWaveBuffer = function(buffer, sampleRate, channels, isFloat32, successCallback, errorCallback){
		var moduleFolder = WebAudio.defaultProcessorOptions.moduleFolder.replace(/\/$/, "") + "/";
		var encoderWorker = new Worker(moduleFolder + 'wave-encoder' + '-worker.js');
		if (!successCallback) successCallback = console.log;
		if (!errorCallback) errorCallback = console.error;
		var options = {
			setup: {
				inputSampleRate: sampleRate,
				inputSampleSize: buffer.length,
				lookbackBufferMs: 0
			}
		};
		encoderWorker.onmessage = function(e){
			if (e.data.moduleState == 1){
				encoderWorker.postMessage({encode: {format: "wave", data: {
					samples: [buffer],		//MONO or interleaved in channel 1
					sampleRate: sampleRate, 
					channels: channels, 
					isFloat32: isFloat32
				}}});
			}else if (e.data.encoderResult){
				encoderWorker.terminate();
				if (e.data.error){
					errorCallback({name: "EncoderError", message: e.data.error});
				}else{
					successCallback(e.data.encoderResult);
				}
			}
		};
		encoderWorker.onerror = function(err){
			encoderWorker.terminate();
			errorCallback(err);
		}
		encoderWorker.postMessage({ctrl: {action: "construct", options: options}});
	}
	//Decode audio file to audio buffer
	WebAudio.decodeAudioFile = function(fileUrl, sampleRate, channels, successCallback, errorCallback){
		WebAudio.readFileAsBuffer(fileUrl, function(encodedArray){
			var offlineAudioContext = new OfflineAudioContext(channels, encodedArray.byteLength, sampleRate);
			offlineAudioContext.decodeAudioData(encodedArray, function(audioBuffer){
				successCallback(audioBuffer);
			}, function(err){
				errorCallback(err);
			});
		}, function(err){
			errorCallback(err);
		});
	}
	//Decode audio file to audio buffer
	WebAudio.decodeAudioFileToInt16Mono = function(fileUrl, sampleRate, successCallback, errorCallback){
		var channels = 1;
		WebAudio.decodeAudioFile(fileUrl, sampleRate, channels, function(audioBuffer){
			var isFloat32 = true;
			WebAudio.encodeWaveBuffer(audioBuffer.getChannelData(0), sampleRate, channels, isFloat32, function(res){
				try {
					var samplesInt16Mono = new Int16Array(res.wav.buffer);
					successCallback(samplesInt16Mono);
				}catch(err){
					errorCallback(err);
				}
			}, errorCallback);
		}, errorCallback);
	}
	
	//WASM resampler
	WebAudio.resampleBufferViaSpeex = function(buffer, inputSampleRate, targetSampleRate, channels, quality, successCallback, errorCallback){
		if (!successCallback) successCallback = console.log;
		if (!errorCallback) errorCallback = console.error;
		try {
			var offlineAudioContext = new OfflineAudioContext(channels, buffer.length, inputSampleRate);	//we just need this to setup the module
			var moduleFolder = WebAudio.defaultProcessorOptions.moduleFolder.replace(/\/$/, "") + "/";
			var moduleName = "speex-resample-switch";
			offlineAudioContext.audioWorklet.addModule(moduleFolder + moduleName + ".js").then(function(){	//NOTE: if the folder is wrong this can fail with poor error message
				var options = {
					processorOptions: {
						ctxInfo: {
							sampleRate: inputSampleRate
						},
						targetSampleRate: targetSampleRate,
						resampleQuality: quality, 		//1-10
						bufferSize: buffer.length
						//passThroughMode: 1,
						//calculateRmsVolume: true
					}
				};
				var processNode = new AudioWorkletNode(offlineAudioContext, moduleName, options);
				processNode.port.onmessage = function(e){
					if (e.data.moduleState == 1){
						processNode.port.postMessage({resample: {
							samples: [buffer],
							isInt16: true
						}});
					}else if (e.data.resampleResult){
						offlineAudioContext = null;
						if (e.data.error){
							errorCallback({name: "ResampleError", message: e.data.error});
						}else{
							successCallback(e.data.resampleResult);
						}
					}
				};
				processNode.onprocessorerror = function(err){
					offlineAudioContext = null;
					errorCallback(err);
				};
			});
		}catch(err){
			errorCallback(err);
		}
	}
	
	//Commons
	
	//File reader
	WebAudio.readFileAsBuffer = function(fileUrl, successCallback, errorCallback){
		if (SepiaFW && SepiaFW.files){
			//more robust method
			SepiaFW.files.fetch(fileUrl, successCallback, errorCallback, "arraybuffer", WebAudio.contentFetchTimeout);
		}else{
			//fallback
			xmlHttpCall('arraybuffer', fileUrl, successCallback, errorCallback);
		}
	}
	WebAudio.readFileAsText = function(fileUrl, successCallback, errorCallback){
		if (SepiaFW && SepiaFW.files){
			SepiaFW.files.fetch(fileUrl, successCallback, errorCallback, undefined, WebAudio.contentFetchTimeout);	//default: text
		}else{
			xmlHttpCall('text', fileUrl, successCallback, errorCallback);
		}
	}
	function arrayBufferLoaderPromise(url){
		return new Promise(function(resolve, reject){
			WebAudio.readFileAsBuffer(url, function(arraybuffer){ resolve(arraybuffer); }, function(err){ reject(err); });
		});
	}
	function textLoaderPromise(url){
		return new Promise(function(resolve, reject){
			WebAudio.readFileAsText(url, function(text){ resolve(text); }, function(err){ reject(err); });
		});
	}
	function xmlHttpCall(responseType, fileUrl, successCallback, errorCallback){
		var request = new XMLHttpRequest();
		request.open('GET', fileUrl);
		request.responseType = responseType; //'arraybuffer';
		request.timeout = WebAudio.contentFetchTimeout;
		request.onload = function(e){
			if (request.status >= 200 && request.status < 300){
				successCallback(request.response); 	//the arraybuffer is in request.response
			}else{
				errorCallback({
					status: request.status,
					message: request.statusText
				});
			}
		};
		request.onerror = function(e){
			errorCallback(e);
		};
		request.ontimeout = function(e){
			errorCallback(e);
		};
		request.send();
	}

	//Base64 converter
	function convertBase64ToUint8Array(s){
		try {
			var decoded = atob(s);
			var bytes = new Uint8Array(decoded.length);
			for (var i = 0; i < decoded.length; ++i){
				bytes[i] = decoded.charCodeAt(i);
			}
			return bytes;
		}catch (error){
			throw new Error("Converting base64 string to Uint8Array bytes array failed.");
		}
	}
	function convertUint8ArrayToBase64String(uint8Array){
		try {
			return btoa(uint8Array.reduce(function(data, byte){ return data + String.fromCharCode(byte); }, ''));
		}catch (error){
			throw new Error("Converting Uint8Array to base64 string failed.");
		}
	}
	//export
	WebAudio.base64 = {
		base64StringToUint8Array: convertBase64ToUint8Array,
		uint8ArrayToBase64String: convertUint8ArrayToBase64String
	}
	
	//Add audio data as audio element to element on page (or body)
	WebAudio.addAudioElementToPage = function(targetEle, audioData, audioType){
		var audioEle = document.createElement("audio");
		audioEle.src = window.URL.createObjectURL((audioData.constructor.name == "Blob")?
			audioData : (new Blob([audioData], { type: (audioType || "audio/wav") })));
		audioEle.setAttribute("controls", "controls");
		var audioBox = document.createElement("div");
		audioBox.appendChild(audioEle);
		if (!targetEle) targetEle = document.body;
		targetEle.appendChild(audioBox);
		return audioEle;
	}
	
	//used to keep Promise structure, e.g.: Promise.resolve((optionalFun || noop)()).then(...)
	function noop(){};

	//<--- END: Copy of SEPIA Web-Audio Lib ---
	
	return WebAudio;
}
