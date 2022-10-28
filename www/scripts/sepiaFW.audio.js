//AUDIO PLAYER
function sepiaFW_build_audio(){
	var AudioPlayer = {};
	var Stream = {};
	var TTS = {};			//TTS parameters for SepiaFW external TTS like Acapela. I've tried to seperate TTS and AudioPlayer as good as possible, but there might be some bugs using both
	var Alarm = {};

	//Global volume (0.0 - 10.0)
	AudioPlayer.storeGlobalMediaPlayerVolume = function(setVol){
		var goodVol = Math.min(10.0, Math.max(0.0, setVol));
		SepiaFW.data.setPermanent("playerVolume", goodVol);
		return goodVol;
	}
	AudioPlayer.getGlobalMediaPlayerVolume = function(){
		return Math.min(10.0, Math.max(0.0, (SepiaFW.data.getPermanent("playerVolume") || 7.0)));
	}

	//Sounds
	AudioPlayer.micConfirmSound = 'sounds/coin.mp3';	//might change for mobile (see below)
	AudioPlayer.alarmSound = 'sounds/alarm.mp3'; 		//NOTE: UI.events is using 'file:// + AudioPlayer.alarmSound' for cordova.plugins.notification
	AudioPlayer.setCustomSound = function(name, path){
		//system: 'micConfirm', 'alarm'
		var customSounds = SepiaFW.data.getPermanent("deviceSounds") || {};
		customSounds[name] = path;
		SepiaFW.data.setPermanent("deviceSounds", customSounds);
		AudioPlayer.loadCustomSounds(customSounds);
	}
	AudioPlayer.loadCustomSounds = function(sounds){
		if (SepiaFW.ui.isMobile){
			AudioPlayer.micConfirmSound = 'sounds/blob.mp3';	//for mobile this works better
		}
		var customSounds = sounds || SepiaFW.data.getPermanent("deviceSounds");
		if (customSounds){
			if (customSounds.micConfirm) AudioPlayer.micConfirmSound = customSounds.micConfirm;
			if (customSounds.alarm) AudioPlayer.alarmSound = customSounds.alarm;
		}
	}
	//NOTE: you can use for example 'deviceSounds: { micConfirm: "...", alarm: "..." } in 'settings.js' device section
	
	//Parameters and states:

	var player;				//AudioPlayer for music and stuff
	var player2;			//AudioPlayer for sound effects
	var speaker;			//Player for TTS
	var speakerAudioCtx, speakerSource, speakerGainNode;	//for TTS effects filter

	var doInitAudio = true;			//workaround to activate scripted audio on touch devices

	//Media Session Interface (see below for events)
	var isMediaSessionSupported = 'mediaSession' in navigator;

	//Media Devices Options
	AudioPlayer.mediaDevicesSelected = {
		mic: { "value": "", "name": "Default" },
		player: { "value": "", "name": "Default" },
		tts: { "value": "", "name": "Default" },
		fx: { "value": "", "name": "Default" }
	}
	AudioPlayer.mediaDevicesAvailable = {		//IMPORTANT: deviceId can change any time on client reload. Use label!
		in: {},
		out: {}
	};
	AudioPlayer.refreshAvailableMediaDevices = function(successCallback, errorCallback){
		if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !navigator.mediaDevices.getUserMedia) {
			SepiaFW.debug.log("Media-Devices: Device enumeration is not supported on this device.");
			if (errorCallback) errorCallback({
				message: "Media device enumeration not supported",
				name: "NotSupportedError"
			});
			return;
		}
		//List media devices
		var didTimeout = false;
		var timeoutTimer = undefined;
		function enumDevices(successCallb, errorCallb){
			if (didTimeout){
				return;
			}
			navigator.mediaDevices.enumerateDevices()	//TODO: as soon as browser support is ok use: navigator.permissions.query(...)
			.then(function(devices){
				devices.forEach(function(device){
					//console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
					if (device.kind == "audioinput"){
						AudioPlayer.mediaDevicesAvailable.in[device.label] = device.deviceId;
					}else if (device.kind == "audiooutput"){
						AudioPlayer.mediaDevicesAvailable.out[device.label] = device.deviceId;
					}
				});
				if (successCallb) successCallb(AudioPlayer.mediaDevicesAvailable);
			})
			.catch(function(err) {
				SepiaFW.debug.error("Media-Devices: Error in device enumeration -", err.message);
				if (errorCallb) errorCallb({
					message: err.message,
					name: err.name
				});
			});
		};
		timeoutTimer = setTimeout(function(){
			didTimeout = true;
			if (errorCallback) errorCallback({
				message: "Media device enumeration timeout. Permission might require user interaction.",
				name: "TimeoutError"
			});
		}, 8000);
		//audio constraints
		var constraints = JSON.parse(JSON.stringify(SepiaFW.webAudio.getSupportedAudioConstraints()));
		//if (constraints.sampleRate) ...;
		var audioVideoConstraints = { 
			video : false, audio: (Object.keys(constraints).length? constraints : true)
		};
		//get permission
		navigator.mediaDevices.getUserMedia(audioVideoConstraints)
		.then(function(stream){
			//close stream right away
			try {
				track0 = stream.getAudioTracks()[0];
				if (track0 && typeof track0.stop == "function" && track0.readyState == "live"){
					track0.stop();
				}
			}catch(e){};
			clearTimeout(timeoutTimer);
			enumDevices(successCallback, errorCallback);
		})
		.catch(function(err){
			clearTimeout(timeoutTimer);
			if (errorCallback) errorCallback({
				message: err.message,
				name: err.name		//probably: NotAllowedError or SecurityError
			});
		});
	}
	AudioPlayer.setMediaDeviceForNode = function(mediaNodeType, mediaDevice, successCallback, errorCallback){
		var audioNodeElement;
		if (mediaNodeType == "mic"){
			//mic changes need to happen in web-audio recorder (this can only fail when recorder is created)
			SepiaFW.audioRecorder.setWebAudioConstraint("deviceId", mediaDevice.deviceId);
			SepiaFW.debug.log("Audio - Set sink ID for media-node '" + mediaNodeType + "'. Label:", mediaDevice.label);
			AudioPlayer.mediaDevicesSelected[mediaNodeType] = {name: mediaDevice.label, value: mediaDevice.deviceId};
			if (successCallback) successCallback();
			return;
		}
		else if (mediaNodeType == "player") audioNodeElement = AudioPlayer.getMusicPlayer();
		else if (mediaNodeType == "tts") audioNodeElement = AudioPlayer.getTtsPlayer();
		else if (mediaNodeType == "fx") audioNodeElement = AudioPlayer.getEffectsPlayer();

		if (!audioNodeElement.setSinkId){
			if (errorCallback) errorCallback("This audio-node does not support custom sink IDs.");
		}else{
			audioNodeElement.setSinkId(mediaDevice.deviceId)
			.then(function(){
				if (audioNodeElement.sinkId == mediaDevice.deviceId){
					SepiaFW.debug.log("Audio - Set sink ID for media-node '" + mediaNodeType + "'. Label:", mediaDevice.label);
					AudioPlayer.mediaDevicesSelected[mediaNodeType] = {name: mediaDevice.label, value: mediaDevice.deviceId};
					if (successCallback) successCallback();
				}else{
					SepiaFW.debug.error("Audio - tried to set sink ID but failed! Label: " + mediaDevice.label);	//can this actually happen?
					if (errorCallback) errorCallback("Label: " + mediaDevice.label + " - Message: Failed to set sink ID.");
				}
			}).catch(function(err){
				SepiaFW.debug.error("Audio - sink ID cannot be set. Label: " + mediaDevice.label + " - Error:", err);	//TODO: revert back? delete setting?
				if (errorCallback) errorCallback("Label: " + mediaDevice.label + " - Message: " + err.message);
			});
			/* dispatch event? if we want to use this for CLEXI we may need to wait for connection 
			document.dispatchEvent(new CustomEvent('sepia_info_event', { detail: {	type: "audio", info: { message: "" }}})); */
		}
	}
	AudioPlayer.storeMediaDevicesSetting = function(){
		SepiaFW.data.setPermanent("mediaDevices", AudioPlayer.mediaDevicesSelected);
	}
	AudioPlayer.resetMediaDevicesSetting = function(){
		SepiaFW.data.delPermanent("mediaDevices");	//NOTE: reload client after reset
	}
	AudioPlayer.mediaDevicesSetup = function(successCallback){
		var mediaDevicesStored = SepiaFW.data.getPermanent("mediaDevices") || {};
		var deviceNamesStored = Object.keys(mediaDevicesStored);	//mic, tts, etc...
		if (deviceNamesStored.length > 0){
			//make sure this is worth it to load because it can slow-down start time:
			var customSettingsN = 0;
			for (let i=0; i<deviceNamesStored.length; i++){
				var d = mediaDevicesStored[deviceNamesStored[i]];
				if (d.name && d.name.toLowerCase() != "default" && AudioPlayer.mediaDevicesSelected[deviceNamesStored[i]]){
					customSettingsN++;
				}
			}
			if (customSettingsN > 0){
				function countAndFinish(){
					--customSettingsN;
					if (customSettingsN <= 0 && successCallback) successCallback();
				}
				function restoreAsyncAndCheckComplete(mediaDevicesAvailable, deviceTypeName, deviceLabelToSet){
					//restore sink IDs ... if any
					var deviceId = (deviceTypeName == "mic")? mediaDevicesAvailable.in[deviceLabelToSet] : mediaDevicesAvailable.out[deviceLabelToSet];
					if (deviceId){
						//mic or speaker - we distinguish inside set method
						AudioPlayer.setMediaDeviceForNode(deviceTypeName, {deviceId: deviceId, label: deviceLabelToSet}, countAndFinish, countAndFinish);
					}else{
						//device gone - TODO: what now? remove from storage?
						SepiaFW.debug.error("Audio - sink ID for '" + deviceTypeName + "' cannot be set because ID was not available! Label:", deviceLabelToSet);
						countAndFinish();
					}
				}
				SepiaFW.debug.log("Audio - Restoring media-device settings");
				//first load all available devices
				AudioPlayer.refreshAvailableMediaDevices(function(mediaDevicesAvailable){	//NOTE: same as AudioPlayer.mediaDevicesAvailable
					deviceNamesStored.forEach(function(typeName){
						var d = mediaDevicesStored[typeName];
						//NOTE: we apply SAME criteria as above
						if (d.name && d.name.toLowerCase() != "default" && AudioPlayer.mediaDevicesSelected[typeName]){
							//NOTE: we check the name (label) since deviceId can change
							restoreAsyncAndCheckComplete(mediaDevicesAvailable, typeName, d.name);
						}
					});
				}, function(err){
					SepiaFW.debug.error("Audio - FAILED to restore media-device settings", err);
					if (successCallback) successCallback();		//we still continue
				});
			}else{
				if (successCallback) successCallback();
			}
		}else{
			if (successCallback) successCallback();
		}
	}

	Stream.isPlaying = false;		//state: stream player
	Stream.isLoading = false;
	TTS.isSpeaking = false;			//state: TTS player
	TTS.isLoading = false;
	Alarm.isPlaying = false;		//state: alarm player (special feature of effects player)
	Alarm.isLoading = false;
	Alarm.lastActive = 0;

	AudioPlayer.getMusicPlayer = function(){
		return player;
	}
	AudioPlayer.isMusicPlayerStreaming = function(){
		return player
			&& player.currentTime > 0
			&& !player.paused
			&& !player.ended
			&& player.readyState > 2;
	}
	AudioPlayer.getEffectsPlayer = function(){
		return player2;
	}
	AudioPlayer.getTtsPlayer = function(){
		return speaker;
	}

	//Try to find out if any music player is active (playing or onHold and waiting to resume)
	AudioPlayer.isAnyAudioSourceActive = function(){
		//Stop internal player
		var isInternalPlayerStreaming = Stream.isLoading || AudioPlayer.isMusicPlayerStreaming() || AudioPlayer.isMainOnHold() || TTS.isPlaying;
		var emp = SepiaFW.ui.cards.embed.getActiveMediaPlayer();
		var isEmbeddedMediaPlayerStreaming = emp && emp.isActive();
		var isAndroidPlayerStreaming = SepiaFW.ui.isAndroid && SepiaFW.android.lastReceivedMediaData && SepiaFW.android.lastReceivedMediaData.playing 
										&& ((new Date().getTime() - SepiaFW.android.lastReceivedMediaAppTS) < (1000*60*15));		//This is pure guessing ...
		return isInternalPlayerStreaming || isEmbeddedMediaPlayerStreaming || isAndroidPlayerStreaming;			
	}
	AudioPlayer.getLastActiveAudioSource = function(){
		return lastAudioPlayerEventSource;
	}
	
	//controls
	var audioTitle;
	var currentAudioTitleBelongsToStreamPlayer = true;	//default: true
	var audioStartBtn;
	var audioStopBtn;
	var audioVolUp;
	var audioVolDown;
	var lastAudioStream = 'sounds/empty.mp3';
	var beforeLastAudioStream = 'sounds/empty.mp3';
	var lastAudioStreamTitle = '';
	var lastAudioPlayerEventSource = '';		//Note: this does not include TTS and effects player
	var mainAudioIsOnHold = false;
	var mainAudioStopRequested = false;
	var orgVolume = AudioPlayer.getGlobalMediaPlayerVolume() / 10.0;
	var FADE_OUT_VOL = 0.01; 	//note: on some devices audio is actually stopped so this value does not apply

	//MediaSession Interface
	if (isMediaSessionSupported){
		navigator.mediaSession.setActionHandler('play', function(){ 
			//console.log("MediaSession - play");		//DEBUG
			SepiaFW.client.controls.media({
				action: "resume"
			});
		});
  		navigator.mediaSession.setActionHandler('pause', function(){ 
			//console.log("MediaSession - pause");		//DEBUG
			SepiaFW.client.controls.media({
				action: "stop"
			});
		});
  		navigator.mediaSession.setActionHandler('stop', function() { 
			//console.log("MediaSession - stop");		//DEBUG
			SepiaFW.client.controls.media({
				action: "stop"
			});
		});
	}
	function setMediaSessionState(state){
		if (isMediaSessionSupported && ["none", "paused", "playing"].indexOf(state) >= 0){
			navigator.mediaSession.playbackState = state;
		}
	}
	function setMediaSessionMetaData(title, artist, album, artwork){
		if (isMediaSessionSupported){
			var defaultArtworkBaseUrl = SepiaFW.config.getAppRootUrl() + "img/";
			var defaultArtwork = [
				{ src: defaultArtworkBaseUrl + "icon-96.png", sizes: '96x96', type: 'image/png' },
				{ src: defaultArtworkBaseUrl + "icon.png", sizes: '192x192', type: 'image/png' },
				{ src: defaultArtworkBaseUrl + "icon-512.png", sizes: '512x512', type: 'image/png' }
				//{ src: defaultArtworkBaseUrl + "ui/sepia.svg", sizes: '256x256', type: 'image/svg' }
			];
			navigator.mediaSession.metadata = new MediaMetadata({
				title: title || "Unknown",
				artist: artist || "SEPIA Stream",
				album: album || undefined,
				artwork: artwork || defaultArtwork
			});
			//example states: title, artist, album, artwork
		}
	}

	//---- broadcasting -----

	AudioPlayer.broadcastAudioEvent = function(source, action, playerObject){
		//stream, effects, tts-player, unknown - prepare, start, stop, error, fadeOut, fadeIn
		//android-intent - stop, start
		//embedded-media-player - start, resume, pause, hold
		source = source.toLowerCase();
		action = action.toLowerCase();
		if (source == "stream" || source == "embedded-media-player" || source.indexOf("android") >= 0){
			lastAudioPlayerEventSource = source;
		}
		var event = new CustomEvent('sepia_audio_player_event', { detail: {
			source: source,
			action: action
		}});
		document.dispatchEvent(event);  //NOTE: we could check result for 'prevent default' (its sync.)
		//console.error("audio event: " + source + " - " + action);
	}
	
	//NOTE: this is for the stream player only
	function broadcastAudioRequested(){
		if (audioTitle) audioTitle.textContent = 'Loading ...';
	}
	function broadcastAudioFinished(){
		SepiaFW.animate.audio.playerIdle();
		if (audioTitle.innerHTML === "Loading ...") audioTitle.textContent = "Stopped";
		//send event for OS:
		setMediaSessionState("paused");
		setMediaSessionMetaData(player.title, "SEPIA Stream");
	}
	function broadcastAudioStarted(){
		if (audioTitle) audioTitle.textContent = player.title;
		SepiaFW.animate.audio.playerActive();
		//send event for OS:
		setMediaSessionState("playing");
		setMediaSessionMetaData(player.title, "SEPIA Stream");
	}
	function broadcastAudioError(){
		if (audioTitle) audioTitle.textContent = 'Error';
		SepiaFW.animate.audio.playerIdle();
		//send event for OS:
		setMediaSessionState("none");
		setMediaSessionMetaData(player.title, "SEPIA Stream");
	}
	function broadcastPlayerVolumeSet(){
	}
	function broadcastPlayerFadeIn(){
		//$('#sepiaFW-chat-output').append('FadeIn'); 		//DEBUG
	}
	function broadcastPlayerFadeOut(){
	}
	
	//-----------------------
	
	//set default parameters for audio
	AudioPlayer.setup = function(readyCallback){
		//get players
		player = document.getElementById('sepiaFW-audio-player');
		player2 = document.getElementById('sepiaFW-audio-player2');
		speaker = document.getElementById('sepiaFW-audio-speaker');
		if (speaker) speaker.setAttribute('data-tts', true);

		//Part 1
		audioSetupPart1(function(){
			//Part 2
			audioSetupPart2(function(){
				//Ready
				if (readyCallback) readyCallback();
			});
		});
	}
	function audioSetupPart1(readyCallback){
		//Media devices
		AudioPlayer.mediaDevicesSetup(readyCallback);
	}
	function audioSetupPart2(readyCallback){
		//modified sounds by user?
		AudioPlayer.loadCustomSounds();
		
		//get player controls
		audioTitle = document.getElementById('sepiaFW-audio-ctrls-title');
		audioStartBtn = document.getElementById('sepiaFW-audio-ctrls-start');
		$(audioStartBtn).off().on('click', function(){
			AudioPlayer.initAudio(undefined, function(){
				if (currentAudioTitleBelongsToStreamPlayer){
					//we keep this for now...
					AudioPlayer.playURL('', "stream");
				}else{
					SepiaFW.client.controls.media({
						action: "resume",
						skipFollowUp: true
					});
				}
			});
		});
		audioStopBtn = document.getElementById('sepiaFW-audio-ctrls-stop');
		$(audioStopBtn).off().on('click', function(){
			SepiaFW.client.controls.media({
				action: "stop",
				skipFollowUp: true
			});
		});
		audioVolUp = document.getElementById('sepiaFW-audio-ctrls-volup');
		$(audioVolUp).off().on('click', function(){
			//playerSetVolume(playerGetVolume() + 1.0);
			SepiaFW.client.controls.volume({
				action: "up"
			});
		});
		audioVolDown = document.getElementById('sepiaFW-audio-ctrls-voldown');
		$(audioVolDown).off().on('click', function(){
			//playerSetVolume(playerGetVolume() - 1.0);
			SepiaFW.client.controls.volume({
				action: "down"
			});
		});
		//set stored volume
		player.volume = orgVolume;
		AudioPlayer.setPlayerVolumeIndicator(Math.round(player.volume*10.0), false);
		
		//player remote
		$("#sepiaFW-audio-ctrls-broadcast").off().on("click", function(){
			AudioPlayer.openRemoteControl();
		});

		if (readyCallback) readyCallback();
	}
		
	//sound init - returns true if it will be executed, false everytime after first call
	AudioPlayer.requiresInit = function(){
		//TODO: is this still up-to-date?
		//NOTE: Safari always needs init atm I guess ...
		return (doInitAudio && !SepiaFW.ui.isCordova &&
			((SepiaFW.ui.isMobile && !SepiaFW.ui.isStandaloneWebApp) || (SepiaFW.ui.isSafari)));
	}
	AudioPlayer.initAudio = function(continueCallback, noopOrContinueCallback){
		if (noopOrContinueCallback && !continueCallback) continueCallback = noopOrContinueCallback;
		//workaround for mobile devices to activate audio by scripts
		if (AudioPlayer.requiresInit()){
			SepiaFW.debug.info('Audio - trying to initialize players');
			SepiaFW.animate.assistant.loading();
			
			setTimeout(function(){ AudioPlayer.playURL('sounds/empty.mp3', player); }, 	  0);
			setTimeout(function(){ AudioPlayer.playURL('sounds/empty.mp3', player2); }, 250);
			setTimeout(function(){ AudioPlayer.playURL('sounds/empty.mp3', speaker); }, 500);
			
			if (SepiaFW.ui.isMobile && SepiaFW.speech){
				setTimeout(function(){ SepiaFW.speech.initTTS(); }, 750);
			}
		
			doInitAudio = false;
			
			//make sure to restore idle state once
			setTimeout(function(){ SepiaFW.animate.assistant.idle('initAudioFinished'); }, 1000);
			
			//recall previous action
			if (continueCallback){
				setTimeout(function(){ continueCallback(); }, 1050);
			}
			return true;
			
		}else{
			if (noopOrContinueCallback) noopOrContinueCallback();
			return false;
		}
	}

	//TTS voice effects
	var voiceEffects = {
		"volume": {
			id: "volume", name: "Volume", 
			getOptions: function(){ 
				return [{key: "gain", name: "Volume", default: 1.0, range: [0.1, 5.0], step: 0.1}]; 
			},
			applyFun: function(audioCtx, masterGainNode, options, doneCallback){
				if (masterGainNode) masterGainNode.gain.value = options.gain || 1.0;
				masterGainNode.connect(audioCtx.destination);
				if (doneCallback) doneCallback(true);
			}
		},
		"robo_1": {
			id: "robo_1", name: "Robotic Modulator 1", 
			getOptions: function(){ return SepiaFW.audio.effects.getVoiceEffectOptions("robo_1"); },
			applyFun: function(audioCtx, masterGainNode, options, doneCallback){
				SepiaFW.audio.effects.applyVoiceEffect("robo_1", audioCtx, masterGainNode, options, doneCallback);
			}
		}, 
		"highpass_1": {
			id: "highpass_1", name: "High-Pass Filter 1", 
			getOptions: function(){ return SepiaFW.audio.effects.getVoiceEffectOptions("highpass_1"); },
			applyFun: function(audioCtx, masterGainNode, options, doneCallback){
				SepiaFW.audio.effects.applyVoiceEffect("highpass_1", audioCtx, masterGainNode, options, doneCallback);
			}
		}
	}
	var voiceEffectActive = "";
	var voiceEffectOptionsActive = {};
	var isVoiceEffectSetupPending = false;

	TTS.setVoiceEffect = function(effectId, options, successCallback, errorCallback){
		if (!options) options = {};
		var optionsAreSame = SepiaFW.tools.simpleObjectsAreSame(options, voiceEffectOptionsActive);		//NOTE: we use a simple compare
		if (voiceEffectActive == effectId && optionsAreSame){
			if (successCallback) successCallback();
			return;
		}
		var effect = effectId? voiceEffects[effectId] : undefined;
		isVoiceEffectSetupPending = true;
		if (!effectId){
			removeActiveVoiceEffect(function(){
				isVoiceEffectSetupPending = false;
				if (successCallback) successCallback();
			});
		}else if (effect){
			applyVoiceEffect(effect, options, function(){
				isVoiceEffectSetupPending = false;
				if (successCallback) successCallback();
			});
		}else{
			removeActiveVoiceEffect(function(){
				isVoiceEffectSetupPending = false;
				SepiaFW.debug.error("TTS effect for id: " + effectId + " NOT FOUND or NOT AVAILABLE!");
				if (errorCallback) errorCallback({name: "VoiceEffectError", message: "not found or not available for this voice"});
			});
		}
	}
	TTS.restoreVoiceEffect = function(selectedVoice, doneCallback){
		var storedData = SepiaFW.data.getPermanent(SepiaFW.speech.getLanguage() + "-voice-effects") || {};
		var voiceEffect = storedData[selectedVoice];
		var effectId;
		var options;
		if (!voiceEffect){
			effectId = "";
			options = {};
		}else{
			effectId = voiceEffect.effectId;
			options = voiceEffect.effectOptions;
		}
		TTS.setVoiceEffect(effectId, options, doneCallback, doneCallback);
	}
	function applyVoiceEffect(effect, options, doneCallback){
		if (speakerGainNode){
			//clean-up what we can
			speakerGainNode.disconnect();
		}
		speaker.crossOrigin = "anonymous";
		speakerAudioCtx = speakerAudioCtx || SepiaFW.webAudio.createAudioContext({});
		speakerSource = speakerSource || speakerAudioCtx.createMediaElementSource(speaker);
		speakerGainNode = speakerAudioCtx.createGain();
		speakerSource.connect(speakerGainNode);
		speaker.sepiaVoiceEffectsSourceNode = speakerSource;
		effect.applyFun(speakerAudioCtx, speakerGainNode, options, function(){
			voiceEffectActive = effect.id;
			voiceEffectOptionsActive = JSON.parse(JSON.stringify(options));		//clone options
			SepiaFW.debug.log("Set TTS effect: " + effect.id + " (" + effect.name + ")");
			if (doneCallback) doneCallback();
		});
	}
	function removeActiveVoiceEffect(doneCallback){
		//NOTE: this is not a "real" clean-up since we cannot get rid of the 'createMediaElementSource' anymore O_o
		//REF: https://github.com/WebAudio/web-audio-api/issues/1202
		if (speakerGainNode){
			speakerGainNode.disconnect();
			speakerGainNode.connect(speakerAudioCtx.destination);
		}
		//speaker.crossOrigin = null;
		voiceEffectActive = "";
		voiceEffectOptionsActive = {};
		SepiaFW.debug.log("Removed TTS effect");
		if (doneCallback) doneCallback();
	}
	TTS.getAvailableVoiceEffects = function(){
		var effects = [
			{value: "", name: "No effect", effectOptions: []}
		];
		//TODO: return different values depending on selected voice?
		Object.keys(voiceEffects).forEach(function(v){
			var eff = voiceEffects[v];
			effects.push({value: eff.id, name: eff.name, effectOptions: eff.getOptions()});
		});
		return effects;
	}
	TTS.getVoiceEffectForId = function(effectId){
		return voiceEffects[effectId];
	}
	TTS.getActiveVoiceEffectId = function(){
		return voiceEffectActive;
	}

	//use TTS endpoint to generate soundfile and speak answer
	TTS.speak = function(message, onStartCallback, onEndCallback, onErrorCallback, options){
		//NOTE: For the state-ful version of 'speak' (with settings and events) use: 'SepiaFW.speech.speak'
		//gets URL and calls play(URL)
		SepiaFW.debug.info("TTS audio requested: " + Date.now());
		SepiaFW.speech.getTtsStreamURL(message, function(audioUrl){
			SepiaFW.debug.info("TTS audio url: " + audioUrl);
			AudioPlayer.playURL(audioUrl, speaker, onStartCallback, onEndCallback, onErrorCallback);
		}, function(err){
			SepiaFW.ui.showInfo(SepiaFW.local.g('ttsAudioFailedToCreate'));
			if (onErrorCallback) onErrorCallback(err);
		}, options);
	}
	TTS.stop = function(){
		AudioPlayer.stop(speaker);
	}

	//STOP all audio
	AudioPlayer.stop = function(audioPlayer){
		if (!audioPlayer) audioPlayer = player;
		if (audioPlayer == player){
			if (Stream.isPlaying){
				audioPlayer.pause(); 		//NOTE: possible race condition here if onPause callback triggers after fadeOutMain (then Stream.isPlaying will be true)
			}else{
				Stream.isLoading = false;
			}
			broadcastAudioFinished();
			mainAudioIsOnHold = false;
			mainAudioStopRequested = true;		//We try to prevent the race-condition with that (1)
			audioPlayer.volume = orgVolume;
		
		}else if (audioPlayer == player2){
			//TODO: ?
			audioPlayer.pause();
		
		}else if (audioPlayer == speaker){
			//TTS
			if (TTS.isSpeaking){
				audioPlayer.pause();
			}else{
				TTS.isLoading = false;
			}
		}
		//SEE AudioPlayer stop button for more, e.g. Android stop
	}
	
	//Fade main audio source in and out and restart if needed
	AudioPlayer.isMainOnHold = function(){
		return mainAudioIsOnHold;
	}
	AudioPlayer.fadeOutMain = function(force){
		//we only trigger this when audio is actually playing ...
		if ((Stream.isPlaying && !mainAudioStopRequested) || force){ 	//NOTE: this relys on successful onPause if "stop" was called before (see race cond. above)
			if (SepiaFW.ui.isMobile && Stream.isPlaying && !mainAudioIsOnHold){
				SepiaFW.debug.info('AUDIO: instant fadeOutMain');
				player.pause(); 		//<-- try without broadcasting, is it save?
			}
			SepiaFW.debug.info('AUDIO: fadeOutMain orgVol=' + orgVolume);
			$(player).stop(); 	//note: this is an animation stop
			$(player).animate({volume: FADE_OUT_VOL}, 300);
			broadcastPlayerFadeOut();
			if (!mainAudioStopRequested){		//(if forced ..) We try to prevent the race-condition with that (2)
				mainAudioIsOnHold = true;
			}
			AudioPlayer.broadcastAudioEvent("stream", "fadeOut", player);
		}
	}
	AudioPlayer.fadeInMainIfOnHold = function(){
		if (mainAudioIsOnHold){
			//fade to original volume
			AudioPlayer.playerFadeToOriginalVolume();
			mainAudioIsOnHold = false;
			AudioPlayer.broadcastAudioEvent("stream", "fadeIn", player);
		}/*else{
			//just restore volume
			SepiaFW.debug.info('AUDIO: fadeInMain - no play just reset vol=' + orgVolume);
			playerSetVolume(orgVolume * 10.0);
		}*/
	}
	//More general functions for fading
	AudioPlayer.isOnHold = function(id){
		return (audioFadeListeners[id]? audioFadeListeners[id].isOnHold() : false);
	}
	AudioPlayer.fadeOut = function(force){
		if ((Stream.isPlaying && !mainAudioStopRequested) || force){
			AudioPlayer.fadeOutMain(force);
		}else{
			//Check manually registered players
			var customPlayerIds = Object.keys(audioFadeListeners);
			for (var i=0; i<customPlayerIds.length; i++){
				//stop on first fade out? There should not be more than one active player
				if (audioFadeListeners[customPlayerIds[i]].onFadeOutRequest(force)){
					SepiaFW.debug.info("AUDIO: fadeOut - player: " + customPlayerIds[i]);
					break;
				}
			}
		}
	}
	AudioPlayer.fadeInIfOnHold = function(){
		if (mainAudioIsOnHold){
			AudioPlayer.fadeInMainIfOnHold();
		}else{
			//Check manually registered players
			var customPlayerIds = Object.keys(audioFadeListeners);
			for (var i=0; i<customPlayerIds.length; i++){
				//stop on first fade in? There should not be more than one active player
				var pId = customPlayerIds[i];
				if (audioFadeListeners[pId].onFadeInRequest){
					SepiaFW.debug.info("AUDIO: fadeInIfOnHold - player: " + pId);
					if (audioFadeListeners[pId].isOnHold()){
						SepiaFW.debug.info("AUDIO: fadeInIfOnHold - triggering onFadeInRequest");
						audioFadeListeners[pId].onFadeInRequest()
						break;
					}
				}
			}
		}
	}
	//Register additional fade listeners
	AudioPlayer.registerNewFadeListener = function(callbackObject){
		if (!callbackObject.id){
			SepiaFW.debug.error("AudioPlayer.registerNewFadeListener - not a valid object to register!");
			//valid obejct example:
			/* {
				id: "embedded-media-player",
				isOnHold: myFunA,			(return true/false)
				onFadeOutRequest: myFunB,	(return true/false, param: force)
				onFadeInRequest: myFunC		(return true/false)
			} */
		}else{
			audioFadeListeners[callbackObject.id] = callbackObject;
		}
	}
	AudioPlayer.removeFadeListener = function(id){
		delete audioFadeListeners[id];
	}
	var audioFadeListeners = {};
	
	//player specials

	function playerGetVolume(){
		return Math.round(10.0 * player.volume);
	}
	AudioPlayer.playerGetVolume = playerGetVolume;
	AudioPlayer.getOriginalVolume = function(){
		return Math.round(10.0 * orgVolume);
	}

	function playerSetVolume(newVol){
		var setVol = getValidVolume(newVol)/10.0;
		player.volume = setVol;
		orgVolume = setVol;
		AudioPlayer.storeGlobalMediaPlayerVolume
		AudioPlayer.setPlayerVolumeIndicator(Math.floor(setVol*10.0), true);
		SepiaFW.debug.info('AUDIO: volume set (and stored) to ' + setVol);
		broadcastPlayerVolumeSet();
	}
	function playerSetVolumeTemporary(newVol){
		var setVol = getValidVolume(newVol)/10.0;
		player.volume = setVol;
		SepiaFW.debug.info('AUDIO: volume set temporary (till next fadeIn) to ' + setVol);
	}
	function getValidVolume(volumeIn){
		if (volumeIn > 10.0) volumeIn = 10.0;
		else if (volumeIn < 0.0) volumeIn = 0.0;
		return volumeIn;
	}
	AudioPlayer.playerSetVolumeTemporary = playerSetVolumeTemporary;
	
	//Set volume safely by checking if its currently faded and set either org. volume only or current AND org.
	AudioPlayer.playerSetCurrentOrTargetVolume = function(newVol){
		if (mainAudioIsOnHold || (SepiaFW.speech.isSpeakingOrListening())){
			var setVol = getValidVolume(newVol)/10.0;
			orgVolume = setVol;
			AudioPlayer.setPlayerVolumeIndicator(Math.floor(setVol*10.0), true);
			SepiaFW.debug.info('AUDIO: unfaded volume set to ' + setVol);
			broadcastPlayerVolumeSet();
		}else{
			playerSetVolume(newVol);
		}
	}

	AudioPlayer.playerFadeToOriginalVolume = function(){
		//fade to original volume
		if (SepiaFW.ui.isMobile && !Stream.isPlaying){
			SepiaFW.debug.info('AUDIO: fadeToOriginal - restore play status');
			var lastStream = SepiaFW.audio.getLastAudioStream();
			var lastStreamTitle = (lastStream)? SepiaFW.audio.getLastAudioStreamTitle() : "";
			SepiaFW.audio.playURL(lastStream, ''); 	//<-- potentially looses callBack info here, but since this is stopped
			SepiaFW.audio.setPlayerTitle(lastStreamTitle, "stream");
		}
		SepiaFW.debug.info('AUDIO: fadeToOriginal - restore vol=' + orgVolume);
		$(player).stop(); 	//note: this is an animation stop
		$(player).animate({volume: orgVolume}, 3000);
		broadcastPlayerFadeIn();
	}

	//--------helpers----------
	
	//test same origin - TODO: EXPERIMENTAL
	function testSameOrigin(url) {
		var loc = window.location,
			a = document.createElement('a');
		a.href = url;
		return a.hostname == loc.hostname &&
			   a.port == loc.port &&
			   a.protocol == loc.protocol;
	}
	
	//set title of player - NOTE: compared to most functions below this is not limited to "stream" player
	AudioPlayer.setPlayerTitle = function(newTitle, playerTag){
		//playerTag: stream, embedded-media-player, android-intent
		if (playerTag == undefined) playerTag = "stream";
		if (playerTag == "stream" || playerTag == player){
			//Stream player
			lastAudioStreamTitle = newTitle;
			player.title = newTitle;
			currentAudioTitleBelongsToStreamPlayer = true;
		}else{
			currentAudioTitleBelongsToStreamPlayer = false;
		}
		if (audioTitle) audioTitle.textContent = newTitle || "SEPIA Audio Player";
	}
	//set volume indicator of player - NOTE: use 0-10 (or '?'), not limited to "stream" player, only visual indicator!
	AudioPlayer.setPlayerVolumeIndicator = function(vol, remember){
		$('#sepiaFW-audio-ctrls-vol').text(vol);
		if (remember){
			AudioPlayer.storeGlobalMediaPlayerVolume(vol);
		}
	}

	//get the stream last played
	AudioPlayer.getLastAudioStream = function(){
		return lastAudioStream;
	}
	//get title of last stream played
	AudioPlayer.getLastAudioStreamTitle = function(){
		return lastAudioStreamTitle;
	}
	//resume last stream
	AudioPlayer.resumeLastAudioStream = function(){
		var lastStream = AudioPlayer.getLastAudioStream();
		var lastStreamTitle = (lastStream)? AudioPlayer.getLastAudioStreamTitle() : "";
		if (lastStream){
			AudioPlayer.playURL(lastStream, player);
			AudioPlayer.setPlayerTitle(lastStreamTitle, "stream");
			return true;
		}else{
			return false;
		}
	}

	//play audio by url
	AudioPlayer.playURL = function(audioURL, audioPlayer, onStartCallback, onEndCallback, onErrorCallback){
		if (!audioPlayer || audioPlayer === '1' || audioPlayer == 1 || audioPlayer == 'stream'){
			audioPlayer = player;
		}else if (audioPlayer === '2' || audioPlayer == 2 || audioPlayer == 'effects'){
			audioPlayer = player2;
		}else if (audioPlayer === 'tts'){
			audioPlayer = speaker;
		}
		var sourceName = "unknown";
		var audioOnEndFired = false;			//prevent doublefireing of audio onend onpause
		var audioOnErrorFired = false;			//prevent doublefireing of audio onerror

		if (audioURL) audioURL = SepiaFW.config.replacePathTagWithActualPath(audioURL);

		if (audioPlayer == player){
			sourceName = "stream";
			if (audioURL){
				beforeLastAudioStream = lastAudioStream;
				lastAudioStream = audioURL;
				lastAudioStreamTitle = "";		//we reset this and assume "setTitle" is called after "playUrl"
			}else{
				audioURL = lastAudioStream;
			}

			broadcastAudioRequested();

			//stop all other audio sources
			SepiaFW.client.controls.media({
				action: "stop",
				skipFollowUp: true
			});
			Stream.isLoading = true;

		}else if (audioPlayer == player2){
			sourceName = "effects";
			//TODO: ?
		
		}else if (audioPlayer == speaker){
			sourceName = "tts-player";
			if (isVoiceEffectSetupPending){
				//TODO: delay
				SepiaFW.debug.error("AUDIO: voice-effects setup still pending! Should delay 'AudioPlayer.playURL'");	//debug
			}
			if (speakerAudioCtx && (speakerAudioCtx.state == "suspended" || speakerAudioCtx.state == "closed")){
				SepiaFW.debug.log("AUDIO: context for voice-effects is suspended or closed! Trying to resume now.");	//debug
				speakerAudioCtx.resume().then(function(){
					SepiaFW.debug.log("AUDIO: context for voice-effects successfully resumed.");
				}).catch(function(err){
					audioPlayer.onerror({name: "AudioContextResumeError", message: "Failed to resume suspended/closed context", info: err});
				});	
				//TODO: wait for promise? Or add timeout fallback? - NOTE: "closed" will fail on purpose
			}
			TTS.isLoading = true;
			//TODO: more?
		}

		audioPlayer.preload = 'auto';
		AudioPlayer.broadcastAudioEvent(sourceName, "prepare", audioPlayer);

		var audioRequestedTime = Date.now();
		var audioFirstLoadTime = 0;
		var audioCanPlayTime = 0;
		SepiaFW.debug.info("AUDIO: pre-loading - " + audioRequestedTime);		//debug
		//console.log("Audio-URL: " + audioURL); 		//DEBUG
		audioPlayer.src = audioURL;
		audioPlayer.onloadedmetadata = function(e){
			SepiaFW.debug.info("AUDIO: meta data received (onloadedmetadata event)");		//debug
			audioFirstLoadTime = Date.now();
		};
		audioPlayer.oncanplay = function(){
			SepiaFW.debug.info("AUDIO: can be played now (oncanplay event)");		//debug
			audioCanPlayTime = Date.now();
			if (audioPlayer == player){
				Stream.isPlaying = true;
				Stream.isLoading = false;
				broadcastAudioStarted();
				AudioPlayer.fadeInMainIfOnHold();
				mainAudioIsOnHold = false;
				mainAudioStopRequested = false;
			}else if (audioPlayer == player2){
				//TODO: ?
			}else if (audioPlayer == speaker){
				TTS.isSpeaking = true;
				TTS.isLoading = false;
			}
			//callback
			if (onStartCallback) onStartCallback();
			AudioPlayer.broadcastAudioEvent(sourceName, "start", audioPlayer);
		};
		audioPlayer.onpause = function(){
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onpause event)" 	//debug
					+ " - First load: " + (audioFirstLoadTime - audioRequestedTime)
					+ " - Time to play: " + (audioCanPlayTime - audioRequestedTime)
					+ " - Playtime: " + (Date.now() - audioCanPlayTime)
				);				
				audioOnEndFired = true;
				if (audioPlayer == player){
					Stream.isPlaying = false;
					Stream.isLoading = false;
					mainAudioStopRequested = false; //from here on we rely on Stream.isPlaying
					broadcastAudioFinished();
					//mainAudioIsOnHold = false; 	//<- set in stop method, here we might actually really want to stop-for-hold
				}else if (audioPlayer == player2){
					//TODO: ?
				}else if (audioPlayer == speaker){
					TTS.isSpeaking = false;
					TTS.isLoading = false;
				}
				//callback
				if (onEndCallback) onEndCallback();
				var sourceName = "unknown";
				if (audioPlayer == player){
					sourceName = "stream";
				}else if (audioPlayer == player2){
					sourceName = "effects";
				}else if (audioPlayer == speaker){
					sourceName = "tts-player";
				}
				AudioPlayer.broadcastAudioEvent(sourceName, "stop", audioPlayer);
			}
		};
		audioPlayer.onended = function(){
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onend event)");				//debug
				audioPlayer.pause();
			}
		};
		audioPlayer.onerror = function(error){
			if (!audioOnErrorFired){
				audioOnErrorFired = true;
				SepiaFW.debug.info("AUDIO: error occured! - code: " + (audioPlayer.error? audioPlayer.error.code : error.name));			//debug
				if (audioPlayer.error && audioPlayer.error.code === 4){
					SepiaFW.ui.showInfo("Cannot play the selected audio stream. Sorry!");		//TODO: localize
				}else if (error && error.name && error.name == "NotAllowedError"){
					SepiaFW.ui.showInfo("Cannot play audio because access was denied! This can happen if the user didn't interact with the client first.");
				}else if (error && error.name){
					SepiaFW.ui.showInfo("Cannot play audio - Error: " + error.name + " (see console for details).");
				}
				if (audioPlayer == player){
					broadcastAudioError();
					mainAudioIsOnHold = false;
					mainAudioStopRequested = false;
					Stream.isPlaying = false;
					Stream.isLoading = false;
				}else if (audioPlayer == player2){
					//TODO: ?
				}else if (audioPlayer == speaker){
					TTS.isSpeaking = false;
					TTS.isLoading = false;
				}
				//callback
				if (onErrorCallback) onErrorCallback();
				var sourceName = "unknown";
				if (audioPlayer == player){
					sourceName = "stream";
				}else if (audioPlayer == player2){
					sourceName = "effects";
				}else if (audioPlayer == speaker){
					sourceName = "tts-player";
				}
				AudioPlayer.broadcastAudioEvent(sourceName, "error", audioPlayer);
			}
		};
		var p = audioPlayer.play();	
		if (p && ('catch' in p)){
			p.catch(function(err){
				SepiaFW.debug.error(err);
				audioPlayer.onerror(err);
			});
		}
	}
	
	//play alarm sound
	AudioPlayer.playAlarmSound = function(onStartCallback, onEndCallback, onErrorCallback, stoppedMedia, skippedN){
		if (skippedN == undefined) skippedN = 0;

		var audioPlayer = player2;
		var audioOnErrorFired = false;			//prevent doublefireing of audio onerror
		
		var alarmSound = AudioPlayer.alarmSound;
		//var emptySound = "sounds/empty.mp3";
		/*
		if (audioPlayer.src !== alarmSound && audioPlayer.src !== emptySound && audioPlayer.src !== ''){
			beforeLastAudioStream = lastAudioStream;
			lastAudioStream = audioPlayer.src;
		}
		*/
		
		//make sure that nothing else is running - hard cut!
		if (skippedN <= 3){
			//let assistant finish
			if (SepiaFW.speech.isSpeaking() || SepiaFW.speech.isRecognizing()){
				setTimeout(function(){
					skippedN++;
					AudioPlayer.playAlarmSound(onStartCallback, onEndCallback, onErrorCallback, stoppedMedia, skippedN);
				}, 3000);
				return;
			}
		}else{
			//force stop
			if (SepiaFW.speech.isSpeaking()){
				SepiaFW.speech.stopSpeech();
			}else if (SepiaFW.speech.isRecognizing()){
				SepiaFW.speech.stopRecognition();
			}
		}
		if (!stoppedMedia){
			stoppedMedia = true;
			//running alarm
			AudioPlayer.stopAlarmSound("playAlarm"); 						//just to be sure
			//running media
			SepiaFW.client.controls.media({action: "stop", skipFollowUp: true});	//TODO: consider restarting media-stream later?
			//running wake-word
			if (SepiaFW.wakeTriggers && SepiaFW.wakeTriggers.isListening()){
				SepiaFW.animate.assistant.loading();
				SepiaFW.wakeTriggers.stopListeningToWakeWords(function(){
					//Use the success-callback here to introduce a proper wait
					skippedN++;
					AudioPlayer.playAlarmSound(onStartCallback, onEndCallback, onErrorCallback, stoppedMedia, skippedN);
				}, function(e){
					//Error
					if (onErrorCallback) onErrorCallback(e);
				});
				return;
			}else{
				//give audio engines some time to react
				setTimeout(function(){
					skippedN++;
					AudioPlayer.playAlarmSound(onStartCallback, onEndCallback, onErrorCallback, stoppedMedia, skippedN);
				}, 1000);
				return;
			}
		}
						
		var audioOnEndFired = false;
		AudioPlayer.broadcastAudioEvent("effects", "prepare", audioPlayer);

		audioPlayer.src = alarmSound;
		audioPlayer.preload = 'auto';
		Alarm.isLoading = true;

		audioPlayer.oncanplay = function(){
			SepiaFW.debug.info("AUDIO: can be played now (oncanplay event)");		//debug
			Alarm.isPlaying = true;
			Alarm.isLoading = false;
			Alarm.lastActive = new Date().getTime();
			//callback
			if (onStartCallback) onStartCallback;
			AudioPlayer.broadcastAudioEvent("effects", "start", audioPlayer);
		};
		audioPlayer.onpause = function(){
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onpause event)");				//debug
				audioOnEndFired = true;
				Alarm.isPlaying = false;
				Alarm.isLoading = false;
				//reset audio URL
				/*
				audioPlayer.preload = 'none';
				audioPlayer.src = emptySound;
				*/
				//callback
				if (onEndCallback) onEndCallback();
				AudioPlayer.broadcastAudioEvent("effects", "stop", audioPlayer);
				SepiaFW.animate.assistant.idle();
			}
		};
		audioPlayer.onended = function(){
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onend event)");				//debug
				audioPlayer.pause();
			}
		};
		audioPlayer.onerror = function(error){
			if (!audioOnErrorFired){
				audioOnErrorFired = true;
				SepiaFW.debug.info("AUDIO: error occured! - code: " + (audioPlayer.error? audioPlayer.error.code : error.name));			//debug
				if (error && error.name && error.name == "NotAllowedError"){
					SepiaFW.ui.showInfo("Cannot play audio because access was denied! This can happen if the user didn't interact with the client first.");
				}else if (error && error.name){
					SepiaFW.ui.showInfo("Cannot play audio - Error: " + error.name + " (see console for details).");
				}
				Alarm.isPlaying = false;
				Alarm.isLoading = false;
				//reset audio URL
				/*
				audioPlayer.preload = 'none';
				audioPlayer.src = emptySound;
				*/
				//callback
				if (onErrorCallback) onErrorCallback();
				AudioPlayer.broadcastAudioEvent("effects", "error", audioPlayer);
				SepiaFW.animate.assistant.idle();
			}
		};
		var p = audioPlayer.play();
		if (p && ('catch' in p)){
			p.catch(function(err){
				SepiaFW.debug.error(err);
				audioPlayer.onerror(err);
			});
		}
	}
	//STOP alarm
	AudioPlayer.stopAlarmSound = function(source){
		//sources: alwaysOn, playAlarm, toggleMic, cardRemove, notificationClick
		SepiaFW.debug.info("AUDIO: stopping alarm sound.");			//debug
		player2.pause();
		//event
		var now = new Date().getTime();
		if (Alarm.isPlaying || (now - Alarm.lastActive) < 60000){
			//alarm was active the last 60s
			if (source && (source == "alwaysOn" || source == "toggleMic" || source == "cardRemove" || source == "notificationClick")){
				SepiaFW.events.broadcastAlarmStop({});			//NOTE: we have no 'Timer' info here :-|
				Alarm.lastActive = 0;
			}
		}
	}

	//Remote control
	AudioPlayer.openRemoteControl = function(){
		var remotePlayer = document.createElement("div");
		var header = document.createElement("h3");
		header.textContent = "Remote Media Player";
		header.style.marginBottom = "32px";
		var previousBtn = document.createElement("button");
		previousBtn.innerHTML = '<i class="material-icons md-24">skip_previous</i>';
		var pauseBtn = document.createElement("button");
		pauseBtn.innerHTML = '<i class="material-icons md-24">pause</i>';
		var playBtn = document.createElement("button");
		playBtn.innerHTML = '<i class="material-icons md-24">play_arrow</i>';
		var nextBtn = document.createElement("button");
		nextBtn.innerHTML = '<i class="material-icons md-24">skip_next</i>';
		//volume box + slider
		var volBox = document.createElement("div");
		volBox.style.cssText = "display: flex; justify-content: center; align-items: center; margin: 8px";
		var volValueLabel = document.createElement("label");
		volValueLabel.className = "sepiaFW-slider-indicator-type-1";
		var volSlider = SepiaFW.ui.build.slider("remote-mp-volume-slider", function(newVol){
			volValueLabel.textContent = newVol;
		}, undefined, SepiaFW.audio.getGlobalMediaPlayerVolume(), [0, 10], 1);
		volSlider.style.cssText = "flex: 0 1 198px;"
		volValueLabel.textContent = volSlider.getValue();
		var setVolBtn = document.createElement("button");
		setVolBtn.innerHTML = '<i class="material-icons md-24">volume_up</i>';	//equalizer
		volBox.appendChild(volValueLabel);
		volBox.appendChild(volSlider);
		volBox.appendChild(setVolBtn);
		//button fun
		$(previousBtn).on("click", function(){
			sendRemotePlayerAction({type: "control", controlAction: "previous"});
		});
		$(pauseBtn).on("click", function(){
			sendRemotePlayerAction({type: "control", controlAction: "pause"});
		});
		$(playBtn).on("click", function(){
			sendRemotePlayerAction({type: "control", controlAction: "resume"});
		});
		$(nextBtn).on("click", function(){
			sendRemotePlayerAction({type: "control", controlAction: "next"});
		});
		$(setVolBtn).on("click", function(){
			var newVol = volSlider.getValue();
			sendRemotePlayerAction({type: "volume", volumeAction: ("volume;;" + newVol)});
		});
		remotePlayer.appendChild(header);
		remotePlayer.appendChild(previousBtn);
		remotePlayer.appendChild(pauseBtn);
		remotePlayer.appendChild(playBtn);
		remotePlayer.appendChild(nextBtn);
		remotePlayer.appendChild(volBox);
		SepiaFW.ui.showPopup(remotePlayer, {buttonOneName: SepiaFW.local.g("abort"), buttonOneAction: function(){}});
	}
	function sendRemotePlayerAction(action){
		var includeSharedFor = [{dataType: "remoteActions", action: "media", actionType: action.type}];
		SepiaFW.client.showConnectedUserClientsAsMenu(SepiaFW.local.g('choose_device_for_action'), 
			function(deviceInfo){
				var sharedReceiver = deviceInfo.isShared? deviceInfo.id : undefined;
				SepiaFW.client.sendRemoteActionToOwnDeviceOrShared("media", action, 
					deviceInfo.deviceId, sharedReceiver, undefined, function(err){
						SepiaFW.debug.error("Failed to send remote action.", err);
						SepiaFW.ui.showPopup("Failed to send remote action." + (err? (" Error: " + err) : ""));
					});
			}, true, includeSharedFor, {
				skipOwnDevice: true
			}
		);
	}
	
	AudioPlayer.tts = TTS;
	AudioPlayer.alarm = Alarm;
	return AudioPlayer;
}