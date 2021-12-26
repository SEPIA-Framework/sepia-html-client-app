//NOTIFICATIONS (HTML API)
function sepiaFW_build_ui_notifications(){
	var Notify = {};

	var userHasBeenAsked = false;
	
	Notify.isSupported = ("Notification" in window);
	if (!Notify.isSupported){
		SepiaFW.debug.log("Browser notifications not supported! (Note: not related to e.g. iOS or Android notifications)");
	}
	
	//send a note
	Notify.send = function(text, title, options, pressCallback, closeCallback){
		if (!Notify.isSupported){
			return;
		}
		//permission check
		if (Notification.permission === "granted"){
			makeNote(text, title, options, pressCallback, closeCallback);
		}
		//ask for permission
		else if (Notification.permission !== 'denied'){
			Notification.requestPermission(function (permission){
				userHasBeenAsked = true;
				if (permission === "granted") {
					makeNote(text, title, options, pressCallback, closeCallback);
				}else{
					var msg = SepiaFW.local.g("notification_error") + " - " + SepiaFW.local.g("check_browser_settings");
					SepiaFW.debug.log(msg);
					SepiaFW.ui.showInfo(msg);
				}
			});
		}
		//comment denied
		else{
			if (!userHasBeenAsked){
				var msg = SepiaFW.local.g("notification_error") + " - " + SepiaFW.local.g("check_browser_settings");
				SepiaFW.debug.log(msg);
				SepiaFW.ui.showInfo(msg);
				userHasBeenAsked = true;
			}
		}
	}
	function makeNote(text, title, options, pressCallback, closeCallback){
		var options = options || new Object();
		//dir, lang, body, tag, icon, data
		options.body = text;
		options.icon = 'img/icon.png';
		//options.data = title;
		options.requireInteraction = false;
		var notification = new Notification((title || "SepiaFW Notification"), options);
		//notification.onshow = function(){};	//add auto close?
		if (pressCallback){
			notification.onclick = function(){ pressCallback(notification); }; 		//event.preventDefault(); // prevent the browser from focusing the Notification's tab
		}
		if (closeCallback){
			notification.onclose = function(){ closeCallback(notification); };
		}
	}
	
	return Notify;
}