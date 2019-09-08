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
			//console.error(JSON.stringify(res));	//DEBUG
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
			//console.error(JSON.stringify(res));	//DEBUG
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
			defaultchannelApiErrorCallback
		);
	}

	//Edit
	Channels.edit = function(channelData, additionalSuccessCallback){
		console.error('Channel edit is not yet implemented!');
	}

	//Delete
	Channels.delete = function(channelData, additionalSuccessCallback){
		if (!channelData.id || channelData.id == SepiaFW.account.getUserId()){
			SepiaFW.debug.error("Failed to delete channel - Missing or invalid channel 'id'.");
			return;
		}
		channelApiCall("deleteChannel", {
			channelId: channelData.id
		}, function(res){
			//SUCCESS
			//console.error(JSON.stringify(res));	//DEBUG
			SepiaFW.debug.log("Channel has been deleted: " + res.channelName + " with ID: " + res.channelId);

			//switch to private channel if currently in this one
			if (SepiaFW.client.getActiveChannel() == res.channelId){
				setTimeout(function(){
					SepiaFW.client.switchChannel(SepiaFW.account.getUserId());
				}, 0);
			}
			
			//re-build channel list
			var cleanedList = SepiaFW.client.getAllChannels().filter(function(channel, index){
				return channel.id != res.channelId;
			});
			SepiaFW.client.refreshChannelList(cleanedList);

			if (additionalSuccessCallback) additionalSuccessCallback(res);
		}, 
			defaultchannelApiErrorCallback
		);
	}

	//Get channels available to specific user
	Channels.loadAvailableChannels = function(includePublic, additionalSuccessCallback){
		if (includePublic == undefined) includePublic = true;

		channelApiCall("getAvailableChannels", {
			includePublic: includePublic
		}, function(res){
			//SUCCESS
			//console.error(JSON.stringify(res));	//DEBUG
			SepiaFW.debug.log("Available channels have been loaded: " + res.channels.length);
			
			//re-build channel list
			res.channels.forEach(function(c){
				SepiaFW.client.pushToChannelList(c);	//NOTE: we can use the raw data of the channel object here, it is in client format
			});
			SepiaFW.client.refreshChannelList();

			//get set of channels that might contain missed messages
			Channels.loadChannelsWithMissedMessages();
			
			if (additionalSuccessCallback) additionalSuccessCallback(res);
		}, 
			defaultchannelApiErrorCallback
		);
	}

	//Get set of channels that might contain missed messages
	Channels.loadChannelsWithMissedMessages = function(){
		//we use the socket connection to get this data:
		SepiaFW.client.requestDataUpdate("missedChannelMessage");
		/* --- Endpoint version (got some endless loader issues with this): ---
		channelApiCall("getChannelsWithMissedMessages", {}, function(res){
			//SUCCESS
			console.error(JSON.stringify(res));	//DEBUG
			SepiaFW.debug.log("Got list of channels that should be checked for messages: " + res.channels);
			
			//mark channels
			if (res.channels){
				res.channels.forEach(function(channelId){
					SepiaFW.animate.channels.markChannelEntry(channelId);
				});
			}
			
			if (additionalSuccessCallback) additionalSuccessCallback(res);
		}, 
			defaultchannelApiErrorCallback
		);
		*/
	}

	//Create channel invite data
	Channels.getChannelInviteData = function(userId, channelId){
		var channelData = SepiaFW.client.getChannelDataById(channelId);
		//is user allowed (and able) to create an invite?
		if (channelData.key && channelData.owner && channelData.owner == SepiaFW.account.getUserId()){
			var userKey = SepiaFW.tools.getSHA256Hash(userId + channelData.key);
			return {
				id: channelId,
				key: userKey,
				name: channelData.name,
				owner: channelData.owner
			}
		}else{
			return;
		}
	}
	Channels.getChannelInviteLink = function(userId, channelId){
		var inviteData = Channels.getChannelInviteData(userId, channelId);
		if (inviteData){
			var shareData = {
				type: SepiaFW.client.SHARE_TYPE_CHANNEL_INVITE,
				data: inviteData
			}
			return SepiaFW.client.buildDeepLinkForSharePath(shareData);
		}else{
			return;
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
