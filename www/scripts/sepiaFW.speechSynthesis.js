//TTS - Part 2 of SepiaFW.speech
function sepiaFW_build_speech_synthesis(Speech, sepiaSessionId){
		
	//SETUP
	var synthID = 0;
	var voiceEngines = [];
	var voiceEngineNames = {};
	var voices = [];
	var selectedVoice = '';
	var selectedVoiceObject;
	var isTtsInitialized = false;
	var isSpeaking = false;
	var speechWaitingForResult = false;
	var speechWaitingForStop = false;
	var stopSpeechTimeout;
	Speech.isNativeTtsSupported = (SepiaFW.ui.isCordova)? ('TTS' in window) : ('speechSynthesis' in window);
	Speech.isHtmlTtsSupported = ($('#sepiaFW-audio-speaker').length && $('#sepiaFW-audio-speaker')[0].canPlayType && $('#sepiaFW-audio-speaker')[0].canPlayType("audio/mp3"));	//set WAV?
	Speech.isTtsSupported = Speech.isNativeTtsSupported || Speech.isHtmlTtsSupported;
	SepiaFW.debug.log("TTS: Supported interfaces: native=" + Speech.isNativeTtsSupported + ", sepia=" + Speech.isHtmlTtsSupported + ".");
	Speech.voiceEngine = SepiaFW.data.getPermanent('voiceEngine') || SepiaFW.data.get('speech-voice-engine') || '';		//2nd value is legacy support
	Speech.voiceCustomServer = SepiaFW.data.getPermanent('voiceCustomServerURI') || '';
	Speech.skipTTS = false;		//skip TTS but trigger 'success' callback

	//get TTS engines - load them and return a select element to show them somewhere
	Speech.getTtsEnginesSelector = function(onChange){
		var ttsSelector = document.getElementById('sepiaFW-menu-select-voice-engine') || document.createElement('select');
		ttsSelector.id = 'sepiaFW-menu-select-voice-engine';
		$(ttsSelector).find('option').remove();
		voiceEngines = [];
		voiceEngineNames = {};
		//first option is select
		var headerOption = document.createElement('option');
		headerOption.selected = true;
		headerOption.disabled = true;
		headerOption.textContent = "- select -";
		ttsSelector.appendChild(headerOption);
		//check others
		if (Speech.isNativeTtsSupported){
			voiceEngines.push("native");
			voiceEngineNames["native"] = "Native";
		}
		if (Speech.isHtmlTtsSupported){
			voiceEngines.push("sepia");
			voiceEngineNames["sepia"] = "SEPIA (Stream)";

			voiceEngines.push("custom-mary-api");
			voiceEngineNames["custom-mary-api"] = "Mary-TTS API";
		}
		voiceEngines.forEach(function(engine){
			var option = document.createElement('option');
			option.value = engine;
			option.textContent = voiceEngineNames[engine];
			ttsSelector.appendChild(option);
			if (Speech.voiceEngine == engine){
				option.selected = true;
				headerOption.selected = false;
			}
		});
		SepiaFW.debug.info('TTS engines available: ' + voiceEngines.length);
		//add button listener
		$(ttsSelector).off().on('change', function() {
			var reloadVoices = true;
			var selectedEngine = $('#sepiaFW-menu-select-voice-engine').val();
			Speech.setVoiceEngine(selectedEngine, reloadVoices);
			if (onChange) onChange(selectedEngine);
		});
		if (voiceEngines.length === 0){
			var option = document.createElement('option');
			option.value = '';
			option.textContent = 'not supported';
			ttsSelector.appendChild(option);
		}
		return ttsSelector;
	}
	Speech.setVoiceCustomServer = function(newUrl){
		Speech.voiceCustomServer = newUrl;
		if (!newUrl){
			SepiaFW.data.delPermanent('voiceCustomServerURI');
		}else{
			SepiaFW.data.setPermanent('voiceCustomServerURI', newUrl);
			SepiaFW.debug.log("TTS: Set custom voice synth. server: " + newUrl);
		}
	}
	Speech.getVoiceCustomServer = function(){
		return Speech.voiceCustomServer;
	}
	Speech.getVoiceEngine = function(){
		return Speech.voiceEngine;
	}
	Speech.setVoiceEngine = function(voiceEngine, reloadVoices){
		if (voiceEngine == 'native'){
			if (!Speech.isNativeTtsSupported){
				SepiaFW.debug.err("TTS: Tried to set 'native' voice engine but it is not supported by this client!");
				voiceEngine = "";
			}
		}else if (voiceEngine == 'sepia'){
			if (!Speech.isHtmlTtsSupported){
				SepiaFW.debug.err("TTS: Tried to set 'SEPIA server' TTS engine but it is not supported by this client!");
				voiceEngine = "";
			}
		}else if (voiceEngine == "custom-mary-api"){
			if (!Speech.isHtmlTtsSupported){		//TODO: do we have to check WAV here?
				SepiaFW.debug.err("TTS: Tried to set 'Mary-TTS API' engine but it is not supported by this client!");
				voiceEngine = "";
			}
		}
		if (!voiceEngine){
			//voiceEngine not known or not given, set default
			if (Speech.isNativeTtsSupported){
				voiceEngine = 'native';
			}else if (Speech.isHtmlTtsSupported){
				voiceEngine = 'sepia';
			}
		}
		if (voiceEngine){
			SepiaFW.data.setPermanent('voiceEngine', voiceEngine);
			Speech.voiceEngine = voiceEngine;
			SepiaFW.debug.log("TTS: Using '" + voiceEngine + "' engine.");
		}
		if (reloadVoices){
			//clean settings - TODO: keep settings for each engine
			selectedVoice = "";
			selectedVoiceObject = {};
			SepiaFW.local.getSupportedAppLanguages().forEach(function(langObj){
				if (!langObj.disabled){
					SepiaFW.data.delPermanent(langObj.value + "-voice");
				}
			});
			//load new
			Speech.getVoices();
		}
	} 
	Speech.setVoiceEngine(Speech.voiceEngine, false);

	Speech.isSpeaking = function(){
		return isSpeaking;
	}
	Speech.isWaitingForSpeech = function(){
		return speechWaitingForResult;
	}
	Speech.isWaitingForSpeechStop = function(){
		return speechWaitingForStop;
	}

	//--------broadcast methods----------

	function broadcastTtsRequested(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.loading();
		SepiaFW.audio.fadeOut();
	}
	function broadcastTtsFinished(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('ttsFinished');
	}
	function broadcastTtsSkipped(){
		//EXAMPLE: 
		//SepiaFW.animate.assistant.idle('ttsSkipped');
		//NOTE: we don't use 'idle' but rely on 'Assistant.setState'
	}
	function broadcastTtsStarted(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.speaking();
	}
	function broadcastTtsError(){
		//EXAMPLE: 
		SepiaFW.animate.assistant.idle('ttsError');
		Speech.dispatchSpeechEvent("tts_error", "unknown");
	}
	
	// ------------- Interface ---------------

	//Enable/disable TTS - NOTE: will not set menu button to correct state :-(
	Speech.enableVoice = function(skipStore){
		Speech.skipTTS = false;
		if (!skipStore)	SepiaFW.data.set('skipTTS', false);
		SepiaFW.debug.info("TTS is ON");
	}
	Speech.disableVoice = function(skipStore){
		Speech.skipTTS = true;
		if (!skipStore)	SepiaFW.data.set('skipTTS', true);
		SepiaFW.debug.info("TTS is OFF");
	}
	
	//get voices - load them and return a select element to show them somewhere
	Speech.getVoices = function(successCallback){
		var voiceSelector = document.getElementById('sepiaFW-menu-select-voice') || document.createElement('select');
		voiceSelector.id = 'sepiaFW-menu-select-voice';
		voiceSelector.style.maxWidth = "200px";		//hack to fit menue better
		$(voiceSelector).find('option').remove();
		voices = [];
		//first option is select
		var headerOption = document.createElement('option');
		headerOption.selected = true;
		headerOption.disabled = true;
		headerOption.textContent = "- select -";
		voiceSelector.appendChild(headerOption);

		if (Speech.voiceEngine == 'sepia' || Speech.voiceEngine == 'custom-mary-api'){
			//SEPIA server or MARY-TTS API
			Speech.getTtsStreamVoices(function(voicesArray){
				//success
				var option = document.createElement('option');
				option.value = "";
				option.textContent = "- automatic -";
				voiceSelector.appendChild(option);
				//add all voices to global array
				if (voicesArray && voicesArray.length > 0){
					voicesArray.forEach(function(v){
						voices.push(v);
					});
				}
				addVoicesToSelector(voices, voiceSelector);
				if (successCallback) successCallback(voices, voiceSelector);
			}, function(err){
				//error
				SepiaFW.debug.error("Failed to get server voices for '" + Speech.voiceEngine + "'. Please check connection and support.");
				var option = document.createElement('option');
				option.value = "";
				option.textContent = "- no voices -";
				voiceSelector.appendChild(option);
				addVoicesToSelector(voices, voiceSelector);
				if (successCallback) successCallback(voices, voiceSelector);
			});

		}else if (Speech.isTtsSupported && !SepiaFW.ui.isCordova){
			//Web Speech API
			voices = window.speechSynthesis.getVoices();
			var option = document.createElement('option');
			if (voices.length === 0){
				option.value = "";
				option.textContent = "- no voices -";
			}else{
				option.value = "";
				option.textContent = "- automatic -";
			}
			voiceSelector.appendChild(option);
			addVoicesToSelector(voices, voiceSelector);
			if (successCallback) successCallback(voices, voiceSelector);

		}else if (Speech.isTtsSupported && SepiaFW.ui.isCordova){
			//Cordova system voices not yet implemented
			var option = document.createElement('option');
			option.value = '';
			option.textContent = '- system -';
			voiceSelector.appendChild(option);
			//TODO: extend?
			addVoicesToSelector(voices, voiceSelector);
			if (successCallback) successCallback(voices, voiceSelector);
		}
	}
	function addVoicesToSelector(voices, voiceSelector){
		if (voices && voices.length > 0){
			voices.forEach(function(voice){
				var option = document.createElement('option');
				option.value = voice.name;
				option.textContent = voice.name; //.replace(/(microsoft|google|apple)/ig, '').replace(/(\(.*?\))/g, '').trim();
				voiceSelector.appendChild(option);
			});
		}
		SepiaFW.debug.info('TTS voices available: ' + voices.length);
		//add button listener
		$(voiceSelector).off().on('change', function(){
			var newVoice = $('#sepiaFW-menu-select-voice').val();
			SepiaFW.debug.info('TTS voice selected: ' + newVoice);
			Speech.setVoice(newVoice);
		});

		if (voices.length > 0){
			setVoiceOnce();
		}
		//refresh selector once more?
		$(voiceSelector).val(Speech.getActiveVoice());
	}
	
	//Chrome loads voices asynchronously so keep an eye on that:
	if (window.speechSynthesis){
		window.speechSynthesis.onvoiceschanged = function(){
			if (Speech.voiceEngine == 'native'){
				Speech.getVoices();
			}
		};
	}
	
	//set a voice
	Speech.setVoice = function(newVoice){
		//console.error("TRACE SET VOICE - v: " + newVoice);		//DEBUG
		if (!voices || !voices.length || !voices.filter(function(v){ return v.name == newVoice; })){
			//console.error("VOICE NOT FOUND, setting empty");		//DEBUG
			newVoice = "";
		}
		if (Speech.isTtsSupported){
			if (Speech.voiceEngine == 'sepia'){
				//custom voices
				selectedVoice = newVoice;
				selectedVoiceObject = {
					name: newVoice
				}
				SepiaFW.debug.log("TTS voice set: " + ((newVoice)? newVoice : "undefined"));
				//store in any case
				$('#sepiaFW-menu-select-voice').val(newVoice);
				SepiaFW.data.setPermanent(Speech.getLanguage() + "-voice", newVoice);
				//prep. engine
				Speech.sepiaTTS.setup({		//TODO: update with actual data from server?
					voice: selectedVoice
				});
				//restore voice effects
				SepiaFW.audio.tts.restoreVoiceEffect(selectedVoice, function(){});

			}else if (Speech.voiceEngine == 'custom-mary-api'){
				//custom voices
				selectedVoice = newVoice;
				selectedVoiceObject = {
					name: newVoice
				}
				SepiaFW.debug.log("TTS voice set: " + ((newVoice)? newVoice : "undefined"));
				//store in any case
				$('#sepiaFW-menu-select-voice').val(newVoice);
				SepiaFW.data.setPermanent(Speech.getLanguage() + "-voice", newVoice);
				//prep. engine
				Speech.maryTTS.setup({
					voice: selectedVoice
				});
				//restore voice effects
				SepiaFW.audio.tts.restoreVoiceEffect(selectedVoice, function(){});

			}else if (SepiaFW.ui.isCordova){
				//TODO: implement

			}else{
				//native voices
				selectedVoice = newVoice;
				if (selectedVoice){
					selectedVoiceObject = window.speechSynthesis.getVoices().find(function(voice){
						return (voice && voice.name && (voice.name === selectedVoice));
					});
					if (!selectedVoiceObject) selectedVoiceObject = {};
				}else{
					selectedVoiceObject = {};
				}
				SepiaFW.debug.log("TTS voice set: " + ((selectedVoiceObject.name)? selectedVoiceObject.name : "undefined"));
				//store if deliberately empty or match
				if (!selectedVoice || selectedVoiceObject.name){
					$('#sepiaFW-menu-select-voice').val(selectedVoice);
					SepiaFW.data.setPermanent(Speech.getLanguage() + "-voice", selectedVoice);
				}
			}
		}
	}
	Speech.getActiveVoice = function(){
		return selectedVoice;
	}
	Speech.refreshVoice = function(){
		if (voices && voices.length > 0){
			selectedVoice = undefined;
			setVoiceOnce();
		}
	}
	Speech.findVoiceObjForLanguage = function(lang){
		if (voices && voices.length > 0){
			lang = lang.replace(/(-|_).*/, "").trim().toLowerCase();
			var knownSelection = SepiaFW.data.getPermanent(lang + "-voice");
			var bestFitV;
			if (knownSelection) bestFitV = voices.find(function(v){ return (v.name && v.name == knownSelection); });
			if (!bestFitV) bestFitV = voices.find(function(v){ return (v.lang && v.lang.indexOf(lang) == 0); });
			return bestFitV;
		}else{
			return;		//we only search in pre-loaded voices for now
		}
	}
	
	//speak an utterance
	Speech.speak = function(text, finishedCallback, errorCallback, startedCallback, options){
		//NOTE: this is the high level function with all events etc...
		//		If you need the direct interface with default settings use 'SepiaFW.audio.tts.speak'
		if (!options) options = {};
		
		//stop running stuff
		if (isSpeaking){
			Speech.stopSpeech();
			clearTimeout(stopSpeechTimeout);
			stopSpeechTimeout = setTimeout(function(){
				Speech.speak(text, finishedCallback, errorCallback, startedCallback, options);
			}, 500);
			return;
		}
		clearTimeout(stopSpeechTimeout);
		
		//some engine settings
		if (Speech.voiceEngine == 'sepia'){
			//load settings by voice
			Speech.sepiaTTS.setup({		//TODO: update with actual data from server
				voice: selectedVoice
			});		
			//chunk text if there is a limit
			if (Speech.sepiaTTS.settings.maxChunkLength){
				text = chunkUtterance(text, Speech.sepiaTTS.settings.maxChunkLength);
			}

		}else if (Speech.voiceEngine == 'custom-mary-api'){
			//load settings by voice
			Speech.maryTTS.setup({		//TODO: update with actual data from server
				voice: selectedVoice
			});		
			//chunk text if there is a limit
			if (Speech.maryTTS.settings.maxChunkLength){
				text = chunkUtterance(text, Speech.sepiaTTS.settings.maxChunkLength);
			}

		}else{
			//chunk text if there is a limit
			//TODO: 'isChromiumDesktop' is not the entire truth, it depends on the selected voice!
			if (SepiaFW.ui.isChromiumDesktop && text && !Speech.skipTTS && Speech.isTtsSupported){
				text = chunkUtterance(text);
			}
		}
		
		//skip but send success
		if (!text || Speech.skipTTS || !Speech.isTtsSupported){
			if (finishedCallback){
				broadcastTtsSkipped();
				finishedCallback();
			}
			return;
		}

		//one-time voice change? - TODO: not all engines support this yet
		var oneTimeVoice;
		if (options.oneTimeLanguage && Speech.getLanguage() != options.oneTimeLanguage){
			oneTimeVoice = Speech.findVoiceObjForLanguage(options.oneTimeLanguage);	
		}
		if (oneTimeVoice) options.oneTimeVoice = oneTimeVoice;
		else options.oneTimeVoice = undefined;		//make sure this is only set after 'findVoiceForLanguage' 

		//Streaming audio server (e.g. SEPIA, MARY-TTS API)
		if (Speech.voiceEngine == 'sepia' || Speech.voiceEngine == 'custom-mary-api'){
			broadcastTtsRequested();
			speechWaitingForResult = true;
			synthID++;
			SepiaFW.audio.tts.speak(text, function(e){	//NOTE: this will call 'SepiaFW.speech.getTtsStreamURL'
				//onStart
				var event = {};
				event.msg = e;
				onTtsStart(event, startedCallback, errorCallback);
			}, function(e){
				//onEnd
				var event = {};
				event.msg = e;
				onTtsEnd(event, finishedCallback);
			}, function(reason){
				//onError
				var event = {};
				event.msg = reason;
				onTtsError(event, errorCallback);
			}, options);
		
		//NATIVE-TTS
		}else if (SepiaFW.ui.isCordova){
			if (!("TTS" in window) || typeof TTS.speak != "function"){
				//onError
				onTtsError({msg: "NotSupported"}, errorCallback);
				return;
			}
			broadcastTtsRequested();
			speechWaitingForResult = true;
			synthID++;
			onTtsStart(undefined, startedCallback, errorCallback);
			TTS.speak({			//Cordova plugin!
				text: text,
				locale: Speech.getLongLanguageCode(Speech.getLanguage()),	//TODO: support one-time lang.? Check support!
				rate: 1.00
				
			}, function () {
				var event = {};
				event.msg = "all good";
				onTtsEnd(event, finishedCallback);
				
			}, function (reason) {
				var event = {};
				event.msg = reason;		//string from plugin, e.g.: "ERR_INVALID_OPTIONS"
				onTtsError(event, errorCallback);
			});
		
		//WEB-SPEECH-API
		}else{
			window.sepia_tts_utterances = []; 		//This is a bug-fix to prevent utterance from getting garbage collected
			var utterance = new SpeechSynthesisUtterance();
			utterance.text = text;
			if (options.oneTimeVoice){
				//support for one-time language switch
				utterance.lang = Speech.getLongLanguageCode(options.oneTimeLanguage);
				utterance.voice = options.oneTimeVoice;
			}else{
				utterance.lang = Speech.getLongLanguageCode(Speech.getLanguage());
				//set voice if valid one was selected
				if (selectedVoiceObject && selectedVoiceObject.name) utterance.voice = selectedVoiceObject;
			}
			utterance.pitch = 1.0;  	//accepted values: 0-2 inclusive, default value: 1
			utterance.rate = 1.0; 		//accepted values: 0.1-10 inclusive, default value: 1
			utterance.volume = 1.0; 	//accepted values: 0-1, default value: 1

			//lastUtterance = utterance;
			//window.speechSynthesis.speak(utterance);
			
			utterance.onend = function(event){
				onTtsEnd(event, finishedCallback);
			}
			utterance.onstart = function(event){
				onTtsStart(event, startedCallback, errorCallback);
				//observer synth for Chrome bug?
				if (SepiaFW.ui.isChromiumDesktop){
					var thisSynthID = synthID;
					observeTTsOutput(thisSynthID, 200, utterance, errorCallback);
				}
			}
			utterance.onerror = function(event){
				onTtsError(event, errorCallback);
			}
			utterance.onpause = function(event){
				synthID++;
				SepiaFW.debug.info('TTS: pause');
			}
			utterance.onboundary = function(event) {
				SepiaFW.debug.info('TTS: onboundary');
			}
			
			setTimeout(function(){
				broadcastTtsRequested();
				speechWaitingForResult = true;
				window.sepia_tts_utterances.push(utterance); 	//bug-fix see above
				window.speechSynthesis.speak(utterance);
			}, 0);
		}

		//dispatch event
		Speech.dispatchSpeechEvent("tts_speak", text);
	}	
	function onTtsStart(event, startedCallback, errorCallback){
		speechWaitingForStop = false;
		speechWaitingForResult = false;
		isSpeaking = true;
		broadcastTtsStarted();
		if (startedCallback){
			startedCallback();
		}
		SepiaFW.debug.info('TTS: started');
	}
	function onTtsEnd(event, finishedCallback){
		speechWaitingForStop = false;
		speechWaitingForResult = false;
		isSpeaking = false;
		broadcastTtsFinished();
		if (finishedCallback){
			finishedCallback();
		}
		SepiaFW.debug.info('TTS: ended');
		synthID++;
	}
	function onTtsError(event, errorCallback){
		synthOnError(event, errorCallback);
	}
	
	//Error method for TTS to be called outside as well
	function synthOnError(event, errorCallback){
		speechWaitingForStop = false;
		speechWaitingForResult = false;
		isSpeaking = false;
		broadcastTtsError();
		if (errorCallback){
			errorCallback(event);
		}
		SepiaFW.debug.err('TTS: '); // + (event)? ((event.error)? event.error : event) : 'unknown error');
		SepiaFW.debug.object(event, 'err');		//SepiaFW.debug.object(event.utterance, 'err');
		synthID++;
	}
	
	//stop speech
	Speech.stopSpeech = function(){
		if (speechWaitingForStop){
			return;
		}
		if (Speech.isTtsSupported && isSpeaking){
			speechWaitingForStop = true;

			//SEPIA server
			if (Speech.voiceEngine == 'sepia'){
				SepiaFW.audio.tts.stop();
				waitForTtsStop(function(){
					return SepiaFW.audio.tts.isSpeaking;
				});

			//CUSTOM MARY-TTS API
			}else if (Speech.voiceEngine == 'custom-mary-api'){
				//TODO: implement
				var event = {};
				event.msg = "NotSupported";
				onTtsError(event);
			
			//NATIVE-TTS
			}else if (SepiaFW.ui.isCordova){
				TTS.speak({	text: ''}, function(){		//Cordova plugin
					//TODO: onEnd might be fired twice now ...
					if (isSpeaking){
						onTtsEnd();
					}
				}, function (reason) {
					var event = {};
					event.msg = reason;		//string from plugin, e.g.: "ERR_INVALID_OPTIONS"
					onTtsError(event);
				});

			//WEB-SPEECH-API
			}else{
				window.speechSynthesis.cancel();
				waitForTtsStop(function(){
					return window.speechSynthesis.speaking;
				});
			}
		}
	}	
	function waitForTtsStop(testFun){
		var maxWait = 40;
		var waited = 0;
		var timer = setInterval(function(){
			if (!testFun()){
				if (isSpeaking){
					onTtsEnd();
				}
				clearInterval(timer);
			}else if (waited > maxWait){
				var event = {};
				event.msg = "timeout";
				onTtsError(event);
				clearInterval(timer);
			}
			waited++;
		}, 100);
	}

	//reset all states of speech for TTS
	Speech.resetTTS = function(){
		Speech.stopSpeech();
		isSpeaking = false;
	}
	
	//workarounds TTS:
	
	//doublecheck if TTS is aborted without error
	function observeTTsOutput(currentSynthID, maxExe, utterance, errorCallback){
		if (currentSynthID != synthID){
			return;
		}
		setTimeout(function(){
			if (maxExe > 0){
				/*if (isSpeaking && !window.speechSynthesis.speaking){
					var evt = {};	evt.error = 'TTS missing onend event';
					synthOnError(evt, errorCallback);
				}else if (window.speechSynthesis.speaking){*/
				if (isSpeaking){
					//console.log(currentSynthID + ": " + window.speechSynthesis.speaking);
					observeTTsOutput(currentSynthID, maxExe-1, utterance, errorCallback);
				}
			}else{
				var evt = {};	evt.error = 'TTS missing onend event';
				synthOnError(evt, errorCallback);
			}
		}, 100);
	}
	
	//speech init. on iOS
	Speech.initTTS = function(){
		if (!isTtsInitialized && Speech.isTtsSupported){
			if (SepiaFW.ui.isCordova){
				//TODO: anything?
				isTtsInitialized = true;
			}else if ('speechSynthesis' in window){
				window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));	//silent activation
				isTtsInitialized = true;
			}else{
				isTtsInitialized = true;	//we just assume the rest works O_O
			}
		}
	}
	
	//set a preselected voice (e.g. in Edge)
	function setVoiceOnce(){
		//stored?
		var storedVoice = SepiaFW.data.getPermanent(Speech.getLanguage() + "-voice");
		if (storedVoice){
			Speech.setVoice(storedVoice);

		//some defaults
		}else if (!selectedVoice && Speech.voiceEngine == 'native'){
			//TODO: just a guess
			if (SepiaFW.ui.isChromiumDesktop && SepiaFW.ui.isEdge){
				if (SepiaFW.config.appLanguage === "de"){
					Speech.setVoice('Microsoft Katja Online (Natural) - German (Germany)');
				}else if(SepiaFW.config.appLanguage === "en"){
					Speech.setVoice('Microsoft Mia Online (Natural) - English (United Kingdom)');
				}
			
			}else if (SepiaFW.ui.isChromiumDesktop && SepiaFW.ui.isChrome){
				if (SepiaFW.config.appLanguage === "de"){
					Speech.setVoice('Google Deutsch');
				}else if(SepiaFW.config.appLanguage === "en"){
					Speech.setVoice('Google UK English Female');
				}
			}
		}
	}
	
	//chunk text
	function chunkUtterance(text, chunkLength){
		if (chunkLength == undefined) chunkLength = 160;
		if (text.length < chunkLength){
			return text;
		}
        var pattRegex = new RegExp('^[\\s\\S]{' + Math.floor(chunkLength / 2) + ',' + chunkLength + '}[.!?,]{1}|^[\\s\\S]{1,' + chunkLength + '}$|^[\\s\\S]{1,' + chunkLength + '} ');
        var chunkArr = text.match(pattRegex);
        if (chunkArr[0] === undefined || chunkArr[0].length <= 2) {
            return text.substring(0, chunkLength);
        }else{
			return chunkArr[0];
		}
	}

	//--- Common Stream TTS Interface ---

	Speech.getTtsStreamURL = function(message, successCallback, errorCallback, options){
		//SEPIA server
		if (Speech.voiceEngine == 'sepia'){
			Speech.sepiaTTS.getURL(message, successCallback, errorCallback, options);
		//CUSTOM MARY-TTS API
		}else if (Speech.voiceEngine == 'custom-mary-api'){
			Speech.maryTTS.getURL(message, successCallback, errorCallback, options);
		//NONE
		}else{
			if (errorCallback) errorCallback({name: "NotSupported", message: "The selected voice engine is missing a required function."});
		}
	}
	Speech.getTtsStreamVoices = function(successCallback, errorCallback){
		//SEPIA server
		if (Speech.voiceEngine == 'sepia'){
			Speech.sepiaTTS.getVoices(successCallback, errorCallback);
		//CUSTOM MARY-TTS API
		}else if (Speech.voiceEngine == 'custom-mary-api'){
			Speech.maryTTS.getVoices(successCallback, errorCallback);
		//NONE
		}else{
			if (errorCallback) errorCallback({name: "NotSupported", message: "The selected voice engine is missing a required function."});
		}
	}

	//--- SEPIA API Interface ---

	Speech.sepiaTTS = {
		settings: {}
	};

	//set default parameters for TTS (just the instantly set stuff)
	Speech.sepiaTTS.setup = function(Settings){
		//TODO: move SEPIA specific stuff to SepiaFW.speech.tts...
		Speech.sepiaTTS.settings.playOn = (Settings.playOn)? Settings.playOn : "client"; 		//play TTS on client (can also be played on "server" if available)
		Speech.sepiaTTS.settings.format = (Settings.format)? Settings.format : "default";		//you can force format to default,OGG,MP3,MP3_CBR_32 and WAV (if using online api)
		//about voices
		Speech.sepiaTTS.settings.voice = (Settings.voice)? Settings.voice : "default";			//name of the voice used
		Speech.sepiaTTS.settings.gender = (Settings.gender)? Settings.gender : "default";		//name of gender ("male", "female", "child", "old, "creature")
		Speech.sepiaTTS.settings.mood = (Settings.mood)? Settings.mood : 5;						//mood state
		Speech.sepiaTTS.settings.speed = (Settings.speed)? Settings.speed : "1.0";
		Speech.sepiaTTS.settings.tone = (Settings.tone)? Settings.tone : "1.0";
		Speech.sepiaTTS.settings.maxChunkLength = (Settings.maxChunkLength)? Settings.maxChunkLength : 600;
		Speech.sepiaTTS.settings.maxMoodIndex = (Settings.maxMoodIndex)? Settings.maxMoodIndex : 3;
	}

	//get audio URL
	Speech.sepiaTTS.getURL = function(message, successCallback, errorCallback, options){
		if (!options) options = {};
		var lang = Speech.getLanguage();
		var voice = Speech.sepiaTTS.settings.voice;
		//use 'options.oneTimeVoice' and 'options.oneTimeLanguage'?
		if (options.oneTimeVoice && options.oneTimeVoice.name){
			voice = options.oneTimeVoice.name;
			lang = options.oneTimeLanguage;
		}
		var apiUrl = SepiaFW.config.assistAPI + "tts";
		var submitData = {
			text: message,
			lang: lang,
			mood: ((SepiaFW.assistant)? SepiaFW.assistant.getMood() : Speech.sepiaTTS.settings.mood),
			voice: voice,
			gender: Speech.sepiaTTS.settings.gender,
			speed: Speech.sepiaTTS.settings.speed,
			tone: Speech.sepiaTTS.settings.tone,
			playOn: Speech.sepiaTTS.settings.playOn,		//check play on server 
			format: Speech.sepiaTTS.settings.format		//sound format (e.g. wav file)
		};
		submitData.KEY = SepiaFW.account.getKey(sepiaSessionId);
		submitData.client = SepiaFW.config.getClientDeviceInfo();
		submitData.env = SepiaFW.config.environment;

		//get url
		$.ajax({
			url: apiUrl,
			timeout: 10000,
			type: "POST",
			data: submitData,
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			success: function(response){
				if (response.result === "success"){
					SepiaFW.debug.info("Speech.sepiaTTS - getURL SUCCESS: " + JSON.stringify(response));
					//convert URL (make sure path absolute)
					var audioUrl = response.url;
					if (audioUrl.indexOf("/") == 0){
						audioUrl = SepiaFW.config.assistAPI + audioUrl.substring(1);
					}else if (audioUrl.indexOf("tts") == 0){
						audioUrl = SepiaFW.config.assistAPI + audioUrl;
					}
					if (successCallback) successCallback(audioUrl);
				}else{
					SepiaFW.debug.error("Speech.sepiaTTS - getURL ERROR: " + JSON.stringify(response));
					if (errorCallback) errorCallback(response.error);
				}
			},
			error: function(e){
				SepiaFW.debug.error("Speech.sepiaTTS - getURL ERROR: " + JSON.stringify(e));
				if (errorCallback) errorCallback(e.name || e.message || e.error);
			}
		});
	}
	Speech.sepiaTTS.getVoices = function(successCallback, errorCallback){
		var apiUrl = SepiaFW.config.assistAPI + "tts-info";
		var submitData = {};
		submitData.KEY = SepiaFW.account.getKey(sepiaSessionId);
		submitData.client = SepiaFW.config.getClientDeviceInfo();
		submitData.env = SepiaFW.config.environment;

		//get voices
		$.ajax({
			url: apiUrl,
			timeout: 10000,
			type: "POST",
			data: submitData,
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			success: function(response){
				SepiaFW.debug.info("Speech.sepiaTTS - getVoices SUCCESS: " + JSON.stringify(response));
				if (response.result === "success"){
					//build voices array
					var voicesArray = [];
					if (response.voices && response.voices.length > 0){
						response.voices.forEach(function(v){
							//example: "de-DE espeak m"
							var vInfo = v.split(" ");
							voicesArray.push({
								//default webSpeech voice format:
								default: true,
								lang: vInfo[0],
								localService: false,
								name: v,
								voiceURI: v
							});
						});
					}
					if (successCallback) successCallback(voicesArray);
				}else{
					if (errorCallback) errorCallback(response);
				}
			},
			error: function(e){
				SepiaFW.debug.info("Speech.sepiaTTS - getVoices ERROR: " + JSON.stringify(e));
				if (errorCallback) errorCallback(e);
			}
		});
	}

	//--- Mary-TTS API Interface ---

	Speech.maryTTS = {
		settings: {}
	};

	//set default parameters for TTS (just the instantly set stuff)
	Speech.maryTTS.setup = function(Settings){
		Speech.maryTTS.settings.format = (Settings.format)? Settings.format : "default";		//only WAVE_FILE so far
		Speech.maryTTS.settings.voice = (Settings.voice)? Settings.voice : "default";			//name of the voice used
		Speech.maryTTS.settings.maxChunkLength = (Settings.maxChunkLength)? Settings.maxChunkLength : 600;
	}

	Speech.maryTTS.getURL = function(message, successCallback, errorCallback, options){
		if (!options) options = {};
		if (!Speech.voiceCustomServer){
			var err = {name: "MissingServerInfo", message: "Custom Mary-TTS API is missing server URL."};
			SepiaFW.debug.error("Speech.maryTTS - getURL ERROR: " + JSON.stringify(err));
			if (errorCallback) errorCallback(err.message);
			return;
		}else if (Speech.voiceCustomServer == "debug"){
			//static file for debugging
			if (successCallback) successCallback("sounds/setup.mp3");
			return;
		}
		if (!Speech.maryTTS.settings.voice && (!voices || !voices.length)){
			var err = {name: "NoVoiceSelected", message: "Custom Mary-TTS API requires to select a voice."};
			SepiaFW.debug.error("Speech.maryTTS - getURL ERROR: " + JSON.stringify(err));
			if (errorCallback) errorCallback(err.message);
			return;
		}else if (!Speech.maryTTS.settings.voice || Speech.maryTTS.settings.voice == "default"){
			//console.log("voices", voices);		//DEBUG
			var lang = Speech.getLanguage();
			var bestFitV = Speech.findVoiceObjForLanguage(lang)
				|| voices.find(function(v){ return (v.name && (v.name.indexOf(lang + "-") == 0 || v.name.indexOf(lang + "_") == 0)); })
				|| voices[0];
			if (bestFitV){
				Speech.maryTTS.settings.voice = bestFitV.name;
			}else{
				var err = {name: "NoVoiceFound", message: "Custom Mary-TTS API could not find matching voice."};
				SepiaFW.debug.error("Speech.maryTTS - getURL ERROR: " + JSON.stringify(err));
				if (errorCallback) errorCallback(err.message);
				return;
			}
		}
		//console.error("Speech.maryTTS.settings.voice", Speech.maryTTS.settings.voice);		//DEBUG
		var voiceName;
		//use 'options.oneTimeVoice' and 'options.oneTimeLanguage'?
		if (options.oneTimeVoice && options.oneTimeVoice.name){
			voiceName = options.oneTimeVoice.name;
		}else{
			voiceName = Speech.maryTTS.settings.voice;
		}
		var voiceInfo = voiceName.split(/\s+/g);  				//example: "dfki-spike-hsmm en_GB male hmm"
		var apiUrl = Speech.voiceCustomServer.replace(/\/$/, "") + "/process" 
			+ "?INPUT_TYPE=TEXT" + "&OUTPUT_TYPE=AUDIO" + "&AUDIO=WAVE_FILE"
			+ "&LOCALE=" + encodeURIComponent(voiceInfo[1])
			+ "&VOICE=" + encodeURIComponent(voiceInfo[0])
			+ "&INPUT_TEXT=" + encodeURIComponent(message)
		;
		SepiaFW.debug.info("Speech.maryTTS - getURL SUCCESS: " + apiUrl);
		//console.log("TTS URL: " + apiUrl);		//DEBUG
		if (successCallback) successCallback(apiUrl);
	}

	Speech.maryTTS.getVoices = function(successCallback, errorCallback){
		if (!Speech.voiceCustomServer){
			var err = {name: "MissingServerInfo", message: "Custom Mary-TTS API is missing server URL."};
			SepiaFW.debug.error("Speech.maryTTS - getURL ERROR: " + JSON.stringify(err));
			if (errorCallback) errorCallback(err.message);
			return;
		}else if (Speech.voiceCustomServer == "debug"){
			//static voice for debugging
			var voicesArray = [{default: true, lang: "en_GB", localService: true, name: "Debug", voiceURI: ""}];
			if (successCallback) successCallback(voicesArray);
			return;
		}
		var apiUrl = Speech.voiceCustomServer.replace(/\/$/, "") + "/voices";
		//call endpoint
		$.ajax({
			url: apiUrl,
			timeout: 10000,
			type: "GET",
			headers: {},
			success: function(response){
				SepiaFW.debug.info("Speech.maryTTS - getVoices SUCCESS: " + JSON.stringify(response));
				//build voices array
				var voicesArray = [];
				if (response){
					response.split(/\n|\r/m).forEach(function(vString){
						//example: "dfki-spike-hsmm en_GB male hmm"
						if (vString.trim()){
							var vInfo = vString.split(/\s+/g);
							voicesArray.push({
								//default webSpeech voice format:
								default: true,
								lang: vInfo[1].replace(/[_]/g, "-"),	//make sure this has correct format xx-XX
								localService: false,
								name: vString,
								voiceURI: vString
							});
						}
					});
					//console.log("voicesArray", voicesArray);		//DEBUG
				}
				if (successCallback) successCallback(voicesArray);
			},
			error: function(e){
				SepiaFW.debug.info("Speech.sepiaTTS - getVoices ERROR: " + JSON.stringify(e));
				if (errorCallback) errorCallback(e);
			}
		});
	}
}
