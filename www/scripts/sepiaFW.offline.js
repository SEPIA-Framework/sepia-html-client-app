//Offline methods and results
function sepiaFW_build_offline(){
	var Offline = {};
		
	//----- Offline answers and actions -----
	
	//Get action to open an URL
	Offline.getUrlOpenAction = function(_url){
		var action = {
			type: "open_in_app_browser",
			url: _url
		}
		return action;
	}
	//Get an action for an URL button
	Offline.getUrlButtonAction = function(_url, _title){
		var action = {
			type: "button_in_app_browser", 
			title: _title, 
			url: _url
		}
		return action;
	}
	//Get an action for a CMD button
	Offline.getCmdButtonAction = function(_cmd, _title, cmdIsText){
		var _info = cmdIsText? "question" : "direct_cmd";
		var action = {
			type: "button_cmd", 
			info: _info,
			title: _title, 
			cmd: _cmd
		}
		return action;
	}
	//Get custom function action 
	Offline.getCustomFunctionButtonAction = function(_fun, _title){
		var action = {
			type: "button_custom_fun", 
			title: _title, 
			fun: _fun
		}
		return action;
	}
	//Get the help button
	Offline.getHelpButtonAction = function(){
		var action = {
			type: "button_help"
		}
		return action;
	}
	//Get a frames view button
	Offline.getFrameViewButtonAction = function(_framePage, _frameName){
		var action = {
			type: "button_frames_view",
			info: {
				pageUrl: _framePage,
				frameName: _frameName
			}
		}
		return action;
	}
	//Get a pro-active chat message action (action type: schedule_msg) 
	//Use with: SepiaFW.events.setProActiveBackgroundNotification(action)
	Offline.getProActiveChatAction = function(_eventId, _triggerIn, _text){
		var action = {
			eventId: _eventId,
			triggerIn: _triggerIn,
			text: _text,
			type: "schedule_msg",
			info: "entertainWhileIdle"
		}
		return action;
	}

	//----- Cards builder -----

	Offline.getLinkCard = function(url, title, description, imageUrl, imageBackground, data){
		if (!data) data = {};
		data.title = title || "Link Card";
		data.desc = description || "Click to open";
		if (!url) url = "https://sepia-framework.github.io/app/search.html";
		/* other data content e.g.:
		"type": "musicSearch",
		"brand": "Spotify"
		*/
		var cardInfoItem = {
			"cardType": "single",
			"N": 1,
			"info": [{
				"image": imageUrl,
				"imageBackground": imageBackground,
				"data": data,
				"type": "link",
				"url": url
			}]
		};
		return cardInfoItem;		//NOTE: it is ONE ITEM of the cardInfo-array! To build use e.g. [getLinkCard(...)]
	}

	//------------------ custom buttons -------------------

	//Create a custom button object
	Offline.createCustomButton = function(name, icon, cmdSummary, text, language){
		var btnObj = {
			"name": name,
			"icon": icon,
			"cmd" : cmdSummary,
			"text": text,
			"language" : language
		}
		return btnObj;
	}

	//------------------ message handling -------------------

	//Handle a message offline sent via Client.sendMessage - currently used for demo-mode
	Offline.handleClientSendMessage = function(message){
		var userId = 'username';
		var dataIn = { sender: userId };
		//console.log(message); 								//DEBUG
		var nluResult;
		var serviceResult;
		//check type
		var inputType = message.data.parameters.input_type;
		if (inputType == "direct_cmd"){
			//direct command
			//...skip user output
		}else{
			//text command (or other?)
			SepiaFW.ui.showCustomChatMessage(message.text, dataIn); 	//show input in chat (usually this comes from server too as ping-pong (channel broadcast))
		}
		if (message.text){
			//try to get some result from offline interpreter
			if (SepiaFW.embedded && SepiaFW.embedded.nlu){
				if (SepiaFW.client.isDemoMode() && SepiaFW.account.getUserRoles() && SepiaFW.account.getUserRoles()[0] == "setup"){
					//TODO: should setup generate response?
				}else{
					nluResult = SepiaFW.embedded.nlu.interpretMessage(message);
				}
			}
			//console.log(nluResult); 							//DEBUG
		}
		if (nluResult && nluResult.result == "success"){
			//get a service result
			var input = {
				text: message.text,
				user: userId,
				language: nluResult.language
			}
			if (SepiaFW.embedded && SepiaFW.embedded.services){
				serviceResult = SepiaFW.embedded.services.answerMessage(input, nluResult);
			}
			//console.log(serviceResult); 						//DEBUG
		}
		var senderUiIdOrName = undefined;	//default
		if (!serviceResult || serviceResult.result != "success"){
			//just repeat input for demo-mode
			var command = "chat";
			var answerText = message.text;
			var lang = message.data.parameters.lang;
			serviceResult = SepiaFW.embedded.services.buildServiceResult(
				userId, lang, command, answerText, '', '', ''
			);
			senderUiIdOrName = 'Parrot';	//overwrite (to make clear this is no real answer ... and for fun)
			/* Old version that lacks e.g. TTS:
			var dataOut = { sender: 'Parrot', senderType: 'assistant' };
			SepiaFW.ui.showCustomChatMessage(message.text, dataOut);
			return;
			*/
		}
		//build a message-object and send it to 'real' message handler (as if we got a server reply)
		setTimeout(function(){
			var id = message.msgId;
			var resultMessage = Offline.buildAssistAnswerMessageForHandler(id, serviceResult, senderUiIdOrName);
			Offline.sendToClienMessagetHandler(resultMessage);
		}, 600);
	}

	//Send a message to regular message handler (where messages from the server usually end up)
	Offline.sendToClienMessagetHandler = function(message){
		//console.log("msg: " + JSON.stringify(message)); 		//DEBUG
		SepiaFW.client.handleServerMessage(message);
	}

	//Message builder
	Offline.buildAssistAnswerMessageForHandler = function(msgId, serviceResult, assistantIdOrName, receiverId){
		var receiver = receiverId || 'userid'; 		//e.g. uid1010
		var sender = assistantIdOrName || 'UI';		//e.g. uid1005 (assistant usually)
		var senderType = 'assistant';
		var channelId = SepiaFW.client.getActiveChannel(); 	//TODO: does this work with an empty channel?
		var timeUnix = new Date().getTime();
		var time = SepiaFW.tools.getLocalTime();
		if (!msgId) msgId = receiver + "-" + timeUnix; 	//note: some tests probably require a proper ID
		var messageData = {
			"receiver": receiver,
			"data": {
				"assistAnswer": serviceResult,
				"dataType": "assistAnswer"
			},
			"sender": sender,
			"timeUNIX": timeUnix,
			"msgId": msgId,
			"senderType": senderType,
			"time": time,
			"channelId": channelId
		};
		return messageData;
	}
	//same as above just with 'real' login data
	Offline.buildAssistAnswerMessageForHandlerWithLogin = function(serviceResult){
		var receiverId = SepiaFW.account.getUserId() || 'userid';
		var assistantId = SepiaFW.assistant.id || 'UI';
		var msgId = (receiverId + "-" + SepiaFW.client.getNewMessageId());
		return Offline.buildAssistAnswerMessageForHandler(msgId, serviceResult, assistantId, receiverId);
	}
	
	return Offline;
}