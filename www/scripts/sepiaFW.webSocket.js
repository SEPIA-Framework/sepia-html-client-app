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
	
	ClientInterface.pauseClient = SepiaFW.webSocket.client.closeConnection;
	ClientInterface.resumeClient = SepiaFW.webSocket.client.instaReconnect;
	
	ClientInterface.isActive = SepiaFW.webSocket.client.isActive;
	ClientInterface.onActive = SepiaFW.webSocket.client.onActive;
	ClientInterface.getActiveChannel = SepiaFW.webSocket.client.getActiveChannel;
	ClientInterface.switchChannel = SepiaFW.webSocket.client.switchChannel;
	ClientInterface.switchChatPartner = SepiaFW.webSocket.client.switchChatPartner;
	ClientInterface.getActiveChatPartner = SepiaFW.webSocket.client.getActiveChatPartner;
	
	ClientInterface.toggleMicButton = SepiaFW.webSocket.client.toggleMicButton;
	ClientInterface.sendInputText = SepiaFW.webSocket.client.sendInputText;
	ClientInterface.sendMessage = SepiaFW.webSocket.client.sendMessage;
	ClientInterface.sendCommand = SepiaFW.webSocket.client.sendCommand;
	ClientInterface.queueCommand = SepiaFW.webSocket.client.queueCommand;
	ClientInterface.getAndRemoveNextCommandInQueue = SepiaFW.webSocket.client.getAndRemoveNextCommandInQueue;
	ClientInterface.clearCommandQueue = SepiaFW.webSocket.client.clearCommandQueue;
	ClientInterface.getCommandQueueSize = SepiaFW.webSocket.client.getCommandQueueSize;
	
	ClientInterface.asrCallbackFinal = SepiaFW.webSocket.client.asrCallbackFinal;
	ClientInterface.asrCallbackInterim = SepiaFW.webSocket.client.asrCallbackInterim;
	ClientInterface.asrErrorCallback = SepiaFW.webSocket.client.asrErrorCallback;
	ClientInterface.asrLogCallback = SepiaFW.webSocket.client.asrLogCallback;
	
	ClientInterface.setMessageIdOptions = SepiaFW.webSocket.client.setMessageIdOptions;
	
	ClientInterface.setDeviceId = SepiaFW.webSocket.client.setDeviceId;
	ClientInterface.getDeviceId = SepiaFW.webSocket.client.getDeviceId;
	
	//states and settings
	ClientInterface.allowBackgroundConnection = true;
	
	//broadcast some events:
	
	//-connection status
	ClientInterface.STATUS_CONNECTING = "status_connecting";
	ClientInterface.STATUS_OPENED = "status_opened";
	ClientInterface.STATUS_CLOSED = "status_closed";
	ClientInterface.STATUS_ERROR = "status_error";
	ClientInterface.broadcastConnectionStatus = function(status){
		switch(status) {
			case ClientInterface.STATUS_CONNECTING:
				$('#sepiaFW-nav-label-online-status').html('Connecting...');
				break;
			case ClientInterface.STATUS_OPENED:
				$('#sepiaFW-nav-label-online-status').html('Online');
				break;
			case ClientInterface.STATUS_CLOSED:
				$('#sepiaFW-nav-label-online-status').html('Offline');
				break;
			case ClientInterface.STATUS_ERROR:
				//ignore for now
				break;
			default:
				//ignore
		}
	}
	
	return ClientInterface;
}

function sepiaFW_build_webSocket_common(){
	var Common = {};
	
	//SocketMessage
	Common.buildSocketMessage = function(sender, receiver, text, html, data, clientType, msgId, channelId){
		//TODO: there is some confusion with ui.build.makeMessageObject - this is what is sent to server
		var msg = new Object();
		var tsUNIX = new Date().getTime();
			
		if (!msgId) msgId = (sender + "-" + SepiaFW.webSocket.client.getNewMessageId());
		msg.msgId = msgId;
		msg.channelId = channelId;
		msg.sender = sender;
		msg.timeUNIX = tsUNIX;
		if (receiver) msg.receiver = receiver;
		if (text) msg.text = text;
		if (html) msg.html = html;
		if (data) msg.data = data;
		if (clientType) msg.clientType = clientType; //this value is currently irrelevant since the value inside data is used
		
		return msg;
	}
	
	return Common;
}

