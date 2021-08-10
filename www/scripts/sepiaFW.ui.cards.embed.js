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

	Embed.MediaPlayer = function(options){
		if (!options) options = {};
		var thisPlayer = this;

		//ID
		var playerId = getNewMediaPlayerId();
		thisPlayer.getId = function(){
			return playerId;
		}

		//States


		//Controls - TODO: implement
		thisPlayer.start = function(doneCallback, errorCallback){

		}
		thisPlayer.pause = function(doneCallback, errorCallback){
			
		}
		thisPlayer.fadeOut = function(doneCallback, errorCallback){
			
		}
		thisPlayer.resume = function(doneCallback, errorCallback){
			
		}
		thisPlayer.fadeIn = function(doneCallback, errorCallback){
			
		}
		thisPlayer.next = function(doneCallback, errorCallback){
			
		}
		thisPlayer.previous = function(doneCallback, errorCallback){
			
		}
		//stop, release resources and remove handle
		thisPlayer.release = function(doneCallback, errorCallback){
			
		}

		//store in list
		activeMediaPlayers[playerId] = thisPlayer;
	}
	
	return Embed;
}
