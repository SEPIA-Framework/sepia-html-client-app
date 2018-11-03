//Offline methods and results
function sepiaFW_build_offline(){
	var Offline = {};
		
	//----- Offline answers and actions -----
	
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

	//Handle a message oflfine sent via Client.sendMessage - currently used for demo-mode
	Offline.handleClientSendMessage = function(message){
		var dataIn = { sender: 'username' };
		SepiaFW.ui.showCustomChatMessage(message.text, dataIn);
		setTimeout(function(){
			var dataOut = { sender: 'parrot', senderType: 'assistant' };
			SepiaFW.ui.showCustomChatMessage(message.text, dataOut);
		}, 500);
	}
	
	return Offline;
}