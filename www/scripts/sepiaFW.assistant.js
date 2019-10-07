//ASSISTANT
function sepiaFW_build_assistant(){
	var Assistant = {};
	
	//some global settings
	Assistant.name = "Sepia"; 	//this should be received from server to prevent confusion with Usernames
	Assistant.id = ""; 			//this should be received from server because it works as receiver for action-commands (buttons etc.)
	Assistant.deviceId = "";

	//control settings
	Assistant.autoCloseAwaitDialog = true;
	Assistant.autoCloseAwaitDialogDelay = 15000; 	//15s
	var autoCloseAwaitDialogTimer;
	
	//set assistant info received from server
	Assistant.updateInfo = function(info){
		if (info.id){
			if (info.id != Assistant.id){
				Assistant.id = info.id;
				if (info.name){ 
					Assistant.name = info.name;
				}else{
					Assistant.name = "Unknown";
					SepiaFW.debug.err("Assistant: missing name for ID '" + info.id + "'!");
				}
				if (info.deviceId){
					Assistant.deviceId = info.deviceId;
				}
				//Update my-view events
				SepiaFW.ui.updateMyView(true, false, 'assistantInfoUpdate');

				//Add to contacts-from-chat if possible
				if (SepiaFW.account && SepiaFW.account.contacts){
					SepiaFW.account.contacts.addContactFromChat({
						id: Assistant.id,
						name: Assistant.name
					});
				}
			}
		}
		SepiaFW.debug.log("Assistant: active assistant is '" + info.name + "' (" + info.id + ")");
	}
	
	Assistant.isProActive = false;	//will send entertaining notifications and stuff?

	//primary
	var mood = 6;
	var moodState = 0;		//0 - neutral, 1 - happy, 2 - sad
	var context = "default";
	
	//dialog
	var last_command = '';
	var last_command_N = 0;
	var input_type = "question";
	var input_miss = "";
	var dialog_stage = 0;
	
	//other
	var user_location = ""; //new: JSON, old: "<city>Berlin City<latitude>52.518616<longitude>13.404636";
	Assistant.setUserLocation = function(addressResult){
		var location = {
			country : addressResult.country,
			city : addressResult.city,
			area_state : addressResult.area_state,
			code : addressResult.code,
			street : addressResult.street,
			s_nbr : addressResult.s_nbr,
			latitude : SepiaFW.tools.round5(addressResult.latitude),
			longitude : SepiaFW.tools.round5(addressResult.longitude)
		};
		user_location = location; //JSON.stringify(location);
	}
	
	//internal
	Assistant.lastInteractionTS = 0;
	Assistant.isWaitingForDialog = false;
	
	//broadcasting of events

	function broadcastAwaitDialog(){
		//EXAMPLE:
		SepiaFW.animate.assistant.awaitDialog(); 		
		//Note: possible follow-up actions moved to 'animate.assistant.awaitDialog' function (since it can be triggered from elsewhere too)
	}
	function broadcastDialogFinished(returnToIdle){
		//EXAMPLE:
		if (returnToIdle){
			SepiaFW.animate.assistant.idle('dialogFinished');
		}
	}
	function broadcastDialogTimeout(){
		//EXAMPLE:
		SepiaFW.animate.assistant.idle('dialogTimeout');
	}
	
	//set direct command
	Assistant.setDirectCmd = function(){
		input_type = "direct_cmd";
	}
	
	//get current state
	Assistant.getState = function(){
		var State = new Object();
		var now = new Date().getTime();
		var isOld = (now - lastGetState) > getStateIsOldTime;
		
		State.time = now;
		State.time_local = SepiaFW.tools.getLocalDateTime(); 
		State.lang = SepiaFW.config.appLanguage;
		State.user_location = user_location;

		State.mood = mood;
		State.moodState = moodState; 	//for the UI only (til now)
		State.context = context;
		State.env = SepiaFW.config.environment;
		State.device_id = SepiaFW.config.getDeviceId();
		
		State.last_cmd = (isOld)? '' : last_command;			//TODO: use SepiaFW.ui.getIdleTime() to clear this?
		State.last_cmd_N = (isOld)? 0 : last_command_N;
		State.input_type = input_type;
		State.input_miss = input_miss;
		State.dialog_stage = dialog_stage;

		//custom data
		var cd = {
			defaultMusicApp: SepiaFW.config.getDefaultMusicApp(),
			recentPAE: ((SepiaFW.events)? SepiaFW.events.getRecentProActiveEventsReduced() : ""),
			embeddedPlayers: SepiaFW.ui.cards.getSupportedWebPlayers()
		};
		State.custom_data = JSON.stringify(cd);

		lastGetState = now;
		return State;
	}
	var lastGetState = 0;
	var getStateIsOldTime = 60000;
	
	//evaluate result and store states
	Assistant.setState = function(result, returnToIdle){
		//set state only when the message was intended for this user - TODO: rethink this
		if (SepiaFW.account && (SepiaFW.account.getUserId() !== result.more.user)){
			return;
		}

		//reset auto-close timer
		if (Assistant.autoCloseAwaitDialog){
			if (autoCloseAwaitDialogTimer){
				clearTimeout(autoCloseAwaitDialogTimer);
			}
		}
			
		//handle mood
		if (result.more.mood){
			var tmp_mood = parseInt(result.more.mood);		//is that still necessary?
			if (!isNaN(tmp_mood)){
				mood = tmp_mood;
				//set moodState
				if (mood<3 && mood!=-1){
					moodState = 2;
				}else if (mood>7 && mood!=-1){
					moodState = 1;
				}else{
					moodState = 0;
				}
			}
		}
		//handle context
		if (result.more.context){
			context = result.more.context;
		}else{
			context = "default";
		}
		//handle last command
		if (result.more.cmd_summary && result.more.cmd_summary != ""){
			if (last_command === result.more.cmd_summary){
				last_command_N++;
			}else{
				last_command_N = 0;
			}
			last_command = result.more.cmd_summary;
		}else{
			last_command = "";
			last_command_N = 0;
		}
		//handle response type and dialogue sequence
		if (result.response_type != undefined && (result.response_type != "" || result.response_type != "info")){
			//question
			if (result.response_type == "question"){
				input_type = "response";
				//get missing input and dialog stage
				if (result.input_miss){
					input_miss = result.input_miss;
				}else{
					input_miss = "";
				}
				if (result.dialog_stage){
					dialog_stage = result.dialog_stage;
				}else{
					dialog_stage = 0;
				}
				//broadcast
				Assistant.isWaitingForDialog = true;
				broadcastAwaitDialog();

				//activate auto-close timer?
				if (Assistant.autoCloseAwaitDialog){
					autoCloseAwaitDialogTimer = setTimeout(function(){
						input_type = "question";
						input_miss = "";
						dialog_stage = 0;
						last_command = '';
						last_command_N = 0;
						//broadcast
						Assistant.isWaitingForDialog = false;
						broadcastDialogTimeout();
					}, Assistant.autoCloseAwaitDialogDelay);
				}
			}
		}else{
			input_type = "question";
			input_miss = "";
			dialog_stage = 0;
			//broadcast
			Assistant.isWaitingForDialog = false;
			broadcastDialogFinished(returnToIdle);
		}
		
		//time stamp last feedback to handle answer to questions 
		Assistant.lastInteractionTS = new Date().getTime();
	}
	
	//reset state
	Assistant.resetState = function(){
		input_type = "question";
		input_miss = "";
		dialog_stage = 0;
		last_command = '';
		last_command_N = 0;
		//broadcast
		Assistant.isWaitingForDialog = false;
		broadcastDialogFinished(true);
	}

	//------------------ SOME METHODS TO ENGAGE USER ------------------

	/**
	 * Wait for the right opportunity (e.g. idle time) and let the assistant say a text
	 * loaded from server.
	 */
	Assistant.waitForOpportunityAndSay = function(dialogTagOrText, fallbackAction, minWait, maxWait, doneCallback){
		if (!minWait) minWait = 2000;
		if (!maxWait) maxWait = 30000;
		if (!dialogTagOrText) dialogTagOrText = "<error_client_control_0a>";
		SepiaFW.client.queueIdleTimeEvent(function(){
			var options = {};   //things like skipTTS etc. (see sendCommand function)
			var dataset = {
				info: "direct_cmd",
				cmd: "chat;;reply=" + dialogTagOrText + ";;",
				newReceiver: SepiaFW.assistant.id
			};
			SepiaFW.client.sendCommand(dataset, options);
			if (doneCallback) doneCallback();
		}, minWait, maxWait, function(){
			//Fallback, e.g.: SepiaFW.ui.showInfo(SepiaFW.local.g('no_client_support'));
			if (fallbackAction) fallbackAction();
		});
	}
	
	//------------------- SOME BASIC COMMUNICATION METHODS ---------------------
	
	//parameters for e.g. interpret, answer, events, ..?
	Assistant.getParametersForActionCall = function(){
		var parameters = SepiaFW.assistant.getState();
		
		//get credentials
		var userId = SepiaFW.account.getUserId();
		var pwd = SepiaFW.account.getToken();
		parameters.KEY = userId + ";" + pwd;
		parameters.client = SepiaFW.config.getClientDeviceInfo(); //SepiaFW.config.clientInfo;
		
		return parameters;
	}
	
	//Abstract SepiaFW API call
	Assistant.abstractApiCall = function(apiUrl, parameters, successCallback, errorCallback, maxWait){
		SepiaFW.ui.showLoader();
		//SepiaFW.debug.info('URL: ' + apiUrl + ' - parameters: ' + JSON.stringify(parameters));
		$.ajax({
			url: apiUrl,
			timeout: (maxWait || 5000),
			type: "POST",
			data: (parameters || {}),
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (debugCallback) debugCallback(data);
				if (data && data.result){
					var status = data.result;
					//error 3
					if (status == "fail"){
						if (errorCallback) errorCallback(data);
						return;
					}
					//assume success
					else{
						if (successCallback) successCallback(data);
					}		
				//error 2
				}else{
					if (errorCallback) errorCallback(data);
				}
			},
			//error 1
			error: function(data) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback(data);
			}
		});
	}
	
	//Call 'interpret' endpoint
	Assistant.callInterpreter = function(text, successCallback, errorCallback){
		var parameters = Assistant.getParametersForActionCall();
		parameters.text = text;
		var apiUrl = SepiaFW.config.assistAPI + "interpret";
		var maxWait = 5000;
		Assistant.abstractApiCall(apiUrl, parameters, successCallback, errorCallback, maxWait);
	}
	//Call 'answer' endpoint
	Assistant.callForAnswer = function(text, successCallback, errorCallback){
		var parameters = Assistant.getParametersForActionCall();
		parameters.text = text;
		var apiUrl = SepiaFW.config.assistAPI + "answer";
		var maxWait = 5000;
		Assistant.abstractApiCall(apiUrl, parameters, successCallback, errorCallback, maxWait);
	}
	//Check 'events' endpoint
	Assistant.callForAnswer = function(text, successCallback, errorCallback){
		var parameters = Assistant.getParametersForActionCall();
		var apiUrl = SepiaFW.config.assistAPI + "events";
		var maxWait = 5000;
		Assistant.abstractApiCall(apiUrl, parameters, successCallback, errorCallback, maxWait);
	}
	
	return Assistant;
}