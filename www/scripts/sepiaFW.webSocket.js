//CLIENT: WEBSOCKET

//Interface for all client implementations
function sepiaFW_build_client_interface(){
	var ClientInterface = {};
	
	//TODO: this is the first stept to make the client implementation modular, but it needs more work ...
	//... there are most likely still a lot of direct calls to SepiaFW.webSocket
	
	ClientInterface.buildUI = SepiaFW.webSocket.client.buildUI;
	ClientInterface.ping = SepiaFW.webSocket.client.ping;
	ClientInterface.checkNetwork = SepiaFW.webSocket.client.checkNetwork;
	ClientInterface.startClient = SepiaFW.webSocket.client.startClient;
	ClientInterface.welcomeActions = SepiaFW.webSocket.client.welcomeActions;
	ClientInterface.handleRequestViaUrl = SepiaFW.webSocket.client.handleRequestViaUrl;
	ClientInterface.handleShareViaUrl = SepiaFW.webSocket.client.handleShareViaUrl;
	ClientInterface.handleRequestViaIntent = SepiaFW.webSocket.client.handleRequestViaIntent;
	ClientInterface.setDemoMode = SepiaFW.webSocket.client.setDemoMode;
	ClientInterface.isDemoMode = SepiaFW.webSocket.client.isDemoMode;
	
	ClientInterface.closeClient = SepiaFW.webSocket.client.closeConnection; 	//argument: forceReset, forceResetCallback
	ClientInterface.pauseClient = SepiaFW.webSocket.client.closeConnection;
	ClientInterface.resumeClient = SepiaFW.webSocket.client.instaReconnect;
	
	ClientInterface.isActive = SepiaFW.webSocket.client.isActive;
	ClientInterface.onActive = SepiaFW.webSocket.client.onActive;
	ClientInterface.addOnActiveAction = SepiaFW.webSocket.client.addOnActiveAction;
	ClientInterface.addOnActiveOneTimeAction = SepiaFW.webSocket.client.addOnActiveOneTimeAction;
	ClientInterface.addOnActivePreUpdateOneTimeAction = SepiaFW.webSocket.client.addOnActivePreUpdateOneTimeAction;
	
	ClientInterface.getActiveChannel = SepiaFW.webSocket.client.getActiveChannel;
	ClientInterface.getActiveChannelUsers = SepiaFW.webSocket.client.getActiveChannelUsers;
	ClientInterface.getActiveChannelUsersByIdOrName = SepiaFW.webSocket.client.getActiveChannelUsersByIdOrName;
	ClientInterface.getFirstActiveChannelUserById = SepiaFW.webSocket.client.getFirstActiveChannelUserById;
	ClientInterface.getAllChannels = SepiaFW.webSocket.client.getAllChannels;
	ClientInterface.getChannelDataById = SepiaFW.webSocket.client.getChannelDataById;
	ClientInterface.switchChannel = SepiaFW.webSocket.client.switchChannel;
	ClientInterface.switchChatPartner = SepiaFW.webSocket.client.switchChatPartner;
	ClientInterface.getActiveChatPartner = SepiaFW.webSocket.client.getActiveChatPartner;

	ClientInterface.openChannelManager = SepiaFW.webSocket.client.openChannelManager;
	ClientInterface.createChannel = SepiaFW.webSocket.channels.create;
	ClientInterface.joinNewChannel = SepiaFW.webSocket.channels.join;
	ClientInterface.deleteChannel = SepiaFW.webSocket.channels.delete;
	ClientInterface.editChannel = SepiaFW.webSocket.channels.edit;
	ClientInterface.loadAvailableChannels = SepiaFW.webSocket.channels.loadAvailableChannels;	//Note: loads data from server (see below)
	ClientInterface.loadChannelsWithMissedMessages = SepiaFW.webSocket.channels.loadChannelsWithMissedMessages;
	ClientInterface.pushToChannelList = SepiaFW.webSocket.client.pushToChannelList;
	ClientInterface.refreshChannelList = SepiaFW.webSocket.client.refreshChannelList;			//Note: refreshes UI (not data, see above)
	ClientInterface.getChannelInviteLink = SepiaFW.webSocket.channels.getChannelInviteLink;

	ClientInterface.refreshClientConnections = SepiaFW.webSocket.client.refreshClientConnections;
	ClientInterface.getConnectedUserClients = SepiaFW.webSocket.client.getConnectedUserClients;
	ClientInterface.showConnectedUserClientsAsMenu = SepiaFW.webSocket.client.showConnectedUserClientsAsMenu;
	ClientInterface.sendRemoteActionToOwnDeviceOrShared = SepiaFW.webSocket.client.sendRemoteActionToOwnDeviceOrShared;

	ClientInterface.getNewMessageId = SepiaFW.webSocket.client.getNewMessageId;
	ClientInterface.handleServerMessage = SepiaFW.webSocket.client.handleServerMessage;
	
	ClientInterface.toggleMicButton = SepiaFW.webSocket.client.toggleMicButton;
	ClientInterface.sendInputText = SepiaFW.webSocket.client.sendInputText;
	ClientInterface.sendMessage = SepiaFW.webSocket.client.sendMessage;
	ClientInterface.sendCommand = SepiaFW.webSocket.client.sendCommand;
	ClientInterface.sendOrRequestDataUpdate = SepiaFW.webSocket.client.sendOrRequestDataUpdate;
	ClientInterface.requestAlivePing = SepiaFW.webSocket.client.requestAlivePing;

	ClientInterface.optimizeAndPublishChatMessage = SepiaFW.webSocket.client.optimizeAndPublishChatMessage;
	
	ClientInterface.queueCommand = SepiaFW.webSocket.client.queueCommand;
	ClientInterface.getAndRemoveNextCommandInQueue = SepiaFW.webSocket.client.getAndRemoveNextCommandInQueue;
	ClientInterface.clearCommandQueue = SepiaFW.webSocket.client.clearCommandQueue;
	ClientInterface.getCommandQueueSize = SepiaFW.webSocket.client.getCommandQueueSize;
	ClientInterface.wasLastInputSourceAsr = SepiaFW.webSocket.client.wasLastInputSourceAsr;
	
	ClientInterface.queueIdleTimeEvent = SepiaFW.webSocket.client.queueIdleTimeEvent;
	ClientInterface.clearIdleTimeEventQueue = SepiaFW.webSocket.client.clearIdleTimeEventQueue;
	
	ClientInterface.asrCallbackFinal = SepiaFW.webSocket.client.asrCallbackFinal;
	ClientInterface.asrCallbackInterim = SepiaFW.webSocket.client.asrCallbackInterim;
	ClientInterface.asrErrorCallback = SepiaFW.webSocket.client.asrErrorCallback;
	ClientInterface.asrLogCallback = SepiaFW.webSocket.client.asrLogCallback;
	
	ClientInterface.setMessageIdOptions = SepiaFW.webSocket.client.setMessageIdOptions;
	
	//states and settings
	ClientInterface.allowBackgroundConnection = false;
	ClientInterface.isMessagePending = false;

	//some constants for link sharing
	ClientInterface.deeplinkHostUrl = "https://b07z.net/dl/sepia/index.html";
	ClientInterface.handleUrlParameterActions = function(){ alert('handleUrlParameterActions has to be defined in app setup first!'); };
	ClientInterface.SHARE_TYPE_ALARM = "alarm";		//parameters: beginTime, title
	ClientInterface.SHARE_TYPE_LINK = "link";		//parameters: see card elements (cardElementInfo?)
	ClientInterface.SHARE_TYPE_CHANNEL_INVITE = "channel_invite";	//parameters: id, key

	//DeepLink builder
	ClientInterface.buildDeepLinkFromText = function(text){
		return (ClientInterface.deeplinkHostUrl + "?q=" + encodeURIComponent("i18n:" + SepiaFW.config.appLanguage + " " + text));
	}
	ClientInterface.buildDeepLinkForSharePath = function(shareData){
		return (SepiaFW.client.deeplinkHostUrl + "?share=" + encodeURIComponent(btoa(JSON.stringify(shareData))));
	}
	ClientInterface.getDeepLinkDataFromShareLink = function(shareLink){
		if (shareLink.indexOf("?share=") >= 0){
			var shareDataEncoded = SepiaFW.tools.getURLParameterFromUrl(shareLink, "share");
			return ClientInterface.getDeepLinkDataFromShareData(shareDataEncoded);
		}else{
			return;
		}
	}
	ClientInterface.getDeepLinkDataFromEncodedShareData = function(shareData){
		try {
			return JSON.parse(atob(shareData));		//no encoding currently (besides URI component which was decoded already)
		}catch(e){
			SepiaFW.debug.error("Failed to parse URL data: " + shareData);
			return;
		}
	}

	//check server info
	ClientInterface.getServerInfo = function(successCallback, errorCallback){
		if (ClientInterface.isDemoMode()){
			var serverInfo = {
				name: "demo-mode",
				version: "0.0.0",
				signature: "",
				privacy_policy: ""
			};	
			if (successCallback) successCallback(serverInfo);
			return;
		}
		function success(data){
			var serverInfo = {
				name: data.server,
				version: (data.version)? data.version.replace(/^v/,"").trim() : "",
				signature: data.signature,
				privacy_policy: data.privacy_policy
			};
			if (successCallback) successCallback(serverInfo);
		}
		function error(err){
			if (errorCallback) errorCallback(err);
		}
		$.ajax({
			dataType: "json",
			url: (SepiaFW.config.assistAPI + "validate"),
			success: success,
			error: error
		});
	}
	ClientInterface.checkServerVersion = function(serverInfo){
		if (!SepiaFW.ui.requiresServerVersion || ClientInterface.isDemoMode()){
			return true;
		}else if (serverInfo.version && !!serverInfo.version.match(/\d\.\d\.\d/)){
			var target = SepiaFW.ui.requiresServerVersion.split(".");
			var got = serverInfo.version.split(".");
			var gotVersion = [];
			var targetVersion = [];
			for (var i=0; i<3; i++){
				gotVersion[i] = parseInt(got[i]);
				targetVersion[i] = parseInt(target[i]);
			}
			if ((gotVersion[0] < targetVersion[0]) || 
				(gotVersion[0] == targetVersion[0] && gotVersion[1] < targetVersion[1]) || 
				(gotVersion[0] == targetVersion[0] && gotVersion[1] == targetVersion[1] && gotVersion[2] < targetVersion[2])){
					return false;
			}else{
				return true;
			}
		}else{
			return false;
		}
	}
	
	//broadcast some [internal] events:
	
	//-connection status
	ClientInterface.STATUS_CONNECTING = "status_connecting";
	ClientInterface.STATUS_OPENED = "status_opened";
	ClientInterface.STATUS_CLOSED = "status_closed";
	ClientInterface.STATUS_ERROR = "status_error";
	ClientInterface.lastKnownConnectionStatus = ClientInterface.STATUS_CLOSED;
	ClientInterface.broadcastConnectionStatus = function(status){
		ClientInterface.lastKnownConnectionStatus = status;
		switch(status) {
			case ClientInterface.STATUS_CONNECTING:
				$('#sepiaFW-nav-label-online-status').removeClass("offline online").addClass("connecting").html('Connecting...');
				$('#sepiaFW-secondary-online-status').html('Connecting...');
				break;
			case ClientInterface.STATUS_OPENED:
				$('#sepiaFW-nav-label-online-status').removeClass("offline connecting").addClass("online").html('Online');
				$('#sepiaFW-secondary-online-status').html('Online');
				break;
			case ClientInterface.STATUS_CLOSED:
				$('#sepiaFW-nav-label-online-status').removeClass("connecting online").addClass("offline").html('Offline');
				$('#sepiaFW-secondary-online-status').html('Offline');
				break;
			case ClientInterface.STATUS_ERROR:
				//ignore for now
				break;
			default:
				//ignore
		}
	}

	//-on active reset - use e.g. to deactivate functions that will be reset in 'onActive'
	ClientInterface.broadcastOnActiveReset = function(){
		if (onActiveResetAvailable){
			onActiveResetAvailable = false;
			//Wake-trigger
			if (SepiaFW.wakeTriggers && SepiaFW.wakeTriggers.isListening()){
				SepiaFW.wakeTriggers.stopListeningToWakeWords();
			}

			//broadcast
			ClientInterface.broadcastClientActiveChange("onActiveReset");
		}
	}
	ClientInterface.releaseOnActiveResetBlock = function(){
		onActiveResetAvailable = true;
	}
	var onActiveResetAvailable = false;

	//-on client error
	ClientInterface.broadcastClientError = function(errorText, errorCode){
		/* Error codes:
			0 - server status message
			1 - UI message
		*/
		if (errorCode == undefined) errorCode = 0;
		var event = new CustomEvent('sepia_client_error', { detail: {
			error: errorText,
			code: errorCode
		}});
		document.dispatchEvent(event);
	}

	//-on client active/inactive - Note: we use same state-change event as for speaking/listening/etc. but with different key
	ClientInterface.broadcastClientActiveChange = function(onActiveEvent){
		var conn;
		if (onActiveEvent && onActiveEvent == "onActiveReset"){
			conn = "closed";
		}else if (onActiveEvent && onActiveEvent == "onActive"){
			conn = "active";
		}else{
			conn = SepiaFW.client.isActive()? "active" : "closed";
		}
		var event = new CustomEvent('sepia_state_change', { detail: {
			connection: conn
		}});
		document.dispatchEvent(event);
	}
	
	return ClientInterface;
}

