//AUDIO PLAYER
function sepiaFW_build_audio(){
	var AudioPlayer = {};
	var TTS = {};			//TTS parameters for SepiaFW external TTS like Acapela. I've tried to seperate TTS and AudioPlayer as good as possible, but there might be some bugs using both
	
	//Parameters and states
	TTS.isSpeaking = false;				//state: is assistant speaking?
	AudioPlayer.isPlaying = false;

	var player;				//AudioPlayer for music and stuff
	var player2;			//AudioPlayer for sound effects
	var speaker;			//Player for TTS
	var doInitAudio = true;			//workaround to activate scripted audio on touch devices
	var audioOnEndFired = false;	//state: prevent doublefireing of audio onend onpause
	
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
	var mainAudioIsOnHold = false;
	var orgVolume = 0.66;
	var orgGain = 1.0;
	var FADE_OUT_VOL = 0.05; 	//note: on some devices audio is actually stopped so this value does not apply

	//---- broadcasting -----
	
	function broadcastAudioRequested(){
		//EXAMPLE: 
		if (audioTitle) audioTitle.innerHTML = 'Loading ...';
	}
	function broadcastAudioFinished(){
		//EXAMPLE: 
		if (gotPlayerAudioContext) setTimeout(function(){ if (!AudioPlayer.isPlaying) clearInterval(playerSpectrum); },1500);
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
		if (gotPlayerAudioContext) setTimeout(function(){ if (!AudioPlayer.isPlaying) clearInterval(playerSpectrum); },1500);
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
		$(audioStartBtn).off();
		$(audioStartBtn).on('click', function(){
			//test: player.src = "sounds/coin.mp3";
			//player.play();
			if (!AudioPlayer.initAudio(function(){ AudioPlayer.playURL('', player); })){
				AudioPlayer.playURL('', player);
			}
		});
		audioStopBtn = document.getElementById('sepiaFW-audio-ctrls-stop');
		$(audioStopBtn).off();
		$(audioStopBtn).on('click', function(){
			if (!AudioPlayer.initAudio(function(){ AudioPlayer.stop(player); })){
				AudioPlayer.stop(player);
			}
		});
		audioVolUp = document.getElementById('sepiaFW-audio-ctrls-volup');
		$(audioVolUp).off();
		$(audioVolUp).on('click', function(){
			playerSetVolume(playerGetVolume() + 1.0);
		});
		audioVolDown = document.getElementById('sepiaFW-audio-ctrls-voldown');
		$(audioVolDown).off();
		$(audioVolDown).on('click', function(){
			playerSetVolume(playerGetVolume() - 1.0);
		});
		audioVol = document.getElementById('sepiaFW-audio-ctrls-vol');
		if (audioVol) audioVol.innerHTML = Math.round(player.volume*10.0);
	}
	
	//connect / disconnect AudioContext
	function connectAudioContext(){
		//get audio context (for ios volume and spectrum analyzers)
		if(AudioPlayer.useAudioContext && !gotPlayerAudioContext && ('webkitAudioContext' in window || 'AudioContext' in window) 
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
	}

	//use TTS endpoint to generate soundfile and speak answer
	TTS.speak = function (message, onStartCallback, onEndCallback, onErrorCallback){
		//gets URL and calls play(URL)
		TTS.getURL(message, function(audioUrl){
			AudioPlayer.playURL(audioURL, speaker, onStartCallback, onEndCallback, onErrorCallback);
		}, onErrorCallback);		
	}
	TTS.stop = function(){
		AudioPlayer.stop(speaker);
	}

	//STOP all audio
	AudioPlayer.stop = function (audioPlayer){
		if (!audioPlayer) audioPlayer = player;
		if (AudioPlayer.isPlaying){
			audioPlayer.pause();
		}
		broadcastAudioFinished();
		if (!audioPlayer.dataset.tts){
			mainAudioIsOnHold = false;
			if (gotPlayerAudioContext) playerGainNode.gain.value = orgGain;
			else audioPlayer.volume = orgVolume;
		}
	}
	
	//Fade main audio source in and out and restart if needed
	AudioPlayer.isMainOnHold = function(){
		return mainAudioIsOnHold;
	}
	AudioPlayer.fadeOutMain = function(force){
		if (AudioPlayer.isPlaying || force){
			if (SepiaFW.ui.isMobile && AudioPlayer.isPlaying && !mainAudioIsOnHold){
				SepiaFW.debug.info('AUDIO: instant fadeOutMain');
				player.pause(); 		//<-- try without broadcasting, is it save?
			}
			if (!gotPlayerAudioContext){
				orgVolume = (player.volume < orgVolume)? orgVolume : player.volume;
				SepiaFW.debug.info('AUDIO: fadeOutMain orgVol=' + orgVolume);
				$(player).stop();
				$(player).animate({volume: FADE_OUT_VOL}, 300);
			}else{
				orgGain = (playerGainNode.gain.value < orgGain)? orgGain : playerGainNode.gain.value;
				SepiaFW.debug.info('AUDIO: fadeOutMain orgVol=' + orgGain);
				playerFadeOut(1.0);
			}
			broadcastPlayerFadeOut();
			mainAudioIsOnHold = true;
		}
	}
	AudioPlayer.fadeInMainIfOnHold = function(){
		if (mainAudioIsOnHold){
			if (SepiaFW.ui.isMobile && !AudioPlayer.isPlaying){
				SepiaFW.debug.info('AUDIO: fadeInMain - restore play status');
				SepiaFW.audio.playURL('', ''); 	//<-- potentially looses callBack info here, but since this is stopped
			}
			if (!gotPlayerAudioContext){
				SepiaFW.debug.info('AUDIO: fadeInMain - restore vol=' + orgVolume);
				$(player).stop();
				$(player).animate({volume: orgVolume}, 3000);
			}else{
				SepiaFW.debug.info('AUDIO: fadeInMain - restore vol=' + orgGain);
				playerFadeIn(10.0);
			}
			broadcastPlayerFadeIn();
			mainAudioIsOnHold = false;
		}
	}
	
	//player specials
	function playerGetVolume(){
		if (!gotPlayerAudioContext){
			return Math.round(10.0 * player.volume);
		}else{
			return Math.round(10.0 * playerGainNode.gain.value);
		}
	}
	function playerSetVolume(newVol){
		var vol = 0.5;
		if (newVol > 10.0) vol = 10.0;
		else if (newVol < 0.0) vol = 0.0;
		else vol = newVol;
		var setVol = (vol/10.0);
		if (!gotPlayerAudioContext){
			player.volume = setVol;
			orgVolume = player.volume;
		}else{
			playerGainNode.gain.value = setVol;
			orgGain = playerGainNode.gain.value;
		}
		$('#sepiaFW-audio-ctrls-vol').html(vol);
		SepiaFW.debug.info('AUDIO: volume set to ' + setVol);
		broadcastPlayerVolumeSet();
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
		//check voice configuration
		var voice = TTS.voice;
		var gender = TTS.gender;
		var voice_speed = TTS.speed;
		var voice_tone = TTS.tone;
		//emotion settings
		var mood = TTS.mood;
		//check play on server 
		var this_playOn = TTS.playOn;
		//set format
		var sound_format = TTS.format;

		//get url
		$.ajax({
			type: "GET",
			url: SepiaFW.config.assistAPI + "tts?text=" + encodeURIComponent(message) +
							"&mood=" + encodeURIComponent(mood) +
							"&voice=" + encodeURIComponent(voice) +
							"&gender=" + encodeURIComponent(gender) +
							"&speed=" + encodeURIComponent(voice_speed) +
							"&tone=" + encodeURIComponent(voice_tone) +
							"&playOn=" + encodeURIComponent(this_playOn) +
							"&format=" + encodeURIComponent(sound_format) +
							//general stuff
							"&env=" + encodeURIComponent(SepiaFW.config.environment) +
							"&lang=" + encodeURIComponent((SepiaFW.speech)? SepiaFW.speech.language : SepiaFW.config.appLanguage) +
							"&KEY=" + encodeURIComponent(SepiaFW.account.getKey()) +
							"&client=" + encodeURIComponent(SepiaFW.config.clientInfo),
			timeout: 10000,
			dataType: "jsonp",
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
	}

	//play audio by url
	AudioPlayer.playURL = function(audioURL, audioPlayer, onStartCallback, onEndCallback, onErrorCallback){
		if (!audioPlayer || audioPlayer === '1' || audioPlayer == 1){
			audioPlayer = player;
		}
		else if (audioPlayer === '2' || audioPlayer == 2 || audioPlayer === 'tts') audioPlayer = speaker;
		
		if (audioURL && !audioPlayer.dataset.tts){
			beforeLastAudioStream = lastAudioStream;
			lastAudioStream = audioURL;
		}
		if (!audioURL) audioURL = lastAudioStream;
		
		audioOnEndFired = false;
		if (!audioPlayer.dataset.tts){
			broadcastAudioRequested();
		}

		audioPlayer.preload = 'auto';
		//console.log("Audio-URL: " + audioURL); 		//DEBUG
		audioPlayer.src = audioURL;
		audioPlayer.oncanplay = function() {
			SepiaFW.debug.info("AUDIO: can be played now (oncanplay event)");		//debug
			if (!audioPlayer.dataset.tts){
				AudioPlayer.isPlaying = true;
				broadcastAudioStarted();
				AudioPlayer.fadeInMainIfOnHold();
				mainAudioIsOnHold = false;
			}else{
				TTS.isSpeaking = true;
			}
			//callback
			if (onStartCallback) onStartCallback;
		};
		audioPlayer.onpause = function() {
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onpause event)");				//debug
				audioOnEndFired = true;
				if (!audioPlayer.dataset.tts){
					AudioPlayer.isPlaying = false;
					broadcastAudioFinished();
					//mainAudioIsOnHold = false; 	//<- set in stop method, here we might actually really want to stop-for-hold
				}else{
					TTS.isSpeaking = false;
				}
				//callback
				if (onEndCallback) onEndCallback();
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
			}
			if (!audioPlayer.dataset.tts){
				broadcastAudioError();
				mainAudioIsOnHold = false;
				AudioPlayer.isPlaying = false;
			}else{
				TTS.isSpeaking = false;
			}
			//callback
			if (onErrorCallback) onErrorCallback();
		};
		audioPlayer.play();
	}
	
	//play alarm sound
	AudioPlayer.playAlarmSound = function(onStartCallback, onEndCallback, onErrorCallback){
		var audioPlayer = player2;
		var alarmSound = "sounds/alarm.mp3";
		//var emptySound = "sounds/empty.mp3";
		/*
		if (audioPlayer.src !== alarmSound && audioPlayer.src !== emptySound && audioPlayer.src !== ''){
			beforeLastAudioStream = lastAudioStream;
			lastAudioStream = audioPlayer.src;
		}
		*/
		
		//make sure that nothing else is running - hard cut! ^^ - also restores gain to full
		AudioPlayer.stopAlarmSound(); 	//just to be sure
		AudioPlayer.stop(player);
		mainAudioIsOnHold = false; 		//<- we might restart this manually
						
		audioOnEndFired = false;
		broadcastAudioRequested();

		audioPlayer.src = alarmSound;
		audioPlayer.preload = 'auto';
		audioPlayer.oncanplay = function() {
			SepiaFW.debug.info("AUDIO: can be played now (oncanplay event)");		//debug
			AudioPlayer.isPlaying = true;
			broadcastAudioStarted();
			//callback
			if (onStartCallback) onStartCallback;
		};
		audioPlayer.onpause = function() {
			if (!audioOnEndFired){
				SepiaFW.debug.info("AUDIO: ended (onpause event)");				//debug
				audioOnEndFired = true;
				AudioPlayer.isPlaying = false;
				broadcastAudioFinished();
				//reset audio URL
				/*
				audioPlayer.preload = 'none';
				audioPlayer.src = emptySound;
				*/
				//callback
				if (onEndCallback) onEndCallback();
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
			broadcastAudioError();
			AudioPlayer.isPlaying = false;
			//reset audio URL
			/*
			audioPlayer.preload = 'none';
			audioPlayer.src = emptySound;
			*/
			//callback
			if (onErrorCallback) onErrorCallback();
		};
		audioPlayer.play();
	}
	//STOP alarm
	AudioPlayer.stopAlarmSound = function(){
		SepiaFW.debug.info("AUDIO: stopping alarm sound.");			//debug
		player2.pause();
	}
	
	AudioPlayer.tts = TTS;
	return AudioPlayer;
}