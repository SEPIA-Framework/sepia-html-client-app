//CARDS
function sepiaFW_build_ui_cards_embed(){
	var Embed = {};
	
	//TODO: add MediaPlayer
	/*
	- Controls: start, pause/stop, resume, next, previous
	- State functions: getState, isOnHold
	- Broadcast state change (start, pause, hold, resume, ?)
	- Make sure only one is active
	- Implement async. callback with msgId and timeout
	*/
	var playerWidgets = {
		default: "<assist_server>/widgets/mp-default.html",
		embedded: "<assist_server>/widgets/mp-default.html",
		spotify: "<assist_server>/widgets/mp-spotify.html",
		apple_music: "<assist_server>/widgets/mp-apple-music.html",
		youtube: "<assist_server>/widgets/mp-youtube.html"
	}

	var activeMediaPlayers = {};

	function getNewMediaPlayerId(){
		mediaPlayerLastId++;
		var overflow = false;
		if (mediaPlayerLastId >= 20){
			mediaPlayerLastId = 1;
			overflow = true;
		}
		var newId = ("sepia-embedded-player-" + mediaPlayerLastId);
		if (overflow){
			//TODO: remove old players
			//activeMediaPlayers ...
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
		loadOverlay.className = "cardItemOverlay";
		loadOverlay.innerHTML = "<p>Loading</p>";
		mediaPlayerDiv.appendChild(loadOverlay);
		return {
			card: mediaPlayerDiv, iframe: iframe, overlay: loadOverlay
		}
	}

	//MediaPlayer interface
	Embed.MediaPlayer = function(options){
		if (!options || !options.parentElement || !(options.widgetUrl || options.widget)){
			SepiaFW.debug.error("Embedded MediaPlayer - Invalid options!");
			return;
		}
		var thisPlayer = this;
		console.error("TEST", "embedWebPlayer", options);      //DEBUG

		//ID
		var playerId = getNewMediaPlayerId();
		thisPlayer.getId = function(){
			return playerId;
		}

		//Widget URL
		var widgetUrl = (options.widgetUrl || playerWidgets[options.widget]).trim();
		widgetUrl = SepiaFW.config.replacePathTagWithActualPath(widgetUrl);
		var widgetIsSameOrigin = SepiaFW.tools.isSameOrigin(widgetUrl);
		var widgetIsSepiaFileHost = SepiaFW.config.urlIsSepiaFileHost(widgetUrl);
		var widgetIsRemote = (widgetUrl.indexOf("http:") == 0) || (widgetUrl.indexOf("https:") == 0) || (widgetUrl.indexOf("ftp:") == 0);
		var widgetIsTrusted = widgetIsSameOrigin || widgetIsSepiaFileHost || !widgetIsRemote;

		widgetUrl = SepiaFW.tools.setParameterInURL(widgetUrl, "skinStyle", SepiaFW.ui.getSkinStyle());
		widgetUrl = SepiaFW.tools.setParameterInURL(widgetUrl, "skinId", SepiaFW.ui.getSkin());
		
		console.error("URL", widgetUrl, "isTrusted", widgetIsTrusted);	//DEBUG

		//Create card (DOM element)
		var mpObj = createMediaPlayerDomElement(playerId, widgetUrl, widgetIsTrusted, function(){
			//on-load
			console.error("on-load", playerId);		//DEBUG
			sendEvent({text: "World Hello"});
		});
		thisPlayer.iframe = mpObj.iframe;
		options.parentElement.appendChild(mpObj.card);

		//SEPIA postMessage interface
		function sendEvent(ev){
			thisPlayer.iframe.contentWindow.postMessage({
				type: "sepia-embedded-player-event",
				ev: ev
			}, "*");
		}
		thisPlayer.eventHandler = function(ev){
			console.error("ev", playerId, ev);		//DEBUG
			if (ev.state){
				stateHandler(ev);
			}
		}

		//States
		var state = 0;	//0: created, 1: ready, 2: playing, 3: paused, 10: error

		function stateHandler(ev){
			if (ev.state == 1){
				//on-ready
				state = ev.state;
				if (ev.size && ev.size.height){
					thisPlayer.iframe.style.height = ev.size.height;
				}
				setTimeout(function(){ $(mpObj.overlay).hide(); }, 500);
			}else if (ev.state == 2){
				//on-play
				state = ev.state;
			}else if (ev.state == 3){
				//on-pause
				state = ev.state;
			}else if (ev.state == 10){
				//on-error
				state = ev.state;
			}
		}

		//Controls - TODO: implement
		thisPlayer.play = function(doneCallback, errorCallback){
			sendEvent({controls: "play"});
		}
		thisPlayer.pause = function(doneCallback, errorCallback){
			sendEvent({controls: "pause"});
		}
		thisPlayer.fadeOut = function(doneCallback, errorCallback){
			sendEvent({controls: "fadeOut"});
		}
		thisPlayer.fadeIn = function(doneCallback, errorCallback){
			sendEvent({controls: "fadeIn"});
		}
		thisPlayer.next = function(doneCallback, errorCallback){
			sendEvent({controls: "next"});
		}
		thisPlayer.previous = function(doneCallback, errorCallback){
			sendEvent({controls: "previous"});
		}
		thisPlayer.volumeUp = function(doneCallback, errorCallback){
			sendEvent({controls: "volumeUp"});
		}
		thisPlayer.volumeDown = function(doneCallback, errorCallback){
			sendEvent({controls: "volumeDown"});
		}

		//stop, release resources and remove handle
		thisPlayer.release = function(doneCallback, errorCallback){
			
		}

		//store in list
		activeMediaPlayers[playerId] = thisPlayer;
	}
	
	return Embed;
}
