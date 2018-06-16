//NOTIFICATIONS (HTML API)
function sepiaFW_build_ui_notifications(){
	var Notify = {};

	var userHasBeenAsked = false;
	
	Notify.isSupported = ("Notification" in window);
	if (!Notify.isSupported){
		SepiaFW.debug.log("Notification: not supported!");
	}
	
	//send a note
	Notify.send = function(text, title, options, pressCallback){
		if (!Notify.isSupported){
			return;
		}
		//permission check
		if (Notification.permission === "granted"){
			makeNote(text, title, options, pressCallback);
		}
		//ask for permission
		else if (Notification.permission !== 'denied'){
			Notification.requestPermission(function (permission){
				userHasBeenAsked = true;
				if (permission === "granted") {
					makeNote(text, title, options, pressCallback);
				}else{
					SepiaFW.debug.log('Notifications are deactivated, please check your browser settings, e.g. chrome://settings/content');
				}
			});
		}
		//comment denied
		else{
			if (!userHasBeenAsked){
				SepiaFW.debug.log('Notifications are deactivated, please check your browser settings, e.g. chrome://settings/content');
				userHasBeenAsked = true;
			}
		}
	}
	function makeNote(text, title, options, pressCallback){
		var options = options || new Object();
		//dir, lang, body, tag, icon, data
		options.body = text;
		options.icon = 'img/icon.png';
		//options.data = title;
		var notification = new Notification((title || "SepiaFW Notification"), options);
		//notification.onshow = function(){};
		notification.onclick = function(){ pressCallback(notification); }; 		//event.preventDefault(); // prevent the browser from focusing the Notification's tab
		//notification.onclose = function(){};
	}
	
	return Notify;
}