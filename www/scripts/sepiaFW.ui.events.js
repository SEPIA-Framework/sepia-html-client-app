//TIME EVENTS and PRO-ACTIVE RECOMMENDATIONS
function sepiaFW_build_events(){
	var Events = {};
	
	//some statics
	Events.TIMER = "timer";
	Events.ALARM = "alarm";
	
	var DAY_MS = 24*60*60*1000;
	var HOUR_MS = 60*60*1000;
	var MIN_MS = 60*1000;
	var SEC_MS = 1000;

	//----------------- Broadcasting -------------------

	//Alarm/reminder has been triggered
	function broadcastAlarmTrigger(info){
		//Always-On mode
		if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
			SepiaFW.alwaysOn.triggerAlarm();
		}
		//dispatch event
		var event = new CustomEvent('sepia_alarm_event', { detail: {
			action: "triggered",
			info: info
		}});
		document.dispatchEvent(event);
		//console.error("broadcastAlarmTrigger", info);		//DEBUG
	}
	Events.broadcastAlarmTrigger = broadcastAlarmTrigger;

	function broadcastAlarmSet(info){
		//dispatch event
		var event = new CustomEvent('sepia_alarm_event', { detail: {
			action: "set",
			info: info
		}});
		document.dispatchEvent(event);
		//console.error("broadcastAlarmSet", info);		//DEBUG
	}
	Events.broadcastAlarmSet = broadcastAlarmSet;

	function broadcastAlarmStop(info){
		//dispatch event
		var event = new CustomEvent('sepia_alarm_event', { detail: {
			action: "stopped",
			info: info
		}});
		document.dispatchEvent(event);
		//console.error("broadcastAlarmStop", info);		//DEBUG
	}
	Events.broadcastAlarmStop = broadcastAlarmStop;

	function broadcastAlarmRemove(info){
		//dispatch event
		var event = new CustomEvent('sepia_alarm_event', { detail: {
			action: "remove",
			info: info
		}});
		document.dispatchEvent(event);
		//console.error("broadcastAlarmRemove", info);		//DEBUG
	}
	Events.broadcastAlarmRemove = broadcastAlarmRemove;
	
	//--------------------------------------------------
	
	//about notifications - TODO: unify methods for different types
	var notificationsCurrentId = SepiaFW.data.get('notificationsCurrentId') || 1;
	function getAndIncreaseNotificationId(){
		var newId = notificationsCurrentId++;
		if (newId >= 2147483640) notificationsCurrentId = 0;	//we use Integer.MAX_VALUE since we don't know what android and iOS expect as ids ^^
		SepiaFW.data.set('notificationsCurrentId', notificationsCurrentId);
		return newId;
	}
	var timeEventNotificationIds = SepiaFW.data.get('timeEventNotificationIds') || [];
	var proActiveNotificationIds = SepiaFW.data.get('proActiveNotificationIds') || [];
	function addTimeEventNotificationId(tenId){
		if ($.inArray(tenId, timeEventNotificationIds) === -1){
			timeEventNotificationIds.push(tenId);
			SepiaFW.data.set('timeEventNotificationIds', timeEventNotificationIds);
		}
	}
	function addProActiveNotificationId(panId){
		if ($.inArray(panId, proActiveNotificationIds) === -1){
			proActiveNotificationIds.push(panId);
			SepiaFW.data.set('proActiveNotificationIds', proActiveNotificationIds);
		}
	}
	function getTimeEventNotificationIds(){
		return timeEventNotificationIds;
	}
	function getProActiveNotificationIds(){
		return proActiveNotificationIds;
	}
	function resetTimeEventNotificationIds(){
		var activeTimeEventIds = getTimeEventNotificationIds();
		var checkedActiveTimeEventIds = [];
		//console.log('active Ids (is): ' + activeTimeEventIds); 		//DEBUG
		if (SepiaFW.ui.isCordova){
			cordova.plugins.notification.local.getScheduledIds(function (ids) {
				$.each(ids, function(index, id){
					if ($.inArray(id, activeTimeEventIds) > -1){
						checkedActiveTimeEventIds.push(id);
					}
				});
				timeEventNotificationIds = checkedActiveTimeEventIds;
				SepiaFW.data.set('timeEventNotificationIds', timeEventNotificationIds);
				//console.log('active Ids (new): ' + getTimeEventNotificationIds()); 		//DEBUG
			});
		}
	}
	function resetProActiveNotificationIds(){
		var activeEventIds = getProActiveNotificationIds();
		var checkedActiveEventIds = [];
		//console.log('active Ids (is): ' + activeEventIds); 		//DEBUG
		if (SepiaFW.ui.isCordova){
			cordova.plugins.notification.local.getScheduledIds(function (ids) {
				$.each(ids, function(index, id){
					if ($.inArray(id, activeEventIds) > -1){
						checkedActiveEventIds.push(id);
					}
				});
				proActiveNotificationIds = checkedActiveEventIds;
				SepiaFW.data.set('proActiveNotificationIds', proActiveNotificationIds);
				//console.log('active Ids (new): ' + getProActiveNotificationIds()); 		//DEBUG
			});
		}
	}
	
	//reset all notifications
	Events.resetAllBackgroundEvents = function(resetAllBackgroundEventsCallback){
		//TODO: put these actions in a line and make proper success check
		lastContextualEventsCheck = 0;
		//proActive background notifications
		resetProActiveNotificationIds();
		Events.clearAllProActiveBackgroundNotifications();
		//timeEvent background notifications
		resetTimeEventNotificationIds();
		Events.clearAllTimeEventBackgroundNotifications();
		//report - note: we can just guess here that the OS will do its best to clean up :-#
		if (resetAllBackgroundEventsCallback){
			var success = true; 	//just a guess!
			resetAllBackgroundEventsCallback(success);
		}
	}
	
	//------------- PERSONAL/CONTEXTUAL/PRO-ACTIVE EVENTS (Time-of-day recommendations, ...) --------------
	
	var proActiveMessageTimers = {}; 		//used to schedule non-cordova compatible proActive background notifications and to cancel cordova compatible messages if they are triggered in foreground
	var lastContextualEventsCheck = 0;
	
	Events.loadContextualEvents = function(forceNew) {
		if (!SepiaFW.assistant.id && !SepiaFW.client.isDemoMode()){
			SepiaFW.debug.err("Events: tried to get contextual events before channel-join completed!");
			return;
		}
		//prevent multiple consecutive calls in short intervall...
		var now = new Date().getTime();
		if (forceNew || (now - lastContextualEventsCheck) > 10*1000){ 		//interval: 10s
			lastContextualEventsCheck = now;
			//reset Ids tracking proActive background messages
			resetProActiveNotificationIds();
			//clear all old proActive ...
			Events.clearAllProActiveBackgroundNotifications(function(){
				//load contextual events to myView
				SepiaFW.debug.info('Events loadContextualEvents: getting new events.');
				var options = {};
					options.skipText = true;
					options.skipTTS = true;
					options.targetView = "myView";
					//NOTE: we don't need 'updateMyViewEvents' here since this is done by the message handler 
				var dataset = {};	dataset.info = "direct_cmd";
					dataset.cmd = "events_personal;;";
					dataset.newReceiver = SepiaFW.assistant.id;
				SepiaFW.client.sendCommand(dataset, options);
			});
		}
	}
	
	//Background notification 
	Events.setProActiveBackgroundNotification = function(action){
		//console.log('setProActiveBackgroundNotification: ' + action.eventId); 		//DEBUG
		if (!SepiaFW.assistant.isProActive){
			return;
		}
		if (!action || action.triggerIn < 0){
			//timers of the past are rejected
			return;
		}
		/* action:
		{"eventId":"randomMotivationMorning","info":"entertainWhileIdle","triggerIn":-22800000, "created": 1558379918970, "text":"Ach, ich wollte noch sagen, du bist cool! :-)","type":"schedule_msg"}
		or e.g.: "info": "proActiveNote"
		*/
		var noteData = {"type": action.info, "action": "triggered", "data": {"message": action.text, "eventId": action.eventId, "created": action.created}};

		if (SepiaFW.ui.isCordova){
			var d = new Date((new Date().getTime() + action.triggerIn) + 1500);		//note: the delay is to handle the foreground activity (see below, 2nd timer)
			var nid = getAndIncreaseNotificationId();
			cordova.plugins.notification.local.schedule([{
				id: nid,
				title: SepiaFW.assistant.name + ":",
				text: action.text,
				trigger: {
					at: (d)
				},
				sound: "res://platform_default",
				smallIcon: "res://ic_popup_reminder",
				icon: "res://icon",
				color: "303030",
				data: noteData,
				wakeup: false
			}]);
			addProActiveNotificationId(nid);
			//prevent foreground execution
			if (!proActiveMessageTimers[action.eventId]){
				proActiveMessageTimers[action.eventId] = '';
			}else{
				clearTimeout(proActiveMessageTimers[action.eventId]);
			}
			proActiveMessageTimers[action.eventId] = setTimeout(function(){
				//remove event before it can be triggered
				if (SepiaFW.ui.isVisible()){
					cordova.plugins.notification.local.cancel([nid], function(){
						//send this instead
						if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
							SepiaFW.assistant.waitForOpportunityAndSay(action.text, function(){}, 2000, 30000);
						}else{
							Events.handleLocalNotificationClick(noteData);
						}
						//trigger event
						Events.trackLocalNotificationTrigger(noteData);
					});
				}
			}, action.triggerIn);
		
		}else if (SepiaFW.ui.notification){
			if (!proActiveMessageTimers[action.eventId]){
				proActiveMessageTimers[action.eventId] = '';
			}else{
				clearTimeout(proActiveMessageTimers[action.eventId]);
			}
			proActiveMessageTimers[action.eventId] = setTimeout(function(){
				if (!SepiaFW.ui.isVisible()){
					SepiaFW.ui.notification.send(action.text, SepiaFW.assistant.name, '', function(note){
						window.focus();
						note.close();
						Events.handleLocalNotificationClick(noteData);
						SepiaFW.ui.updateMyView(false, true, 'localNotificationClick');
					});
					//trigger event
					Events.trackLocalNotificationTrigger(noteData);
				}else{
					//send this instead
					if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
						SepiaFW.assistant.waitForOpportunityAndSay(action.text, function(){}, 2000, 30000);
					}else{
						Events.handleLocalNotificationClick(noteData);
					}
					//trigger event
					Events.trackLocalNotificationTrigger(noteData);
				}
			}, action.triggerIn);
		}
		//console.log('scheduled: ' + action.eventId);		//DEBUG
	}
	//properties: scheduled once and executed locally, will not show when the app is in foreground
	Events.clearAllProActiveBackgroundNotifications = function(callbackDone){
		if (SepiaFW.ui.isCordova){
			var removeIds = getProActiveNotificationIds();
			cordova.plugins.notification.local.cancel(removeIds, function(){
				if (callbackDone) callbackDone();
			});
		}else if (SepiaFW.ui.notification){
			$.each(proActiveMessageTimers, function(key, value){
				clearTimeout(value);
			});
			if (callbackDone) callbackDone();
		}else{
			if (callbackDone) callbackDone();
		}
	}
	
	//------------- TIME EVENTS (Timer, Alarm, ...) ---------------
	
	//about timeEvents
	var Timers = {};
	var removedTimerIds = []; 		//to sync deleted timers/alarms with account
	var ActivatedTimers = {};
	var timerCurrentId = 1;
	
	//Scheduler variables
	var scheduleDelay = 5000; 		//to prevent multiple syncs in a short time-period the current sync is delayed and gets shifted with each new sync request
	var SyncSchedulers = {};

	var lastTimeEventsCheck = 0;
	var timeEventsCheckTimer;

	//----------------- Broadcasting -------------------

	//see at top of class ...

	//--------------------------------------------------
	
	//SETUP TimeEvents
	Events.setupTimeEvents = function(forceNew){
		if (!SepiaFW.assistant.id && !SepiaFW.client.isDemoMode()){
			SepiaFW.debug.err("Events: tried to get time-events before channel-join completed!");
			return;
		}
		//prevent multiple consecutive calls in short intervall...
		var now = new Date().getTime();
		var timePassedSinceLastCheck = (now - lastTimeEventsCheck);
		var targetTime = 10*1000; 	//at least 10s
		if (forceNew || timePassedSinceLastCheck > targetTime){ 		//interval: 10s
			clearTimeout(timeEventsCheckTimer);
			lastTimeEventsCheck = now;
			
			//reset ids tracking timeEvents - basically just reload all active background time events to 'timeEventNotificationIds'
			resetTimeEventNotificationIds();

			//remove all objects from collection and stop alarm trigger
			$.each(Timers, function(name, Timer){
				cleanUpRemovedTimeEvent(Timer);
			});
			Timers = {};

			//NOTE: this will not remove old timer cards only add new ones and disable old background notifications
			SepiaFW.ui.cards.findAllTimeEventCards(false, true).forEach(function(item){ 
				item.remove();
				//more info: SepiaFW.events.getRunningOrActivatedTimeEventById(item.data.eventId)
			});

			//clear all background notifications
			Events.clearAllTimeEventBackgroundNotifications(function(){
				//reload Timers
				var options = {};
					options.loadOnlyData = true;
					options.updateMyViewTimers = true; 		//update my-view (but only timers) afterwards
				var dataset = {};	dataset.info = "direct_cmd";
					dataset.cmd = "timer;;action=<show>;;alarm_type=<timer>;;";			//TODO: make a function for that
					dataset.newReceiver = SepiaFW.assistant.id;
				SepiaFW.client.sendCommand(dataset, options);
				var dataset2 = {};	dataset2.info = "direct_cmd";
					dataset2.cmd = "timer;;action=<show>;;alarm_type=<alarmClock>;;";	//TODO: make a function for that
					dataset2.newReceiver = SepiaFW.assistant.id;
				SepiaFW.client.sendCommand(dataset2, options);
			});
		}else{
			SepiaFW.debug.log("Events: Delayed time events update because requests came too quickly!");
			//buffer calls and schedule update for later
			timeEventsCheckTimer = setTimeout(function(){
				Events.setupTimeEvents();
			}, (targetTime - timePassedSinceLastCheck + 2000));
		}
	}
	
	//add timeEvent to UI and activate it
	Events.addOrRefreshTimeEvent = function(targetTimeUnix, eventType, eventData){
		var Timer = Events.getRunningOrActivatedTimeEventById(eventData.eventId);
		var reloadBackgroundNotification = false;
		var now = new Date().getTime();
		if (!Timer){
			reloadBackgroundNotification = true;
			Timer = {};
			Timer.targetTime = targetTimeUnix;
			Timer.name = "sepiaFW-timedEvent-" + timerCurrentId++; 			//not to be confused with Timer.eventData.name!
			Timer.type = eventType;
			Timer.data = eventData;
			Timers[Timer.name] = Timer;

			if ((now - targetTimeUnix) < 0){
				broadcastAlarmSet({
					timeUnix: Timer.targetTime,
					type: Timer.type,
					id: Timer.name,
					title: (Timer.data? Timer.data.name : Timer.type)
				});
			}
		}
		
		//final action
		scheduleTimeAction(Timer, reloadBackgroundNotification);			//assigns: Timer.action
		
		//interval action (animations)
		addTimeEventIntervalAction(Timer)		//assigns: Timer.animation and gets all relevant DOM elements (by eventId, aka data-id)

		SepiaFW.debug.info("TimeEvent - " + Timer.name + ': ADDED or REFRESHED');		//DEBUG
		return Timer;
	}
	//get an active timeEvent by name (DOM id)
	Events.getTimeEvent = function(name){
		if(name in Timers){
			return Timers[name];
		}else{
			return "";
		}
	}
	//get next timeEvent
	Events.getNextTimeEvents = function(maxTargetTime, excludeName, includePastMs){
		if (!maxTargetTime) maxTargetTime = Number.MAX_SAFE_INTEGER;
		var nextTimers = [];
		//var nearestFuture = Number.MAX_SAFE_INTEGER;
		var now = new Date().getTime();
		if (includePastMs){
			now = now - includePastMs;
		}
		$.each(Timers, function(timerName, timerObj){
			if (!excludeName || (excludeName !== timerName)){
				var isValidTime = (timerObj.targetTime < maxTargetTime) && ((timerObj.targetTime - now) > 0);
				if (isValidTime){
					nextTimers.push(timerObj);
				}
				/*
				if (isValidTime && timerObj.targetTime < nearestFuture){
					nearestFuture = timerObj.targetTime;
					nextTimers = [timerObj];
				}else if (isValidTime && timerObj.targetTime == nearestFuture){
					nextTimers.push(timerObj);
				}
				*/
			}
		});
		return nextTimers;
	}
	//get an timeEvent that has been executed already
	Events.getActivatedTimeEvent = function(name){
		if(name in ActivatedTimers){
			return ActivatedTimers[name];
		}else{
			return "";
		}
	}
	//get an active timeEvent by eventId (given by server)
	Events.getRunningOrActivatedTimeEventById = function(eventId){
		var timerWithId = '';
		$.each(Timers, function(timerName, timerObj){
			if (timerObj.data && timerObj.data.eventId){
				if (timerObj.data.eventId === eventId){
					timerWithId = timerObj;
				}
			}
		});
		if (!timerWithId){
			$.each(ActivatedTimers, function(timerName, timerObj){
				if (timerObj.data && timerObj.data.eventId){
					if (timerObj.data.eventId === eventId){
						timerWithId = timerObj;
					}
				}
			});
		}
		return timerWithId;
	}
	//deactivate timeEvent - optionally resync server list afterwards
	Events.removeTimeEvent = function(name, resyncList, callbackRemovedBackgroundActivity){
		var Timer = Events.getTimeEvent(name);
		if (Timer){
			//Remove background notification
			Events.removeTimeEventBackgroundNotification(Timer, callbackRemovedBackgroundActivity);
			//clean up
			cleanUpRemovedTimeEvent(Timer);
			delete Timers[Timer.name];
			//this might be set if a timeEvent is removed by a "UI-only-action" (e.g. remove button) and the server needs to get the info as well
			if (resyncList){
				//store eventId of deleted timer for resync
				removedTimerIds.push(Timer.data.eventId);
				scheduleTimeEventsSync(Timer.type);
			}
			SepiaFW.debug.info("TimeEvent - " + name + ': REMOVED');		//DEBUG
			broadcastAlarmRemove({
				timeUnix: Timer.targetTime,
				type: Timer.type,
				id: Timer.name,
				title: (Timer.data? Timer.data.name : Timer.type)
			});
		
		}else if (resyncList){
			var activatedTimer = Events.getActivatedTimeEvent(name);
			if (activatedTimer){
				//store eventId of deleted timer for resync
				removedTimerIds.push(activatedTimer.data.eventId);
				scheduleTimeEventsSync(activatedTimer.type);
			}
		}
	}
	function cleanUpRemovedTimeEvent(Timer){
		//clean up
		if (Timer.action) clearTimeout(Timer.action);
		//if (Timer.animation) clearInterval(Timer.animation); 	//<- animation keeps running until dom element is deleted
	}
	//synchronize timeEvents with server - since creating an event should be done via server request we assume that only silently removed or UI-unknown events need sync.
	Events.syncTimeEvents = function(type){
		if (SepiaFW.client.isDemoMode()){
			//we skip this in demo-mode to avoid confusing error-messages
			return;
		}
		var title = "";
		if (type === Events.TIMER){
			title = "timer";
		}else if (type === Events.ALARM || type === "alarmClock"){
			title = "alarmClock";
		}else{
			SepiaFW.debug.log('UI.Actions timeEvent: Can\'t synchronize type "' + Timer.type + '" yet!');
			return;
		}
		var listToLoad = {};
			listToLoad.section = "timeEvents";
			listToLoad.indexType = "alarms"; 		//see UI.cards: INDEX_TYPE_ALARMS
			if (title) listToLoad.title = title;
		SepiaFW.account.loadList(listToLoad, function(data){
			//got list(s)
			var lists = data.lists;
			var syncList = {};
			if (lists && lists.length > 0){
				//get first list - should be only one specific here!
				syncList = lists[0];
				if (!syncList.data) syncList.data = [];
				//iterate account events
				var i=0;
				var newListData = [];
				while (i < syncList.data.length){
					//is not on list of silently removed timeEvents?
					if ($.inArray(syncList.data[i].eventId, removedTimerIds) === -1){
						//TODO: use ActivatedTimers ???
						//check if timer exists and has newer lastChange date (e.g. because the name was changed in UI)
						var Timer = SepiaFW.events.getRunningOrActivatedTimeEventById(syncList.data[i].eventId);
						if (Timer && Timer.data.lastChange > syncList.data[i].lastChange){
							//console.log('updated');
							newListData.push(Timer.data);
						}else{
							//console.log('refreshed');
							newListData.push(syncList.data[i]);
						}
					}
					i++;
				}
				var removedItems = (syncList.data.length - newListData.length);
				SepiaFW.debug.info("TimeEvent - " + removedItems + " removed during synchronization");
				syncList.data = newListData;
				//save changes
				SepiaFW.account.saveList(syncList, function(data){
					//clean remove queue
					removedTimerIds = [];
					//TODO: clean up ActivatedTimers ???
					//hide all save buttons
					var cardsBodyClass = '';
					if (type === Events.TIMER){
						cardsBodyClass = ".sepiaFW-cards-list-timers";
					}else if (type === Events.ALARM){
						cardsBodyClass = ".sepiaFW-cards-list-alarms";
					}
					if (cardsBodyClass){
						$(SepiaFW.ui.JQ_RES_VIEW_IDS).find(cardsBodyClass).each(function(){
							var saveBtn = $(this).parent().find('.sepiaFW-cards-list-saveBtn');
							saveBtn.removeClass('active');
						});
					}
					
				},function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				});
			
			}else{
				//TODO: in this case we need to create an alarm first
			}
		}, function(msg){
			//error
			SepiaFW.ui.showPopup(msg);
		});
	}
	
	//Schedulers and animations:
	
	//TimeEvent activation action scheduler
	function scheduleTimeAction(Timer, reloadBackgroundNotification){
		var timeoutLimit = 2000000000; 	//2147483648;
		var timeDiff = Timer.targetTime - (new Date().getTime());
		//stretch timeout
		if (timeDiff >= timeoutLimit){
			clearTimeout(Timer.action);
			Timer.action = setTimeout(function(){
				scheduleTimeAction(Timer);
			}, Math.floor(timeoutLimit/2.0));
			
		//in the past?
		}else if (timeDiff < 0){
			//do nothing for now
			return;
		
		//wait for event
		}else{
			clearTimeout(Timer.action);
			Timer.action = setTimeout(function(){
				SepiaFW.debug.info("TimeEvent - " + Timer.name + ': ACTIVATED');		//DEBUG
				//remove the timer and trigger the UI foreground action
				Events.removeTimeEvent(Timer.name, "", function(){
					//remove success - to prevent conflict between notification and trigger
					Events.triggerAlarm(Timer, '', '', ''); 	//start, end, error
				});
				ActivatedTimers[Timer.name] = Timer;
				
				//graphics
				var domEles = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-id="' + Timer.data.eventId + '"]').find(".timeEventCenter");
				if (domEles.length > 0){
					domEles.addClass("inThePast");
					var scrollCard = $(domEles[0]).closest('.timeEvent');
					var scrollBody = scrollCard.closest(SepiaFW.ui.JQ_RES_VIEW_IDS);
					SepiaFW.ui.scrollToElement(scrollCard[0], scrollBody[0]);
				}
			}, timeDiff);
		}
		
		//prepare notification - notifications run in the background (parallel to the javascript alarm-triggers) and thus need to be managed extra :-(
		if (reloadBackgroundNotification){
			Events.setTimeEventBackgroundNotification(Timer);
		}
	}
	//TimeEvent interval action (e.g. animations)
	function addTimeEventIntervalAction(Timer){
		//TIMER
		if (Timer && Timer.type === Events.TIMER){
			//get all relevant domElements - note: this might come to early here as the elements are not yet added to the DOM :-(
			var domEles = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-id="' + Timer.data.eventId + '"]').find(".sepiaFW-timer-indicator");
			//start animation
			clearInterval(Timer.animation);
			var elementsRetrivalRetry = 0;
			Timer.animation = setInterval((function(){
				if (elementsRetrivalRetry < 3){
					//workaround to give elements time to appear in DOM
					domEles = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-id="' + Timer.data.eventId + '"]').find(".sepiaFW-timer-indicator");
					elementsRetrivalRetry++;
				}
				//refresh domEles by visibility check
				if (domEles.length > 0){
					domEles = domEles.filter(function(index){
						var cardBody = domEles[index].parentNode.parentNode;
						return (cardBody && cardBody.parentNode && cardBody.parentNode.parentNode);
					});
				}
				if (domEles.length < 1){
					if (elementsRetrivalRetry >= 3){
						clearInterval(this.animation);
					}
				}else{
					//still at least one visible
					var prefix = "";
					var left_ms = (Timer.targetTime - (new Date().getTime()));
					if (left_ms <= 0){
						prefix = SepiaFW.local.g('expired') + ": ";
						left_ms = left_ms * -1.0;
					}
					var dd = Math.floor(left_ms/DAY_MS);		left_ms = left_ms - (dd * DAY_MS);
					var hh = Math.floor(left_ms/HOUR_MS);		left_ms = left_ms - (hh * HOUR_MS);
					var mm = Math.floor(left_ms/MIN_MS);		left_ms = left_ms - (mm * MIN_MS);
					var ss = Math.floor(left_ms/SEC_MS);
					var newTime = (prefix + dd + "d " + hh + "h " + mm + "min " + ss + "s").trim();
					domEles.text(newTime);
					//console.log(Timer.name + ': refresh');		//DEBUG
				}
			}).bind(Timer), 1000);
		}
	}
	//TimeEvent synchronization scheduler 
	function scheduleTimeEventsSync(type){
		clearTimeout(SyncSchedulers[type]);
		SyncSchedulers[type] = setTimeout(function(){
			Events.syncTimeEvents(type);
		}, scheduleDelay);
	}
	Events.scheduleTimeEventsSync = scheduleTimeEventsSync;
	
	//EVENTS:
	
	//Background notification 
	Events.setTimeEventBackgroundNotification = function(Timer){
		//console.log('setTimeEventBackgroundNotification'); 		//DEBUG
		if (!Timer || (Timer.targetTime - new Date().getTime())<0){
			//timers of the past are rejected
			return;
		}
		var noteData = {"type" : Timer.type, "action" : "triggered", "data" : Timer.data};
		if (SepiaFW.ui.isCordova){
			var d = new Date(Timer.targetTime + 500);
			var nid = getAndIncreaseNotificationId();
			cordova.plugins.notification.local.schedule([{
				id: nid,
				title: (SepiaFW.local.g(Timer.type) + ": " + d.toLocaleString(SepiaFW.config.appLanguage)),
				text: Timer.data.name,
				trigger: {
					at: (d)
				},
				sound: "file://sounds/alarm.mp3", 		//TODO: is this path working at all?? Its not really a typical valid path :-/
				smallIcon: "res://ic_popup_reminder",
				color: "303030",
				data: noteData,
				wakeup: true
			}]);
			//console.log('addTimeEventNotificationId: ' + nid); 		//DEBUG
			addTimeEventNotificationId(nid);
		}else{
			//we don't have that yet because in-browser events are fired live with message when triggered
		}
	}
	Events.clearAllTimeEventBackgroundNotifications = function(callbackDone){
		//console.log('clearAllTimeEventBackgroundNotifications'); 		//DEBUG
		if (SepiaFW.ui.isCordova){
			var removeIds = getTimeEventNotificationIds();
			//console.log('clear: ' + removeIds); 					//DEBUG
			cordova.plugins.notification.local.cancel(removeIds, function(){
				//console.log('done-clearAllTimeEventBackgroundNotifications'); 		//DEBUG
				//resetTimeEventNotificationIds();		//clearing that here seems to be not reliable
				if (callbackDone) callbackDone();
			});
		}else{
			//console.log('done-clearAllTimeEventBackgroundNotifications'); 		//DEBUG
			if (callbackDone) callbackDone();
		}
	}
	Events.removeTimeEventBackgroundNotification = function(Timer, callbackDone){
		//console.log('removeTimeEventBackgroundNotification'); 		//DEBUG
		if (SepiaFW.ui.isCordova){
			//for now we have to do it the hard way:
			//1) clear all:
			Events.clearAllTimeEventBackgroundNotifications(function(){
				//2) reload all but one:
				thisName = Timer.name;
				$.each(Timers, function(name, Timer){
					if (!Timer || name !== thisName){
						Events.setTimeEventBackgroundNotification(Timer);
					}
				});
				if (callbackDone) callbackDone();
			});
		}else{
			if (callbackDone) callbackDone();
		}
	}
	//note: not used at the moment
	Events.refreshTimeEventBackgroundNotification = function(Timer){
		//console.log('refreshTimeEventBackgroundNotification'); 		//DEBUG
		if (SepiaFW.ui.isCordova){
			//for now we have to do it the hard way:
			//1) clear all:
			Events.clearAllTimeEventBackgroundNotifications(function(){
				//2) reload all:
				Events.reloadAllTimeEventBackgroundNotifications();
			});
		}
	}
	//note: not used at the moment (except ... look one line up ^^)
	Events.reloadAllTimeEventBackgroundNotifications = function(){
		//console.log('reloadAllTimeEventBackgroundNotifications'); 		//DEBUG
		if (SepiaFW.ui.isCordova){
			var now = new Date().getTime();
			$.each(Timers, function(name, Timer){
				if ((Timer.targetTime - now) > 0){
					Events.setTimeEventBackgroundNotification(Timer);
				}
			});
		}
	}
	
	//Alarm clock - Triggered when UI is in foreground (system notification is removed before)
	Events.triggerAlarm = function(Timer, startCallback, endCallback, errorCallback){
		//console.log('triggerAlarm'); 			//DEBUG
		var showSimpleNote = true;
		var playSound = true;
		var showMissedNote = true;
		var doBroadcast = true;
		//in case the app was in background while the timer expired we block certain actions
		if ((new Date().getTime() - Timer.targetTime) > 15000){
			//TODO: How can we land here again?? Awake from sleep-mode?
			showSimpleNote = false;
			playSound = false;
			//we keep the 'missed' note and broadcast
		}
		//if the app is open we trigger a simple notification just to give some visual feedback when the app is in background - it is delayed 
		var titleS = SepiaFW.local.g(Timer.type); //+ ": " + (new Date().toLocaleString());
		var textS = SepiaFW.local.g('expired') + ": " + Timer.data.name;
		if (showSimpleNote){
			setTimeout(function(){
				var noteData = {
					type : "alarm",
					onClickType : "stopAlarmSound",
					onCloseType : "stopAlarmSound"
				};
				Events.showSimpleSilentNotification(titleS, textS, noteData);
			}, 50);
		}
		//play sound
		if (playSound){
			if (SepiaFW.audio){
				SepiaFW.audio.playAlarmSound(startCallback, endCallback, errorCallback);
			}else{
				SepiaFW.debug.err("Alarm: Audio CANNOT be played, SepiaFW.audio is missing!");
			}
		}
		//add missed message?
		if (showMissedNote){
			if (!SepiaFW.ui.isVisible()
				|| (SepiaFW.frames && SepiaFW.frames.isOpen)
				|| (SepiaFW.teach && SepiaFW.teach.isOpen)
			){
				//SepiaFW.ui.addMissedMessage(); 		//this is handled inside UI.addDataToResultView call of the 'showInfo' item
				var customTag = Timer.data.eventId;
				SepiaFW.ui.showInfo(SepiaFW.local.g('missed') + "? " + titleS + " " + textS, true, customTag);
			}
		}
		//broadcast event
		if (doBroadcast){
			broadcastAlarmTrigger({
				timeUnix: Timer.targetTime,
				type: Timer.type,
				id: Timer.name,
				title: (Timer.data? Timer.data.name : Timer.type)
			});
		}
	}
	
	//------------- other notifications --------------
	
	var browserNotificationTimers = {};
	Events.cancelSimpleNotification = function(nid){
		if (SepiaFW.ui.isCordova){
			cordova.plugins.notification.local.cancel([nid]);
			
		}else if (SepiaFW.ui.notification){
			if (nid in browserNotificationTimers){
				clearTimeout(browserNotificationTimers[nid]);
				delete browserNotificationTimers[nid];
			}
		}
	}
	
	//Simple direct notifications
	Events.showSimpleSilentNotification = function(titleS, textS, data){
		//console.log('showSimpleSilentNotification'); 		//DEBUG
		Events.showSimpleNotification(titleS, textS, 'null', data);
	}
	Events.showSimpleNotification = function(titleS, textS, soundFile, data){
		//console.log("actions: " + JSON.stringify(data)); 		//DEBUG
		Events.scheduleSimpleNotification(titleS, textS, soundFile, data);
	}
	Events.scheduleSimpleNotification = function(titleS, textS, soundFile, data, date, msgId){
		var nid = -1;
		if (date && (date.getTime() - new Date().getTime())<0){
			//timers of the past are rejected
			return nid;
		}
		nid = msgId || getAndIncreaseNotificationId();
		if (SepiaFW.ui.isCordova){
			var options = {
				id: nid,
				title: titleS,
				text: textS,
				smallIcon: "res://ic_popup_reminder",
				color: "303030",
				data: (data? data : {}),
				wakeup: false
			}
			//sound
			if (soundFile && soundFile == 'null'){
				options.sound = null;
			}else{
				options.sound = (soundFile? soundFile : "res://platform_default");
			}
			//schedule
			if (date){
				options.trigger = {
					at: date
				}
			}
			cordova.plugins.notification.local.schedule([options]);
			
		}else if (SepiaFW.ui.notification){
			//schedule
			var delay = 50;
			if (date){
				//TODO: convert delay
				//delay = ???
			}
			var options = {
				data: (data? data : {})
			}
			browserNotificationTimers[nid] = setTimeout(function(){
				SepiaFW.ui.notification.send(textS, titleS, options, function(note){
					window.focus();
					note.close();
					Events.handleLocalNotificationClick(data);
				}, function(note){
					Events.handleLocalNotificationClose(data);
				});
				//trigger event
				Events.trackLocalNotificationTrigger(data);
				//sound
				if (soundFile && soundFile != 'null'){
					//TODO: add sound
				}
			}, delay);
		}
		return nid;
	}
	
	//handle click events on simple notifications
	Events.handleLocalNotificationClick = function(data){
		//reply sender
		if (data && data.onClickType && data.onClickType == "replySender" && data.sender){
			var chatInput = document.getElementById("sepiaFW-chat-input");
			if (chatInput){
				setTimeout(function(){
					chatInput.focus();
					chatInput.value = '@' + data.sender + " ";
				}, 300);
			}
		
		//alarm trigger
		}else if (data && data.type == "alarm"){
			if (data.onClickType == "stopAlarmSound"){
				//stop alarm
				if (SepiaFW.audio && SepiaFW.audio.alarm.isPlaying){
					SepiaFW.audio.stopAlarmSound("notificationClick");
				}
			}
		
		//pro-active chat message
		}else if (data && (data.type === "entertainWhileIdle" || data.type === "proActiveNote") && data.data){
			var msg = data.data.message;
			setTimeout(function(){
				var dataOut = { 
					sender: SepiaFW.assistant.name, 
					senderType: 'assistant', 	 	//valid for both types?
					channelId: (data.data.channelId || 'info')
				};
				SepiaFW.ui.showCustomChatMessage(msg, dataOut);
			}, 300);
		}
		
	}
	//handle close events on simple notifications
	Events.handleLocalNotificationClose = function(data){
		//alarm trigger
		if (data && data.type == "alarm"){
			if (data.onCloseType == "stopAlarmSound"){
				//stop alarm
				if (SepiaFW.audio && SepiaFW.audio.alarm.isPlaying){
					SepiaFW.audio.stopAlarmSound("notificationClose");
				}
			}
		}
	}
	
	//track which notifications were triggered (received) to prevent repeated execution
	Events.trackLocalNotificationTrigger = function(note){
		//we are only interested in events with fix ID at the moment
		//example eventIds: "randomMotivationMorning", "haveLunch", ...
		if (note.type == "entertainWhileIdle" || note.type == "proActiveNote"){
		    if (note.data && note.data.eventId && note.data.created){
		        //get cleaned-up, recent, existing events
		        var recentlyTriggeredProActiveEvents = Events.getCleanedUpRecentProActiveEvents(note.data.eventId);
				var now = new Date().getTime();
				var tooOld = getRecentProActiveEventsExpireTime();
                //add new
                if ((now - note.data.created) <= tooOld){
                    recentlyTriggeredProActiveEvents.push({
                        ts: note.data.created,
                        eid: note.data.eventId
                    });
                }
                //store modifications
                SepiaFW.data.set('sepia-recent-pro-active-events', JSON.stringify(recentlyTriggeredProActiveEvents));
		    }
		}
	}
	Events.getCleanedUpRecentProActiveEvents = function(filterEvent){
		//get existing
		var recentlyTriggeredProActiveEvents = SepiaFW.data.get('sepia-recent-pro-active-events');
		//console.log(recentlyTriggeredProActiveEvents);      //DEBUG
		if (recentlyTriggeredProActiveEvents && recentlyTriggeredProActiveEvents.indexOf('[') == 0){
			recentlyTriggeredProActiveEvents = JSON.parse(recentlyTriggeredProActiveEvents);
		}else{
			recentlyTriggeredProActiveEvents = [];
		}
		//clean-up old (and same)
		var now = new Date().getTime();
		var tooOld = getRecentProActiveEventsExpireTime();
		var i = recentlyTriggeredProActiveEvents.length;
		while (i--){
			var ev = recentlyTriggeredProActiveEvents[i];
			if (ev.eid == filterEvent || (now - ev.ts) > tooOld){
				recentlyTriggeredProActiveEvents.splice(i, 1);
			}
		}
		return recentlyTriggeredProActiveEvents;
	}
	Events.getRecentProActiveEventsReduced = function(){
		var recentPAEvents = Events.getCleanedUpRecentProActiveEvents();
		var now = new Date().getTime();
		var recentPAEventsReduced = {};		//reduced to id:age
		recentPAEvents.forEach(function(e){
			recentPAEventsReduced[e.eid] = (now - e.ts);
		});
		return recentPAEventsReduced;
	}
	function getRecentProActiveEventsExpireTime(){
		return (1000*60*60*13);     //13h
	}
	
	return Events;
}