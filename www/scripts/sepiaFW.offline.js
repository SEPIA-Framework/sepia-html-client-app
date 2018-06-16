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
	
	return Offline;
}