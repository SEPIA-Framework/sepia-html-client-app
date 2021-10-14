//CARDS
function sepiaFW_build_ui_cards_embed(){
	var Embed = {};
	
	//MediaPlayer
	/* TODO:
	- Fix link share feature
	- Add play-on feature
	- Test controls: start, pause/stop, resume, next, previous, vol...
	- Implement async. callback with msgId and timeout (doneCallback, errorCallback)?
	- Improve use of SepiaFW.audio.setPlayerTitle('', '') + setMediaSessionState (SepiaFW.audio)?
	*/
	var playerWidgets = {
		default: "<assist_server>/widgets/mp-default.html",
		embedded: "<assist_server>/widgets/mp-default.html",
		spotify: "<assist_server>/widgets/mp-spotify.html",
		apple_music: "<assist_server>/widgets/mp-apple-music.html",
		youtube: "<assist_server>/widgets/mp-youtube.html",
		soundcloud: "<assist_server>/widgets/mp-soundcloud.html",
		template: "templates/media-player_template.html"
	}
	function getPlayerWidget(widget){
		var wUrl = playerWidgets[widget];
		if (wUrl && SepiaFW.client.isDemoMode()){
			wUrl = wUrl.replace("<assist_server>", "xtensions/custom-data");
		}
		return wUrl;
	}

	var activeMediaPlayers = {};
	var lastActiveMediaPlayer = undefined;
	var maxActiveMediaPlayers = 4; 		//NOTE: "active" does not mean "playing" but "exists" with event listeners

	function getNewMediaPlayerId(){
		mediaPlayerLastId++;
		if (mediaPlayerLastId > maxActiveMediaPlayers){
			mediaPlayerLastId = 1;
		}
		var newId = ("sepia-embedded-player-" + mediaPlayerLastId);
		//remove old players, but try to keep my-view players if possbile
		var oldMp = activeMediaPlayers[newId];
		if (oldMp && oldMp.exists()){
			var myViewPlayersN = $("#sepiaFW-my-view").find(".embeddedWebPlayer").length;
			if (myViewPlayersN > 0 && myViewPlayersN < maxActiveMediaPlayers 
					&& $(oldMp.cardItem).closest("#sepiaFW-my-view").length){
				//skip
				return getNewMediaPlayerId();
			}else{
				//remove
				oldMp.cardItem.sepiaCardClose();
				//console.error("RELEASED and REMOVED", newId, oldMp);		//DEBUG
			}
		}
		return newId;
	}
	var mediaPlayerLastId = 0;

	//Iframe message listener
	window.addEventListener('message', function(message){
		if (message.data && message.data.type){
			if (message.data.type == "sepia-embedded-player-event" && message.data.ev){
				var mp = Object.values(activeMediaPlayers).find(function(amp){
					return amp.iframe.contentWindow == message.source;
				});
				if (mp && mp.eventHandler){
					mp.eventHandler(message.data.ev);
				}
			}
		}
	});

	//Create media player DOM element
	function createMediaPlayerDomElement(id, contentUrl, isTrusted, onLoadHandler){
		//card
		var mediaPlayerDiv = document.createElement('div');
		mediaPlayerDiv.id = id;
		mediaPlayerDiv.className = "embeddedWebPlayer cardBodyItem fullWidthItem";
		//iframe
		var allowIframe;
		//Info: https://developer.mozilla.org/en-US/docs/Web/HTTP/Feature_Policy/Using_Feature_Policy#the_iframe_allow_attribute
		if (isTrusted){
			allowIframe = 'autoplay *; encrypted-media *;';
		}else{
			allowIframe = 'encrypted-media *;';
		}
		var iframe = document.createElement("iframe");
		iframe.className = "cardItemBlock onlyBlock";
		iframe.src = contentUrl;
		iframe.width = "100%";
		iframe.height = 50; 	//can be set via postMessage interface
		iframe.allowtransparency = true;
		iframe.onload = onLoadHandler;
		iframe.allow = allowIframe;
		//iframe.sandbox = ...;
		mediaPlayerDiv.appendChild(iframe);
		//loading overlay
		var loadOverlay = document.createElement('div');
		loadOverlay.className = "cardItemOverlay cardItemBlock";
		loadOverlay.innerHTML = "<p>Loading</p>";
		mediaPlayerDiv.appendChild(loadOverlay);
		return {
			card: mediaPlayerDiv, iframe: iframe, overlay: loadOverlay
		}
	}
	function createMediaPlayerClosedCardMsg(){
		var msgDiv = document.createElement('div');
		msgDiv.className = "embeddedWebPlayerClosed cardBodyItem fullWidthItem";
		msgDiv.innerHTML = "<div class='cardItemBlock cardDisabledMessage'>" 
				+ "Media-Player " + SepiaFW.local.g("closed") + "&nbsp;" + "<i class='material-icons md-inherit'>block</i>"
			+ "</div>";
		return msgDiv;
	}
	//Register new audio fade (stop/start) handler
	function registerMediaPlayerFadeInOutListener(){
		//NOTE: will always overwrite old ones if existing (same ID for every player, we control only last one)
		SepiaFW.audio.registerNewFadeListener({
			id: "embedded-media-player",
			isOnHold: function(){
				var mp = Embed.getActiveMediaPlayer();
				if (mp && mp.isOnHold()){
					return true;
				}else{
					return false;
				}
			},
			onFadeOutRequest: function(force){
				//check if player is playing
				var mp = Embed.getActiveMediaPlayer();
				if (mp && mp.isPlaying() && !mp.isWaitingForPause()){
					mp.fadeOut();
					return true;
				}else{
					return false;
				}
			},
			onFadeInRequest: function(){
				var mp = Embed.getActiveMediaPlayer();
				if (mp && mp.isOnHold() && mp.isPaused()){
					mp.fadeIn();
					return true;
				}else{
					return false;
				}
			}
		});
	}

	//Get active media player
	Embed.getActiveMediaPlayer = function(){
		if (lastActiveMediaPlayer && lastActiveMediaPlayer.exists()){
			return lastActiveMediaPlayer;
		}else{
			return;
		}
	}
	//Stop all media players
	Embed.stopAllMediaPlayers = function(except){
		var triedToStopAtLeastOne = false;
		Object.values(activeMediaPlayers).forEach(function(mp){
			if (!except || mp != except){
				if (mp.isPlaying() || mp.isWaitingForPlay() || mp.isOnHold()){
					mp.pause();
					triedToStopAtLeastOne = true;
				}
			}
		});
		return triedToStopAtLeastOne;
	}
	//Is embedded player active global source?
	Embed.mediaPlayerIsActiveGlobalSource = function(){
		return (SepiaFW.audio.getLastActiveAudioSource() == "embedded-media-player");
	}

	//MediaPlayer interface
	Embed.MediaPlayer = function(options){
		if (!options || !options.parentElement || !(options.widgetUrl || options.widget)){
			SepiaFW.debug.error("Embedded MediaPlayer - Invalid options!");
			return;
		}else{
			if (options.onReady) options.onready = options.onReady;		//prevent confusion
		}
		//options
		//required:	parentElement, widget or widgetUrl
		//optional:	brand
		//events: 	onready (NOTE: will trigger only once)
		//			onTitleChange, onUrlChange

		var thisPlayer = this;
		//console.error("Embedded MediaPlayer", options);      //DEBUG
		var currentMediaTitle;
		var currentMediaUrl;
		var currentVolume;

		//ID
		var playerId = getNewMediaPlayerId();
		var lastMessageId = 0;
		thisPlayer.getId = function(){
			return playerId;
		}
		function getMessageId(){
			lastMessageId++;
			if (lastMessageId > 10000) lastMessageId = 1;
			return (playerId + "-" + lastMessageId);
		}

		//Widget URL
		var widgetUrl = (options.widgetUrl || getPlayerWidget(options.widget) || "").trim();
		if (!widgetUrl){
			SepiaFW.debug.error("Embedded MediaPlayer - No widget found for: " + options.widget);
			SepiaFW.ui.showPopup("Embedded MediaPlayer: Widget '" + options.widget + "' not found.");
			return;
		}
		widgetUrl = SepiaFW.config.replacePathTagWithActualPath(widgetUrl);
		//check URL - NOTE: currently we do not allow unknown URLs
		var isValidLocalURL = SepiaFW.tools.isRelativeFileUrl(widgetUrl, "html");
		var isAcceptableFileOrigin = (widgetUrl.indexOf("file://") == 0);	//any other condition? - This is important for Android (Cordova)
		var isTrustedRemoteUrl = SepiaFW.tools.isRemoteFileUrl(widgetUrl, "html") 
			&& (SepiaFW.tools.isSameOrigin(widgetUrl) || SepiaFW.config.urlIsSepiaFileHost(widgetUrl));
		var widgetIsTrusted = isValidLocalURL || isAcceptableFileOrigin || isTrustedRemoteUrl;
		if (!widgetIsTrusted){
			SepiaFW.debug.error("WARNING: Embedded MediaPlayer Widget URL has remote location and was BLOCKED due to security restrictions! - URL: " + widgetUrl);
			SepiaFW.ui.showSafeWarningPopup("Warning", [
				"SEPIA was asked to open a widget with an untrusted remote URL. The request has been blocked due to security restrictions.",
				"If you want to use this widget please ask an admin to move it to a secure location (e.g. the SEPIA file server).",
				"URL:"
			], widgetUrl);
			return;
		}

		//URL parameters (so we have the data during loading)
		widgetUrl = SepiaFW.tools.setParameterInURL(widgetUrl, "skinStyle", SepiaFW.ui.getSkinStyle());
		widgetUrl = SepiaFW.tools.setParameterInURL(widgetUrl, "skinId", SepiaFW.ui.getSkin());
		widgetUrl = SepiaFW.tools.setParameterInURL(widgetUrl, "lang", SepiaFW.config.appLanguage);
		widgetUrl = SepiaFW.tools.setParameterInURL(widgetUrl, "mobile", SepiaFW.ui.isMobile);
		SepiaFW.debug.info("Embedded MediaPlayer - Loading widget URL: " + widgetUrl);

		//Create card (DOM element)
		var mpObj = createMediaPlayerDomElement(playerId, widgetUrl, widgetIsTrusted, function(){
			//on-load
			//console.error("on-load", playerId);		//DEBUG
		});
		var loadTimer = setTimeout(function(){ $(thisPlayer.overlay).hide(); }, 6000);	//fallback if read event never comes
		thisPlayer.iframe = mpObj.iframe;
		thisPlayer.cardItem = mpObj.card;
		thisPlayer.overlay = mpObj.overlay;
		thisPlayer.exists = function(){
			var ex = thisPlayer.cardItem && document.body.contains(thisPlayer.cardItem);
			/*if (!ex && state != 11){
				thisPlayer.release();		//this should be used but it can lead to null pointer in sync. follow-up checks :-/
			}*/
			return ex;
		}
		options.parentElement.appendChild(mpObj.card);
		
		//Card move and delete actions
		thisPlayer.cardItem.sepiaCardOnBeforeMove = function(){
			//TODO: no reliable way to call it atm (can we use MutationObserver? But on what parent?)
			//console.error("BEFORE MOVE EVENT", playerId);		//DEBUG
			//anything? (note: onready is a one-time event now, settings will restore automatically)
		}
		thisPlayer.cardItem.sepiaCardOnBeforeRemove = function(){
			//TODO: no reliable way to call it atm (too many events: history clear, parent list remove, etc...)
			//console.error("BEFORE REMOVE EVENT", playerId);	//DEBUG
			thisPlayer.release();
		}
		thisPlayer.cardItem.sepiaCardClose = function(){
			thisPlayer.cardItem.sepiaCardOnBeforeRemove();
			$(thisPlayer.cardItem).remove();
		}

		//Media title and URL change
		function onTitleSubmit(newTitle){
			if (newTitle != currentMediaTitle){
				currentMediaTitle = newTitle;
				if (options.onTitleChange) options.onTitleChange(newTitle);
			}
			setTimeout(function(){
				if (Embed.mediaPlayerIsActiveGlobalSource() && lastActiveMediaPlayer == thisPlayer){
					SepiaFW.audio.setPlayerTitle(newTitle, "embedded-media-player");
				}
			}, 50);
		}
		function onUrlSubmit(newUrl){
			if (newUrl != currentMediaUrl){
				currentMediaUrl = newUrl;
				if (options.onUrlChange) options.onUrlChange(newUrl);
			}
		}

		//SEPIA postMessage interface
		function sendEvent(ev){
			if (state && state == 11){
				//player is already released
				SepiaFW.debug.info("Embedded MediaPlayer - Blocked 'sendEvent' because player was already released.");
				return;
			}
			thisPlayer.iframe.contentWindow.postMessage({
				type: "sepia-embedded-player-event",
				msgId: getMessageId(),
				ev: ev
			}, "*");
		}
		thisPlayer.eventHandler = function(ev){
			//player still exists? (is this even possible?)
			if (!thisPlayer.exists()){
				SepiaFW.debug.error("Embedded MediaPlayer - Player received event but was removed or released!");
				return;
			}
			if (state && state == 11){
				//player is already released
				SepiaFW.debug.info("Embedded MediaPlayer - Blocked 'sendEvent' because player was already released.");
				return;
			}
			if (ev.state != undefined){
				stateHandler(ev);
			}
			if (ev.properties){
				propertiesHandler(ev.properties);	//temporary properties to adjust, e.g. UI size
			}
			if (ev.settings){
				widgetSettings = ev.settings;	//custom widget settings to restore player
			}
		}

		//Settings backup
		var widgetSettings;		//settings specific to widget that will be submitted e.g. after move or reload

		//properties
		function propertiesHandler(props){
			if (props.size && props.size.height){
				thisPlayer.iframe.style.height = props.size.height;
			}
			if (props.volume != undefined){
				currentVolume = props.volume;
				if (thisPlayer.isPlaying() || thisPlayer.isActive){
					$('#sepiaFW-audio-ctrls-vol').text(currentVolume);	
					//TODO: this should be replaced with a proper function
				}
			}
		}

		//States
		var state = 0;	//0: created, 1: ready, 2: playing, 3: paused, 10: error, 11: closed
		var isOnHold = false;			//will start to play after next idle event (usually)
		var isWaitingForPlay = false;		//transient state
		var isWaitingForPause = false;		//transient state

		function stateHandler(ev){
			var data = ev.data || {};
			
			//on-ready
			if (ev.state == 1){
				SepiaFW.debug.info("Embedded MediaPlayer - Player ready: " + playerId);
				state = ev.state;
				if (data.size && data.size.height){
					thisPlayer.iframe.style.height = data.size.height;
				}
				clearTimeout(loadTimer);
				setTimeout(function(){ $(thisPlayer.overlay).hide(); }, 500);
				//settings stored?
				if (widgetSettings){
					thisPlayer.restoreSettings(widgetSettings);
				}
				//callback (only once)
				if (options.onready){
					options.onready();
					options.onready = undefined;
				}

			//on-play
			}else if (ev.state == 2){
				state = ev.state;
				SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "start");
				lastActiveMediaPlayer = thisPlayer;
				SepiaFW.debug.info("Embedded MediaPlayer - Last active player switched to: " + playerId);
				//Embed.stopAllMediaPlayers(thisPlayer)	//this should be handled globally for ALL media
				if (ev.data && ev.data.meta){
					if (ev.data.meta.title) onTitleSubmit(ev.data.meta.title);
					if (ev.data.meta.url) onUrlSubmit(ev.data.meta.url);
				}

			//on-pause
			}else if (ev.state == 3){
				state = ev.state;
				SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "pause");
			
			//on-error
			}else if (ev.state == 10){
				var lastWasError = (state == 10);
				state = ev.state;
				//ev.code-ev.name: 1-UnknownEvent, 2-NoMediaMatch, 3-PlayerErrorNotAllowed, 4-PlayerError (any), ... tbd
				if (lastWasError){
					SepiaFW.ui.showInfo("Media-Player error: " + (ev.name || ev.message || "?"));
				}else{
					if (ev.name == "NoMediaMatch"){
						SepiaFW.client.controls.sendMediaPlayerErrorFollowUpMessage("notFound", undefined, undefined);
					}else if (ev.name == "PlayerErrorNotAllowed"){
						SepiaFW.client.controls.sendMediaPlayerErrorFollowUpMessage("notPossible", undefined, undefined);
					}else{
						SepiaFW.ui.showInfo("Media-Player error: " + (ev.name || ev.message || "?"));
						SepiaFW.client.controls.sendMediaPlayerErrorFollowUpMessage("error", undefined, undefined);
					}
				}
				SepiaFW.debug.error("Embedded MediaPlayer - Error:", ev.name, ev.message, ev.code);
				SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "error");
			
			//other
			}else{
				SepiaFW.debug.error("Embedded MediaPlayer - Unknown state: " + ev.state);
				return;
			}
			//reset transient states
			isWaitingForPlay = false;
			isWaitingForPause = false;
		}

		//state getters
		thisPlayer.isReady = function(){
			return (thisPlayer.exists() && state >= 1 && state < 10);
		}
		thisPlayer.isPlaying = function(){
			return (thisPlayer.exists() && state == 2);
		}
		thisPlayer.isPaused = function(){
			return (thisPlayer.exists() && state == 3);
		}
		thisPlayer.isWaitingForPlay = function(){
			return (thisPlayer.exists() && isWaitingForPlay);
		}
		thisPlayer.isWaitingForPause = function(){
			return (thisPlayer.exists() && isWaitingForPause);
		}
		thisPlayer.isOnHold = function(){
			//TODO: implemented correct?
			return (thisPlayer.exists() && isOnHold);
		}
		thisPlayer.isActive = function(){
			return (thisPlayer.exists() && (state == 2 || isOnHold));	
			//include 'isOnHold'? (atm we don't check this for internal player)
		}

		//Controls
		thisPlayer.play = function(doneCallback, errorCallback){
			sendEvent({controls: "play"});
			isWaitingForPlay = true;
		}
		thisPlayer.pause = function(doneCallback, errorCallback){
			sendEvent({controls: "pause"});
			isWaitingForPause = true;
			isWaitingForPlay = false;
			isOnHold = false;
		}
		thisPlayer.fadeOut = function(doneCallback, errorCallback){
			sendEvent({controls: "fadeOut"});
			isOnHold = true;
			//SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "hold");	//TODO: wait for something before sending?
			SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "fadeOut");	//TODO: what is correct???
		}
		thisPlayer.fadeIn = function(doneCallback, errorCallback){
			sendEvent({controls: "fadeIn"});
			isOnHold = false;
			//SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "resume");	//TODO: wait for something before sending?
			SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "fadeIn");	//TODO: what is correct???
		}
		thisPlayer.next = function(doneCallback, errorCallback){
			sendEvent({controls: "next"});
		}
		//TODO: implement callbacks?! more?
		thisPlayer.previous = function(doneCallback, errorCallback){
			sendEvent({controls: "previous"});
		}
		thisPlayer.volumeUp = function(doneCallback, errorCallback){
			sendEvent({controls: "volumeUp"});
		}
		thisPlayer.volumeDown = function(doneCallback, errorCallback){
			sendEvent({controls: "volumeDown"});
		}
		thisPlayer.volumeSet = function(vol, doneCallback, errorCallback){
			sendEvent({controls: "volumeSet", data: vol});
		}

		//get properties
		thisPlayer.getVolume = function(){
			return currentVolume;
		}

		//Content
		thisPlayer.mediaRequest = function(type, request, autoplay, safeRequest, doneCallback, errorCallback){
			SepiaFW.debug.info("Embedded MediaPlayer - MediaRequest: " + type + " - autoplay: " + !!(autoplay && widgetIsTrusted));
			SepiaFW.audio.broadcastAudioEvent("embedded-media-player", "prepare");
			if (autoplay && widgetIsTrusted){
				//stop all previous audio first
				SepiaFW.client.controls.media({
					action: "stop",
					skipFollowUp: true
				});
			}
			if (request.title) onTitleSubmit(request.title);
			if (request.uri) onUrlSubmit(request.uri);
			sendEvent({
				mediaType: type || "auto",	//e.g. music, video
				mediaRequest: request,
				autoplay: (autoplay && widgetIsTrusted), 	//autoplay only for trusted widgets
				safeRequest: safeRequest 	//came from assistant or private channel?
			});
		}
		//Settings
		thisPlayer.restoreSettings = function(data){
			sendEvent({
				settings: data
			});
		}

		//Specials
		thisPlayer.openInExternalPage = function(sourceUrl){
			//we check internal URL first, then we use given URL
			var openUrl = currentMediaUrl || sourceUrl || "";
			//TODO: improve features
			if (openUrl){
				SepiaFW.ui.actions.openUrlAutoTarget(openUrl, true);
			}else{
				SepiaFW.ui.showPopup(SepiaFW.local.g("cant_execute") + " (-- Under Construction --)"); 	
			}
		}

		//Release resources and remove handler
		thisPlayer.release = function(doneCallback, errorCallback){
			if (state == 11){
				return;		//already closed
			}
			//remove from active players, block incoming events
			state = 11;
			if (lastActiveMediaPlayer == thisPlayer) lastActiveMediaPlayer = undefined;
			delete activeMediaPlayers[playerId];
			//add "removed" card info
			$(thisPlayer.cardItem).before(createMediaPlayerClosedCardMsg());
			SepiaFW.debug.info("Embedded MediaPlayer - Released player with id: " + playerId);
		}

		//add audio-interface events (make sure its set)
		registerMediaPlayerFadeInOutListener(thisPlayer);

		//make sure last active player is stopped
		if (lastActiveMediaPlayer && (lastActiveMediaPlayer.isPlaying() || lastActiveMediaPlayer.isWaitingForPlay())){
			lastActiveMediaPlayer.pause();
		}

		//store in list
		activeMediaPlayers[playerId] = thisPlayer;
		lastActiveMediaPlayer = thisPlayer;
	}
	
	return Embed;
}
