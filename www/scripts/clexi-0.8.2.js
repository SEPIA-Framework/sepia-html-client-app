/* CLEXI - Client Extension Interface */
var ClexiJS = (function(){
	var Clexi = {};
	
	Clexi.version = "0.8.2";
	Clexi.serverId = "";		//if you set this the client will check the server ID on welcome event and close connection if not identical
	
	//Extension subscriptions
	var subscriptions = {};
	
	//Websocket connection
	var hostURL;
	var ws;
	var msgId = 0;

	var reconnectBaseDelay = 330;
	var reconnectMaxDelay = 300000;
	var reconnectTry = 0;
	var reconnectTimer = undefined;
	var requestedClose = false;
	var readyToAcceptEvents = false; 	//the welcome event will set this to true and allow subscriptions (if data is correct)
	
	var isConnected = false;
	Clexi.isConnected = function(){
		return isConnected;
	}
	Clexi.doAutoReconnect = true;
	Clexi.setMaxReconnectDelay = function(delay){
		reconnectMaxDelay = delay;
	}
	
	Clexi.onLog = undefined;		//set this in your code to get log messages
	Clexi.onDebug = undefined;
	Clexi.onError = undefined;
	
	Clexi.availableXtensions = {}; 	//TODO: we should update this somehow (will only update once at welcome event)
	
	Clexi.pingAndConnect = function(host, onPingOrIdError, onOpen, onClose, onError, onConnecting, onWelcome){
		var url;
		if (!host) url = location.origin;
		else url = host.replace(/^wss/, 'https').replace(/^ws/, 'http');
		Clexi.httpRequest("GET", url + "/ping", function(data){
			//Success
			if (typeof data == "string" && data.indexOf("{") == 0){
				data = JSON.parse(data);
			}
			//console.log(data);
			//check ID
			if (data.id && (data.id == Clexi.serverId || (data.id == "[SECRET]" && Clexi.serverId))){
				Clexi.connect(host, onOpen, onClose, onError, onConnecting, onWelcome);
			}else{
				if (onPingOrIdError) onPingOrIdError({
					code: 418,
					msg:"CLEXI connection aborted due to wrong server ID."
				});
			}
		}, function(){
			//Error
			if (onPingOrIdError) onPingOrIdError({
				code: 404,
				msg:"CLEXI connection failed! Server not reached."
			});
		});
	}
	
	Clexi.connect = function(host, onOpen, onClose, onError, onConnecting, onWelcome){
		//URL
		if (host){
			//given URL
			hostURL = host;
		}else{
			//assume origin is WS host too
			if (location.origin.indexOf("https") == 0){
				hostURL = location.origin.replace(/^https/, 'wss');
			}else{
				hostURL = location.origin.replace(/^http/, 'ws');
			}
		}
		
		//Connect
		try {
			ws = new WebSocket(hostURL);
		}catch (err){
			if (Clexi.onError){
				if (typeof err == "string"){
					Clexi.onError("CLEXI error: " + err);
				}else if (err.message){
					Clexi.onError("CLEXI error: " + err.message);
				}else{
					Clexi.onError("CLEXI error");
				}
			}
			if (onError) onError(err);
			return;
		}
		requestedClose = false;
		readyToAcceptEvents = false;
		if (Clexi.onLog) Clexi.onLog('CLEXI connecting ...');
		if (onConnecting) onConnecting();
		
		//Events:
		
		ws.onopen = function(me){
			reconnectTry = 0;
			isConnected = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (Clexi.onLog) Clexi.onLog('CLEXI connected');
			if (onOpen) onOpen(me);
			//send welcome
			Clexi.send("welcome", {"client_version": Clexi.version, "server_id": Clexi.serverId});
		};
		
		ws.onmessage = function(me){
			//console.log(me);
			msg = JSON.parse(me.data);
			if (Clexi.onDebug) Clexi.onDebug('CLEXI received msg of type: ' + msg.type);
			
			//check xtensions first
			if (readyToAcceptEvents && subscriptions[msg.type]){
				if (msg.data){
					//Extension event
					subscriptions[msg.type].onEvent(msg.data);
				}else if (msg.response){
					//Extension response to input
					subscriptions[msg.type].onResponse(msg.response, msg.id);
				}else if (msg.error){
					//Extension error
					subscriptions[msg.type].onError(msg.error);
				}
			
			//was welcome message?
			}else if (msg.type == "welcome"){
				if (msg.info && msg.info.xtensions) Clexi.availableXtensions = msg.info.xtensions;
				if (Clexi.onLog) Clexi.onLog('CLEXI server says welcome. Info: ' + JSON.stringify(msg.info));
				if (msg.code && msg.code == 401){
					//server requires correct ID for authentication - This is "the" security feature (see comment below)
					Clexi.close();
				//check server ID
				}else if (Clexi.serverId && msg.info.id && (Clexi.serverId != msg.info.id)){
					//NOTE: the server might not necessarily refuse connections with wrong ID (depends on settings), but we will if ID is given.
					//Obviously this is NOT a security feature but a server ID filter ;-)
					Clexi.close();
				}else{
					readyToAcceptEvents = true;
					if (onWelcome) onWelcome(msg.info);
				}
			}
		};
		
		ws.onerror = function(error){
			if (Clexi.onError){
				if (typeof error == "string"){
					Clexi.onError("CLEXI error: " + error);
				}else if (error.message){
					Clexi.onError("CLEXI error: " + error.message);
				}else{
					Clexi.onError("CLEXI error");
				}
			}
			if (onError) onError(error);
		};
		
		ws.onclose = function(me){
			isConnected = false;
			if (Clexi.onLog) Clexi.onLog('CLEXI closed. Reason: ' + me.code + " " + me.reason);
			if (onClose) onClose(me);
			//was requested close?
			if (!requestedClose){
				//try reconnect?
				if (Clexi.doAutoReconnect){
					autoReconnect(host, onOpen, onClose, onError, onConnecting, onWelcome);
				}
			}else{
				if (reconnectTimer) clearTimeout(reconnectTimer);
				reconnectTry = 0;
			}
		};
	}
	
	Clexi.close = function(){
		if (reconnectTimer) clearTimeout(reconnectTimer);
		requestedClose = true;
		if (ws && isConnected){
			ws.close();
		}
	}
	
	function autoReconnect(host, onOpen, onClose, onError, onConnecting, onWelcome){
		reconnectTry++;
		var delay = Math.min(reconnectTry*reconnectTry*reconnectBaseDelay, reconnectMaxDelay);
		//TODO: we could/should check navigator.onLine here ...
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = setTimeout(function(){
			if (!isConnected && !requestedClose){
				if (Clexi.onLog) Clexi.onLog('CLEXI reconnecting after unexpected close. Try: ' + reconnectTry);
				Clexi.connect(host, onOpen, onClose, onError, onConnecting, onWelcome);
			}
		}, delay);
	}
	
	Clexi.send = function(extensionName, data, numOfRetries){
		if (ws && isConnected){
			var msg = {
				type: extensionName,
				data: data,
				id: ++msgId,
				ts: Date.now()
			};
			// Send the msg object as a JSON-formatted string.
			ws.send(JSON.stringify(msg));
		}else if (numOfRetries && numOfRetries > 0){
			Clexi.schedule(extensionName, data, 0, numOfRetries);
		}
	}
	Clexi.schedule = function(extensionName, data, thisRetry, maxRetries){
		thisRetry++;
		if (thisRetry <= maxRetries){
			setTimeout(function(){
				if (ws && isConnected){
					Clexi.send(extensionName, data, maxRetries - thisRetry);
				}else{
					Clexi.schedule(extensionName, data, thisRetry, maxRetries);
				}
			}, Clexi.scheduleDelay);
		}else{
			//Error: message not delivered - what TODO ?
			if (Clexi.onError) Clexi.onError('CLEXI send failed!');
		}
	}
	Clexi.scheduleDelay = 1500;
	
	/**
	* Subscribe to an extension event. 
	* Note: currently you can have only one callback per extension. Feel free to
	* implement your own event dispatcher.
	*/
	Clexi.subscribeTo = function(extensionName, eventCallback, inputCallback, errorCallback){
		subscriptions[extensionName] = {
			onEvent: eventCallback || function(){},
			onResponse: inputCallback || function(){},
			onError: errorCallback || function(){}
		};
	}
	Clexi.removeSubscription = function(extensionName){
		delete subscriptions[extensionName];
	}
	
	/**
	* A vanillaJS version of jQuery ajax call for HTTP GET. TODO: extend for POST.
	*/
	function vanillaJsHttpRequest(method, url, headers, successCallback, errorCallback, connectErrorCallback){
		if (method == "POST" || method == "post"){
			console.error("Clexi.httpRequest does not yet support 'POST' method!");
			if (connectErrorCallback) connectErrorCallback();
			else if (errorCallback) errorCallback();
			return;
		}
		var request = new XMLHttpRequest();
		request.open(method, url, true);
		if (headers){
			Object.keys(headers).forEach(function(key){
				request.setRequestHeader(key, headers[key]);
			});
		}
		request.onload = function(){
			if (request.status >= 200 && request.status < 400) {
				//Success!
				var res = request.responseText;
				if (successCallback) successCallback(res);
			}else{
				//Server Error
				if (errorCallback) errorCallback();
			}
		};
		request.onerror = function(){
			//Connection Error
			if (connectErrorCallback) connectErrorCallback();
			else if (errorCallback) errorCallback();
		};
		request.send();
	}

	Clexi.httpRequest = function(method, url, successCallback, errorCallback, connectErrorCallback){
		vanillaJsHttpRequest(method, url, undefined, successCallback, errorCallback, connectErrorCallback);
	}

	Clexi.sendHttpEvent = function(host, clexiId, eventName, data, successCallback, errorCallback, connectErrorCallback){
		var url = host.replace(/^wss/, 'https').replace(/^ws/, 'http').replace(/\/$/, '') + "/event/" + eventName;
		if (data && typeof data == "object"){
			Object.keys(data).forEach(function(key){
				url += ("&" + key + "=" + data[key]);
			});
			url = url.replace(/&/, "?");	//replace first "&"
		}
		var headers = {
			"clexi-id": clexiId
		}
		vanillaJsHttpRequest("GET", url, headers, successCallback, errorCallback, connectErrorCallback);
	}
	
	return Clexi;
})();
