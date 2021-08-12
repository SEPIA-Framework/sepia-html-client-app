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
	function createMediaPlayerDomElement(id, contentUrl, onLoadHandler){
		//card
		var mediaPlayerDiv = document.createElement('DIV');
		mediaPlayerDiv.id = id;
		mediaPlayerDiv.className = "embeddedWebPlayer cardBodyItem fullWidthItem";
		//iframe
		var iframe = document.createElement("iframe");
		iframe.src = contentUrl;
		iframe.width = "100%";
		iframe.height = 50; 	//can be set via postMessage interface
		iframe.allowtransparency = true;
		iframe.onload = onLoadHandler;
		//iframe.allow = ...;
		//iframe.sandbox = ...;
		mediaPlayerDiv.appendChild(iframe);
		return {
			card: mediaPlayerDiv, iframe: iframe
		}
	}

	//MediaPlayer interface
	Embed.MediaPlayer = function(options){
		if (!options || !options.parentElement || !options.widgetUrl){
			SepiaFW.debug.error("Embedded MediaPlayer - Invalid options!");
			return;
		}
		var thisPlayer = this;

		//ID
		var playerId = getNewMediaPlayerId();
		thisPlayer.getId = function(){
			return playerId;
		}

		//Widget URL
		options.widgetUrl = SepiaFW.config.replacePathTagWithActualPath(options.widgetUrl);
		console.error("URL", options.widgetUrl);	//DEBUG
		//<custom_data>/embedded-player.html

		//Create card (DOM element)
		var mpObj = createMediaPlayerDomElement(playerId, options.widgetUrl, function(){
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
			//TODO: use
			console.error("ev", playerId, ev);		//DEBUG
		}

		//States

		//Controls - TODO: implement
		thisPlayer.start = function(doneCallback, errorCallback){
			sendEvent({controls: "start"});
		}
		thisPlayer.pause = function(doneCallback, errorCallback){
			sendEvent({controls: "pause"});
		}
		thisPlayer.resume = function(doneCallback, errorCallback){
			sendEvent({controls: "resume"});
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
		//stop, release resources and remove handle
		thisPlayer.release = function(doneCallback, errorCallback){
			
		}

		//store in list
		activeMediaPlayers[playerId] = thisPlayer;
	}
	
	return Embed;
}
