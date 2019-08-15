//WEBSOCKET CHANNELS
function sepiaFW_build_webSocket_channels(){
	var Channels = {};

	//Create new channel
	Channels.create = function(channelData, additionalSuccessCallback){
		if (!channelData.name){
			SepiaFW.debug.error("Failed to create channel - Missing 'name' parameter.");
			return;
		}
		if (channelData.members == undefined) channelData.members = [];
		if (channelData.isPublic == undefined) channelData.isPublic = false;
		if (channelData.addAssistant == undefined) channelData.addAssistant = true;
		channelApiCall("createChannel", {
			channelName: channelData.name,
			members: channelData.members,
			isPublic: channelData.isPublic,
			addAssistant: channelData.addAssistant
		}, function(res){
			//SUCCESS
			console.error(JSON.stringify(res));	//DEBUG
			SepiaFW.debug.log("Created new channel: " + res.channelName + " with ID: " + res.channelId);
			
			//re-build channel list
			if (SepiaFW.client.pushToChannelList({
				id: res.channelId,
				name: res.channelName,
				key: res.key,
				owner: res.owner
			})){
				SepiaFW.client.refreshChannelList();
			}

			if (additionalSuccessCallback) additionalSuccessCallback(res);
		}, 
			defaultchannelApiErrorCallback
		);
	}

	//Join
	Channels.join = function(channelData, additionalSuccessCallback){
		if (!channelData.id || !channelData.key){
			SepiaFW.debug.error("Failed to join channel - Missing 'id' and/or 'key' parameter.");
			return;
		}
		channelApiCall("joinChannel", {
			channelId: channelData.id,
			userKey: channelData.key		//Note: must be userKey NOT channelKey
		}, function(res){
			//SUCCESS
			console.error(JSON.stringify(res));	//DEBUG
			SepiaFW.debug.log("Joined new channel: " + res.channelName + " with ID: " + res.channelId);
			
			//re-build channel list
			if (SepiaFW.client.pushToChannelList({
				id: res.channelId,
				name: res.channelName,
				owner: res.owner
			})){
				SepiaFW.client.refreshChannelList();
			}

			if (additionalSuccessCallback) additionalSuccessCallback(res);
		}, 
			defaultchannelApiErrorCallback,
			console.log
		);
	}

	//Edit
	Channels.edit = function(channelData, additionalSuccessCallback){
		console.error('Channel edit is not yet implemented!');
	}

	//Delete
	Channels.delete = function(channelData, additionalSuccessCallback){
		console.error('Channel delete is not yet implemented!');
	}

	//Create channel invite data
	Channels.getChannelInviteData = function(userId, channelId){
		var channelData = SepiaFW.client.getChannelDataById(channelId);
		//is user allowed (and able) to create an invite?
		if (channelData.key && channelData.owner && channelData.owner == SepiaFW.account.getUserId()){
			var userKey = SepiaFW.tools.getSHA256Hash(userId + channelData.key);
			return {
				id: channelId,
				key: userKey
			}
		}else{
			return undefined;
		}
	}

	//--- general call to channel APIs ---

	function defaultchannelApiErrorCallback(e){
		//Error
		if (e && e.error){
			SepiaFW.ui.showPopup("Sorry, but the channel-API call failed! Error: " + e.error);
		}else{
			SepiaFW.ui.showPopup("Sorry, but the channel-API call failed! Error: " + e);
		}
	}

	function channelApiCall(endpoint, requestBody, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.webSocketAPI + endpoint;
		var dataBody = requestBody || new Object();
		dataBody.KEY = SepiaFW.account.getKey();
		dataBody.client = SepiaFW.config.getClientDeviceInfo();
		$.ajax({
			url: apiUrl,
			timeout: 5000,
			type: "POST",
			data: JSON.stringify(dataBody),
			headers: {
				"content-type": "application/json",
				"cache-control": "no-cache"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (debugCallback) debugCallback(data);
				if (data.result && data.result === "fail"){
					if (errorCallback) errorCallback(data);
					return;
				}
				//--callback--
				if (successCallback) successCallback(data);
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				SepiaFW.client.checkNetwork(function(){
					if (errorCallback) errorCallback('Sorry, but the process failed because the server could not be reached :-( Please wait a bit and then try again!');
				}, function(){
					if (errorCallback) errorCallback('Sorry, but the process failed because it seems you are offline :-( Please wait for a connection and then try again.');
				});
				if (debugCallback) debugCallback(data);
			}
		});
	}

	return Channels;
}