function sepiaFW_build_webSocket_common(){
	var Common = {};
	
	//SocketMessage
	Common.buildSocketMessage = function(sender, receiver, text, html, data, clientType, msgId, channelId){
		//NOTE: Don't confuse with ui.build.makeMessageObject ... this here is what is sent to server
		var msg = new Object();
		var tsUNIX = new Date().getTime();
			
		if (!msgId) msgId = (sender + "-" + SepiaFW.webSocket.client.getNewMessageId()); 	//DONT CHANGE!
		msg.msgId = msgId;
		msg.channelId = channelId;
		msg.sender = sender;
		msg.senderDeviceId = (data && data.parameters)? data.parameters.device_id : "";
		msg.timeUNIX = tsUNIX;
		if (receiver){
			msg.receiver = receiver;
			//Auto-fill missing device ID
			if (msg.receiver == SepiaFW.assistant.id){
				msg.receiverDeviceId = SepiaFW.assistant.deviceId;
			}else{
				var activeChatPartner = SepiaFW.client.getActiveChatPartner();
				if (!activeChatPartner){
					var chatPartnersWithId = SepiaFW.client.getActiveChannelUsersByIdOrName(receiver);
					if (chatPartnersWithId){
						activeChatPartner = chatPartnersWithId[0];		//TODO: just assume first?
					}
				}
				if (activeChatPartner && receiver == activeChatPartner.id){
					//add device ID (required to find correct receiver)
					msg.receiverDeviceId = activeChatPartner.deviceId;
					
					//add to contacts-from-chat if possible
					if (SepiaFW.account && SepiaFW.account.contacts){
						SepiaFW.account.contacts.addContactFromChat(activeChatPartner);
					}
				}
			}
		}
		if (text) msg.text = text;
		if (html) msg.html = html;
		if (data) msg.data = data;
		if (clientType) msg.clientType = clientType; //this value is currently irrelevant since the value inside data is used
		
		return msg;
	}
	
	return Common;
}

