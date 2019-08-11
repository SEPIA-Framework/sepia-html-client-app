//WEBSOCKET CHANNELS
function sepiaFW_build_webSocket_channels(){
	var Channels = {};
		

	//--- general call to channel APIs ---

	function defaultchannelApiErrorCallback(e){
		//Error
		SepiaFW.ui.showPopup("Sorry, but the channel-API call failed! Error: " + e);
	}

	function channelApiCall(endpoint, requestBody, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.webSocketAPI + endpoint;
		var dataBody = requestBody || new Object();
		dataBody.KEY = Account.getKey();
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
