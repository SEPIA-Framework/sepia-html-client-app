//NOTIFICATIONS (WEB API)
function sepiaFW_build_ui_notifications(){
	var Notify = {};

	var userHasBeenAsked = false;
	
	Notify.isSupported = ("Notification" in window);
	if (!Notify.isSupported){
		SepiaFW.debug.log("Browser notifications not supported! (Note: not related to e.g. iOS or Android notifications)");
	}

	var browserNotificationTimers = {};

	//request permission
	Notify.requestPermission = function(grantedCallback, refusedOrErrorCallback){
		Notification.requestPermission().then(function(permission){
			userHasBeenAsked = true;
			if (permission === "granted"){
				if (grantedCallback) grantedCallback();
			}else{
				if (refusedOrErrorCallback) refusedOrErrorCallback();
			}
		});
	}

	//return code messages
	Notify.getReturnMessageForCode = function(code){
		var msg;
		switch (code) {
			case 0:
				msg = "not supported";
				break;
			case 1:
				msg = "success";
				break;
			case 2:
				msg = "interrupted by permission request";
				break;
			case 3:
				msg = "permission denied";
				break;
			case 4:
				msg = "internal error";
				break;
			default:
				msg = "unknown return code";
				break;
		}
		return msg;
	}
	
	//send a note
	Notify.send = function(text, title, options, pressCallback, closeCallback, requestCallback){
		//return codes - 0: not supported, 1: success, 2: permission requested, 3: permission denied, 4: internal error
		if (!Notify.isSupported){
			if (requestCallback) requestCallback({error: "NotSupported"});
			return 0;
		}
		//permission check
		if (Notification.permission === "granted"){
			makeNote(text, title, options, pressCallback, closeCallback);
			if (requestCallback) requestCallback({info: "NoteCreated"});
			return 1;
		}
		//ask for permission
		else if (Notification.permission !== 'denied'){
			Notify.requestPermission(function(){
				//granted
				makeNote(text, title, options, pressCallback, closeCallback);
				if (requestCallback) requestCallback({info: "NoteCreated", askedPermission: true});
			}, function(){
				//refused or error
				var msg = SepiaFW.local.g("notification_error") + " - " + SepiaFW.local.g("check_browser_settings");
				SepiaFW.debug.log(msg);
				SepiaFW.ui.showInfo(msg);
				if (requestCallback) requestCallback({error: "PermissionRequestError", askedPermission: true});
			});
			return 2;
		}
		//comment denied
		else{
			if (!userHasBeenAsked){
				var msg = SepiaFW.local.g("notification_error") + " - " + SepiaFW.local.g("check_browser_settings");
				SepiaFW.debug.log(msg);
				SepiaFW.ui.showInfo(msg);
				userHasBeenAsked = true;
			}
			if (requestCallback) requestCallback({error: "NotAllowed"});
			return 3;
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

	//schedule a note (TODO: currently only works if browser is open)
	Notify.schedule = function(text, title, options, pressCallback, closeCallback, triggerCallback){
		if (!options || options.id == undefined){
			SepiaFW.debug.error("Notify.schedule - Missing 'options.id'.");
			if (triggerCallback) triggerCallback()
			return;
		}
		//data
		if (!options.data){
			options.data = {};
		}
		//schedule
		var delay = 50;
		if (options.triggerAt){
			delay = Math.max(50, options.triggerAt.getTime() - new Date().getTime());
		}
		var nid = options.id;	//NOTE: required!
		clearTimeout(browserNotificationTimers[nid]);
		browserNotificationTimers[nid] = setTimeout(function(){
			var returnCode = Notify.send(text, title, options, pressCallback, closeCallback);
			//sound
			if (options.sound){
				//TODO: add sound (but prevent conflict with app alarm sound)
			}
			if (triggerCallback) triggerCallback(returnCode);
		}, delay);
		return nid;
	}
	//cancel scheduled note
	Notify.cancel = function(idArray){
		if (idArray && idArray.length){
			idArray.forEach(function(nid){
				clearTimeout(browserNotificationTimers[nid]);
				delete browserNotificationTimers[nid];
			});
		}
	}
	
	return Notify;
}