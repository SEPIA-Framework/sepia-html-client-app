//ACTIONS
function sepiaFW_build_ui_actions(){
	var Actions = {};

	//Simple delay queue that waits for next idle state - NOTE: don't mistake this for 'command queue' (client)
	//Executes all functions in next idle state so MAKE SURE! they don't interfere with each other!
	var delayQueue = {};
	var delayQueueTimers = {};
	var delayId = 0;
	Actions.delayFunctionUntilIdle = function(fun, idleState, timeoutDelay, timeoutMessage){
		delayId++;
		if (delayId > 64000) delayId = 0;
		if (!idleState) idleState = "any"; 		//could be: unknown, ttsFinished, dialogFinished, asrFinished, anyButAsr
		delayQueue[delayId] = {
			fun: fun,
			idleState: idleState,
			id: delayId
		};
		if (timeoutDelay){
			delayQueueTimers[delayId] = setTimeout(function(){
				SepiaFW.ui.showInfo(timeoutMessage || ("Delayed function lost due to timeout - Id: " + delayId));
				delete delayQueue[delayId];
			}, timeoutDelay);
		}
		//NOTE: At the time of this function call the state can actually BE IDLE (short transient)
		//Should we add a timeout fallback?
		//console.error("delayFunction", "state", SepiaFW.animate.assistant.getState());		//DEBUG
	}
	Actions.executeDelayedFunctionsAndRemove = function(stateFilter){
		var cleanUpIds = [];
		$.each(delayQueue, function(i, queueData){
			//console.log("delayed call: " + JSON.stringify(queueData)); 		//DEBUG
			if (!stateFilter 
				|| queueData.idleState == "any" 
				|| (queueData.idleState == stateFilter)
				|| (queueData.idleState == "anyButAsr" && stateFilter != "asrFinished")
			){
				clearTimeout(delayQueueTimers[queueData.id]);
				queueData.fun();
				cleanUpIds.push(queueData.id);
			}
		});
		for (var i=0; i<cleanUpIds.length; i++){
			delete delayQueue[cleanUpIds[i]];
			delete delayQueueTimers[cleanUpIds[i]];
		}
	}
	Actions.getDelayQueueSize = function(){
		//console.log('DelayQueue size: ' + delayQueue.length); 		//DEBUG
		return Object.keys(delayQueue).length;
	}
	Actions.clearDelayQueue = function(){
		delayQueue = {};
		Object.keys(delayQueueTimers).forEach(function(dId){
			clearTimeout(delayQueueTimers[dId]);
		});
		delayQueueTimers = {};
	}

	//custom action event dispatcher
	function dispatchCustomActionEvent(actionEvent){
		if (actionEvent && actionEvent.name){
			var evn = 'sepia_action_custom_event_' + actionEvent.name;
			var event = new CustomEvent(evn, { 
				detail: actionEvent.data
			});
			document.dispatchEvent(event);
		}
	}
	
	//note: 'action' is 'actionInfo[i]'

	//button BUILDER
	function buildActionButton(title, className, fun){
		var btn = document.createElement('BUTTON');
		btn.className = className;
		if (fun){
			addFunToActionButton(btn, fun);
		}
		btn.textContent = title;
		return btn;
	}
	function addFunToActionButton(btn, fun){
		SepiaFW.ui.onclick(btn, function(){
			fun();
		}, true);
	}
	
	//BUTTON Help
	Actions.addButtonHelp = function(action, parentBlock){
		var helpBtn = buildActionButton(
			action.title || SepiaFW.local.g('help'),
			'chat-button-help',
			function(){
				var newAction = {};
				newAction.info = "direct_cmd";
				newAction.cmd = "chat;;type=help;;";
				newAction.options = { skipTTS : true, skipText : true, targetView : "bigResults" };
				Actions.openCMD(newAction);
			}
		);
		parentBlock.appendChild(helpBtn);
	}
	
	//BUTTON TeachUI
	Actions.addButtonTeachUI = function(action, parentBlock){
		if (SepiaFW.teach){
			var info = action.info;
			var teachBtn = buildActionButton(
				action.title || SepiaFW.local.g('teach_ui_btn'),
				'chat-button-teach',
				function(){
					SepiaFW.ui.closeAllMenus();
					SepiaFW.teach.openUI(info);
				}
			);
			parentBlock.appendChild(teachBtn);
		}
	}
	//BUTTON Frames-layer view
	Actions.addButtonFrameView = function(action, parentBlock){
		if (SepiaFW.frames){
			var info = action.info;
			var framesBtn = buildActionButton(
				action.title || info.frameName || SepiaFW.local.g('frames_view_btn'),
				'chat-button-frames',
				function(){
					SepiaFW.ui.closeAllMenus();
					SepiaFW.frames.open(info);
				}
			);
			parentBlock.appendChild(framesBtn);
		}
	}
	//OPEN Frames-layer view
	Actions.openFrameView = function(action){
		if (SepiaFW.frames){
			SepiaFW.ui.closeAllMenus();
			SepiaFW.frames.open(action.info);
			//alternative: SepiaFW.ui.openViewOrFrame(action.info.pageUrl);
		}
	}
	//CLOSE Frames-layer view
	Actions.closeFrameView = function(action){
		if (SepiaFW.frames && SepiaFW.frames.isOpen){
			SepiaFW.frames.close();
		}
	}
	//Send ACTION to Frames-layer view
	Actions.frameViewAction = function(action){
		var didSubmit = false;
		if (SepiaFW.frames && SepiaFW.frames.isOpen){
			if (SepiaFW.frames.currentScope && SepiaFW.frames.currentScope.actionHandler){
				SepiaFW.frames.currentScope.actionHandler(action.info);
				didSubmit = true;
			}
		}
		if (!didSubmit){
			//error message
			SepiaFW.assistant.waitForOpportunityAndSay("<error_client_control_0b>", function(){
				//Fallback after max-wait:
				SepiaFW.ui.showInfo(SepiaFW.local.g('cant_execute') + " - Frame view action");
			}, 2000, 30000);    //min-wait, max-wait
		}
	}
	
	//BUTTON Custom function
	Actions.addButtonCustomFunction = function(action, sender, parentBlock){
		if (!action.fun) return;
		if (sender) action.sender = sender;
		var funBtn = buildActionButton(
			action.title || "FUNCTION",
			'chat-button-custom-fun'
		);
		funBtn.setAttribute("data-sender", action.sender);
		funBtn.setAttribute("data-fun", action.fun);
		//funBtn.title = ("Function: " + action.fun);
		var actionFun;
		if (typeof action.fun === 'string'){
			if (action.fun.indexOf("controlFun;;") >= 0){
				//it is a control function given as string...
				var funParts = action.fun.split(";;");
				funParts.shift();
				var fun = funParts.shift();
				var act = funParts.shift();
				if (act && act.indexOf("{") == 0){
					act = JSON.parse(act);
				}
				actionFun = function(){
					Actions.clientControlFun({
						"fun": fun,
						"controlData": act,
						"delayUntilIdle": false
					}, sender);
				};	
			}
		}else{
			actionFun = function(){
				action.fun(funBtn);
			};
		}
		addFunToActionButton(funBtn, actionFun);
		parentBlock.appendChild(funBtn);
	}
	//CLIENT Control function
	/*
	Actions.clientControlFun = function(action, sender){
		if (action && action.fun){
			SepiaFW.client.controls.handle(action.fun, action.controlData);
		}
	}
	*/
	Actions.clientControlFun = function(action, sender, delayUntilIdle){
		if (!action || !action.fun){
			return;
		}
		if (delayUntilIdle || action.delayUntilIdle){
			Actions.delayFunctionUntilIdle(function(){
				SepiaFW.client.controls.handle(action.fun, action.controlData);
			}, "any",	//idleState req. (change?)
			8000, "Failed to trigger client controls (timeout).");
		}else{
			SepiaFW.client.controls.handle(action.fun, action.controlData);
		}
	}
	
	//BUTTON URLs
	Actions.addButtonURL = function(action, parentBlock){
		var urlBtn = buildActionButton(
			action.title || "URL",
			'chat-button-url',
			function(){
				Actions.openURL(action);
			}
		);
		urlBtn.setAttribute("data-url", action.url);
		parentBlock.appendChild(urlBtn);
	}
	
	//OPEN URLs
	Actions.openURL = function(action, forceExternal){
		if (!action.url) return;
		if (action.skipIfEmbeddable){
			if (SepiaFW.ui.cards.canEmbedUrl(action.url)){
				//Cards will show it (or at least try)
				return;
			}
		}
		Actions.openUrlAutoTarget(action.url, forceExternal);
	}
	var inAppBrowserDefaultOptions = [
		'location=yes', 'toolbar=yes', 'hidenavigationbuttons=no', 'hardwareback=yes', 'disableswipenavigation=no',
		'footer=no', 'mediaPlaybackRequiresUserAction=yes', 'allowInlineMediaPlayback=yes',
		'enablethirdpartycookies=no', 'clearsessioncache=no', 'clearcache=no'
	].join(",");
	function getInAppBrowserOptions(){
		//we keep a dark style because the nav-bar is dark
		var toolbarColor = "#000000";
		var toolbarAccent = "#ceff1a";
		var toolbarText = "#eeeeee";
		//we try to set a custom accent if it fits to black
		if (SepiaFW.ui.assistantColorPlainHex && SepiaFW.ui.assistantColorContrast == "black"){
			toolbarAccent = SepiaFW.ui.assistantColorPlainHex;
		}else if (SepiaFW.ui.navBarColor && SepiaFW.ui.navBarColorContrast && SepiaFW.ui.navBarColorContrast == "black"){
			toolbarAccent = SepiaFW.ui.navBarColor;
		}
		return [inAppBrowserDefaultOptions,
			'toolbarcolor=' + toolbarColor, 'toolbaraccentcolor=' + toolbarAccent, 'toolbartextcolor=' + toolbarText
		].join(",");
	}
	Actions.openUrlAutoTarget = function(url, forceExternal){
		if (!url) return;

		//tiny and headless do not support URL action
		if (SepiaFW.ui.isTinyApp || SepiaFW.ui.isHeadless){
			//Tiny and headless apps usually have no ability to open in-app browser
			SepiaFW.assistant.waitForOpportunityAndSay("<error_client_support_0a>", function(){
				//Fallback after max-wait:
				SepiaFW.ui.showInfo(SepiaFW.local.g('no_client_support'));
			}, 2000, 30000);    //min-wait, max-wait
			return;
		}

		//check URL vor sanity (at least a bit)
		var hasValidUrlProtocol = SepiaFW.tools.urlHasValidProtocol(url);
		var isSpecialUrl = (url == "<inappbrowser-last>" || url == '<inappbrowser-home>' 
				|| url.indexOf("search.html") == 0 || url.indexOf("license.html") == 0);	//TODO: better handling of whitelist
		if (!hasValidUrlProtocol && !isSpecialUrl){
			var question = document.createElement("div");
			var p = document.createElement("p");
			p.textContent = "Open URL:";
			question.appendChild(p);
			var unsafeContent = document.createElement("textarea");
			unsafeContent.textContent = url;
			question.appendChild(unsafeContent);
			SepiaFW.ui.askForPermissionToExecute(question, function(){
				//open
				openUrlAutoTargetFun(url, forceExternal);
			}, function(){
				SepiaFW.debug.error("Action - 'openUrlAutoTarget' blocked due to suspicious URL: " + url);
			});
		}else{
			//open
			openUrlAutoTargetFun(url, forceExternal);
		}
	}
	function openUrlAutoTargetFun(url, forceExternal){
		var urlLower = url.toLowerCase();
		if (SepiaFW.ui.isCordova){
			if (forceExternal 
				|| (urlLower.indexOf('http') !== 0 && !!urlLower.match(/^\w+:/)) 		//TODO: keep an eye on this! Does it prevent some cool URL scheme features?
				|| urlLower.indexOf('https://maps.') === 0 || urlLower.indexOf('http://maps.') === 0
				|| urlLower.indexOf('https://www.google.com/maps/') === 0 || urlLower.indexOf('https://www.google.de/maps/') === 0
				|| urlLower.indexOf('https://itunes.apple.com/') === 0 || urlLower.indexOf('https://music.apple.com/') === 0 || urlLower.indexOf('https://geo.itunes.apple.com/') === 0
				|| urlLower.indexOf('https://open.spotify.com/') === 0
				){
				cordova.InAppBrowser.open(url, '_system');
			}else{
				cordova.InAppBrowser.open(url, '_blank', getInAppBrowserOptions());
				//some special 'links': <inappbrowser-last>, <inappbrowser-home>, search.html
			}
		}else{
			var newWindow = window.open(url, '_blank');
			if (newWindow && newWindow.opener){
				newWindow.opener = null;
				//some special links that should not leave an empty browser tab
				if (urlLower.indexOf('spotify:') == 0 || urlLower.indexOf('itmss:') == 0 || urlLower.indexOf('musics:') == 0){
					setTimeout(function(){
						newWindow.close(); 		//NOTE: problem here is that app-request dissapears before user interaction if not already allowed by user
					}, 500);
				}
			}else{
				SepiaFW.ui.showInfo("Website pop-up blocked.");
			}
		}
	}
	
	//BUTTON CMDs
	Actions.addButtonCMD = function(action, sender, parentBlock){
		if (sender) action.sender = sender;
		var cmdBtn = buildActionButton(
			action.title || "CMD",
			'chat-button-cmd',
			function(){
				Actions.openCMD(action);
				SepiaFW.debug.info("Action - sending button-cmd: " + action.cmd);
			}
		);
		cmdBtn.setAttribute("data-sender", action.sender);
		cmdBtn.setAttribute("data-cmd", action.cmd);
		parentBlock.appendChild(cmdBtn);
	}

	//OPEN CMDs
	Actions.openCMD = function(action){
		if (SepiaFW.client){
			if (!action.options){
				action.options = {};
			}
			if (!action.options.targetView){
				//add default view
				action.options.targetView = "chat";
			}
			SepiaFW.client.sendCommand(action);	//handles options
		}else{
			SepiaFW.debug.info("Action: button type 'openCMD' is not supported yet.");
		}
	}
	
	//QUEUE CMDs - Note: these commands are executed in idle state with "openCMD" (so they have to support this)
	Actions.queueCMD = function(action){
		if (SepiaFW.client){
			SepiaFW.client.queueCommand(action);
		}else{
			SepiaFW.debug.info("Action: 'queueCMD' is not supported yet.");
		}
	}

	//BUTTON custom action event
	Actions.addButtonCustomActionEvent = function(action, parentBlock){
		var evBtn = buildActionButton(
			action.title || "EVENT",
			'chat-button-custom-action-event',
			function(){
				dispatchCustomActionEvent(action);
				SepiaFW.debug.info("Action - dispatching custom action ev.: " + action.name);
			}
		);
		evBtn.setAttribute("data-ca-event", action.name);
		parentBlock.appendChild(evBtn);
	}
	
	//HTML RESULT ACTION
	Actions.buildHtmlResultAction = function(action, parentBlock, handleOptions){
		if (SepiaFW.ui.cards){
			//build card from html data
			var card = SepiaFW.ui.cards.buildCustomHtmlCardFromAction(action);
			var resultView;
			
			//check options for target view
			if (handleOptions.targetView && parentBlock){
				//this has highest prio since the handler is waiting for data in parentBlock
				parentBlock.appendChild(card);
			}else if (action.options && action.options.targetView){
				//get right view
				resultView = SepiaFW.ui.getResultViewByName(action.options.targetView);
				SepiaFW.ui.addDataToResultView(resultView, card, false, true, 500);
			}else if (!parentBlock){
				//get default view
				resultView = SepiaFW.ui.getResultViewByName("chat");
				SepiaFW.ui.addDataToResultView(resultView, card, false, true, 500);
			}else{
				parentBlock.appendChild(card);
			}
		}else{
			SepiaFW.debug.info("Action: type 'show_html_result' is not supported yet.");
		}
	}
	
	//PLAY AUDIO STREAM
	Actions.playAudioURL = function(action, triggeredViaButton){
		if (SepiaFW.speech.isSpeaking() || SepiaFW.speech.isWaitingForSpeech()){	//its starting to get messy here with all the exceptions, we need a proper event queue ...
			//do something to delay start?
		}
		if (!triggeredViaButton){
			var idleState = "anyButAsr";
			Actions.delayFunctionUntilIdle(function(){
				playAction(action);
			}, idleState,
			14000, "Failed to trigger audio player (timeout).");
		}else{
			playAction(action);
		}
	}
	function playAction(action){
		SepiaFW.audio.playerSetVolumeTemporary(1.0); 		//<-- to start smoothly
		if (!action.audio_url){
			action.audio_url = SepiaFW.audio.getLastAudioStream();
			action.audio_title = (action.audio_url)? SepiaFW.audio.getLastAudioStreamTitle() : "";
		}
		SepiaFW.audio.playURL(action.audio_url, '', function(){
			SepiaFW.audio.playerFadeToOriginalVolume();
		});//, onEndCallback, onErrorCallback)
		SepiaFW.audio.setPlayerTitle(action.audio_title, 'stream');
	}
	//STOP AUDIO STREAM
	Actions.stopAudio = function(action){
		//SepiaFW.debug.info("Action: type 'stop_audio_stream'.");
		SepiaFW.client.controls.media({
			action: "stop"
		});
	}
	
	//SCHEDULE Messages
	Actions.scheduleMessage = function(action, parentBlock){
		//TODO: distinguish between proActive-background and other types of messages
		if (action.info && (action.info === "entertainWhileIdle" || action.info === "proActiveNote")){
			SepiaFW.events.setProActiveBackgroundNotification(action);
		}else{
			SepiaFW.debug.info("Action: type '" + action.type + "' with info '" + action.info + "' is not supported yet.");
		}
	}
	
	//TIMERs and ALARMs
	Actions.timerAndAlarm = function(action, parentBlock){
		//SET
		if (action.info === "set"){
			if (action.eleType === SepiaFW.events.TIMER){
				Actions.setTimer(action, parentBlock);
			}else if (action.eleType === SepiaFW.events.ALARM){
				Actions.setAlarm(action, parentBlock);
			}else{
				SepiaFW.debug.info("Action: type '" + action.type + "' with eleType '" + action.eleType + "' is not supported yet.");
			}
		//REMOVE
		}else if (action.info === "remove"){
			var Timer = SepiaFW.events.getRunningOrActivatedTimeEventById(action.eventId);
			if (Timer){
				//remove event
				SepiaFW.events.removeTimeEvent(Timer.name);
				//clear DOM?
				$timerElements = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-id="' + Timer.data.eventId + '"]');
				$timerElements.closest('.sepiaFW-cards-flexSize-container.oneElement').remove();
				$timerElements.remove();
			}
			
		}else{
			SepiaFW.debug.info("Action: type '" + action.type + "' with info '" + action.info + "' is not supported yet.");
		}
	}
	//TIMER
	Actions.setTimer = function(action, parentBlock){
		setTimeEvent(SepiaFW.events.TIMER, action, parentBlock);
	}
	//ALARM
	Actions.setAlarm = function(action, parentBlock){
		setTimeEvent(SepiaFW.events.ALARM, action, parentBlock);
	}
	//... set method
	function setTimeEvent(eventType, action, parentBlock){
		var card;
		var timeEventEle;
		if (SepiaFW.ui.cards){
			card = SepiaFW.ui.cards.buildTimeEventElementFromAction(action, eventType);
			timeEventEle = $(card).find('.timeEvent')[0];
			
			if (parentBlock){
				if (parentBlock.id == 'sepiaFW-my-view'){
					SepiaFW.ui.myView.addElement(card, true);
				}else{
					parentBlock.appendChild(card);
				}
			}else{
				SepiaFW.ui.insertEle("sepiaFW-chat-output", card);
				SepiaFW.ui.scrollToBottom("sepiaFW-chat-output");
			}
		}
		SepiaFW.events.addOrRefreshTimeEvent(action.targetTimeUnix, eventType, action);
	}

	//SWITCH LANGUAGE
	Actions.switchLanguage = function(action){
		if (action.language_code){
			var lang, region;
			if (action.language_code.indexOf("-") == 2){
				var langAndRegion = action.language_code.split("-");
				lang = langAndRegion[0].toLowerCase();
				region = langAndRegion[1].toUpperCase();
			}else if (action.language_code.length == 2){
				lang = action.language_code;
			}else{
				SepiaFW.debug.error("language-switch action FAILED. Wrong language code: " + action.language_code);
				return;
			}
			//TODO: should we delay this until the answer is finished?
			if (lang){
				var foundLang = SepiaFW.local.getSupportedAppLanguages()
					.filter(function(sl){ return !sl.disabled && sl.value == lang; }).length;
				var foundRegion;
				var bcp47;
				if (foundLang && region){
					bcp47 = (lang + "-" + region);
					foundRegion = SepiaFW.local.getExperimentalAppLanguages()
						.filter(function(reg){ return reg.value == bcp47; }).length;
				}
				if (foundRegion){
					SepiaFW.debug.log("language-switch action - app lang.: " + lang + " - speech lang.: " + bcp47);
					SepiaFW.config.broadcastLanguage(lang, bcp47, action.skip_save);
				}else if (foundLang){
					SepiaFW.debug.log("language-switch action - app lang.: " + lang + " - speech lang.: default");
					SepiaFW.config.broadcastLanguage(lang, undefined, action.skip_save);
				}
			}
		}
	}

	//SWITCH STT ENGINE
	Actions.switchSttEngine = function(action){
		if (action.engine){
			var info;
			if (action.url){
				info = { url: action.url };
			}
			var engineSet = SepiaFW.speech.setAsrEngine(action.engine, info);
			if (engineSet != action.engine){
				//error message
				SepiaFW.assistant.waitForOpportunityAndSay("<error_client_control_0a>", function(){
					//Fallback after max-wait:
					SepiaFW.ui.showInfo(SepiaFW.local.g('cant_execute') + " - STT engine");
				}, 2000, 30000);    //min-wait, max-wait
			}
		}
	}
	
	//EVENTS START
	Actions.buildMyEventsBox = function(action, parentBlock){
		//fadeout old
		var	aButtonsAreaReplaced = document.getElementById('sepiaFW-myEvents-buttons');
		if (aButtonsAreaReplaced){
			//temporary disable interaction with my-view to prevent false click
			$('#sepiaFW-my-view').addClass('disabled');
			//remove
			aButtonsAreaReplaced.id = 'sepiaFW-myEvents-buttons-replaced';
			var oldEventsParent = $(aButtonsAreaReplaced).closest('.chatMsg');
			oldEventsParent.hide(300, function(){
				oldEventsParent.remove();
			});
		}else{
			//first events
			$('#sepiaFW-my-view-intro').remove(); 		//remove welcome message
		}
		//make new
		var	aButtonsArea = document.createElement('DIV');
		aButtonsArea.id = 'sepiaFW-myEvents-buttons';
		aButtonsArea.className = 'chat-buttons-area';
		aButtonsArea.style.display = 'none';
		//header
		var titleNote = document.createElement('P');
		titleNote.className = 'sepiaFW-myEvents-titleNote';
		var d = new Date();
		titleNote.textContent = SepiaFW.local.g('recommendationsFor') + " " 
			+ SepiaFW.account.getUserName() + " " + SepiaFW.local.g('from') + " "
			+ d.toLocaleTimeString(SepiaFW.config.appLanguage, {hour: 'numeric', minute:'2-digit'}) + " " + SepiaFW.local.g('oclock') + ":";
		$(aButtonsArea).prepend(titleNote);
		
		//show again on top
		$(parentBlock).append(aButtonsArea);
		setTimeout(function(){
			//show and enable everything again
			$(aButtonsArea).show(300, function(){
				$('#sepiaFW-my-view').removeClass('disabled');
			});
		}, 200);
		
		return aButtonsArea;
	}
	
	//Build client-first-start box
	Actions.buildClientFirstStartBox = function(action, parentBlock){
		//fadeout old
		var	aButtonsAreaReplaced = document.getElementById('sepiaFW-myFirstStart-buttons');
		if (aButtonsAreaReplaced){
			aButtonsAreaReplaced.id = 'sepiaFW-myFirstStart-buttons-replaced';
			var oldFirstStartParent = $(aButtonsAreaReplaced).closest('.chatMsg');
			oldFirstStartParent.fadeOut(300, function(){
				oldFirstStartParent.remove();
			});
		}
		//make new
		var	aButtonsArea = document.createElement('DIV');
		aButtonsArea.id = 'sepiaFW-myFirstStart-buttons';
		aButtonsArea.className = 'chat-buttons-area';
		aButtonsArea.style.display = 'none';
		//header
		var titleNote = document.createElement('P');
		titleNote.className = 'sepiaFW-myFirstStart-titleNote';
		titleNote.textContent = SepiaFW.local.g('forNewcomers') + ":";
		$(aButtonsArea).prepend(titleNote);
		
		//show again on top
		$(parentBlock).append(aButtonsArea);
		$(aButtonsArea).fadeIn(500);
		
		return aButtonsArea;
	}
	
	//-----Handler-----
	Actions.handle = function(data, parentBlock, sender, handleOptions, isSafeSource){
		if (data.actionInfo){
			//handle options
			if (!handleOptions) handleOptions = {};
			var doButtonsOnly = handleOptions.doButtonsOnly || !isSafeSource;
			
			//buttons will be collected here:
			var aButtonsArea = document.createElement('DIV');
			aButtonsArea.className = 'chat-buttons-area';
			parentBlock.appendChild(aButtonsArea); 	//we just assume its there and place it here before any other actions
			//iterate:
			for (var i = 0; i < data.actionInfo.length; i++) {
				var type = data.actionInfo[i].type;
				//run through all actions
				if (type){
					if (doButtonsOnly){
						if (type.indexOf('button_') !== 0){
							SepiaFW.debug.log("Skipped action due to unsafe trigger (or by request): " + type);		//DEBUG
							continue;
						}
					}
					//Events - if there are events this will be triggered first
					if (type === 'events_start'){
						//... check info?
						parentBlock.removeChild(aButtonsArea); 	//we will create a new one
						aButtonsArea = Actions.buildMyEventsBox(data.actionInfo[i], parentBlock);
						
					//First client visit info actions in my-view - if there are any this will be triggered first
					}else if (type === 'first_visit_info_start'){
						parentBlock.removeChild(aButtonsArea); 	//we will create a new one
						aButtonsArea = Actions.buildClientFirstStartBox(data.actionInfo[i], parentBlock);

					//Open URL
					}else if (type === 'open_in_app_browser'){
						Actions.openURL(data.actionInfo[i]);
					}else if (type === 'open_url'){
						Actions.openURL(data.actionInfo[i], true);

					//HTML result
					}else if (type === 'show_html_result'){
						Actions.buildHtmlResultAction(data.actionInfo[i], parentBlock, handleOptions);
					}else if (type === 'show_html_sandbox'){
						//TODO: ...
						console.error("TODO: show_html_sandbox");
					
					//BUTTON - help
					}else if (type === 'button_help'){
						Actions.addButtonHelp(data.actionInfo[i], aButtonsArea);
						
					//BUTTON - teach UI
					}else if (type === 'button_teach_ui'){
						Actions.addButtonTeachUI(data.actionInfo[i], aButtonsArea);
					
					//BUTTON - frames view
					}else if (type === 'button_frames_view'){
						Actions.addButtonFrameView(data.actionInfo[i], aButtonsArea);
					
					//Open frames view
					}else if (type === 'open_frames_view'){
						Actions.openFrameView(data.actionInfo[i]);
					
					//Close frames view
					}else if (type === 'close_frames_view'){
						Actions.closeFrameView(data.actionInfo[i]);

					//Frames view action
					}else if (type === 'frames_view_action'){
						Actions.frameViewAction(data.actionInfo[i]);
					
					//BUTTON - url
					}else if (type === 'button_url' || type === 'button_in_app_browser'){
						Actions.addButtonURL(data.actionInfo[i], aButtonsArea);
						
					//BUTTON - cmd
					}else if (type === 'button_cmd'){
						Actions.addButtonCMD(data.actionInfo[i], sender, aButtonsArea);

					//Queue CMD - Note: these commands are executed in idle state with "openCMD" (so they have to support this)
					}else if (type === 'queue_cmd'){
						Actions.queueCMD(data.actionInfo[i]);
						
					//Schedule CMD - Note: will wait for idle
					}else if (type === 'schedule_cmd'){
						//TODO (targetTimeUnix, can we give timers an action?)
						console.error("TODO: schedule_cmd");
						
					//BUTTON - custom function
					}else if (type === 'button_custom_fun'){
						Actions.addButtonCustomFunction(data.actionInfo[i], sender, aButtonsArea);

					//Open client control function (pre-defined, "safe" functions)
					}else if (type === 'client_control_fun'){
						Actions.clientControlFun(data.actionInfo[i], sender);

					//Open settings - NOTE: we use this as button because its usually used for "you can add your address" notes etc.
					}else if (type === 'open_settings'){
						//section: addresses (3), favorites (x), contacts (x)
						Actions.addButtonCustomFunction({
							title: SepiaFW.local.g(data.actionInfo[i].section),
							fun: function(){ SepiaFW.ui.toggleSettings(0); }
						}, sender, aButtonsArea);

					//BUTTON - custom action event
					}else if (type === 'button_custom_event'){
						Actions.addButtonCustomActionEvent(data.actionInfo[i], aButtonsArea);

					//Trigger - custom action event
					}else if (type === 'trigger_custom_event'){
						dispatchCustomActionEvent(data.actionInfo[i]);

					//Show dialog abort button
					}else if (type === 'show_abort'){
						var title = SepiaFW.local.g('abort');
						//var abortAction = SepiaFW.offline.getCmdButtonAction("abort", title, false);
						//Actions.addButtonCMD(abortAction, sender, aButtonsArea);
						var abortAction = SepiaFW.offline.getCustomFunctionButtonAction(function(btn){
							SepiaFW.ui.resetMicButton();
							$(btn).fadeOut(300, function(){ $(btn).remove(); });
						}, title);
						Actions.addButtonCustomFunction(abortAction, sender, aButtonsArea);
					
					//Audio stream
					}else if (type === 'play_audio_stream'){
						Actions.playAudioURL(data.actionInfo[i]);
					}else if (type === 'stop_audio_stream'){
						Actions.stopAudio(data.actionInfo[i]);
						
					//Schedule messages
					}else if (type === 'schedule_msg'){
						Actions.scheduleMessage(data.actionInfo[i], parentBlock);
					
					//Time events - TODO: type should be more general like "timeEvent"
					}else if (type === 'timer' || type === 'alarm' || type === 'timeEvent'){
						var actionInfo = data.actionInfo[i];
						if (actionInfo.eleType === SepiaFW.events.TIMER){
							Actions.timerAndAlarm(actionInfo, parentBlock);
						}else if (actionInfo.eleType === SepiaFW.events.ALARM){
							Actions.timerAndAlarm(actionInfo, parentBlock);
						}else if (actionInfo.info === "remove"){
							Actions.timerAndAlarm(actionInfo, parentBlock);
						}else{
							SepiaFW.debug.info('UNSUPPORTED ACTION (timeEvent): ' + JSON.stringify(actionInfo));
						}

					//Language switcher
					}else if (type === 'switch_language'){
						Actions.switchLanguage(data.actionInfo[i]);

					//STT switcher
					}else if (type === 'switch_stt_engine'){
						Actions.switchSttEngine(data.actionInfo[i]);
					
					//UNKNOWN
					}else{
						SepiaFW.debug.info('UNSUPPORTED ACTION: ' + JSON.stringify(data.actionInfo[i]));
					}
				}
			}
			if (!aButtonsArea.innerHTML) parentBlock.removeChild(aButtonsArea);
		}
	}
	
	return Actions;
}