function sepiaFW_build_webSocket_client(){
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
	var activeChatPartner = "";
	var lastActivatedChatPartner = "";
	var activeChannelId = "";			//set on "joinChannel" event
	var lastActivatedChannelId = "";	//last actively chosen channel
	var channelList = [
		{"id" : "openWorld"}
	];
	function pushToChannelList(newId){
		var exists = false;
		$.each(channelList, function(index, entry){
			if (entry.id === newId){
				exists = true;
				return false;
			}
		});
		if (!exists){
			channelList.push({"id":newId});
			return true;
		}else{
			return false;
		}
	}
	var deviceId = "";				//set in settings and freely chosen by user to address his devices directly
	Client.setDeviceId = function(newDeviceId){
		deviceId = newDeviceId;
		SepiaFW.config.broadcastDeviceId(newDeviceId);
	}
	Client.getDeviceId = function(){
		return deviceId;
	}
	//special input commands
	var CMD_SAYTHIS = "saythis";
	Client.inputHasSpecialCommand = function(inputText){
		var regEx = new RegExp('(^' + SepiaFW.assistant.name + ' |^)' + '(' + CMD_SAYTHIS + ') ', "i");
		var checkRes = inputText.match(regEx);
		if (checkRes && checkRes[2]){
			return checkRes[2];
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
	
	//command queue
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
	
	//shortcuts
	var buildSocketMessage = SepiaFW.webSocket.common.buildSocketMessage;
	
	//-------broadcasts-------
	
	var isFirstJoin = true;
	function broadcastChannelJoin(channelId){
		//call onActive when first joining a channel
		if (isFirstJoin){
			isFirstJoin = false;
			Client.onActive();
		}
		
		//update and build channel list
		pushToChannelList(channelId);
		SepiaFW.ui.build.channelList(channelList, activeChannelId);
		
		//set label
		SepiaFW.ui.setLabel((activeChannelId == username)? "" : activeChannelId);
		
		//switch visibility of messages in chat view
		SepiaFW.ui.switchChannelView(channelId);
		
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
	}
	
	function broadcastChatPartnerSwitch(partnerId){
		//removed lock
		if (!partnerId){
			//set channel as label
			SepiaFW.ui.setLabel((activeChannelId == username)? "" : activeChannelId);
			
		//set lock
		}else{
			//set user as label
			SepiaFW.ui.setLabel(Client.getNameFromUserList(partnerId));
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
				if (!failOfflineCallback) failOfflineCallback = SepiaFW.ui.showPopup(SepiaFW.local.g('noConnectionToNetwork'), getTryAgainPopupConfigAfterConnectionFail());
				Client.checkNetwork(failCallback, failOfflineCallback);
			}
		});
	}
	//check network
	Client.checkNetwork = function(successCallback, failCallback){
		SepiaFW.ui.showLoader(true);
		$.ajax({
			url: ("https://maps.googleapis.com/maps/api/geocode/json"),
			timeout: 1500,
			method: "HEAD",
			success: function(data) {
				SepiaFW.ui.hideLoader();
				//console.log('success');		console.log('status: ' + data.status);
				if (successCallback) successCallback(data);
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				if (data && data.status >= 100){
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
			
		//refresh timers
		if (SepiaFW.events){
			SepiaFW.events.setupTimeEvents();
		}
		
		//update myView
		SepiaFW.ui.updateMyView(false, true);
	}
	
	//execute when UI is ready and user is logged in (usually)
	Client.startClient = function(){
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
		
		//ADD welcome stuff? - TODO: what if this is offline mode or unreachable server?
		Client.welcomeActions(true);
	}
	
	//when client started add some info like first-visit messages or buttons
	Client.welcomeActions = function(onlyOffline){
		if (SepiaFW.account.getClientFirstVisit()){
			var sender = "UI";
			var options = { 
				autoSwitchView: true,
				switchDelay: 1000
			}
			var actionsArray = [];
			actionsArray.push({type: "fist_visit_info_start"});
			actionsArray.push(SepiaFW.offline.getFrameViewButtonAction("license.html", SepiaFW.local.g("license")));
			actionsArray.push(SepiaFW.offline.getFrameViewButtonAction("tutorial.html", SepiaFW.local.g("tutorial")));
			actionsArray.push(SepiaFW.offline.getUrlButtonAction("https://github.com/SEPIA-Framework/sepia-docs/wiki", "S.E.P.I.A. Wiki"));
			if (!onlyOffline){
				actionsArray.push(SepiaFW.offline.getHelpButtonAction()); 		//TODO: this will only onActive
			}
			if (SepiaFW.account.getUserId()){
				actionsArray.push({type: "button_custom_fun", title: SepiaFW.local.g('dontShowAgain'), fun: function(){
					SepiaFW.account.setClientFirstVisit(false);
					$('#sepiaFW-myFirstStart-buttons').closest('.chatMsg').fadeOut(300);
				}});
			}
			publishMyViewActions(actionsArray, sender, options);
		}
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
		var channelCustomInput = document.getElementById("sepiaFW-custom-channel-input");
		var channelCustomInputButton = document.getElementById("sepiaFW-custom-channel-connect");
		function addToChannelList(){
			var newChannel = $(channelCustomInput).val();
			if (newChannel){
				if (pushToChannelList(newChannel)){
					SepiaFW.ui.build.channelList(channelList, activeChannelId);
				}
				$(channelCustomInput).val("");
			}
		}
		$(channelCustomInput).off().on("keypress", function(e){
			if (e.keyCode === 13){
				//Return-Key
				addToChannelList();
			}
		});
		$(channelCustomInputButton).off().on("click", function(){
			addToChannelList();
		});
		
		//CHAT CONTROLS
		
		//chat controls more menue
		var chatMenuBtn = document.getElementById("sepiaFW-chat-controls-more-btn");
		if (chatMenuBtn){
			function closeControlsMenueWithDelay(){
				setTimeout(function(){
					if ($("#sepiaFW-chat-controls-more-menu").css('display') != 'none'){
						$('#sepiaFW-chat-controls-more-btn').trigger('click', { bm_force : true });
					}
				}, 750);
			}
			
			//-screen size
			var screenBtn = document.getElementById("sepiaFW-fullsize-btn");
			if (screenBtn){
				$(screenBtn).off();
				/*$(screenBtn).on("click", function () {
					SepiaFW.ui.toggleInterfaceFullscreen();
				});*/
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
				$(backBtn).on("click", function () {
					SepiaFW.ui.backButtonAction();
				});
			}
			//-teachUi
			var teachUiBtn = document.getElementById("sepiaFW-teachUI-open");
			if (teachUiBtn){
				$(teachUiBtn).off();
				$(teachUiBtn).on("click", function () {
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
				$(saythisBtn).on("click", function () {
					closeControlsMenueWithDelay();
					var inp = document.getElementById("sepiaFW-chat-input");
					inp.value = SepiaFW.assistant.name + ' ' + CMD_SAYTHIS + ' ';
					inp.focus();
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
						options.targetView = "chat";
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
						options.targetView = "chat";
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
			//-alarms
			var alarmsBtn = document.getElementById("sepiaFW-shortcut-btn-alarm");
			if (alarmsBtn){
				$(alarmsBtn).off();
				$(alarmsBtn).on("click", function () {
					SepiaFW.animate.flash(this.id);
					var options = {};
						//options.skipText = true;
						options.targetView = "chat";
						options.showView = true;
						options.skipTTS = true;
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "timer;;action=<show>;;alarm_type=<timer>;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					Client.sendCommand(dataset, options);
					//TODO: if voice is on we need to wait here or skip actively (better skip)
					var dataset2 = {};	dataset2.info = "direct_cmd";
						dataset2.cmd = "timer;;action=<show>;;alarm_type=<alarmClock>;;";
						dataset2.newReceiver = SepiaFW.assistant.id;
					Client.sendCommand(dataset2, options);
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
					var dataset = {};	dataset.info = "direct_cmd";
						dataset.cmd = "events_personal;;";
						dataset.newReceiver = SepiaFW.assistant.id;
					var options = {};
						options.skipText = true;
						options.targetView = "myView";
						options.showView = true;
						options.skipTTS = true;
					Client.sendCommand(dataset, options);
					closeControlsMenueWithDelay();
				});
			}
			//-cordova inApp browser			
			var inAppBrowserBtn = document.getElementById("sepiaFW-shortcut-btn-inAppBrowser");
			if (inAppBrowserBtn){
				if (SepiaFW.ui.isCordova){
					$(inAppBrowserBtn).off();
					$(inAppBrowserBtn).on("click", function () {
						var inAppBrowserOptions = 'location=yes,toolbar=yes,mediaPlaybackRequiresUserAction=yes,allowInlineMediaPlayback=yes,hardwareback=yes,disableswipenavigation=no,clearsessioncache=no,clearcache=no';
						cordova.InAppBrowser.open("<inappbrowser-last>", '_blank', inAppBrowserOptions);	//also valid: <inappbrowser-home>
						closeControlsMenueWithDelay();
					});
				}else{
					$(inAppBrowserBtn).hide();
					/*
					$(inAppBrowserBtn).on("click", function () {
						window.open("search.html", '_blank');
						closeControlsMenueWithDelay();
					});
					*/
				}
			}
		}
	}
	//MIC CONTROLS
	Client.asrCallbackFinal = function(text){
		//text optimizations
		var textRaw = text;
		if (optimizeAsrResult && (SepiaFW.speech.language === "de") && text && text.match(/^(GTA|GPA|PPA|WPA|dpa|liebherr)( ).+/ig)){
			text = text.replace(/^(GTA|GPA|PPA|WPA|dpa|liebherr)( )/i, "Sepia ");
		}
		
		//try speech-bubble
		var inBox =	document.getElementById('sepiaFW-chat-controls-speech-box-bubble');
		if (inBox){
			if (text){
				inBox.innerHTML = text;
			}else if (textRaw){
				inBox.innerHTML = textRaw;
			}
			SepiaFW.client.sendInputText();
		//try default text input field
		}else{
			var inBox =	document.getElementById("sepiaFW-chat-input");
			if (inBox){ 
				if (text){
					inBox.value = text;
				}else if (textRaw){
					inBox.value = textRaw;
				}
				SepiaFW.client.sendInputText();
			}
		}
	}
	Client.asrCallbackInterim = function(text){
		//try speech-bubble
		var inBox =	document.getElementById('sepiaFW-chat-controls-speech-box-bubble');
		if (inBox){
			if (text){
				inBox.innerHTML = text;
			}
		//try default text input field
		}else{
			var textRaw = text;
			inBox = $('#sepiaFW-chat-input');
			if (inBox.length > 0){
				var maxWidth = inBox.innerWidth();
				if (text.length*7.5 > maxWidth) {
					//cut text to fit in input
					text = text.slice(-1 * Math.floor(maxWidth / 7.5));
				}
				if (text){
					inBox[0].value = text;
				}else if (textRaw){
					inBox[0].value = textRaw;
				}
			}
		}
	}
	Client.asrErrorCallback = function(error){
		SepiaFW.debug.err("UI-ASR: " + error);
	}
	Client.asrLogCallback = function(msg){
		SepiaFW.debug.info("UI-ASR: " + msg);
	}
	
	//add credentials and parameters
	function addCredentialsAndParametersToData(data){
		//NOTE: compare to 'Assistant.getParametersForActionCall'
		
		if (SepiaFW.account.getUserId() && SepiaFW.account.getToken()){
			//use "safe" field: credentials
			data.credentials = new Object();
			data.credentials.userId = SepiaFW.account.getUserId();
			data.credentials.pwd = SepiaFW.account.getToken();
		}
		data.parameters = SepiaFW.assistant.getState();
		data.parameters.client = SepiaFW.config.clientInfo;
		
		return data;
	}

	//connect by creating the webSocket
	Client.connect = function(uri, onConnectedCallback){
		tryReconnect = true;
		clearTimeout(reconTimer);
		
		if (isConnecting){
			SepiaFW.debug.log("WebSocket: already connecting!");
			return;
		}
		
		SepiaFW.debug.log("WebSocket: connecting ...");
		connectAttempts++;
		isConnecting = true;
		SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_CONNECTING);

		webSocket = new WebSocket(uri);
		
		webSocket.onmessage = function (msg) {
			Client.handleMessage(msg); 
		};

		webSocket.onclose = function () {
			SepiaFW.debug.log("WebSocket: connection closed or lost");
			connectionIsOpen = false;
			isConnecting = false;
			username = "";
			activeChannelId = "";
			activeChatPartner = "";
			SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_CLOSED);
			Client.handleCloseEvent();
		};

		webSocket.onopen = function () { 
			SepiaFW.debug.log("WebSocket: connection open");
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

		webSocket.onerror = function (error) { 
			SepiaFW.debug.err("WebSocket: " + error);
			console.log(error);
			SepiaFW.client.broadcastConnectionStatus(SepiaFW.client.STATUS_ERROR);
			//TODO: does error mean connection lost?
		};
	}

	//close connection
	Client.closeConnection = function(){
		//TODO: consider tryReconnect here. When force close set it in the calling function.
		tryReconnect = false;
		webSocket.close();
	}
	
	//reconnect on close
	var reconTimer;
	Client.handleCloseEvent = function(){
		clearTimeout(reconTimer);
		var nextWaitDuration = Math.min(reconnectMaxWait, (connectAttempts * connectAttempts * nextReconnect));
		if (tryReconnect && !neverReconnect){
			reconTimer = setTimeout(function(){ 
				Client.connect(SepiaFW.config.webSocketURI);
			}, nextWaitDuration);
		}
	}
	//instant reconnect
	Client.instaReconnect = function(){
		clearTimeout(reconTimer);
		connectAttempts = 0;
		if (!neverReconnect && !connectionIsOpen){
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
			sendInputTimeout = setTimeout(Client.sendInputText, 500);
			return;
		}
		clearTimeout(sendInputTimeout);
		//prep text
		var text = inputText || document.getElementById("sepiaFW-chat-controls-speech-box-bubble").innerHTML || document.getElementById("sepiaFW-chat-input").value;
		if (text && text.trim()){
			text = text.trim();
			SepiaFW.ui.lastInput = text;
			var receiver = "";
			var msg;
			//manual receiver overwrite
			if (text.substring(0, 1) === "@" && (text.indexOf(" ") > 0)){
				var res = text.split(" ");
				var possibleReceivers = Client.getUserId(res[0].substring(1, res[0].length));
				if (possibleReceivers.length > 0){
					//console.log(possibleReceivers); 		//DEBUG
					//TODO: since names are not unique but chosen by users it can happen that we get the same name multiple times here ... what then?
					receiver = possibleReceivers[0];
				}
				res.shift();
				text = res.join(" ");
			
			//locked receiver overwrite
			}else if (activeChatPartner && !Client.inputHasSpecialCommand(text)){
				//console.log('send to: ' + activeChatPartner);
				receiver = activeChatPartner;
			}
			
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
			var newId = (username + "-" + ++msgId);
			msg = buildSocketMessage(username, receiver, text, "", data, "", newId, activeChannelId);

			//SepiaFW.debug.info(JSON.stringify(msg));
			Client.sendMessage(msg);
			
			//check if there is actually someone to listen :-)
			if (!userList || userList.length <= 1){
				SepiaFW.ui.showInfo(SepiaFW.local.g('nobodyThere'));
			}
		}
		//reset all possible text fields
		clearInputText();
	}
	function clearInputText(){
		//reset all possible text fields
		var inputField = document.getElementById("sepiaFW-chat-input");
		if (inputField) inputField.value = "";
		var speechBubble = document.getElementById("sepiaFW-chat-controls-speech-box-bubble");
		if (speechBubble) speechBubble.innerHTML = "";
	}
	
	Client.getUserId = function(nameOrId){
		var receivers = [];
		if (nameOrId){
			$.each(userList, function(index, u){
				if (nameOrId.toLowerCase() === u.name.toLowerCase() || nameOrId.toLowerCase() === u.id.toLowerCase()){
					receivers.push(userList[index].id);
				}
			});
		}
		return receivers;
	}
	Client.getNameFromUserList = function(id){
		var name = "";
		if (id){
			$.each(userList, function(index, u){
				if (id.toLowerCase() === u.id.toLowerCase()){
					name = userList[index].name;
					return false;
				}
			});
		}
		return name;
	}

	//Send a message if it's not empty
	var sendFailedInRow = 0;
	Client.sendMessage = function(message, retryNumber){
		if (!retryNumber) retryNumber = 0;
		if (message){
			if (isConnecting || !connectionIsOpen){
				handleSendMessageFail(message, retryNumber, SepiaFW.local.g('stillConnecting'), (sendFailedInRow>3), false);
				return;
			
			}else if (!activeChannelId){
				//TODO: we can add offline modus here
				
				//check auth. status, but only if this message itselve is not an auth. or join channel request
				if (!message.data || !(message.data.dataType === "authenticate" || message.data.dataType === "joinChannel")){
					handleSendMessageFail(message, retryNumber, SepiaFW.local.g('noConnectionOrNoCredentials'), true, true);
					return;
				}
			}
			webSocket.send(JSON.stringify(message));
			//console.log('MSG: ' + JSON.stringify(message)); 		//DEBUG
			sendFailedInRow = 0;
		}
	}
	function refreshDataAndRetrySendMessage(message, nextRetryNumber){
		//we need to refresh activeChannelId and activeChatPartner of 'message' (message.channelId, message.receiver) here
		if ((activeChannelId && !lastActivatedChannelId) || (lastActivatedChannelId && (lastActivatedChannelId == activeChannelId))){
			message.channelId = activeChannelId;
		}
		if ((activeChatPartner && !lastActivatedChatPartner) || (lastActivatedChatPartner && (lastActivatedChatPartner == activeChatPartner))){
			message.receiver = activeChatPartner;
		}
		Client.sendMessage(message, nextRetryNumber);
	}
	function handleSendMessageFail(message, retryNumber, note, showReloadOption, showLoginOption){
		sendFailedInRow++;
		if (!isConnecting && !connectionIsOpen){
			//try to reconnect
			setTimeout(function(){
				Client.instaReconnect();
			}, 30000);
		}
		if (retryNumber <= 1){
			setTimeout(function(){
				refreshDataAndRetrySendMessage(message, ++retryNumber);
			}, 1500);
		}else{
			var config = {
				buttonOneName : SepiaFW.local.g('tryAgain'),
				buttonOneAction : function(){
					refreshDataAndRetrySendMessage(message, 0);
				},
				buttonFourName : SepiaFW.local.g('forget'),
				buttonFourAction : function(){}
			}
			if (showReloadOption){
				config.buttonTwoName = SepiaFW.local.g('reload');
				config.buttonTwoAction = function(){
					location.reload();
				}
			}
			if (showLoginOption){
				config.buttonThreeName = SepiaFW.local.g('sendLogin');
				config.buttonThreeAction = function(){
					SepiaFW.account.afterLogout = function(){
						location.reload();
					}
					SepiaFW.account.logoutAction();
				}
			}
			SepiaFW.ui.showPopup(note, config);
		}
	}
	
	//Send a command (usually triggered by an action received)
	Client.sendCommand = function(dataset, options){
		var data = new Object();
		var isDirectCmd = false;
		if (dataset.info && dataset.info === "direct_cmd"){
			data.dataType = 'directCmd';
			isDirectCmd = true;
		}
		var cmd = dataset.cmd;
		//the sender becomes the receiver - This workds because dataset is usually an 
		//action received from the assistant ... but it is kind of inconsistent with the rest :-(
		var receiver = dataset.newReceiver || dataset.sender || ''; 	//we use newReceiver to fix the inconsistency (a bit)
		//TODO: handle options in dataset?
		if (dataset.options){
			$.each(options, function(key, value){
				dataset.options[key] = value;
			});
			options = dataset.options;
			//console.log("options " + JSON.stringify(dataset.options));
		}
		data = addCredentialsAndParametersToData(data);
		if (isDirectCmd){
			//SepiaFW.assistant.setDirectCmd();
			data.parameters.input_type = "direct_cmd"; //switch state temporary only for this command
		}
		var newId = (username + "-" + ++msgId);
		var msg = buildSocketMessage(username, receiver, cmd, "", data, "", newId, activeChannelId);
		//console.log('CMD: ' + JSON.stringify(msg)); 		//DEBUG
		if (options && Object.keys(options).length !== 0){
			Client.setMessageIdOptions(newId, options);
		}
		Client.sendMessage(msg);
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
		var receiver = serverName;
		var newId = (username + "-" + ++msgId);
		var msg = buildSocketMessage(username, receiver, "", "", data, "", newId, "");
		Client.sendMessage(msg);
		//note: activeChannelId and activeChatPartner remain active until channel join is broadcasted
	}
	Client.getActiveChannel = function(){
		return activeChannelId;
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
	
	Client.switchChatPartner = function(partnerId){
		if (!partnerId){
			lastActivatedChatPartner = "";
			activeChatPartner = "";
			SepiaFW.debug.log("WebSocket: removed private chat partner lock.");
			broadcastChatPartnerSwitch('');
			return;
		}
		//check if ID is in current channel
		if (Client.hasChannelUser(partnerId)){
			SepiaFW.debug.log("WebSocket: switched chat partner to: " + partnerId);
			lastActivatedChatPartner = partnerId;
			activeChatPartner = partnerId;
			broadcastChatPartnerSwitch(partnerId);
		}
	}
	Client.getActiveChatPartner = function(){
		return activeChatPartner;
	}
	
	//Update the chat-panel, and the list of connected users
	Client.handleMessage = function(msg) {
		var message = JSON.parse(msg.data);
		var refreshUsers = false;
		var notAnsweredYet = true;
		
		//console.log(msg);
		//console.log(message);
		
		//userList submitted?
		if (message.userList){
			userList = message.userList;
			refreshUsers = true;
			
			//check userList for assistants
			if (userList){
				$.each(userList, function(index, entry){
					if (entry.role && entry.role == "assistant"){
						SepiaFW.assistant.updateInfo(entry.id, entry.name);
					}
				});
			}
		}
		
		//data
		if (message.data){
			
			//authenticate
			if (message.sender === serverName && message.data.dataType === "authenticate"){
				//send credentials and then wait until the server sends channel info
				SepiaFW.debug.log("WebSocket: authenticating ...");
				var data = new Object();
				data.dataType = "authenticate";
				data.deviceId = deviceId;
				data = addCredentialsAndParametersToData(data);
				var newId = ("auth" + "-" + ++msgId);
				var msg = buildSocketMessage(username, serverName, "", "", data, "", newId, "");		//note: no channel during auth.
				Client.sendMessage(msg);

				/*
				if ('isAuthenticated' in message.data){
					var userIsAuthenticated = message.data.isAuthenticated;
					if (!userIsAuthenticated || userIsAuthenticated === "false"){
						var statusMessage = SepiaFW.ui.build.makeMessageObject(SepiaFW.local.g('noConnectionToAssistant'), "Server", "assistant", username);
						statusMessage.textType = "status";
						publishStatusMessage(statusMessage, username);
					}
				}
				*/
				
			//get channel-join confirmation of server
			}else if (message.sender === serverName && message.data.dataType === "joinChannel"){
				activeChannelId = message.data.channelId;
				//var givenName = message.data.givenName; 		//might be useful
				SepiaFW.debug.log("WebSocket: switched channel to: " + message.data.channelId);
				
				//re-build channel list - TODO: improve!
				//var channelList = ???
				
				//broadcastChannelJoin(activeChannelId);  //moved to welcome message so that we can update userList first
				
			//get welcome message after channel-join
			}else if (message.sender === serverName && message.data.dataType === "welcome"){
				
				broadcastChannelJoin(activeChannelId);
				
			
			//assistant answer
			}else if (message.data.dataType === "assistAnswer"){
				publishChatMessage(message, username);
				notAnsweredYet = false;
			
			//direct command
			}else if (message.data.dataType === "directCmd"){
				//TODO: do nothing? why would the UI get a direct command ... hmm wait a minute ... >:-)
				notAnsweredYet = false;
			
			//remoteAction
			}else if (message.data.dataType === "remoteAction"){
				
				//HOTKEY
				if (message.data.type && (message.data.type === "hotkey")){
					var actionUser = message.data.user;
					var action = JSON.parse(message.data.action);
					SepiaFW.debug.info("remoteAction - hotkey: " + action.key + ", language: " + action.language);
					
					var sEntry = SepiaFW.ui.build.statusMessage(message, username);
					SepiaFW.ui.insertEle("sepiaFW-chat-output", sEntry);
					SepiaFW.ui.scrollToBottom("sepiaFW-chat-output");
					notAnsweredYet = false;
					
					//activate microphone for this user
					if (actionUser === SepiaFW.account.getUserId()){
						if (action.key === "F4"){
							SepiaFW.ui.toggleMicButton(true);
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
			SepiaFW.ui.insert("sepiaFW-chat-output", message.html);
			SepiaFW.ui.scrollToBottom("sepiaFW-chat-output");
		
		//text
		}else if (notAnsweredYet && message.text){
			//status update
			if (message.textType && message.textType === "status"){
				publishStatusMessage(message, username);
			
			//chat
			}else{
				publishChatMessage(message, username);
			}
		}

		//refresh Users?
		if (refreshUsers){
			//build list
			SepiaFW.ui.build.userList(userList, username);
		}
	}
	
	//-- publish a status message
	function publishStatusMessage(message, username, isErrorMessage){
		var sEntry = SepiaFW.ui.build.statusMessage(message, username, isErrorMessage);
		var resultView = SepiaFW.ui.getResultViewByName("chat");
		var beSilent = !isErrorMessage;
		SepiaFW.ui.addDataToResultView(resultView, sEntry, beSilent);
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
				options.skipInsert = true;
				options.skipActions = true;
				options.skipLocalNotification = true;
			}
		}
		//console.log('options: ' + JSON.stringify(options));		//DEBUG
		
		var isAssistAnswer = (message.data && message.data.dataType === "assistAnswer");
		var messageTextSpeak = (isAssistAnswer)? message.data.assistAnswer.answer_clean : message.text;
		if (!messageTextSpeak){
			options.skipTTS = true;
		}
		
		//Chat, actions and cards
		
		//build entry
		var cEntry = SepiaFW.ui.build.chatEntry(message, username, options);
		
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
				SepiaFW.ui.updateMyView(true);
			}, 500);
		}
		
		//Notification
		if (!options.skipLocalNotification){
			if ($(cEntry).children().not('.chatMe').hasClass('chatPm') && (!SepiaFW.ui.isVisible() || (SepiaFW.ui.getIdleTime() > (5*60*1000)))){
				if (SepiaFW.events){
					var noteData = {
						onClickType : "replySender",
						sender : message.sender
					}
					var msgTitle = SepiaFW.webSocket.client.getNameFromUserList(message.sender);
					SepiaFW.events.showSimpleNotification(msgTitle, messageTextSpeak, 'null', noteData);
				}
			}
		}
		
		//Assistant states - TODO: this needs some rework to make it compatible with background commands 
		if (isAssistAnswer && !(options.loadOnlyData || options.skipInsert || options.skipText)){
			var returnToIdle;
			if (options.skipTTS || !SepiaFW.speech || SepiaFW.speech.skipTTS || !SepiaFW.speech.isTtsSupported){
				returnToIdle = true;
			}else{
				returnToIdle = false;
			}
			SepiaFW.assistant.setState(message.data.assistAnswer, returnToIdle);
		
		}else if (isAssistAnswer && options.skipTTS){
			//there will be no trigger for queued commands now, so we have to check it manually
			if (SepiaFW.ui.actions && SepiaFW.client.getCommandQueueSize() > 0){
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
				},function(){
					//error			
				});
			}
		}else{
			if (message.senderType === "assistant"){
				//finished - same callback as above
			}
		}
	}
	
	return Client;
}