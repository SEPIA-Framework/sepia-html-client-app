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

	//random tag
	var sessionTagCounter = 1;
	function getRandomTag(){
		return (sessionTagCounter++ + "-" + Date.now());
	}
	
	//send a note
	Notify.send = function(text, title, options, onClickData, onCloseData, requestCallback){
		//return codes - 0: not supported, 1: success, 2: permission requested, 3: permission denied, 4: internal error
		if (!Notify.isSupported){
			if (requestCallback) requestCallback({error: "NotSupported"});
			return 0;
		}
		//permission check
		if (Notification.permission === "granted"){
			makeNote(text, title, options, onClickData, onCloseData);
			if (requestCallback) requestCallback({info: "NoteCreated"});
			return 1;
		}
		//ask for permission
		else if (Notification.permission !== 'denied'){
			Notify.requestPermission(function(){
				//granted
				makeNote(text, title, options, onClickData, onCloseData);
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
	function makeNote(text, title, options, onClickData, onCloseData){
		var options = options || new Object();
		//dir, lang, body, tag, icon, data
		options.body = text;
		options.icon = 'img/icon.png';
		options.tag = (options.id != undefined)? options.id : getRandomTag();
		options.requireInteraction = false;
		//options.actions = [...];	//works only in SW!
		try {
			//Mobile notification via service worker
			if ('sepiaClientSwRegistration' in window){
				//add click data to options.data
				var noteData = options.data;
				options.data = {
					noteData: noteData,
					onClickData: onClickData,
					onCloseData: onCloseData
				};
				//check actions array
				if (!options.actions || !options.actions.length){
					options.actions = [{action: "dismiss", title: SepiaFW.local.g("close")}];
				}
				//create in SW
				window.sepiaClientSwRegistration.showNotification(title || "SepiaFW Notification", options);
			//Default desktop notification
			}else{
				//check actions array
				if (options.actions){
					delete options.actions;		//either not shown or even crashing non-SW notifications :-/
				}
				//create
				var notification = new Notification(title || "SepiaFW Notification", options);
				//notification.onshow = function(){};	//add auto close?
				if (onClickData){
					notification.onclick = function(){
						onPressAction(notification, onClickData, options.data);
					};
					//event.preventDefault(); // ??prevent the browser from focusing the Notification's tab
				}
				if (onCloseData){
					//TODO: not working anymore in Chrome for Windows 11?
					notification.onclose = function(){
						onCloseAction(notification, onCloseData, options.data);
					};
				}
			}
		}catch (error){
			var msg = SepiaFW.local.g("notification_error");
			SepiaFW.debug.error(msg, ".", error);
			SepiaFW.ui.showInfo(msg);
		}
	}
	function onPressAction(notification, onClickData, noteData){
		//.focusApp and .closeNote
		if (onClickData.focusApp){
			window.focus();
		}
		if (onClickData.closeNote){
			notification.close();
		}
		handleNoteInteraction(onClickData, "click");
		if (noteData) SepiaFW.events.handleLocalNotificationClick(noteData);
	}
	function onCloseAction(notification, onCloseData, noteData){
		//.focusApp
		if (onCloseData.focusApp){
			window.focus();
		}
		handleNoteInteraction(onCloseData, "close");
		if (noteData) SepiaFW.events.handleLocalNotificationClose(noteData);
	}
	function handleNoteInteraction(interactionData, source){
		if (interactionData.updateMyView){
			handleUpdateMyView(interactionData.updateMyView);
		}
	}
	function handleUpdateMyView(data){
		SepiaFW.ui.updateMyView(data.forceUpdate, data.checkGeolocationFirst, data.updateSource);
	}
	//pre-defined actions for 'onClickData'/'onCloseData' (to be extended):
	/* {
		focusApp: true,		//window.focus();
		closeNote: true,	//notification.close();
		updateMyView: {		//SepiaFW.ui.updateMyView(false, true, 'localNotificationClick');
			forceUpdate: false,
			checkGeolocationFirst: true,
			updateSource: "localNotificationClick"
		}
	} */

	//handle notification data from service worker
	Notify.handleServiceWorkerMessage = function(msg){
		//TODO: buffer if client not active yet?
		/* {
			action: ...,
			onClickData: ...,
			onCloseData: ...,
			noteData: ...
		} */
		//console.error("handleServiceWorkerMessage:", msg);	//DEBUG
		if (msg.onClickData){
			handleNoteInteraction(msg.onClickData, "click");
			if (msg.noteData) SepiaFW.events.handleLocalNotificationClick(msg.noteData);
		}else if (msg.onCloseData || action == "dismiss"){
			handleNoteInteraction(msg.onCloseData || {}, "close");
			if (msg.noteData) SepiaFW.events.handleLocalNotificationClose(msg.noteData);
		}
	}

	//schedule a note (TODO: currently only works if browser is open)
	Notify.schedule = function(text, title, options, onClickData, onCloseData, triggerCallback){
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
			var returnCode = Notify.send(text, title, options, onClickData, onCloseData);
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