function sepiaFW_build_webSocket_client(sepiaSessionId){
	var Client = {};
	
	//----DEBUG----
	Client.testInterrupt = function(){
		webSocket.close();
	}
	Client.testMessageAfterInterrupt = function(){
		webSocket.close();
		setTimeout(function(){
			Client.sendInputText('test');
		}, 10);
	}
	Client.testMessageWithNoChannel = function(){
		activeChannelId = "";
		setTimeout(function(){
			Client.sendInputText('test');
		}, 10);
		setTimeout(function(){
			activeChannelId = username;
		}, 5000);
	}
	//-------------
	
	//some static stuff
	var serverName = ""; 				//synced during server ping
	var username = "";					//synced during account validation
	var userList;
	var activeChatPartner;
	var lastActivatedChatPartner;
	var activeChannelId = "";			//set on "joinChannel" event
	var lastActivatedChannelId = "";	//last actively chosen channel
	var lastChannelMessageTimestamps = {};		//track when a channel received the last message
	var lastChannelHistoryClearTimestamps = {};	//track when a channel history was last cleared
	var lastChannelJoinTimestamps = {};			//track when a channel was last joined (NOTE: this is volatile by intention, don't store it unless u store channel history as well)
	var lastChannelMessageDataStoreTimer;			//a timer that prevents too many consecutive calls to store channel data in local DB
	var lastChannelMessageDataStoreDelay = 6000;	//... not more often than every N seconds
	var channelList = [
		{id: "openWorld", name: "Open World"}
	];
	Client.pushToChannelList = function(channelData){
		var newId = channelData.id;
		if (!channelData.name) channelData.name = newId;	//take ID if name is missing
		var exists = false;
		$.each(channelList, function(index, entry){
			if (entry.id === newId){
				exists = true;
				return false;
			}
		});
		if (!exists){
			channelList.push(channelData);		//TODO: should we filter?
			return true;
		}else{
			return false;
		}
	}
	Client.refreshChannelList = function(newChannelList){
		if (newChannelList) channelList = newChannelList;
		SepiaFW.ui.build.channelList(channelList, activeChannelId);
	}
	//special input commands (slash-command) and modifiers (input-modifier)
	var CMD_SAYTHIS = "saythis";		//slash-command
	var CMD_LINKSHARE = "linkshare";	//slash-command
	var CMD_CLIENT_I18N = "i18n";		//input-modifier - NOTE: this usually runs client-side
	//var CMD_HTTP = "http";			//slash-command - NOTE: this is checked server-side only
	Client.inputHasSpecialCommand = function(inputText){
		var regEx = new RegExp('(^' + SepiaFW.assistant.name + ' |^|\)' + '(' + CMD_SAYTHIS + '|' + CMD_LINKSHARE + '|' + CMD_CLIENT_I18N + ')(:\\w+\\s|\\s)', "i");
		var checkRes = inputText.match(regEx);
		if (checkRes && checkRes[2] && checkRes[3]){
			return (checkRes[2] + checkRes[3]).trim();
		}else if (checkRes && checkRes[2]){
			return checkRes[2].trim();
		}else{
			return "";
		}
	}
	
	var msgId = 0;		//increasing id that is sent with every message to server
	Client.getNewMessageId = function(){
		return ++msgId;
	}
	var messageIdOptionsMap = {};
	Client.setMessageIdOptions = function(id, options){
		messageIdOptionsMap[id] = options;
	}
	Client.getMessageIdOptions = function(id){
		return (messageIdOptionsMap[id] || "");
	}
	Client.getAndRemoveMessageIdOptions = function(id){
		var options = messageIdOptionsMap[id] || "";
		delete messageIdOptionsMap[id];
		return options;
	}

	//socket stuff
	var webSocket;
	var isConnecting = false;
	var connectionIsOpen = false;
	var tryReconnect = true;		//do not modify this ...
	var neverReconnect = false; 	//.. set this to prevent reconnects
	var connectAttempts = 0;
	var nextReconnect = 1000;		//this is a constant multiplied by connectAttemps
	var reconnectMaxWait = 30000;
	
	Client.isActive = function(){
		if (activeChannelId){
			return true;
		}else{
			return false;
		}
	}
	
	//other
	var optimizeAsrResult = true; 	//try to recognize some Sepia related vocab better (like 'Sepia' at the beginning)
	
	//keep track of last input source (e.g. to decide if we should auto-switch mic on question)
	var inputCameViaAsr = false;			//local state, reset after each send-input to undefined
	Client.lastInputSourceWasAsr = false;	//global state returned (only) via method below
	Client.wasLastInputSourceAsr = function(){
		return Client.lastInputSourceWasAsr;
	}

	//--- Queues:
	
	//Command queue - Executed via: client.sendCommand(...)
	var commandQueue = [];
	Client.queueCommand = function(queueCmd){
		commandQueue.push(queueCmd);	//note: queueCmd = action
	}
	Client.getAndRemoveNextCommandInQueue = function(){
		if (commandQueue.length > 0){
			var nextCmd = commandQueue[0];
			commandQueue.shift();
			return nextCmd;
		}else{
			return "";
		}
	}
	Client.getCommandQueueSize = function(){
		//console.log('cmdQueue size: ' + commandQueue.length); 		//DEBUG
		return commandQueue.length;
	}
	Client.clearCommandQueue = function(){
		commandQueue = [];
	}

	//Idle time event queue - Executed via arbitrary callback after certain idle time
	//NOTE: not to be confused with UI.getIdleTime
	//NOTE2: idle events are NOT guaranteed to be executed!
	var idleTimeEventQueue = [];
	var idleTimeEventChecker = undefined;
	var lastIdleStateTS = 0;
	Client.clearIdleTimeEventQueue = function(){
		idleTimeEventQueue = [];
	}
	Client.queueIdleTimeEvent = function(eventCallback, minIdle, maxDelay, fallbackEvent){
		var minIdleTime = (minIdle)? minIdle : 2000;
		if (minIdleTime < 2000) minIdleTime = 2000;		//min. 2s idle
		var maxDelayTime = (maxDelay)? maxDelay : 30000;
		if (maxDelayTime > 60000) maxDelayTime = 60000;	//max. 60s delay
		if (maxDelayTime < minIdleTime){
			minIdleTime = 2000;
			maxDelayTime = 30000;
		}
		var now = new Date().getTime();
		idleTimeEventQueue.push({
			event: eventCallback,
			minIdle: minIdleTime,
			maxUnix: (now + maxDelayTime),
			fallback: fallbackEvent 	//this triggers if maxUnix expires without event. Should be a simple note like SepiaFW.ui.showInfo(...)
		});
		//start now or wait for next idle state?
		if (SepiaFW.animate.assistant.getState() == "idle"){
			runIdleTimeEventChecker(); 
		}
	}
	function runIdleTimeEventChecker(){
		if (idleTimeEventChecker){
			return;		//trust the running checker
		}else{
			idleTimeEventChecker = setInterval(function(){
				//anything left?
				if (!idleTimeEventQueue || idleTimeEventQueue.length == 0){
					clearInterval(idleTimeEventChecker);
					idleTimeEventChecker = undefined;
				//check next event
				}else{
					checkNextIdleTimeEventAndRemove();		
				}
			}, 1000);
		}
	}
	function checkNextIdleTimeEventAndRemove(){
		if (idleTimeEventQueue && idleTimeEventQueue.length > 0){
			var now  = new Date().getTime();
			var idleTime = (now - lastIdleStateTS);
			var idleEvent = idleTimeEventQueue[0];
			if (idleEvent){
				if (now > idleEvent.maxUnix){
					//drop this event, its not valid anymore. Then restart check.
					idleTimeEventQueue.shift();
					if (idleEvent.fallback){
						idleEvent.fallback(); 		//call fallback if its important stuff, e.g. via SepiaFW.ui.showInfo(...);
					}
					checkNextIdleTimeEventAndRemove();
				}
				if (idleTime >= idleEvent.minIdle){
					lastIdleStateTS = new Date().getTime(); 	//idle or not, we reset
					if (SepiaFW.animate.assistant.getState() == "idle"){
						idleTimeEventQueue.shift();
						idleEvent.event();
					}
				}
			}
		}
	}
	//listen to SEPIA state changes to find "idle"
	document.addEventListener("sepia_state_change", function(e){		//e.g. stt, tts, loading
		//console.log(e.detail.state);
		lastIdleStateTS = new Date().getTime();
		if (e.detail && e.detail.state == "idle"){
			runIdleTimeEventChecker();
		}
	});

	//------
	
	//shortcuts
	var buildSocketMessage = SepiaFW.webSocket.common.buildSocketMessage;
	
	//-------broadcasts-------
	
	var isFirstJoin = true;
	function broadcastChannelJoin(channelId){
		//call onActive when first joining a channel
		if (isFirstJoin){
			isFirstJoin = false;
			//Client.onActive();
		}
		
		//update and build channel list - Note: this moved to actual channel-join message (before broadcast)
		//Client.pushToChannelList(channelId);
		//SepiaFW.ui.build.channelList(channelList, activeChannelId);
		var channelData = Client.getChannelDataById(channelId);
		var channelName = channelData.name || channelId;
		
		//set label
		SepiaFW.ui.setLabel((activeChannelId == username)? "" : channelName);
		
		//switch visibility of messages in chat view
		SepiaFW.ui.switchChannelView(channelId);

		//unmark channel
		SepiaFW.animate.channels.unmarkChannelEntry(channelId);
		
		//reset activeChatPartner - moved to button press of channel switch
		//Client.switchChatPartner('');
		
		//check if channel is correct (= the channel that was actively chosen by user)
		if (lastActivatedChannelId && channelId !== lastActivatedChannelId){
			Client.switchChannel(lastActivatedChannelId);
			return;
		}
		//check if chat partner is correct
		if (lastActivatedChatPartner && (activeChatPartner !== lastActivatedChatPartner)){
			Client.switchChatPartner(lastActivatedChatPartner);
		}

		//Update channel list - basically this just sets the correct active channel
		SepiaFW.ui.build.updateChannelList(activeChannelId);

		//update channel control buttons
		SepiaFW.ui.build.updateChannelControlButtons(channelData);

		//always call onActive
		Client.onActive();
	}
	
	function broadcastChatPartnerSwitch(userObject){
		//removed lock
		if (!userObject){
			//set channel as label
			var channelData = Client.getChannelDataById(activeChannelId);
			var channelName = channelData.name || channelId;
			SepiaFW.ui.setLabel((activeChannelId == username)? "" : channelName);
			
		//set lock
		}else{
			//set user as label
			SepiaFW.ui.setLabel(Client.getNameFromUserList(userObject.id));
		}
		//TODO: this is a workaround to set the proper UI state
		SepiaFW.ui.build.userList(userList, username);
	}
	
	//----------------------
	
	//ping server
	Client.ping = function(successCallback, failCallback, failOfflineCallback){
		SepiaFW.ui.showLoader();
		SepiaFW.debug.info('Client: Pinging server');
		$.ajax({
			url: (SepiaFW.config.webSocketAPI + "ping"),
			timeout: 3000,
			dataType: "jsonp",
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (data.result && data.result === "fail"){
					if (failCallback) failCallback(data);
				}else{
					serverName = data.server;
					SepiaFW.debug.info('Client: Received server name: ' + serverName);
					if (successCallback) successCallback(data);
				}
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				if (!failOfflineCallback) failOfflineCallback = SepiaFW.ui.showPopup(SepiaFW.local.g('noConnectionToNetwork'), getTryAgainPopupConfigAfterConnectionFail());
				Client.checkNetwork(failCallback, failOfflineCallback);
			}
		});
	}
	//check network
	Client.checkNetwork = function(successCallback, failCallback){
		SepiaFW.ui.showLoader(true);
		$.ajax({
			url: ("https://sepia-framework.github.io"),
			timeout: 1500,
			method: "HEAD",
			success: function(data) {
				SepiaFW.ui.hideLoader();
				//console.log('success');		console.log('status: ' + data.status);
				if (successCallback) successCallback(data);
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				//if (data && data.status >= 100){
				if (data && data.status == 405){
					//console.log('success');	console.log('status: ' + data.status);
					if (successCallback) successCallback(data);
				}else{
					//console.log('fail');	console.log('status: ' + data.status);
					if (failCallback) failCallback(data);
				}
			}
		});
	}
	function getTryAgainPopupConfigAfterConnectionFail(){
		var config = {
			buttonTwoName : SepiaFW.local.g('tryAgain'),
			buttonTwoAction : function(){
				SepiaFW.account.afterLogin();
			}
		}
		return config;
	}
	
	//actions triggered when the client becomes active (in this case when the active channel is obtained)
	Client.onActive = function(){
		//LOAD SOME MORE STUFF that requires account verification:

		//One-time actions that need to run before my-view update
		onActivePreUpdateOneTimeActions.forEach(function(fun, index){
			try{
				fun();
			}catch(e){
				SepiaFW.debug.error("Client.onActive failed for 'onActivePreUpdateOneTimeActions' with index: " + index);
			}
		});
		onActivePreUpdateOneTimeActions = [];

		//update my-view
		SepiaFW.ui.updateMyView(false, true, 'onActive');

		//actions like CLEXI and other modules are queued here
		onActiveActions.forEach(function(fun, index){
			try{
				fun();
			}catch(e){
				SepiaFW.debug.error("Client.onActive failed for 'onActiveActions' with index: " + index);
			}
		});
		onActiveOneTimeActions.forEach(function(fun, index){
			try{
				fun();
			}catch(e){
				SepiaFW.debug.error("Client.onActive failed for 'onActiveOneTimeActions' with index: " + index);
			}
		});
		onActiveOneTimeActions = [];
		SepiaFW.debug.log("Ran and removed one-time onActive events.");

		//release onActiveReset for next disconnect
		SepiaFW.client.releaseOnActiveResetBlock();

		//broadcast
		SepiaFW.client.broadcastClientActiveChange("onActive");
	}
	Client.addOnActiveAction = function(actionFunction){
		if ($.inArray(actionFunction, onActiveActions) == -1){
			onActiveActions.push(actionFunction);
		}
	}
	Client.addOnActiveOneTimeAction = function(actionFunction, source){
		if ($.inArray(actionFunction, onActiveOneTimeActions) == -1){
			onActiveOneTimeActions.push(actionFunction);
		}
		if (source){
			SepiaFW.debug.log("Added one-time onAction event of source: " + source);
		}
	}
	Client.addOnActivePreUpdateOneTimeAction = function(actionFunction, source){
		if ($.inArray(actionFunction, onActivePreUpdateOneTimeActions) == -1){
			onActivePreUpdateOneTimeActions.push(actionFunction);
		}
		if (source){
			SepiaFW.debug.log("Added pre-my-view-update one-time onAction event of source: " + source);
		}
	}
	var onActiveActions = [];
	var onActiveOneTimeActions = [];
	var onActivePreUpdateOneTimeActions = [];
	
	//execute when UI is ready and user is logged in (usually)
	Client.startClient = function(){
		//Load some stuff
		lastChannelMessageTimestamps = SepiaFW.data.get("lastChannelMessageTimestamps") || {};
		lastChannelHistoryClearTimestamps = SepiaFW.data.get("lastChannelHistoryClearTimestamps") || {};

		//Establish the WebSocket connection and set up event handlers
		Client.connect(SepiaFW.config.webSocketURI);
		
		//ID
		username = SepiaFW.account.getUserId();
		//serverName is set during "PING" request 
		
		//COMMON
		
		//anything for the standalone web app?
		if (SepiaFW.ui.isStandaloneWebApp){
		}
		
		//BUILD UI
		Client.buildUI();	//we could call this once inside ui.setup(), but without log-in ...
		
		//ADD welcome stuff - TODO: what if this is offline mode or unreachable server?
		Client.welcomeActions(false);
	}
	
	//when client started (and likely before active channel is received) add some info like first-visit messages or buttons
	Client.welcomeActions = function(onlyOffline){
		//First visit info
		if (SepiaFW.account.getClientFirstVisit()){
			var sender = "UI";
			var options = { 
				autoSwitchView: true,
				switchDelay: 1000
			}
			var actionsArray = [];
			actionsArray.push({type: "first_visit_info_start"});
			if (SepiaFW.config.isAutoSetupModeEnabled()){
				actionsArray.push({type: "button_custom_fun", title: SepiaFW.local.g('reloadApp'), fun: function(){
					SepiaFW.account.logoutAction();
					//TODO: replace with custom login?
				}});
			}
			actionsArray.push(SepiaFW.offline.getFrameViewButtonAction("tutorial.html", SepiaFW.local.g("tutorial")));
			actionsArray.push(SepiaFW.offline.getUrlButtonAction("https://github.com/SEPIA-Framework/sepia-docs", "S.E.P.I.A. Docs"));
			actionsArray.push(SepiaFW.offline.getUrlButtonAction(SepiaFW.config.clientLicenseUrl, SepiaFW.local.g("license")));
			actionsArray.push(SepiaFW.offline.getUrlButtonAction(SepiaFW.config.privacyPolicyUrl + "?host=" + encodeURIComponent(SepiaFW.config.host), SepiaFW.local.g("data_privacy")));
			if (!onlyOffline){
				actionsArray.push(SepiaFW.offline.getHelpButtonAction()); 		//TODO: this will only work onActive
			}
			if (SepiaFW.account.getUserId()){
				actionsArray.push({type: "button_custom_fun", title: SepiaFW.local.g('dontShowAgain'), fun: function(){
					SepiaFW.account.setClientFirstVisit(false);
					$('#sepiaFW-myFirstStart-buttons').closest('.chatMsg').fadeOut(300);
				}});
			}
			publishMyViewActions(actionsArray, sender, options);
		}
		//Custom buttons
		if (SepiaFW.ui.customButtons){
			SepiaFW.ui.customButtons.load();
		}
	}

	//handle a message or command that was given via URL 'q=...' parameter
	Client.handleRequestViaUrl = function(requestMsg){
		//1st: remove it from URL to avoid repeat
		var url = SepiaFW.tools.removeParameterFromURL(window.location.href, 'q');
		if (window.history && window.history.replaceState){
			window.history.replaceState(history.state, document.title, url);
		}
		//2nd: check if it is a text message or a command and handle accordingly
		if (requestMsg.indexOf("cmd:") == 0){
			//handle command:
			handleUrlCommandRequest(requestMsg.substring(4, requestMsg.length));
		}else{
			//handle msg:
			handleUrlMessageRequest(requestMsg);
		}
	}
	function handleUrlMessageRequest(requestMsg){
		//ask user if he wants to do this before actually doing it!
		var ask = "<p>" + requestMsg.replace(/^i18n:(\w+)\s/, "($1) ") + "</p>";
		SepiaFW.ui.askForPermissionToExecute(ask, function(){
			//yes
			SepiaFW.debug.log("Executing request via URL: " + requestMsg);
			setTimeout(function(){
				SepiaFW.client.sendInputText(requestMsg);
			}, 750);
		}, function(){
			//no
		});
	}
	function handleUrlCommandRequest(requestMsg){
		//decode base64 string
		requestMsg = atob(requestMsg);
		var ask = requestMsg.replace(/;;(\w+)=/gi, ", <b>$1:</b> ");
		SepiaFW.ui.askForPermissionToExecute("<p><b>cmd: </b>" + ask + "</p>", function(){
			//yes
			SepiaFW.debug.log("Executing command via URL: " + requestMsg);
			//TODO: test
			var options = {};   //things like skipTTS etc. (see sendCommand function)
			var dataset = {
				info: "direct_cmd",
				cmd: requestMsg,
				newReceiver: SepiaFW.assistant.id
			};
			SepiaFW.client.sendCommand(dataset, options);
		}, function(){
			//no
		});
	}
	//handle data that was shared via URL 'share=...' parameter
	Client.handleShareViaUrl = function(shareData){
		//1st: remove it from URL to avoid repeat
		var url = SepiaFW.tools.removeParameterFromURL(window.location.href, 'share');
		if (window.history && window.history.replaceState){
			window.history.replaceState(history.state, document.title, url);
		}
		//2nd: check data and build
		if (typeof shareData == "string"){
			if (shareData.indexOf("{") == 0){
				shareData = JSON.parse(shareData);
			}else{
				shareData = SepiaFW.client.getDeepLinkDataFromEncodedShareData(shareData);
			}
			if (!shareData) return;
		}
		//console.log(shareData);
		if (shareData.type && shareData.data){
			var sdd = shareData.data;
			var ask;
			//give more info
			if (shareData.type == SepiaFW.client.SHARE_TYPE_LINK){
				//Link
				if (sdd.url){
					ask = "<p><b>" + SepiaFW.local.g('link_open_url') + "</b></p>";
					ask += "<b>URL:</b> ";
					ask += (sdd.url.length > 30)? (sdd.url.substring(0,29) + "...") : sdd.url;
				}else if (sdd.data && sdd.data.type && (sdd.data.type == "musicSearch" || sdd.data.type == "videoSearch")){
					ask = "<p><b>" + SepiaFW.local.g('link_media_search') + "</b></p>";
					if (sdd.data.brand) ask += "<p>Link Card Type: " + sdd.data.brand + "</p>";
					ask += sdd.data.title;
				}else{
					ask = "<p><b>" + "Link Card" + "</b></p>";
					ask += "<b>Unknown</b>";
				}
			}else if (shareData.type == SepiaFW.client.SHARE_TYPE_CHANNEL_INVITE){
				//Channel Invite
				ask = "<p><b>" + SepiaFW.local.g('link_join_channel') + "</b></p>";
				ask += "<b>Channel Name:</b> " + sdd.name + "<br>";
				ask += "<b>Channel Owner:</b> " + sdd.owner;
			}else if (shareData.type == SepiaFW.client.SHARE_TYPE_ALARM){
				//Alarm
				ask = "<p><b>" + SepiaFW.local.g('link_create_reminder') + "</b></p>";
				ask += "<b>Title:</b> " + sdd.title;
			}else{
				//Other
				ask = "<p>Shared data of type: <b>" + shareData.type.toUpperCase() + "</b></p>";
			}
			SepiaFW.ui.askForPermissionToExecute(ask, function(){
				//ALARM
				if (shareData.type == SepiaFW.client.SHARE_TYPE_ALARM && sdd.beginTime){
					var options = {};   //things like skipTTS etc. (see sendCommand function)
					var dataset = {
						info: "direct_cmd",
						cmd: "timer;;alarm_name=" + (sdd.title || "Shared Alarm") 
							+ ";;alarm_type=" + "<alarmClock>" 
							+ ";;time=" + "<unix>" + sdd.beginTime 
							+ ";;clock=" + "<unix>" + sdd.beginTime
							+ ";;action=<set>",
						newReceiver: SepiaFW.assistant.id
					};
					SepiaFW.client.sendCommand(dataset, options);
					//TODO: note that name might be unreliable if it was a date and timezone changes
				
				//LINK CARD
				}else if (shareData.type == SepiaFW.client.SHARE_TYPE_LINK && SepiaFW.offline && SepiaFW.embedded){
					//TODO					
					var msgId = SepiaFW.client.getNewMessageId();
					var nluInput = {
						user: SepiaFW.account.getUserId(),
						language: SepiaFW.config.appLanguage
					}
					var nluResult = {
						command: "open_link"
					}
					var serviceResult = SepiaFW.embedded.services.link(nluInput, nluResult, sdd);
					//serviceResult.answer = "";
					//serviceResult.answer_clean = "";
					var assistantIdOrName = ""; 	//SepiaFW.assistant.id
					var receiverId = "";			//SepiaFW.account.getUserId()
					var resultMessage = SepiaFW.offline.buildAssistAnswerMessageForHandler(msgId, serviceResult, assistantIdOrName, receiverId)
					SepiaFW.client.handleServerMessage(resultMessage);

				//CHANNEL INVITE
				}else if (shareData.type == SepiaFW.client.SHARE_TYPE_CHANNEL_INVITE){
					//send request
					SepiaFW.client.joinNewChannel(sdd, function(res){
						//additional onSuccess
						SepiaFW.ui.showPopup(SepiaFW.local.g('joinedChannel') + ":"
							+ "<br><br><b>Name:</b> " + res.channelName
							//+ "<br>Id: " + res.channelId
						);
					});
				
				//No handler
				}else{
					SepiaFW.debug.error("No handler for shared-link type: " + shareData.type);
				}
			}, function(){
				//no
			});
		}
		//TODO: implement more:
		//TYPES: reminder, timer, website, ...
	}
	//handle a message or command that was given via (Android) intent
	Client.handleRequestViaIntent = function(intent){
		//console.log('Android intent action: ' + JSON.stringify(intent.action));		//DEBUG
		if (intent.action){
			//NOTE: the following assumes that the intent was properly executed after onActive
			if (intent.action == "android.intent.action.ASSIST" 
				|| intent.action == "android.intent.action.VOICE_COMMAND"){
				//DEBUG
				//var intentExtras = intent.extras;
				//if (intentExtras)	console.log('Intent extras: ' + JSON.stringify(intentExtras));
				//Start mic
				var useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
				var sourceAction = "intent-" 
					+ (intent.action.replace("android.intent.action.", "").replace(/_/g, "-").trim().toLowerCase());
				SepiaFW.ui.toggleMicButton(useConfirmationSound, sourceAction);
			}
		}		
	}
	
	//demo mode setup
	var demoMode = false;
	Client.setDemoMode = function(value){
		demoMode = value;
	}
	Client.isDemoMode = function(){
		return demoMode;
	}
	
	//BUILD UI METHOD - TODO: move this method to own file and put all client-specific functions in the client interface
	Client.buildUI = function(){
		
		//NAV-BAR
		
		//open close users list and channel-list - TODO: channels are here until we find a better place
		var usersListBtn = document.getElementById("sepiaFW-nav-users-btn");
		if (usersListBtn){
			$(usersListBtn).off();
			$(usersListBtn).on("click", function () {
				$("#sepiaFW-chat-channel-view").fadeToggle(300);
				SepiaFW.ui.closeAllMenusThatCollide("#sepiaFW-chat-channel-view");
			});
		}
		
		//CHANNELS
		Client.openChannelManager = function(data){
			SepiaFW.frames.open({
				pageUrl: "channel-manager.html",
				theme: "dark",
				onOpen: function(){
					var channel = SepiaFW.client.getChannelDataById(activeChannelId);
					var userId = SepiaFW.account.getUserId();
					var canEdit = false;
					//open edit-page for all owned channels except private one
					if (channel && channel.owner && channel.owner == userId && channel.id != userId){
						SepiaFW.frames.currentScope.loadEditData(channel);
						canEdit = true;
					}else{
						SepiaFW.frames.currentScope.clearEditData();
					}
					if (data){
						if (data.page && data.page == "invite"){
							SepiaFW.frames.currentScope.openInvitePage();
						}else{
							SepiaFW.frames.uic.showPane(0);
						}
					}
				},
				onClose: function(){}
			});
		}
		var channelManagerButton = document.getElementById("sepiaFW-chat-channel-manager-btn");
		$(channelManagerButton).off().on("click", function(){
			Client.openChannelManager();
		});
		var channelInviteButton = document.getElementById("sepiaFW-chat-invite-btn");
		$(channelInviteButton).off().on("click", function(){
			Client.openChannelManager({
				page: "invite"
			});
		});
		var channelLogoutButton = document.getElementById("sepiaFW-chat-logout-btn");
		$(channelLogoutButton).off().on("click", function(){
			SepiaFW.account.logoutAction();
		});
		
		//CHAT CONTROLS
		
		//chat controls more menue aka SHORTCUTS-MENU
		var chatMenuBtn = document.getElementById("sepiaFW-chat-controls-more-btn");
		if (chatMenuBtn){
			function closeControlsMenueWithDelay(delay){
				setTimeout(function(){
					if ($("#sepiaFW-chat-controls-more-menu").css('display') != 'none'){
						$('#sepiaFW-chat-controls-more-btn').trigger('click', { bm_force : true });
					}
				}, delay || 750);
			}
			
			//-screen size
			var screenBtn = document.getElementById("sepiaFW-fullsize-btn");
			if (screenBtn){
				$(screenBtn).off();
				SepiaFW.ui.longPressShortPressDoubleTap(screenBtn, function(){
					//long-press
				},'',function(){
					//short press
					SepiaFW.ui.toggleInterfaceFullscreen();
				},function(){
					//double-tab
					SepiaFW.ui.toggleFullscreen();
				}, true, true);
			}
			//-back
			var backBtn = document.getElementById("sepiaFW-back-btn");
			if (backBtn){
				$(backBtn).off();
				$(backBtn).on("click", function(){
					SepiaFW.ui.backButtonAction();
				});
			}
			//-always on mode
			var alwaysOnBtn = document.getElementById("sepiaFW-alwaysOn-btn");
			if (alwaysOnBtn){
				$(alwaysOnBtn).off().on("click", function(){
					if (SepiaFW.alwaysOn){
						SepiaFW.ui.closeAllMenus();
						SepiaFW.alwaysOn.start();
					}
				});
			}
			//-teachUi
			var teachUiBtn = document.getElementById("sepiaFW-teachUI-open");
			if (teachUiBtn){
				$(teachUiBtn).off();
				$(teachUiBtn).on("click", function(){
					if (SepiaFW.teach){
						SepiaFW.ui.closeAllMenus();
						SepiaFW.teach.openUI();
					}
				});
			}
			//-saythis
			var saythisBtn = document.getElementById("sepiaFW-saythis-btn");
			if (saythisBtn){
				$(saythisBtn).off();
				$(saythisBtn).on("click", function(){
					closeControlsMenueWithDelay();
					//chat or remote?
					SepiaFW.ui.showPopup(SepiaFW.local.g('broadcast_to_device_or_chat'), {
						inputLabelOne: "Text",
						buttonOneName: "Remote Device",
						buttonOneAction: function(btn, inputVal1){
							//Remote
							if (!inputVal1) return;
							var includeSharedFor = [{dataType: "remoteActions", action: "notify", actionType: "assistant_message"}];
							setTimeout(function(){
								SepiaFW.client.showConnectedUserClientsAsMenu(SepiaFW.local.g('choose_device_for_action'), 
									function(deviceInfo){
										var sharedReceiver = deviceInfo.isShared? deviceInfo.id : undefined;
										SepiaFW.client.sendRemoteActionToOwnDeviceOrShared("notify", {
											type: "assistant_message",
											text: inputVal1,
											language: SepiaFW.speech.getLanguage() 		//speech or app lang.?
										}, deviceInfo.deviceId, sharedReceiver, undefined, function(err){
											SepiaFW.debug.error("Failed to send remote action.", err);
											SepiaFW.ui.showPopup("Failed to send remote action." + (err? (" Error: " + err) : ""));
										});
									}, true, includeSharedFor, {
										skipOwnDevice: true
									}
								);
							}, 0);
						},
						buttonTwoName: "Send via Chat",
						buttonTwoAction: function(btn, inputVal1){
							//Chat
							var inp = document.getElementById("sepiaFW-chat-input");
							inp.value = SepiaFW.assistant.name + ' ' + CMD_SAYTHIS + ' ' + inputVal1;
							inp.focus();
						},
						buttonThreeName: "Cancel",
						buttonThreeAction: function(btn, inputVal1){}
					});
				});
			}
			//-clear history
			var clearHistoryBtn = document.getElementById("sepiaFW-history-btn");
			if (clearHistoryBtn){
				$(clearHistoryBtn).off();
				SepiaFW.ui.onclick(clearHistoryBtn, function(){
				//$(clearHistoryBtn).on("click", function () {
					if (SepiaFW.ui.moc){
						var currentPane = SepiaFW.ui.moc.getCurrentPane();
						if (currentPane == 0){
							$("#sepiaFW-my-view").html('');
						}else if (currentPane == 1){
							//$("#sepiaFW-chat-output").html('');
							$("#sepiaFW-chat-output").find('> div').each(function(){
								if ($(this).css("display") !== 'none'){
									$(this).remove();
								}
							});
							lastChannelHistoryClearTimestamps[activeChannelId] = new Date().getTime();
							SepiaFW.data.set("lastChannelHistoryClearTimestamps", lastChannelHistoryClearTimestamps);
						}else{
							$("#sepiaFW-result-view").html('');
						}
					}else{
						$("#sepiaFW-chat-output").html('');
					}
				});
			}
			//-shopping list
			var shopListBtn = document.getElementById("sepiaFW-shortcut-btn-shop");
			if (shopListBtn){
				$(shopListBtn).off();
				$(shopListBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "lists;;list_type=<shopping>;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						//options.skipText = true;
						options.skipTTS = true;
						options.targetView = "chat"; 		//auto-selects bigResult for card
						options.showView = true;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-todo list
			var todoListBtn = document.getElementById("sepiaFW-shortcut-btn-todo");
			if (todoListBtn){
				$(todoListBtn).off();
				$(todoListBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "lists;;list_type=<todo>;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						//options.skipText = true;
						options.skipTTS = true;
						options.targetView = "chat"; 		//auto-selects bigResult for card
						options.showView = true;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-radio
			var radioBtn = document.getElementById("sepiaFW-shortcut-btn-radio");
			if (radioBtn){
				$(radioBtn).off();
				$(radioBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "music_radio;;radio_station=egofm;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						//options.skipText = true;
						options.skipTTS = true;
						options.targetView = "chat";
						options.showView = true;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-timers
			var timersBtn = document.getElementById("sepiaFW-shortcut-btn-timer");
			if (timersBtn){
				$(timersBtn).off();
				$(timersBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var options = {};
						//options.skipText = true;
						options.targetView = "chat"; 		//might auto-select bigResult for card
						options.showView = true;
						options.skipTTS = true;
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "timer;;action=<show>;;alarm_type=<timer>;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-alarms/reminders
			var alarmsBtn = document.getElementById("sepiaFW-shortcut-btn-alarm");
			if (alarmsBtn){
				$(alarmsBtn).off();
				$(alarmsBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var options = {};
						//options.skipText = true;
						options.targetView = "chat";		//might auto-select bigResult for card
						options.showView = true;
						options.skipTTS = true;
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "timer;;action=<show>;;alarm_type=<alarmClock>;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					Client.sendCommand(dataset, options);
					//TODO: if voice is on we need to wait here or skip actively (better skip)
					/* It is split now
					var dataset2 = {};	dataset2.info = "direct_cmd";
						dataset2.cmd = "timer;;action=<show>;;alarm_type=<timer>;;";
						dataset2.newReceiver = SepiaFW.assistant.id;
					Client.sendCommand(dataset2, options);
					*/
					closeControlsMenueWithDelay();
				});
			}
			//-weather
			var weatherBtn = document.getElementById("sepiaFW-shortcut-btn-weather");
			if (weatherBtn){
				$(weatherBtn).off();
				$(weatherBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "weather;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						//options.skipText = true;
						options.targetView = "chat";
						options.showView = true;
						options.skipTTS = true;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-news
			var newsBtn = document.getElementById("sepiaFW-shortcut-btn-news");
			if (newsBtn){
				$(newsBtn).off();
				$(newsBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "news;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						//options.skipText = true;
						options.targetView = "chat"; 		//auto-selects bigResult for card
						options.showView = true;
						options.skipTTS = true;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-my events
			var myEventsBtn = document.getElementById("sepiaFW-shortcut-btn-myEvents");
			if (myEventsBtn){
				$(myEventsBtn).off();
				$(myEventsBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					SepiaFW.ui.updateMyView(true, true, 'shortcutsButton');
					/*
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "events_personal;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						options.skipText = true;
						options.targetView = "myView";
						options.showView = true;
						options.skipTTS = true;
					Client.sendCommand(dataset, options);
					*/
					closeControlsMenueWithDelay();
				});
			}
			//-cordova inApp browser			
			var inAppBrowserBtn = document.getElementById("sepiaFW-shortcut-btn-inAppBrowser");
			if (inAppBrowserBtn){
				if (SepiaFW.ui.isCordova){
					$(inAppBrowserBtn).off().on("click", function(){
						SepiaFW.ui.actions.openUrlAutoTarget("<inappbrowser-last>");	//also valid: <inappbrowser-home>
						closeControlsMenueWithDelay();
					});
				}else{
					//$(inAppBrowserBtn).hide();
					$(inAppBrowserBtn).off().on("click", function(){
						var prefSE = SepiaFW.config.getPreferredSearchEngine();
						SepiaFW.ui.actions.openUrlAutoTarget("search.html?default="+ encodeURIComponent(prefSE));
						closeControlsMenueWithDelay();
					});
				}
			}

			//-landscape input field and button (simple input, no extra logic, no audio init. or ASR updates)		
			var landscapeInputText = document.getElementById("sepiaFW-more-menu-input-text");
			if (landscapeInputText){
				$(landscapeInputText).on("keydown", function(e){
					if (e.key == "Enter" && landscapeInputText.value){
						//Return-Key
						SepiaFW.client.sendInputText(landscapeInputText.value);
						landscapeInputText.value = "";
						closeControlsMenueWithDelay();
					}
				});
				$('#sepiaFW-more-menu-input-send').off().on("click", function(){
					if (landscapeInputText.value){
						SepiaFW.client.sendInputText(landscapeInputText.value);
						landscapeInputText.value = "";
						closeControlsMenueWithDelay();
					}
				});
			}
		}
	}
	//MIC CONTROLS
	Client.asrCallbackFinal = function(text){
		//text optimizations
		if (optimizeAsrResult 
				&& (SepiaFW.speech.getLanguage() === "de") && text && text.match(/^(GPA|PPA|WPA|dpa)( ).+/ig)){
			text = text.replace(/^(GPA|PPA|WPA|dpa)( )/i, "Sepia ");
		}
		text = text.trim();

		//show results in frame as well ...
		if (SepiaFW.frames && SepiaFW.frames.isOpen && SepiaFW.frames.canHandleSpeechToTextInput()){
			var modText = SepiaFW.frames.handleSpeechToTextInput({
				"text": text,
				"isFinal": true
			});
			if (modText) text = modText;
		
		//... or default?
		}else{
			//draw speech (e.g. into speech bubble or input field)
			drawSpeech(text, true);
		}

		if (text){
			inputCameViaAsr = true;
			SepiaFW.client.sendInputText(text);
		}else{
			//rare cases were callback triggers but there is no input
			SepiaFW.animate.assistant.idle('asrNoResult');
			//TODO: is this all or do we need to reset anything else?
		}
	}
	Client.asrCallbackInterim = function(text){
		//show results in frame ...
		if (SepiaFW.frames && SepiaFW.frames.isOpen && SepiaFW.frames.canHandleSpeechToTextInput()){
			var modText = SepiaFW.frames.handleSpeechToTextInput({
				"text": text,
				"isFinal": false
			});
			if (modText) text = modText;
		
		//... or default?
		}else{
			//draw speech (e.g. into speech bubble or input field)
			drawSpeech(text, false);
		}
	}
	Client.asrErrorCallback = function(error){
		SepiaFW.debug.err("UI-ASR: " + error);
	}
	Client.asrLogCallback = function(msg){
		SepiaFW.debug.info("UI-ASR: " + msg);
	}
	function drawSpeech(text, isFinal){
		SepiaFW.ui.drawLiveSpeechInputText(text, isFinal);
	}
	
	//add credentials and parameters
	function addCredentialsAndParametersToData(data, skipAssistantState){
		//NOTE: compare to 'Assistant -> getParametersForHttpCall'
		
		if (SepiaFW.account.getUserId() && SepiaFW.account.getToken(sepiaSessionId)){
			//use "safe" field: credentials
			data.credentials = new Object();
			data.credentials.userId = SepiaFW.account.getUserId();
			data.credentials.pwd = SepiaFW.account.getToken(sepiaSessionId);
		}
		if (!skipAssistantState){
			data.parameters = SepiaFW.assistant.getState();
		}else{
			data.parameters = {};
		}
		data.parameters.client = SepiaFW.config.getClientDeviceInfo(); 	//SepiaFW.config.clientInfo;
		data.parameters.device_id = SepiaFW.config.getDeviceId();
		
		return data;
	}

	//connect by creating the webSocket
	Client.connect = function(uri, onConnectedCallback){
		tryReconnect = true;
		clearTimeout(reconTimer);
		clearTimeout(instaReconTimer);
		
		if (isConnecting){
			SepiaFW.debug.log("WebSocket: already connecting!");
			return;
		}
		
		SepiaFW.debug.log("WebSocket: connecting ...");
		connectAttempts++;
		isConnecting = true;
		SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_CONNECTING);

		webSocket = new WebSocket(uri);
		
		webSocket.onmessage = function(msg){
			Client.handleMessage(msg); 
		};

		webSocket.onclose = function(ev){
			var closedOnPurpose = false;
			if (ev && ev.code && ev.code == 1012){
				closedOnPurpose = true;
				SepiaFW.debug.log("WebSocket: connection closed with SERVICE RESTART info.");
			}else{
				SepiaFW.debug.log("WebSocket: connection closed or lost");
			}
			connectionIsOpen = false;
			isConnecting = false;
			username = "";
			activeChannelId = "";
			activeChatPartner = undefined;
			SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_CLOSED);
			if (closedOnPurpose){
				//handle with delay
				setTimeout(function(){ Client.handleCloseEvent(); }, Math.round(Math.random() * 2000) + 1000);
			}else{
				//handle immediately
				Client.handleCloseEvent();
			}
		};

		webSocket.onopen = function(){
			SepiaFW.debug.log("WebSocket: connection open");
			clearTimeout(reconTimer);
			clearTimeout(instaReconTimer);
			clearTimeout(closeConnectionTimer);
			connectionIsOpen = true;
			connectAttempts = 0;
			isConnecting = false;
			username = SepiaFW.account.getUserId();
			activeChannelId = "";
			SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_OPENED);
			if (onConnectedCallback){
				//note: the websocket server will initiate channelJoin after onOpen, 
				//so make sure that 'onConnectedCallback' will not be in conflict with that
				onConnectedCallback();
			}
		};

		webSocket.onerror = function(error){
			SepiaFW.debug.err("WebSocket:", error);
			SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_ERROR);
			//TODO: does error mean connection lost?
		};
	}

	//close connection
	Client.closeConnection = function(forceReset, forceResetCallback){
		//TODO: consider tryReconnect here. When force close set it in the calling function.
		tryReconnect = false;
		clearTimeout(reconTimer);
		clearTimeout(instaReconTimer);
		connectAttempts = 0;
		if (webSocket){
			webSocket.close();
		}
		if (forceReset){
			clearTimeout(closeConnectionTimer);
			closeConnectionTimer = setTimeout(function(){
				if (isConnecting || connectionIsOpen){
					webSocket.onclose();
					if (forceResetCallback) forceResetCallback();
				}else{
					if (forceResetCallback) forceResetCallback();
				}
			}, 3000);
		}
	}
	var closeConnectionTimer = undefined;
	
	//reconnect on close
	var reconTimer;
	Client.handleCloseEvent = function(){
		clearTimeout(reconTimer);
		clearTimeout(instaReconTimer);
		var nextWaitDuration = Math.min(reconnectMaxWait, (connectAttempts * connectAttempts * nextReconnect));
		if (tryReconnect && !neverReconnect && !Client.isDemoMode()){
			reconTimer = setTimeout(function(){ 
				Client.connect(SepiaFW.config.webSocketURI);
			}, nextWaitDuration);
		}
		SepiaFW.client.broadcastOnActiveReset();
	}
	//instant reconnect
	var instaReconTimer;
	Client.instaReconnect = function(){
		clearTimeout(reconTimer);
		clearTimeout(instaReconTimer);
		connectAttempts = 0;
		if (!neverReconnect && !connectionIsOpen && !Client.isDemoMode()){
			Client.connect(SepiaFW.config.webSocketURI);
		}
	}

	//Send text from input field and reset field
	var sendInputTimeout;
	Client.sendInputText = function(inputText){
		//switch to chat
		if (SepiaFW.ui.moc) SepiaFW.ui.moc.showPane(1);

		//stop running stuff
		if (SepiaFW.speech.isSpeaking()){
			SepiaFW.speech.stopSpeech();
			clearTimeout(sendInputTimeout);
			sendInputTimeout = setTimeout(function(){ Client.sendInputText(inputText); }, 500);
			return;
		}
		clearTimeout(sendInputTimeout);
		//prep text
		var text = inputText || getInputTextFromInterface();
		if (text && text.trim()){
			//specials?
			var inputSpecialCommand = Client.inputHasSpecialCommand(text);
			var hasSpecialCommand = !!inputSpecialCommand;
			var specialOptions = {};
			if (hasSpecialCommand && inputSpecialCommand.indexOf(CMD_CLIENT_I18N) == 0){
				//handle CMD_CLIENT_I18N here, don't send to server
				text = text.replace(/^.*?(\s|$)/, "");
				if (inputSpecialCommand.indexOf(":") > 0){
					var modLang = inputSpecialCommand.split(":")[1];
					specialOptions.requestLanguageModifier = modLang;
				}
			}

			//prep. request
			text = text.trim();
			SepiaFW.ui.lastInput = text;
			var receiver = "";
			var receiverDeviceId = "";
			var msg;
			//manual receiver overwrite
			if (text.substring(0, 1) === "@" && (text.indexOf(" ") > 0)){
				var res = text.split(" ");
				var recUid = res[0].substring(1, res[0].length);
				var possibleReceivers = Client.getActiveChannelUsersByIdOrName(recUid);
				if (possibleReceivers.length > 0){
					//console.log(possibleReceivers); 		//DEBUG
					//TODO: since names are not unique but chosen by users it can happen that we get the same name multiple times here ... what then?
					receiver = possibleReceivers[0].id;
					receiverDeviceId = possibleReceivers[0].deviceId;
				}else{
					receiver = recUid;		//we should set receiver in any case to prevent a public message
				}
				res.shift();
				text = res.join(" ").trim();
			
			//locked receiver overwrite
			}else if (activeChatPartner && !hasSpecialCommand){
				//console.log('send to: ' + JSON.stringify(activeChatPartner));
				receiver = activeChatPartner.id;
				receiverDeviceId = activeChatPartner.deviceId;
			}

			//track last source (and reset state)
			Client.lastInputSourceWasAsr = (inputCameViaAsr === true);
			inputCameViaAsr = undefined;
			
			//check if ID is still in channel list and if not reply with status message
			if (receiver && !Client.hasChannelUser(receiver)){
				SepiaFW.ui.showPopup(SepiaFW.local.g('userNotFound'), {
					buttonOneName : SepiaFW.local.g('wait'),
					buttonOneAction : function(){
						//do nothing
					},
					buttonTwoName : SepiaFW.local.g('forget'),
					buttonTwoAction : function(){
						clearInputText();
						Client.switchChatPartner('');
					}
				});
				return;
			}
			
			//TODO: think about security here - answer(?): the server takes care of it during broadcast
			var data = new Object();
			data.dataType = "openText";
			data = addCredentialsAndParametersToData(data);
			
			//special command modifiers
			if (specialOptions.requestLanguageModifier && specialOptions.requestLanguageModifier.length == 2 
					&& specialOptions.requestLanguageModifier != data.parameters.lang){
				data.parameters.lang = specialOptions.requestLanguageModifier;
				SepiaFW.debug.log("Client.sendInputText - modified language for request: " + data.parameters.lang);
			}

			var newId = (username + "-" + ++msgId);
			msg = buildSocketMessage(username, receiver, text, "", data, "", newId, activeChannelId);
			msg.receiverDeviceId = receiverDeviceId;
			//console.log(JSON.stringify(msg)); 		//DEBUG

			//add source?
			if (Client.lastInputSourceWasAsr) msg.inputViaAsr = true;

			//SepiaFW.debug.info(JSON.stringify(msg));
			Client.sendMessage(msg);
			
			//check if there is actually someone to listen :-)
			if (!userList || userList.length <= 1){
				if (!Client.isDemoMode()){
					var infoMsg = SepiaFW.local.g('nobodyThere');
					SepiaFW.ui.showInfo(infoMsg);
					//broadcast error
					SepiaFW.client.broadcastClientError(infoMsg, 1);
				}
			}
		}
		//reset all possible text fields
		clearInputText();
	}
	function getInputTextFromInterface(){
		return SepiaFW.ui.getActiveSpeechOrChatInputText();
	}
	function clearInputText(){
		SepiaFW.ui.clearSpeechAndChatInputText();
	}
	
	Client.getActiveChannelUsersByIdOrName = function(nameOrId){
		nameOrId = nameOrId.toLowerCase();
		var id = SepiaFW.account.stringLooksLikeAnID(nameOrId)? nameOrId : "";
		var receivers = [];
		if (nameOrId){
			$.each(userList, function(index, u){
				if ((id && id === u.id.toLowerCase()) || nameOrId === u.name.toLowerCase()){
					receivers.push(u);
				}
			});
		}
		return receivers;
	}
	Client.getFirstActiveChannelUserById = function(id){
		var user;
		if (id){
			$.each(userList, function(index, u){
				if (id.toLowerCase() === u.id.toLowerCase()){
					user = u;
					return false;
				}
			});
		}
		return user;
	}
	Client.getNameFromUserList = function(id){
		var name = "";
		if (id){
			$.each(userList, function(index, u){
				if (id.toLowerCase() === u.id.toLowerCase()){
					name = u.name;
					return false;
				}
			});
		}
		return name;
	}

	//Send a message if it's not empty
	var sendFailedInRow = 0;
	var messageQueue = {};
	Client.sendMessage = function(message, retryNumber){
		if (!retryNumber) retryNumber = 0;
		if (message){
			//Offline mode
			if (Client.isDemoMode()){
				if (SepiaFW.offline && message.text){
					SepiaFW.offline.handleClientSendMessage(message);
				}else{
					//SepiaFW.ui.showInfo(SepiaFW.local.g('nobodyThere'));
					SepiaFW.ui.showInfo("Demo-Mode", true);
				}
				return;
			//Still connecting
			}else if (isConnecting || !connectionIsOpen){
				handleSendMessageFail(message, retryNumber, SepiaFW.local.g('stillConnecting'), (sendFailedInRow>3), false, false);
				return;
			//User not active
			}else if (!activeChannelId){
				//check auth. status, but only if this message itselve is not an auth. or join channel request
				if (!message.data || !(message.data.dataType === "authenticate" || message.data.dataType === "joinChannel")){
					handleSendMessageFail(message, retryNumber, SepiaFW.local.g('noConnectionOrNoCredentials'), true, true, false);
					return;
				}
			}
			if (!Client.fakeConnectionLoss){
				webSocket.send(JSON.stringify(message));
			}
			//console.log('MSG: ' + JSON.stringify(message)); 		//DEBUG
			observeMessage(message);
			sendFailedInRow = 0;
			return true;
		}
	}
	//check if message was successfully received by server and returned with confirmation
	function observeMessage(message){
		if (message.msgId){
			var id = message.msgId;
			//var isMessageToAssistant = message.receiver && message.receiver == SepiaFW.assistant.id;
			var isChat = message.data && (message.data.dataType == "openText" || message.data.dataType == "directCmd");
			//console.log(id + " - " + message.data.dataType);
			if (isChat){
				messageQueue[id] = message;
				//console.log(JSON.stringify(message));
				setTimeout(function(){
					//Message problems?
					if (messageQueue[id]){
						SepiaFW.animate.assistant.loading();
						setTimeout(function(){
							//Message lost?
							if (messageQueue[id]){
								//problems!
								SepiaFW.client.isMessagePending = true;
								SepiaFW.debug.error("Message with ID '" + id + "' was not delivered (yet) after 7s!");
								//clean-up and show reconnect/send again pop-up
								delete messageQueue[id];
								handleSendMessageFail(message, 2, SepiaFW.local.g('messageLost'), false, false, true);
								//TODO: can we use 'isMessagePending' in a smart way to block messageQueue spamming?
							}else{
								SepiaFW.client.isMessagePending = false;
							}
						}, 3500);
					}else{
						SepiaFW.client.isMessagePending = false;
					}
				}, 3500);
			}
		}
	}
	function refreshDataAndRetrySendMessage(message, nextRetryNumber){
		//we need to refresh activeChannelId and activeChatPartner of 'message' (message.channelId, message.receiver) here
		if ((activeChannelId && !lastActivatedChannelId) || (lastActivatedChannelId && (lastActivatedChannelId == activeChannelId))){
			message.channelId = activeChannelId;
		}
		if ((activeChatPartner && !lastActivatedChatPartner) || (lastActivatedChatPartner && (lastActivatedChatPartner == activeChatPartner))){
			message.receiver = activeChatPartner.id;
			message.receiverDeviceId = activeChatPartner.deviceId;
		}
		Client.sendMessage(message, nextRetryNumber);
	}
	function handleSendMessageFail(message, retryNumber, note, showReloadOption, showLoginOption, showForceReconnectOption){
		sendFailedInRow++;
		if (retryNumber <= 1){
			setTimeout(function(){
				refreshDataAndRetrySendMessage(message, ++retryNumber);
			}, 1500);
		}else{
			note += ("<br><br>Status: <span id='sepiaFW-secondary-online-status'>" + SepiaFW.local.g(SepiaFW.client.lastKnownConnectionStatus) + "</span>");
			var config = {
				buttonOneName : SepiaFW.local.g('tryAgain'),
				buttonOneAction : function(){
					if (!isConnecting && !connectionIsOpen){
						//try to reconnect
						clearTimeout(instaReconTimer);
						instaReconTimer = setTimeout(function(){
							Client.instaReconnect();
							setTimeout(function(){
								refreshDataAndRetrySendMessage(message, 0);
							}, 1500);
						}, 1000);
					}else if (!activeChannelId){
						//try auth. again then send message again
						sendAuthenticationRequest();
						refreshDataAndRetrySendMessage(message, 0);
					}else{
						refreshDataAndRetrySendMessage(message, 0);
					}
				},
				buttonFourName : SepiaFW.local.g('forget'),
				buttonFourAction : function(){
					//Trigger idle event once again
					SepiaFW.client.queueIdleTimeEvent(function(){
						SepiaFW.animate.assistant.idle();
					}, 1500, 8500, function(){});
				}
			}
			if (showReloadOption){
				config.buttonTwoName = SepiaFW.local.g('reload');
				config.buttonTwoAction = function(){
					setTimeout(function(){
						window.location.reload();
					}, 1000);
				}
			}
			if (showLoginOption){
				config.buttonThreeName = SepiaFW.local.g('sendLogin');
				config.buttonThreeAction = function(){
					SepiaFW.account.afterLogout = function(){
						setTimeout(function(){
							window.location.reload();
						}, 1000);
					}
					SepiaFW.account.logoutAction();
				}
			}else if (showForceReconnectOption){
				config.buttonThreeName = SepiaFW.local.g('tryReconnect');
				config.buttonThreeAction = function(){
					SepiaFW.client.closeClient(true, function(){
						SepiaFW.client.resumeClient();
						SepiaFW.client.isMessagePending = false;
						refreshDataAndRetrySendMessage(message, 0);
					});
				}
			}
			config.autoAction = true;
			config.autoActionIndex = 4;
			config.autoActionTargetTime = 45000;
			config.popupId = "handleSendMessageFail";
			SepiaFW.ui.showPopup(note, config);
			//broadcast error
			SepiaFW.client.broadcastClientError("Failed to send chat message - Last known connection state: " + SepiaFW.local.g(SepiaFW.client.lastKnownConnectionStatus), 1);
		}
	}
	
	//Send a command (usually triggered by an action received)
	Client.sendCommand = function(dataset, options){
		var data = new Object();
		var isDirectCmd = false;
		if (dataset.info && dataset.info === "direct_cmd"){
			data.dataType = 'directCmd';
			isDirectCmd = true;
		}else{
			data.dataType = 'openText';
		}
		var cmd = dataset.cmd;
		//the sender becomes the receiver - This workds because dataset is usually an 
		//action received from the assistant ... but it is kind of inconsistent with the rest :-(
		var receiver = dataset.newReceiver || dataset.sender || SepiaFW.assistant.id; 	//we use newReceiver to fix the inconsistency (a bit)
		if (receiver == "<all>"){
			receiver = "";
		}
		//TODO: handle options in dataset?
		if (dataset.options){
			$.each(options, function(key, value){
				dataset.options[key] = value;
			});
			options = dataset.options;
			//console.log("options " + JSON.stringify(dataset.options));
		}
		data = addCredentialsAndParametersToData(data);
		//special command modifiers
		if (dataset.lang && dataset.lang != data.parameters.lang){
			data.parameters.lang = dataset.lang;
			SepiaFW.debug.log("Client.sendCommand - modified language for request: " + dataset.lang);
		}
		if (isDirectCmd){
			//SepiaFW.assistant.setDirectCmd();
			data.parameters.input_type = "direct_cmd"; //switch state temporary only for this command
		}
		var newId = (username + "-" + ++msgId);
		var msg = buildSocketMessage(username, receiver, cmd, "", data, "", newId, activeChannelId);
		//console.error('CMD: ' + JSON.stringify(msg)); 		//DEBUG
		if (options && Object.keys(options).length !== 0){
			//console.log("msg-id: " + newId + " - options " + JSON.stringify(options)); 		//DEBUG
			Client.setMessageIdOptions(newId, options);
		}
		Client.sendMessage(msg);
	}

	//Request an alive ping - use delay=-1 to trigger continous procedure
	Client.requestAlivePing = function(delay){
		var data = new Object();
		data.dataType = "ping";
		data.sendPing = delay;
		var newId = ("ping" + "-" + ++msgId);
		var msg = buildSocketMessage(username, serverName, "", "", data, "", newId, "");
		Client.sendMessage(msg);
	}

	//Request data update via Socket connection (alternative to HTTP request to server endpoint)
	Client.sendOrRequestDataUpdate = function(updateData, dataObj){
		//build data
		var data = new Object();
		data.dataType = "updateData";
		data = addCredentialsAndParametersToData(data, true);	//true: skip assistant state data
		//updateData object
		data.updateData = updateData;
		if (dataObj){
			data.data = dataObj;
		}
		//add channel info
		/* data.channelInfo = {
			lastReceivedMessages: lastChannelMessageTimestamps
		} */
		var newId = ("update" + "-" + ++msgId);
		var msg = buildSocketMessage(username, serverName, "", "", data, "", newId, activeChannelId);
		Client.sendMessage(msg);
	}

	//Send remote action via client connection
	Client.sendRemoteActionToOwnDeviceOrShared = function(type, action, deviceId, sharedReceiver, successCallback, errorCallback){
		if (!SepiaFW.account.getUserId() || !deviceId) return;	//required
		//redirect to HTTP call?
		if (sharedReceiver){
			//TODO: we currently have to redirect shared-access remote-actions to HTTP for authentication!
			SepiaFW.assistant.sendHttpRemoteAction(type, action, deviceId, sharedReceiver, successCallback, function(err){
				if (errorCallback){
					var errMsg = err? (err.message || err.name || err.statusText) : undefined;
					errorCallback(errMsg);
				}
			});
			return;
		}
		//build data
		var data = new Object();
		data.dataType = "remoteAction";
		data = addCredentialsAndParametersToData(data, true);
		//remoteAction object
		data.type = type;
		data.action = (typeof action != "string")? JSON.stringify(action) : action;
		//source and target
		data.remoteUserId = SepiaFW.account.getUserId();
		data.targetDeviceId = deviceId;
		data.skipDeviceId = SepiaFW.config.getDeviceId();	//skip own
		//msg.data.get("targetChannelId");					//auto
		var newId = ("remote-act" + "-" + ++msgId);
		var msg = buildSocketMessage(username, serverName, "", "", data, "", newId, "<auto>");
		var submitted = Client.sendMessage(msg);
		if (submitted){
			if (successCallback) successCallback();
		}else{
			if (errorCallback) errorCallback();
		}
	}
	
	Client.switchChannel = function(channelId, channelKey){
		lastActivatedChannelId = channelId;
		//clear old channel and user list
		/*
		SepiaFW.ui.build.channelList([], '');
		SepiaFW.ui.build.userList('', '');
		*/
		//request new
		var data = new Object();
		data.dataType = 'joinChannel';
		//use "safe" field: credentials
		data.credentials = new Object();
		data.credentials.channelId = channelId;
		if (channelKey) data.credentials.channelKey = channelKey;
		//filters for channel history
		var notOlderThanFilter;
		if (!lastChannelJoinTimestamps[channelId]){
			//force full history or time of last history clear when channel was never joined
			notOlderThanFilter = lastChannelHistoryClearTimestamps[channelId] || 0;
		}else{
			//take TS if available or last history clear (depending on what is more recent)
			if (lastChannelHistoryClearTimestamps[channelId] && lastChannelMessageTimestamps[channelId]){
				notOlderThanFilter = Math.max(lastChannelHistoryClearTimestamps[channelId], lastChannelMessageTimestamps[channelId]);	
			}else if (lastChannelMessageTimestamps[channelId]){
				notOlderThanFilter = lastChannelMessageTimestamps[channelId] || 0;
			}else{
				notOlderThanFilter = lastChannelHistoryClearTimestamps[channelId] || 0;
			}
		}
		data.channelHistoryFilter = {
			notOlderThan: notOlderThanFilter
		}
		var receiver = serverName;
		var newId = (username + "-" + ++msgId);
		var msg = buildSocketMessage(username, receiver, "", "", data, "", newId, "");
		Client.sendMessage(msg);
		//note: activeChannelId and activeChatPartner remain active until channel join is broadcasted
	}
	Client.getActiveChannel = function(){
		return activeChannelId;
	}
	Client.getAllChannels = function(){
		return channelList;
	}
	Client.getChannelDataById = function(channelId){
		var channelData;
		for (var i=0; i<channelList.length; i++){
			var channel = channelList[i];
			if (channel.id == channelId){
				channelData = channel;
				break;
			}
		}
		return channelData;
	}
	Client.getActiveChannelUsers = function(){
		return userList;
	}
	Client.hasChannelUser = function(checkUserId){
		var channelHasUser = false;
		$.each(userList, function(index, user) {
			if (user.id === checkUserId){
				channelHasUser = true;
				return false;
			}
		});
		return channelHasUser;
	}
	
	Client.switchChatPartner = function(userObject){
		if (!userObject){
			lastActivatedChatPartner = undefined;
			activeChatPartner = undefined;
			SepiaFW.debug.log("WebSocket: removed private chat partner lock.");
			broadcastChatPartnerSwitch('');
			return;
		}
		//check if ID is in current channel
		if (Client.hasChannelUser(userObject.id)){
			SepiaFW.debug.log("WebSocket: switched chat partner to: " + userObject.id);
			lastActivatedChatPartner = userObject;
			activeChatPartner = userObject;
			broadcastChatPartnerSwitch(userObject);
		}
	}
	Client.getActiveChatPartner = function(){
		return activeChatPartner;
	}
	
	//Interface conform version of message handler
	Client.handleServerMessage = function(msg){
		var message = {
			data: msg 	//we put the original message into the data field as we would get it from the chat server
		}
		Client.handleMessage(message);
	}
	//Handle message received from chat server, update the chat-panel and the list of connected users
	//Note: This also includes (and handles) messages sent by the user since the server lets them bounce back to confirm transfer
	Client.handleMessage = function(msg) {
		var message = (typeof msg.data === 'string')? JSON.parse(msg.data) : msg.data;
		var refreshUsers = false;
		var notAnsweredYet = true;
		
		//console.log("handleMessage", msg);
		//console.log(JSON.stringify(message, null, 2));
		if (message.msgId){
			delete messageQueue[message.msgId];
			SepiaFW.client.isMessagePending = false;
		}
		
		//userList submitted?
		if (message.userList){
			userList = message.userList;
			refreshUsers = true;
			
			//check userList for assistants
			if (userList){
				$.each(userList, function(index, entry){
					if (entry.role && entry.role == "assistant"){
						SepiaFW.assistant.updateInfo(entry);
					}
				});
			}
		}
		
		//data
		if (message.data){
			//ping
			if (message.sender === serverName && message.data.dataType === "ping"){
				var data = new Object();
				data.dataType = "ping";
				//return ping ID
				data.replyId = message.msgId;
				var newId = ("ping" + "-" + ++msgId);
				var msg = buildSocketMessage(username, serverName, "", "", data, "", newId, "");
				Client.sendMessage(msg);

			//authenticate
			}else if (message.sender === serverName && message.data.dataType === "authenticate"){
				//send credentials and then wait until the server sends channel info
				sendAuthenticationRequest();
				
			//get channel-join confirmation of server
			}else if (message.sender === serverName && message.data.dataType === "joinChannel"){
				activeChannelId = message.data.channelId;
				var channelName = message.data.channelName;		//an arbitrary name given to this channel
				//var givenName = message.data.givenName; 		//user name - might be useful but you should know your name ^^
				SepiaFW.debug.log("WebSocket: switched channel to: " + message.data.channelName + " - id: " + message.data.channelId);
				
				//re-build channel list
				if (Client.pushToChannelList({
					id: activeChannelId,
					name: channelName
				})){
					Client.refreshChannelList();
				}

				//register join (we could/should move this to the 'welcome' event maybe?)
				lastChannelJoinTimestamps[message.data.channelId] = new Date().getTime();

				//clean channel
				$("#sepiaFW-chat-output").find('[data-channel-id=' + message.data.channelId + ']').filter('[data-msg-custom-tag=unread-note]').remove();

				//rebuild channel history data
				if (message.data.channelHistory && message.data.channelHistory.length){
					//clean channel
					//$("#sepiaFW-chat-output").find('[data-channel-id=' + message.data.channelId + ']').remove();
					
					//rebuild
					/*
					console.error("Channel History:");
					console.error(JSON.stringify(message.data.channelHistory));
					console.error("Size: " + message.data.channelHistory.length);
					*/
					var day = undefined;
					var showedNew = false;
					var lastMsgTS = lastChannelMessageTimestamps[message.data.channelId];
					var numOfMsg = message.data.channelHistory.length;
					var n = 0;
					message.data.channelHistory.forEach(function(msg){
						var isNew = false;
						if (msg.timeUNIX){
							//add day name
							var d = new Date(msg.timeUNIX);
							var thisDay = d.getDay();
							if (thisDay != day){
								day = thisDay;
								var customTag = "weekday-note-" + SepiaFW.tools.getLocalDateWithCustomSeparator("-", msg.timeUNIX);
								//... but only if we haven't already
								if ($("#sepiaFW-chat-output").find('[data-channel-id=' + message.data.channelId + ']').filter('[data-msg-custom-tag=' + customTag + ']').length == 0){
									var weekdayName = SepiaFW.local.getWeekdayName(day) + " " + d.toLocaleDateString(SepiaFW.config.appLanguage);
									SepiaFW.ui.showInfo(weekdayName, false, customTag, true, message.data.channelId);	//SepiaFW.local.g('history')
								}
							}
							//add unread note
							isNew = (!lastMsgTS || msg.timeUNIX > lastMsgTS);		//TODO: I think due to some ms time difference in server and client this can fail sometimes
							if (isNew && msg.sender && msg.sender == SepiaFW.account.getUserId()){
								//we don't need to mark own messages
								isNew = false;
								//TODO: there is a curious bug somewhere that messes with 'lastChannelMessageTimestamps' sometimes so last read msg is shown, idk where :-/
							}
							if (isNew && !showedNew){
								SepiaFW.ui.showInfo(SepiaFW.local.g('newMessages'), false, "unread-note", true, message.data.channelId);
								showedNew = true;
							}
						}
						n++;
						var isLast = (n == numOfMsg);
						var options = {
							displayOptions: {
								skipAnimation: !isLast,
								beSilent: !isNew
							}
						}
						SepiaFW.ui.showCustomChatMessage(msg.text, msg, options); 
					});
				}
				
				//broadcastChannelJoin(activeChannelId);  //moved to welcome message so that we can update userList first
				
			//get welcome message after channel-join
			}else if (message.sender === serverName && message.data.dataType === "welcome"){
				broadcastChannelJoin(activeChannelId);
				//transfer some info to chat server (should we move this to 'onActive'? - I prefer to have it here because its chat-server data)
				sendWelcomeData();

			//get new data - NOTE: this is similar to 'dataType == "remoteAction", type == "sync"' but usually contains two-way data (not only an sync request)
			}else if (message.sender === serverName && message.data.dataType === "updateData"){
				if (message.data && message.data.updateData){
					handleUpdateRequest(message.data);
				}else{
					SepiaFW.debug.error("WebSocket: 'updateData' message had no data attached or missing parameters.");
				}

			//assistant answer
			}else if (message.data.dataType === "assistAnswer"){
				//console.error("assistAnswer", JSON.stringify(message, "", 2), username);		//DEBUG
				//console.error("options", Client.getMessageIdOptions(message.msgId));			//DEBUG
				Client.optimizeAndPublishChatMessage(message, username);
				notAnsweredYet = false;

			//assistant follow up message
			}else if (message.data.dataType === "assistFollowUp"){
				//TODO: should we wait for idle time here? I guess so ..., on the other hand TTS (if active) will be queued anyway
				//console.log(message);
				Client.optimizeAndPublishChatMessage(message, username); 		
				//TODO: the msg ID will be the one of the initial request ... is this an unhandled problem later? msg options (e.g. skipTTS) might be lost ...
				notAnsweredYet = false;
			
			//direct command
			}else if (message.data.dataType === "directCmd"){
				//TODO: do nothing? why would the UI get a direct command ... hmm wait a minute ... >:-)
				notAnsweredYet = false;
			
			//remoteAction
			}else if (message.data.dataType === "remoteAction"){
				var actionUser = message.data.user;
				var action;
				if (message.data.action){
					if (typeof message.data.action == "string" && message.data.action.indexOf("{") == 0){
						action = JSON.parse(message.data.action);
					}else{
						action = message.data.action;
					}
				}
				//TODO: we could use for additional info:
				//var originalSender = message.data.originalSender;	//defined if action came from user allowed via shared access

				//invalid
				if (!message.data.type || !action){
					SepiaFW.debug.log("remoteAction - ignored action because no type or action was given");
				
				//HOTKEY
				}else if (message.data.type === "hotkey"){
					if (typeof action == "string"){
						action = {
							key: action
						}
					}
					SepiaFW.debug.info("remoteAction - hotkey: " + action.key + ", language: " + action.language);
					
					var sEntry = SepiaFW.ui.build.statusMessage(message, username);
					SepiaFW.ui.insertEle("sepiaFW-chat-output", sEntry);
					SepiaFW.ui.scrollToBottom("sepiaFW-chat-output");
					notAnsweredYet = false;
					
					//user has to be same! (security)
					if (actionUser !== SepiaFW.account.getUserId()){
						SepiaFW.debug.error("remoteAction - tried to use type 'hotkey' with wrong user");
					}else{
						//handle remote action
						if (SepiaFW.inputControls){
							SepiaFW.inputControls.handleRemoteHotkeys(action);
						}else{
							SepiaFW.debug.log("remoteAction - no handler yet for type: " + message.data.type);
						}
					}

				//SYNC - NOTE: this is similar to 'dataType == "updateData"' but usually is only the update request event (no data)
				}else if (message.data.type === "sync"){
					if (typeof action == "string"){
						action = {
							events: action,
							forceUpdate: true,
							updateLocation: false
						}
					}
					SepiaFW.debug.info("remoteAction - sync: " + action.events + " - force: " + action.forceUpdate);

					//user has to be same! (security)
					if (actionUser !== SepiaFW.account.getUserId()){
						SepiaFW.debug.error("remoteAction - tried to use type 'sync' with wrong user");
					}else{
						//handle sync event
						if (action.events == "timeEvents" || action.events == SepiaFW.events.TIMER || action.events == SepiaFW.events.ALARM){
							//if its old we remove the card here (because the update will only refresh future timers)
							if (action.details && action.details.eventId){
								//NOTE: this will ONLY be triggered if its not a complete list-sync. because list-sync. is missing individual eventIds
								SepiaFW.ui.cards.findAllTimeEventCards(true, false).forEach(function(item){
									if (item.data && item.data.eventId == action.details.eventId){
										item.remove();
									}
								});
							}
							//refresh future
							SepiaFW.ui.updateMyTimeEvents(action.forceUpdate);

						}else if (action.events == "my" || action.events == "myView" || action.events == "home"){
							SepiaFW.ui.updateMyView(action.forceUpdate, action.updateLocation);

						}else if (action.events == "productivity"){
							//mark list as out-of-sync
							if (action.details && action.details.groupId){
								SepiaFW.ui.cards.findAllUserDataLists(action.details.groupId).forEach(function(l){
									$(l.ele).addClass("sepiaFW-card-out-of-sync").find('.sepiaFW-cards-list-saveBtn')
											.addClass('active').find('i').html('sync_problem'); 	//cloud_off
								});
							}

						}else if (action.events == "addresses"){
							//NOTE: this probably requires location.reload()
							SepiaFW.debug.log("remoteAction - no 'sync' handler yet for 'addresses'");

						}else{
							SepiaFW.debug.log("remoteAction - no 'sync' handler yet for events: " + action.events);
						}
						
						//console.error("action", action); 		//DEBUG
						
						//TODO: add e.g. "userAddress", "toDoLists", "userData", ...
					}

				//Media (player controls, streams etc.)
				}else if (message.data.type === "media"){
					if (typeof action == "string"){
						//default is stream
						action = {
							type: "audio_stream",
							streamURL: action
						}
					}
					if (action.streamUrl) action.streamURL = action.streamUrl; 		//avoid typo problems
					SepiaFW.debug.info("remoteAction - media: " + JSON.stringify(action));

					//user has to be same! (security)
					if (actionUser !== SepiaFW.account.getUserId()){
						SepiaFW.debug.error("remoteAction - tried to use type 'media' with wrong user");
					}else{
						//handle
						if (action.type == "audio_stream"){
							if (action.streamURL){
								//wait for opportunity and execute
								SepiaFW.assistant.waitForOpportunitySayLocalTextAndRunAction(
									SepiaFW.account.getUserName() + ", " + SepiaFW.local.g('remote_action_audio_stream'), 
									function(){
										SepiaFW.ui.showInfo(SepiaFW.local.g('remote_action') + " - Media Audio Stream: " + (action.name || action.streamURL), false);
										//SepiaFW.ui.showCustomChatMessage(msg);
										SepiaFW.ui.actions.playAudioURL({
											audio_url: action.streamURL,
											audio_title: action.name || "Audio Stream"
										}, true);
									}, 
									undefined, 10000
								);
							}
						}else if (action.type == "control"){
							//control audio (stop, pause, resume, next, ...)
							if (action.controlAction){
								SepiaFW.ui.showInfo(SepiaFW.local.g('remote_action') + " - Media Control: " + action.controlAction, false);
								SepiaFW.client.controls.media({
									action: action.controlAction
								});
							}
						}else if (action.type == "volume"){
							//control audio volume
							if (action.volumeAction){
								SepiaFW.ui.showInfo(SepiaFW.local.g('remote_action') + " - Volume: " + action.volumeAction.replace("volume;;", ""), false);
								SepiaFW.client.controls.volume({
									action: action.volumeAction
								});
							}
						}else if (action.type == "embedded_player"){
							//embedded media-player
							if (action.playerData){
								if (!action.playerData.data) action.playerData.data = {};
								//wait for opportunity and execute
								SepiaFW.assistant.waitForOpportunitySayLocalTextAndRunAction(
									SepiaFW.account.getUserName() + ", " + SepiaFW.local.g('remote_action_media_player'), 
									function(){
										SepiaFW.ui.showInfo(SepiaFW.local.g('remote_action') + " - Media Player: " 
											+ (action.playerData.data && action.playerData.data.title || action.playerData.url), false);
										var isSafeSource = true;	//it comes from own account
										action.playerData.data.autoplay = true;		//it doesn't really make sense without ;-)
										SepiaFW.ui.cards.addEmbeddedPlayer("chat", action.playerData, isSafeSource);
									}, 
									undefined, 10000
								);
							}
						}else{
							SepiaFW.debug.error("remoteAction - type: media - no support yet for action type: " + action.type);
						}
					}

				//Notification
				}else if (message.data.type === "notify"){
					if (typeof action == "string"){
						//default is assistant text
						action = {
							type: "assistant_message",
							text: action
						}
					}
					SepiaFW.debug.info("remoteAction - notify: " + JSON.stringify(action));

					//user has to be same! (security)
					if (actionUser !== SepiaFW.account.getUserId()){
						SepiaFW.debug.error("remoteAction - tried to use type 'notify' with wrong user");
					}else{
						//handle
						if (action.type == "assistant_message"){
							if (action.text){
								if (!action.language) action.language = SepiaFW.speech.getLanguage();
								action.text = action.text.trim();
								if (!action.text.match(/(!|\?|\.)$/)) action.text = action.text + ".";		//make sure we end with "." (important for some TTS)
								var orgMsg = action.text;
								if (!action.skipIntro){
									action.text = SepiaFW.account.getUserName() + ", " 
										+ SepiaFW.local.g('remote_action_notify', action.language).trim() + " " 
										+ action.text;
								}
								var actionFun = function(){
									SepiaFW.ui.showCustomChatMessage(orgMsg, {
										sender: SepiaFW.local.g("notification"), //SepiaFW.assistant.name,
										//senderType: 'assistant',
										channelId: 'info'
									});
									//NOTE: we can use 'originalSender' for something (see above)
								}
								SepiaFW.assistant.waitForOpportunitySayLocalTextAndRunAction(
									//localizedText, actionFun, fallbackAction, maxWait, speakOptions:
									action.text, function(){
										actionFun();
									}, function(){
										SepiaFW.ui.showInfo(SepiaFW.local.g("notification"), false);
										actionFun();
									}, 15000, {oneTimeLanguage: action.language}
								);
								//use instead? SepiaFW.events.setProActiveBackgroundNotification(action)
								//TODO: add intro text? add notification? add something in the chat!
							}
						}else{
							SepiaFW.debug.error("remoteAction - type: notify - no support yet for action type: " + action.type);
						}
					}
				
				//Unknown
				}else{
					SepiaFW.debug.log("remoteAction - no handler yet for type: " + message.data.type);
				}
			
			//error message
			}else if (message.data.dataType === "errorMessage"){
				//status update
				if (message.textType && message.textType === "status"){
					notAnsweredYet = false;
					var isErrorMessage = true;
					//check error type
					if (message.data && message.data.errorType == "authentication" && message.data.errorCode == 401){	
						//Note: 429 - temp. block is possible too
						//most likely the token expired before it got too old (e.g. overwritten or killed by other client)
						//info message
						var config = {
							buttonOneName : SepiaFW.local.g("ok"),
							buttonOneAction : function(){
								SepiaFW.account.logoutAction(false);
							},
							buttonTwoName : SepiaFW.local.g("abort"),
							buttonTwoAction : function(){},
						};
						SepiaFW.ui.showPopup(SepiaFW.local.g("loginFailedExpired"), config);
					}
					publishStatusMessage(message, username, isErrorMessage);
					if (SepiaFW.ui.moc){
						SepiaFW.ui.moc.showPane(1);
					}
				}
			
			}/*else{
				console.log("msg dataType: " + message.data.dataType);
				console.log("msg data: " + JSON.stringify(message.data));
			}*/
		}
		
		//html - TODO: support special HTML message?
		if (notAnsweredYet && message.html){
			/*
			SepiaFW.ui.insert("sepiaFW-chat-output", message.html);
			SepiaFW.ui.scrollToBottom("sepiaFW-chat-output");
			*/
			SepiaFW.ui.showPopup(
				"The message you've received included raw HTML code. This feature is currently disabled for security reasons! "
				+ "<br>Sender: " + message.sender
			);
		
		//text
		}else if (notAnsweredYet && message.text){
			//status update
			if (message.textType && message.textType === "status"){
				//publish
				publishStatusMessage(message, username);
			
			//chat
			}else{
				//optimize and publish
				Client.optimizeAndPublishChatMessage(message, username);
			}
		}

		//refresh Users?
		if (refreshUsers){
			//build list
			SepiaFW.ui.build.userList(userList, username);
		}

		//log last transmission TS if channel is given
		if (message.channelId){
			//buffer
			lastChannelMessageTimestamps[message.channelId] = new Date().getTime();
			
			//store locally
			if (lastChannelMessageDataStoreTimer) clearTimeout(lastChannelMessageDataStoreTimer);
			lastChannelMessageDataStoreTimer = setTimeout(function(){
				SepiaFW.data.set("lastChannelMessageTimestamps", lastChannelMessageTimestamps);
			}, lastChannelMessageDataStoreDelay);
		}
	}

	//optimize message, e.g. identify deep-links before publish etc. and publish
	Client.optimizeAndPublishChatMessage = function(message, username, customPublishMethod){
		//check if text is a URL and this URL points to a SEPIA deep-link
		var deepLinkInMessage;
		if (message.text && message.text.indexOf(SepiaFW.client.deeplinkHostUrl) == 0){
			//extract first link and shorten original link
			deepLinkInMessage = message.text.replace(/\s.*/,"").trim();
			message.text = message.text.replace(deepLinkInMessage, deepLinkInMessage.substring(0, 49) + "...");
		}

		//add a "today" info block?
		var d = new Date();
		if (message.channelId && (d.getTime() - message.timeUNIX) < 30000){
			var customTag = "weekday-note-" + SepiaFW.tools.getLocalDateWithCustomSeparator("-");
			var $todayNote = $("#sepiaFW-chat-output").find('[data-channel-id=' + message.channelId + ']').filter('[data-msg-custom-tag=' + customTag + ']');
			if ($todayNote.length == 0){
				var weekdayName = SepiaFW.local.getWeekdayName(d.getDay()) + " " + d.toLocaleDateString(SepiaFW.config.appLanguage);
				SepiaFW.ui.showInfo(weekdayName, false, customTag, true, message.channelId);
			}
		}

		//TODO: check for language and set 'oneTimeLanguage'?

		//publish
		var chatMessageEntry;
		if (customPublishMethod){
			chatMessageEntry = customPublishMethod(message, username);
		}else{
			chatMessageEntry = publishChatMessage(message, username);
		}

		//modify?
		if (chatMessageEntry && deepLinkInMessage){
			//Universal Link support
			var buttonTitle1 = "Universal Link";
			var action1 = SepiaFW.offline.getCustomFunctionButtonAction(function(){
				//handle internally
				SepiaFW.client.handleUrlParameterActions(SepiaFW.client.isDemoMode(), deepLinkInMessage);

			}, buttonTitle1);
			var buttonTitle2 = SepiaFW.local.g('show');
			var action2 = SepiaFW.offline.getCustomFunctionButtonAction(function(){
				//Show to copy
				SepiaFW.ui.showPopup(deepLinkInMessage);

			}, buttonTitle2);
			var options = {};
			var deepLinkActionData = {
				actionInfo: [action1, action2]
			};
			var isSafe = true;
			SepiaFW.ui.actions.handle(deepLinkActionData, chatMessageEntry, message.sender, options, isSafe);
		}
	}

	//-- send authentication request
	function sendAuthenticationRequest(){
		SepiaFW.debug.log("WebSocket: authenticating ...");
		//build data
		var data = new Object();
		data.dataType = "authenticate";
		data.deviceId = SepiaFW.config.getDeviceId(); 		//NOTE: this is kind of redundant since it is included as data.parameters.device_id as well
		data = addCredentialsAndParametersToData(data);
		var newId = ("auth" + "-" + ++msgId);
		var msg = buildSocketMessage(username, serverName, "", "", data, "", newId, "");		//note: no channel during auth.
		Client.sendMessage(msg);
	}

	function sendWelcomeData(){
		//userOrDeviceInfo
		//--local and global location
		Client.sendOrRequestDataUpdate("userOrDeviceInfo", {
			deviceLocalSite: SepiaFW.config.getDeviceLocalSiteData(),
			deviceGlobalLocation: SepiaFW.config.getDeviceGlobalLocation()
		});
	}
	
	//-- publish a status message
	function publishStatusMessage(message, username, isErrorMessage){
		var sEntry = SepiaFW.ui.build.statusMessage(message, username, isErrorMessage);
		var resultView = SepiaFW.ui.getResultViewByName("chat");
		var beSilent = !isErrorMessage;
		SepiaFW.ui.addDataToResultView(resultView, sEntry, beSilent);
		//broadcast
		if (isErrorMessage){
			SepiaFW.client.broadcastClientError(message, 0);
		}
	}
	
	//-- publish my-view actions
	function publishMyViewActions(actionsArray, sender, options){
		if (!options) options = {};
		if (options.autoSwitchView == undefined) options.autoSwitchView = true;
		if (options.switchDelay == undefined) options.switchDelay = 1000;
		if (options.beSilent == undefined) options.beSilent = false;

		var aEntry = SepiaFW.ui.build.myViewActionsBlock(actionsArray, sender, options);
		var resultView = SepiaFW.ui.getResultViewByName("myView");
		SepiaFW.ui.addDataToResultView(resultView, aEntry, options.beSilent, options.autoSwitchView, options.switchDelay);
	}
	
	//-- publish message to user with chat-entry, notification and TTS --
	function publishChatMessage(message, username){
		//console.log('MSG: ' + JSON.stringify(message)); 		//debug
		//console.log('OPTIONS: ' + JSON.stringify(Client.getMessageIdOptions(message.msgId))); 		//debug
		var options = Client.getAndRemoveMessageIdOptions(message.msgId);
		if (!options){
			options = {};
		}else{
			if (options.loadOnlyData){
				options.skipTTS = true;
				options.skipText = true;
				options.skipInsert = true;
				options.skipActions = true;
				options.skipLocalNotification = true;
			}
		}
		//console.log('options: ' + JSON.stringify(options));		//DEBUG
		
		var isAssistAnswer = (message.data && message.data.dataType === "assistAnswer");
		var isAssistFollowUp = (message.data && message.data.dataType === "assistFollowUp");
		var messageTextSpeak;
		if (isAssistAnswer || isAssistFollowUp){
			messageTextSpeak = message.data.assistAnswer.answer_clean; 		//note: follow-up is also called 'assistAnswer' .. should have called it 'assistMsg' ^^
		}else{
			messageTextSpeak = message.text;
		}
		if (!messageTextSpeak){
			options.skipTTS = true;
		}
		
		//Chat, actions and cards
		
		//build entry
		var cEntry = SepiaFW.ui.build.chatEntry(message, username, options);
		if (!cEntry){
			SepiaFW.debug.error('Failed to publish chat-entry, data was invalid! ChannelId issue?');
			return;
		}
		//TODO: if we have 'options.loadOnlyData' (or skipInsert etc.) we shouldn't build the whole cEntry :-/ 
		//... currently we need it for events handled in cards though (e.g timer)
		
		//get right view
		var resultView = SepiaFW.ui.getResultViewByName(options.targetView);
		
		//add to view
		if (!options.skipInsert){
			SepiaFW.ui.addDataToResultView(resultView, cEntry);
		}
		//auto-change pane?
		var paneNbr = resultView.paneNumber;
		if (options.showView || (options.targetView && options.targetView === "bigResults")){
			if (SepiaFW.ui.moc) SepiaFW.ui.moc.showPane(paneNbr);
		}
		
		//update my-view?
		if (options.updateMyView){
			setTimeout(function(){
				SepiaFW.ui.updateMyView(true, false, 'chatMessageRequest');
			}, 500);
		}else if (options.updateMyViewTimers){
			setTimeout(function(){
				SepiaFW.ui.updateMyTimers();
			}, 500);
		}else if (options.updateMyViewEvents){
			setTimeout(function(){
				SepiaFW.ui.updateMyContextualEvents();
			}, 500);
		}
		
		//Notification
		if (!options.skipLocalNotification){
			if ($(cEntry).children().not('.chatMe').hasClass('chatPm') && (!SepiaFW.ui.isVisible() || (SepiaFW.ui.getIdleTime() > (5*60*1000)))){
				if (SepiaFW.events){
					var noteData = {
						type: "chat",
						onClickType: "replySender",
						sender: message.sender
					}
					var msgTitle = SepiaFW.webSocket.client.getNameFromUserList(message.sender);
					SepiaFW.events.showSimpleNotification(msgTitle, messageTextSpeak, 'null', noteData);
				}
			}
		}
		
		//Assistant states - TODO: this needs some rework to make it compatible with background commands
		if ((isAssistAnswer || isAssistFollowUp) && !(options.loadOnlyData || options.skipInsert || options.skipText)){
			var returnToIdle;
			if (options.skipTTS || SepiaFW.speech.skipTTS || !SepiaFW.speech.isTtsSupported){
				returnToIdle = true;
			}else{
				returnToIdle = false;
			}
			SepiaFW.assistant.setState(message.data.assistAnswer, returnToIdle);
		
		}else if ((isAssistAnswer || isAssistFollowUp) && options.skipTTS){
			//there will be no trigger for queued commands now, so we have to check it manually
			if (SepiaFW.client.getCommandQueueSize() > 0){
				SepiaFW.animate.assistant.loading();
				var action = SepiaFW.client.getAndRemoveNextCommandInQueue();
				SepiaFW.ui.actions.openCMD(action);
			}
		}
		
		//TTS
		if (!options.skipTTS){
			if (message.senderType === "assistant"){
				SepiaFW.speech.speak(messageTextSpeak, function(){
					//finished - same callback as below
				}, function(){
					//error			
				}, function(){
					//started
				}, {});	
				//TODO: support 'options'
			}
		}else{
			if (message.senderType === "assistant"){
				//finished - same callback as above
			}
		}
		//show results in frame as well? (SHOW ONLY!)
		if (!options.skipInsert && !options.skipText && message.senderType === "assistant" && messageTextSpeak){
			//some exceptions
			if (messageTextSpeak != '<silent>'){
				if (SepiaFW.frames && SepiaFW.frames.isOpen && SepiaFW.frames.canShowChatOutput()){
					SepiaFW.frames.handleChatOutput({
						"text": messageTextSpeak 	//NOTE: this text can be longer than the actual TTS text that gets trimmed sometimes
					});
				}
			}
		}

		return cEntry;
	}

	//handle the updateData channel message
	function handleUpdateRequest(msgData){
		if (msgData.updateData == "availableChannels"){
			if (msgData.data){
				//apply
				SepiaFW.client.refreshChannelList(msgData.data);
				//load set of channels with missed messages
				SepiaFW.client.loadChannelsWithMissedMessages();
			}else{
				//request (includes check for missed messages)
				SepiaFW.client.loadAvailableChannels();
			}
		}else if (msgData.updateData == "missedChannelMessage"){
			//console.log(msgData.data); 		//DEBUG
			if (msgData.data){
				//apply
				msgData.data.forEach(function(info){
					SepiaFW.animate.channels.markChannelEntry(info.channelId);
				});
			}else{
				//request
				//TODO: implement request
			}
		}else{
			SepiaFW.debug.error("Missing handler for message updateData-type: " + JSON.stringify(msgData));
		}
		//TODO: add 'events' refresh request
	}

	//--- WebSocket server clients endpoint ---//

	//Ask server to close all connections of this user or all (if admin rights available)
	Client.refreshClientConnections = function(successCallback, errorCallback, refreshAll){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.webSocketAPI + "refreshClientConnections";
		var dataBody = new Object();
		dataBody.KEY = SepiaFW.account.getKey(sepiaSessionId);
		dataBody.client = SepiaFW.config.getClientDeviceInfo();
		if (refreshAll) dataBody.all = true;	//admins can refresh all connections
		$.ajax({
			url: apiUrl,
			timeout: 8000,
			type: "POST",
			data: JSON.stringify(dataBody),
			headers: {
				"content-type": "application/json",
				"cache-control": "no-cache"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (data.result && data.result === "fail"){
					if (errorCallback) errorCallback(data);
					return;
				}else{
					if (successCallback) successCallback(data.sessionsClosed);
				}
			},
			error: function(err) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback("connection or authentication error");
			}
		});
	}

	//Get connected clients of user from server
	Client.getConnectedUserClients = function(successCallback, errorCallback, includeSharedFor){
		if (SepiaFW.client.isDemoMode()){
			successCallback({clients:[
				{role:"user", name:"Testy", id:"uid202", sessionId:3, isActive:true, deviceId:"test1", info:{
					deviceLocalSite:null, deviceGlobalLocation:null
				}
			}]});
			return;
		}
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.webSocketAPI + "getOwnClientConnections";
		var dataBody = new Object();
		dataBody.KEY = SepiaFW.account.getKey(sepiaSessionId);
		dataBody.client = SepiaFW.config.getClientDeviceInfo();
		if (includeSharedFor) dataBody.includeShared = true;	//TODO: for now we get all shared. Later we can support granular filter.
		$.ajax({
			url: apiUrl,
			timeout: 8000,
			type: "POST",
			data: JSON.stringify(dataBody),
			headers: {
				"content-type": "application/json",
				"cache-control": "no-cache"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (data.result && data.result === "fail"){
					if (errorCallback) errorCallback(data);
					return;
				}
				//--callback--
				if (includeSharedFor && data.clients && data.clients.length){
					//filter shared access using 'sharedAccessInfo'
					var filteredClients = [];
					data.clients.forEach(function(cl){
						//own
						if (!cl.isShared){
							filteredClients.push(cl);
						//shared
						}else if (cl.sharedAccessInfo){
							if (cl.sharedAccessInfo.details){
								//TODO: filter (e.g.: {dataType: "remoteActions", action: "notify", actionType: "assistant_message"})
							}else{
								//no 'details' means all!
								filteredClients.push(cl);
							}
						}
					});
					data.clients = filteredClients;
					//console.error("data", data);	//DEBUG
				}
				if (successCallback) successCallback(data);
			},
			error: function(err) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback("connection or authentication error");
			}
		});
	}
	Client.showConnectedUserClientsAsMenu = function(title, deviceButtonFun, closeAfterPress, includeSharedFor, options){
		if (!options) options = {};
		Client.getConnectedUserClients(function(data){
			if (data.clients && data.clients.length > 0){
				var menu = buildUserDevicesListForAction(data.clients, title, function(deviceInfo){
					if (closeAfterPress) SepiaFW.ui.hidePopup();
					if (deviceButtonFun) deviceButtonFun(deviceInfo);
				}, options.skipOwnDevice);
				SepiaFW.ui.showPopup(menu, {
					buttonOneName: SepiaFW.local.g("abort"),
					buttonOneAction: function(){}
				});
			}else{
				SepiaFW.ui.showPopup(SepiaFW.local.g('no_other_user_clients_found'));
			}
		}, function(err){
			SepiaFW.ui.showPopup(SepiaFW.local.g('error_after_try'));
			SepiaFW.debug.error("Failed to get connected clients - Msg.:", err);
		}, includeSharedFor);
	}
	function buildUserDevicesListForAction(clients, title, deviceButtonFun, skipOwnDevice){
		var menu = document.createElement("div");
		var header = document.createElement("p");
		header.style.fontWeight = "bold";
		header.style.fontSize = "16px";
		header.textContent = title;
		menu.appendChild(header);
		var thisDevice = SepiaFW.config.getDeviceId();
		var devicesAdded = 0;
		clients.forEach(function(cl){
			if (!cl.deviceId) return;	//check 'isActive'?
			var isThisDevice = (!cl.isShared && cl.deviceId == thisDevice);
			if (isThisDevice && skipOwnDevice) return;
			var type = "", name = "", index = "";
			if (cl.info && cl.info.deviceLocalSite && cl.info.deviceLocalSite.type){
				type = cl.info.deviceLocalSite.type || "";
				name = cl.info.deviceLocalSite.name || "";
				index = cl.info.deviceLocalSite.index || "";
			}
			var info;
			if (type == "room"){
				info = (name + " " + index).trim() || "Undefined room";
			}else{
				info = (type + " " + name + " " + index ).replace(/\s+/, " ").trim() 
					|| SepiaFW.local.g("not_defined");
			}
			var sharedName = "";
			if (cl.isShared){
				sharedName = "<span>User: <b>" + cl.name + "</b> (" + cl.id + ") - "
					+ SepiaFW.local.g("deviceId") + ": <b>" + (cl.deviceId) + "</b></span>";
			}else{
				sharedName = "<span>" + SepiaFW.local.g("deviceId") + ": <b>" + (cl.deviceId) + "</b>" 
					+ (isThisDevice? (" (<i>" + SepiaFW.local.g("thisDevice") + "</i>)") : "") + "</span>";
			}
			var device = document.createElement("div");
			device.style.display = "flex";
			device.style.flexDirection = "column";
			device.innerHTML = SepiaFW.tools.sanitizeHtml(
				"<button class='" + (isThisDevice? "same-device" : "") + "'>" 
					+ sharedName + "<br>"
					+ "<span>Info: " + info.replace(/^./, info[0].toUpperCase()) + "</span>" +
				"</button>"
			);
			menu.appendChild(device);
			$(device).on("click", function(){
				deviceButtonFun(cl);
			});
			devicesAdded++;
		});
		if (devicesAdded == 0){
			var noDevicesInfo = document.createElement("p");
			noDevicesInfo.textContent = "- Found no (other) active client devices -";
			menu.appendChild(noDevicesInfo);
		}
		return menu;
	}
	return Client;
}