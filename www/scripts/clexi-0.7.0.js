/* CLEXI - Client Extension Interface v0.9.0 */
var ClexiJS = (function(){
	var Clexi = {};
	
	Clexi.version = "0.7.0";
	
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
	
	Clexi.availableXtensions = {};
	
	Clexi.connect = function(host, onOpen, onClose, onError){
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
		ws = new WebSocket(hostURL);
		requestedClose = false;
		if (Clexi.onLog) Clexi.onLog('CLEXI connecting ...');
		
		//Events:
		
		ws.onopen = function(me){
			reconnectTry = 0;
			isConnected = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (Clexi.onLog) Clexi.onLog('CLEXI connected');
			if (onOpen) onOpen(me);
			//send welcome
			Clexi.send("welcome", "Client v" + Clexi.version);
		};
		
		ws.onmessage = function(me){
			//console.log(me);
			msg = JSON.parse(me.data);
			if (Clexi.onDebug) Clexi.onDebug('CLEXI received msg of type: ' + msg.type);
			if (subscriptions[msg.type]){
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
			}else if (msg.type == "welcome"){
				if (msg.info && msg.info.xtensions) Clexi.availableXtensions = msg.info.xtensions;
				if (Clexi.onLog) Clexi.onLog('CLEXI server says welcome. Info: ' + JSON.stringify(msg.info));
			}
		};
		
		ws.onerror = function(error){
			if (Clexi.onError){
				Clexi.onError("CLEXI error");
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
					autoReconnect(host, onOpen, onClose, onError);
				}
			}else{
				if (reconnectTimer) clearTimeout(reconnectTimer);
				reconnectTry = 0;
			}
		};
	}
	
	Clexi.close = function(){
		if (reconnectTimer) clearTimeout(reconnectTimer);
		if (ws && isConnected){
			requestedClose = true;
			ws.close();
		}
	}
	
	function autoReconnect(host, onOpen, onClose, onError){
		reconnectTry++;
		var delay = Math.min(reconnectTry*reconnectTry*reconnectBaseDelay, reconnectMaxDelay);
		//TODO: we could/should check navigator.onLine here ...
		reconnectTimer = setTimeout(function(){
			if (!isConnected){
				if (Clexi.onLog) Clexi.onLog('CLEXI reconnecting after unexpected close. Try: ' + reconnectTry);
				Clexi.connect(host, onOpen, onClose, onError);
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
	
	return Clexi;
})();