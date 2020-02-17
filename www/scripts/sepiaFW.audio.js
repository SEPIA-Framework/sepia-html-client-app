//AUDIO PLAYER
function sepiaFW_build_audio(){
	var AudioPlayer = {};
	var Stream = {};
	var TTS = {};			//TTS parameters for SepiaFW external TTS like Acapela. I've tried to seperate TTS and AudioPlayer as good as possible, but there might be some bugs using both
	var Alarm = {};
	
	//Parameters and states:

	var player;				//AudioPlayer for music and stuff
	var player2;			//AudioPlayer for sound effects
	var speaker;			//Player for TTS
	var doInitAudio = true;			//workaround to activate scripted audio on touch devices
	var audioOnEndFired = false;	//state: prevent doublefireing of audio onend onpause

	Stream.isPlaying = false;		//state: stream player
	Stream.isLoading = false;
	TTS.isSpeaking = false;			//state: TTS player
	TTS.isLoading = false;
	Alarm.isPlaying = false;		//state: alarm player (special feature of effects player)
	Alarm.isLoading = false;

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
	AudioPlayer.startNextMusicStreamOfQueue = function(successCallback, errorCallback){
		//TODO: Currently the only thing 'player' can do is stream radio or URL, so this will always return ERROR for now.
		if (errorCallback) errorCallback({
			error: "No next stream available",
			status: 1
		});
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
		var isYouTubePlayerStreaming = SepiaFW.ui.cards.youTubePlayerGetState() == 1 || SepiaFW.ui.cards.youTubePlayerIsOnHold();
		var isAndroidPlayerStreaming = SepiaFW.ui.isAndroid && SepiaFW.android.lastReceivedMediaData && SepiaFW.android.lastReceivedMediaData.playing 
										&& ((new Date().getTime() - SepiaFW.android.lastReceivedMediaAppTS) < (1000*60*15));		//This is pure guessing ...
		return isInternalPlayerStreaming || isYouTubePlayerStreaming || isAndroidPlayerStreaming;			
	}
	AudioPlayer.getLastActiveAudioStreamPlayer = function(){
		return lastAudioPlayerEventSource;
	}
	
	//AudioContext stuff:
	AudioPlayer.useAudioContext = false;	//experimental feature for things like gain control and music visualization (unfortunately fails for quite a few radio streams)
	var gotPlayerAudioContext = false;		//state of context
	var playerAudioContext; 	//AudioContext for player
	var playerAudioSource;		//Source of player
	var playerGainNode;			//Gain for player
	var playerAudioAnalyser;	//Analyzer for player
	var playerGainFader;		//interval control to fade in and out
	var playerSpectrum;			//Spectrum of player
	
	//controls
	var audioTitle;
	var audioStartBtn;
	var audioStopBtn;
	var audioVolUp;
	var audioVolDown;
	var audioVolD;
	var lastAudioStream = 'sounds/empty.mp3';
	var beforeLastAudioStream = 'sounds/empty.mp3';
	var lastAudioPlayerEventSource = '';		//Note: this does not include TTS and effects player
	var mainAudioIsOnHold = false;
	var mainAudioStopRequested = false;
	var orgVolume = 1.0;
	var orgGain = 1.0;
	var FADE_OUT_VOL = 0.05; 	//note: on some devices audio is actually stopped so this value does not apply

	//---- broadcasting -----

	AudioPlayer.broadcastAudioEvent = function(source, action, playerObject){
		//stream, effects, tts-player, unknown - start, stop, error, fadeOut, fadeIn
		//android-intent - stop, start
		//youtube-embedded - start, resume, pause, hold
		source = source.toLowerCase();
		action = action.toLowerCase();
		if (source == "stream" || source.indexOf("youtube") >= 0 || source.indexOf("android") >= 0){
			lastAudioPlayerEventSource = source;
		}
		var event = new CustomEvent('sepia_audio_player_event', { detail: {
			source: source,
			action: action
		}});
		document.dispatchEvent(event);
		//console.error("audio event: " + source + " - " + action);
	}
	
	function broadcastAudioRequested(){
		//EXAMPLE: 
		if (audioTitle) audioTitle.innerHTML = 'Loading ...';
	}
	function broadcastAudioFinished(){
		//EXAMPLE: 
		if (gotPlayerAudioContext) setTimeout(function(){ if (!Stream.isPlaying) clearInterval(playerSpectrum); },1500);
		else SepiaFW.animate.audio.playerIdle();
		if (audioTitle.innerHTML === "Loading ...") audioTitle.innerHTML = "Stopped";
	}
	function broadcastAudioStarted(){
		//EXAMPLE: 
		if (audioTitle) audioTitle.innerHTML = player.title;
		if (gotPlayerAudioContext){ 	clearInterval(playerSpectrum); playerSpectrum = setInterval(playerDrawSpectrum, 30); 	}
		else SepiaFW.animate.audio.playerActive();
	}
	function broadcastAudioError(){
		//EXAMPLE: 
		if (audioTitle) audioTitle.innerHTML = 'Error';
		if (gotPlayerAudioContext) setTimeout(function(){ if (!Stream.isPlaying) clearInterval(playerSpectrum); },1500);
		else SepiaFW.animate.audio.playerIdle();
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
	AudioPlayer.setup = function (){
		//get players
		player = document.getElementById('sepiaFW-audio-player');
		player2 = document.getElementById('sepiaFW-audio-player2');
		speaker = document.getElementById('sepiaFW-audio-speaker');
		if (speaker) speaker.setAttribute('data-tts', true);
		
		//get audio context (for ios volume and spectrum analyzers)
		connectAudioContext();
		
		//get player controls
		audioTitle = document.getElementById('sepiaFW-audio-ctrls-title');
		audioStartBtn = document.getElementById('sepiaFW-audio-ctrls-start');
		$(audioStartBtn).off().on('click', function(){
			//test: player.src = "sounds/coin.mp3";
			//player.play();
			if (!AudioPlayer.initAudio(function(){ AudioPlayer.playURL('', player); })){
				AudioPlayer.playURL('', player);
			}
		});
		audioStopBtn = document.getElementById('sepiaFW-audio-ctrls-stop');
		$(audioStopBtn).off().on('click', function(){
			SepiaFW.client.controls.media({
				action: "stop"
			});
		});
		audioVolUp = document.getElementById('sepiaFW-audio-ctrls-volup');
		$(audioVolUp).off().on('click', function(){
			playerSetVolume(playerGetVolume() + 1.0);
		});
		audioVolDown = document.getElementById('sepiaFW-audio-ctrls-voldown');
		$(audioVolDown).off().on('click', function(){
			playerSetVolume(playerGetVolume() - 1.0);
		});
		audioVol = document.getElementById('sepiaFW-audio-ctrls-vol');
		if (audioVol) audioVol.innerHTML = Math.round(player.volume*10.0);
	}
	
	//connect / disconnect AudioContext
	function connectAudioContext(){
		//get audio context (for ios volume and spectrum analyzers - TODO: why is '!SepiaFW.ui.isIOS' used? Didn't we deactivate the whole thing?)
		if(AudioPlayer.useAudioContext && !gotPlayerAudioContext 
					&& ('webkitAudioContext' in window || 'AudioContext' in window) 
					&& !((window.location.toString().indexOf('file') == 0) 
					&& !SepiaFW.ui.isSafari && !SepiaFW.ui.isIOS)){
			player.crossOrigin = "anonymous";
						
			playerAudioContext = new (window.AudioContext || window.webkitAudioContext)();
			playerAudioSource = playerAudioContext.createMediaElementSource(player);
			
			playerGainNode = playerAudioContext.createGain();
			playerGainNode.gain.value = 1.0;
			
			playerAudioSource.connect(playerGainNode);
			
			// an analyser is used for the spectrum
			playerAudioAnalyser = playerAudioContext.createAnalyser();
			playerAudioAnalyser.smoothingTimeConstant = 0.85;
			
			playerGainNode.connect(playerAudioAnalyser);
			playerAudioAnalyser.connect(playerAudioContext.destination);
			
			gotPlayerAudioContext = true;
		}
	}
	/*	-- NOT WORKING --
	function disconnectAudioContext(){
		if (gotPlayerAudioContext){
			player.removeAttribute('crossorigin');
			
			playerGainNode.disconnect();
			playerAudioAnalyser.disconnect();
			playerAudioSource.disconnect();
			
			playerAudioContext.close();
			
			gotPlayerAudioContext = false;
		}
	}*/
	
	//sound init - returns true if it will be executed, false everytime after first call
	AudioPlayer.requiresInit = function(){
		return (!SepiaFW.ui.isStandaloneWebApp && (SepiaFW.ui.isMobile || SepiaFW.ui.isSafari) && doInitAudio);
	}
	AudioPlayer.initAudio = function(continueCallback){
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
			return false;
		}
	}

	//set default parameters for TTS
	TTS.setup = function (Settings){
		TTS.playOn = (Settings.playOn)? Settings.playOn : "client"; 		//play TTS on client (can also be played on "server" if available)
		TTS.format = (Settings.format)? Settings.format : "default";		//you can force format to default,OGG,MP3,MP3_CBR_32 and WAV (if using online api)
		//about voices
		TTS.voice = (Settings.voice)? Settings.voice : "default";			//name of the voice used
		TTS.gender = (Settings.gender)? Settings.gender : "default";		//name of gender ("male", "female", "child", "old, "creature")
		TTS.mood = (Settings.mood)? Settings.mood : 5;						//mood state
		TTS.speed = (Settings.speed)? Settings.speed : "1.0";
		TTS.tone = (Settings.tone)? Settings.tone : "1.0";
		TTS.maxChunkLength = (Settings.maxChunkLength)? Settings.maxChunkLength : 600;
		TTS.maxMoodIndex = (Settings.maxMoodIndex)? Settings.maxMoodIndex : 3;
	}

	//use TTS endpoint to generate soundfile and speak answer
	TTS.speak = function (message, onStartCallback, onEndCallback, onErrorCallback){
		//gets URL and calls play(URL)
		TTS.getURL(message, function(audioUrl){
			if (audioUrl.indexOf("/") == 0){
				audioUrl = SepiaFW.config.assistAPI + audioUrl.substring(1);
			}else if (audioUrl.indexOf("tts") == 0){
				audioUrl = SepiaFW.config.assistAPI + audioUrl;
			}
			AudioPlayer.playURL(audioUrl, speaker, onStartCallback, onEndCallback, onErrorCallback);
		}, onErrorCallback);		
	}
	TTS.stop = function(){
		AudioPlayer.stop(speaker);
	}

	//STOP all audio
	AudioPlayer.stop = function (audioPlayer){
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
			if (gotPlayerAudioContext) playerGainNode.gain.value = orgGain;
			else audioPlayer.volume = orgVolume;
		
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
			if (!gotPlayerAudioContext){
				//orgVolume = (player.volume < orgVolume)? orgVolume : player.volume;
				SepiaFW.debug.info('AUDIO: fadeOutMain orgVol=' + orgVolume);
				$(player).stop(); 	//note: this is an animation stop
				$(player).animate({volume: FADE_OUT_VOL}, 300);
			}else{
				//orgGain = (playerGainNode.gain.value < orgGain)? orgGain : playerGainNode.gain.value;
				SepiaFW.debug.info('AUDIO: fadeOutMain orgVol=' + orgGain);
				playerFadeOut(1.0); 	//note: argument is speed of fader
			}
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
			if (!gotPlayerAudioContext){
				SepiaFW.debug.info('AUDIO: fadeInMain - no play just reset vol=' + orgVolume);
				playerSetVolume(orgVolume * 10.0);
			}else{
				SepiaFW.debug.info('AUDIO: fadeInMain - no play just reset vol=' + orgGain);
				playerSetVolume(orgGain * 10.0);
			}
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
				id: "youtube",
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
		if (!gotPlayerAudioContext){
			return Math.round(10.0 * player.volume);
		}else{
			return Math.round(10.0 * playerGainNode.gain.value);
		}
	}
	AudioPlayer.playerGetVolume = playerGetVolume;
	AudioPlayer.getOriginalVolume = function(){
		if (!gotPlayerAudioContext){
			return Math.round(10.0 * orgVolume);
		}else{
			return Math.round(10.0 * orgGain);
		}
	}

	function playerSetVolume(newVol){
		var setVol = getValidVolume(newVol)/10.0;
		if (!gotPlayerAudioContext){
			player.volume = setVol;
			orgVolume = setVol;
		}else{
			playerGainNode.gain.value = setVol;
			orgGain = setVol;
		}
		$('#sepiaFW-audio-ctrls-vol').html(Math.floor(setVol*10.0));
		SepiaFW.debug.info('AUDIO: volume set (and stored) to ' + setVol);
		broadcastPlayerVolumeSet();
	}
	function playerSetVolumeTemporary(newVol){
		var setVol = getValidVolume(newVol)/10.0;
		if (!gotPlayerAudioContext){
			player.volume = setVol;
		}else{
			playerGainNode.gain.value = setVol;
		}
		SepiaFW.debug.info('AUDIO: volume set temporary (till next fadeIn) to ' + setVol);
	}
	function getValidVolume(volumeIn){
		var vol = 0.5;
		if (volumeIn > 10.0) vol = 10.0;
		else if (volumeIn < 0.0) vol = 0.0;
		else vol = volumeIn;
		return vol;
	}
	AudioPlayer.playerSetVolume = playerSetVolume;
	AudioPlayer.playerSetVolumeTemporary = playerSetVolumeTemporary;
	
	//Set volume safely by checking if its currently faded and set either org. volume only or current AND org.
	AudioPlayer.playerSetCurrentOrTargetVolume = function(newVol){
		if (mainAudioIsOnHold || (SepiaFW.speech.isSpeakingOrListening())){
			var setVol = getValidVolume(newVol)/10.0;
			if (!gotPlayerAudioContext){
				orgVolume = setVol;
			}else{
				orgGain = setVol;
			}
			$('#sepiaFW-audio-ctrls-vol').html(Math.floor(setVol*10.0));
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
			SepiaFW.audio.playURL('', ''); 	//<-- potentially looses callBack info here, but since this is stopped
		}
		if (!gotPlayerAudioContext){
			SepiaFW.debug.info('AUDIO: fadeToOriginal - restore vol=' + orgVolume);
			$(player).stop(); 	//note: this is an animation stop
			$(player).animate({volume: orgVolume}, 3000);
		}else{
			SepiaFW.debug.info('AUDIO: fadeToOriginal - restore vol=' + orgGain);
			playerFadeIn(10.0); 	//note: argument is speed of fader
		}
		broadcastPlayerFadeIn();
	}
	function playerFadeOut(slowness){
		clearInterval(playerGainFader);
		playerGainFader = setInterval(function(){
			var gain = playerGainNode.gain.value;
			if (gain > FADE_OUT_VOL){ 	playerGainNode.gain.value = (gain - 0.05);	}
			else { 
				playerGainNode.gain.value = (orgGain<FADE_OUT_VOL)? orgGain : FADE_OUT_VOL;
				clearInterval(playerGainFader); 
			}
		}, (15 * slowness));
	}
	function playerFadeIn(slowness){
		clearInterval(playerGainFader);
		playerGainFader = setInterval(function(){
			var gain = playerGainNode.gain.value;
			if (gain < orgGain){ 	playerGainNode.gain.value = (gain + 0.05);	}
			else { 
				playerGainNode.gain.value = orgGain;	
				clearInterval(playerGainFader); 
			}
		}, (15 * slowness));
	}
	function playerDrawSpectrum() {
		var canvas = document.getElementById('sepiaFW-audio-ctrls-canvas');
		var ctx = canvas.getContext('2d');
		var width = canvas.width;
		var height = canvas.height;
		var bar_width = 10;

		ctx.clearRect(0, 0, width, height);
		//ctx.fillStyle=SepiaFW.ui.assistantColor;

		var freqByteData = new Uint8Array(playerAudioAnalyser.frequencyBinCount);
		playerAudioAnalyser.getByteFrequencyData(freqByteData);

		var barCount = Math.round(width / bar_width);
		for (var i = 0; i < barCount; i++) {
			var magnitude = freqByteData[i];
			// some values need adjusting to fit on the canvas
			ctx.fillRect(bar_width * i, height, bar_width - 2, -magnitude + 80);
		}
	}

	//--------helpers----------

	//get audio URL
	TTS.getURL = function(message, successCallback, errorCallback){
		var apiUrl = SepiaFW.config.assistAPI + "tts";
		var submitData = {
			text: message,
			lang: ((SepiaFW.speech)? SepiaFW.speech.getLanguage() : SepiaFW.config.appLanguage),
			mood: ((SepiaFW.assistant)? SepiaFW.assistant.getMood() : TTS.mood),
			voice: TTS.voice,
			gender: TTS.gender,
			speed: TTS.speed,
			tone: TTS.tone,
			playOn: TTS.playOn,		//check play on server 
			format: TTS.format		//sound format (e.g. wav file)
		};
		submitData.KEY = SepiaFW.account.getKey();
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
			success: function (response) {
				SepiaFW.debug.info("GET_AUDIO SUCCESS: " + JSON.stringify(response));
				if (response.result === "success"){
					if (successCallback) successCallback(response.url);
				}else{
					if (errorCallback) errorCallback();
				}
			},
			error: function (e) {
				SepiaFW.debug.info("GET_AUDIO ERROR: " + JSON.stringify(e));
				if (errorCallback) errorCallback();
			}
		});
	}
	
	//test same origin - TODO: EXPERIMENTAL
	function testSameOrigin(url) {
		var loc = window.location,
			a = document.createElement('a');
		a.href = url;
		return a.hostname == loc.hostname &&
			   a.port == loc.port &&
			   a.protocol == loc.protocol;
	}
	
	//set title of player
	AudioPlayer.setPlayerTitle = function(newTitle, audioPlayer){
		if (!audioPlayer) audioPlayer = player;
		audioPlayer.title = newTitle;
		if (audioTitle) audioTitle.innerHTML = newTitle || "SepiaFW audio player";
	}

	//get the stream last played
	AudioPlayer.getLastAudioStream = function(){
		return lastAudioStream;
	}
	//resume last stream
	AudioPlayer.resumeLastAudioStream = function(){
		if (AudioPlayer.getLastAudioStream()){
			AudioPlayer.playURL('', player);
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
		
		if (audioURL && audioPlayer == player){
			beforeLastAudioStream = lastAudioStream;
			lastAudioStream = audioURL;
		}
		if (!audioURL) audioURL = lastAudioStream;
		
		audioOnEndFired = false;
		if (audioPlayer == player){
			broadcastAudioRequested();

			//stop all other audio sources
			if (SepiaFW.client.controls){
				SepiaFW.client.controls.media({
					action: "stop",
					skipFollowUp: true
				});
			}
			Stream.isLoading = true;

		}else if (audioPlayer == player2){
			//TODO: ?
		}else if (audioPlayer == speaker){
			//TODO: more?
			TTS.isLoading = true;
		}

		audioPlayer.preload = 'auto';

		//console.log("Audio-URL: " + audioURL); 		//DEBUG
		audioPlayer.src = audioURL;
		audioPlayer.oncanplay = function() {
			SepiaFW.debug.info("AUDIO: can be played now (oncanplay event)");		//debug
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
			if (audioPlayer == player){
				AudioPlayer.broadcastAudioEvent("stream", "start", audioPlayer);
			}else if (audioPlayer == player2){
				AudioPlayer.broadcastAudioEvent("effects", "start", audioPlayer);
			}else if (audioPlayer == speaker){
				AudioPlayer.broadcastAudioEvent("tts-player", "start", audioPlayer);
			}else{
				AudioPlayer.broadcastAudioEvent("unknown", "start", audioPlayer);
			}
		};
		audioPlayer.onpause = function() {
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onpause event)");				//debug
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
				if (audioPlayer == player){
					AudioPlayer.broadcastAudioEvent("stream", "stop", audioPlayer);
				}else if (audioPlayer == player2){
					AudioPlayer.broadcastAudioEvent("effects", "stop", audioPlayer);
				}else if (audioPlayer == speaker){
					AudioPlayer.broadcastAudioEvent("tts-player", "stop", audioPlayer);
				}else{
					AudioPlayer.broadcastAudioEvent("unknown", "stop", audioPlayer);
				}
			}
		};
		audioPlayer.onended = function() {
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onend event)");				//debug
				audioPlayer.pause();
			}
		};
		audioPlayer.onerror = function(error) {
			SepiaFW.debug.info("AUDIO: error occured! - code: " + audioPlayer.error.code);			//debug
			if (audioPlayer.error.code === 4){
				SepiaFW.ui.showInfo('Cannot play the selected audio stream. Sorry!');		//TODO: localize
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
			if (audioPlayer == player){
				AudioPlayer.broadcastAudioEvent("stream", "error", audioPlayer);
			}else if (audioPlayer == player2){
				AudioPlayer.broadcastAudioEvent("effects", "error", audioPlayer);
			}else if (audioPlayer == speaker){
				AudioPlayer.broadcastAudioEvent("tts-player", "error", audioPlayer);
			}else{
				AudioPlayer.broadcastAudioEvent("unknown", "error", audioPlayer);
			}
		};
		audioPlayer.play();
	}
	
	//play alarm sound
	AudioPlayer.playAlarmSound = function(onStartCallback, onEndCallback, onErrorCallback, stoppedMedia, skippedN){
		if (skippedN == undefined) skippedN = 0;

		var audioPlayer = player2;
		var alarmSound = "sounds/alarm.mp3";
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
			AudioPlayer.stopAlarmSound(); 						//just to be sure
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
						
		audioOnEndFired = false;

		audioPlayer.src = alarmSound;
		audioPlayer.preload = 'auto';
		Alarm.isLoading = true;

		audioPlayer.oncanplay = function() {
			SepiaFW.debug.info("AUDIO: can be played now (oncanplay event)");		//debug
			Alarm.isPlaying = true;
			Alarm.isLoading = false;
			//callback
			if (onStartCallback) onStartCallback;
			AudioPlayer.broadcastAudioEvent("effects", "start", audioPlayer);
		};
		audioPlayer.onpause = function() {
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
		audioPlayer.onended = function() {
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onend event)");				//debug
				audioPlayer.pause();
			}
		};
		audioPlayer.onerror = function(error) {
			SepiaFW.debug.info("AUDIO: error occured! - code: " + audioPlayer.error.code);						//debug
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
		};
		audioPlayer.play();
	}
	//STOP alarm
	AudioPlayer.stopAlarmSound = function(){
		SepiaFW.debug.info("AUDIO: stopping alarm sound.");			//debug
		player2.pause();
	}
	
	AudioPlayer.tts = TTS;
	AudioPlayer.alarm = Alarm;
	return AudioPlayer;
}