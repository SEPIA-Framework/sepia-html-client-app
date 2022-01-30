//BUILD - code blocks to build dynamic objects of the app
function sepiaFW_build_ui_build(sepiaSessionId){
	var Build = {};

	//build spacer
	Build.spacer = function(width, height, float){
		var spacer = document.createElement('DIV');
		spacer.style.width = width;
		spacer.style.height = height;
		spacer.style.display = "inline-block";
		if (float){
			spacer.style.float = float;
		}
		return spacer;
	}
	
	//build reuseable language selector
	Build.optionSelector = function(btnId, optionsObjectArray, selectedValue, optionChangeAction){
		var ele = document.createElement("SELECT");
		if (btnId) ele.id = btnId;
		optionsObjectArray.forEach(function(option){
			var opt = buildOptionEle(option);
			ele.appendChild(opt);
		});
		//initialize selected value
		if (selectedValue != undefined) ele.value = selectedValue;

		//change listener
		$(ele).off().on('change', function(){
			if (optionChangeAction) optionChangeAction(ele);
		});
		return ele;
	}
	function buildOptionEle(option){
		var opt = document.createElement("OPTION");
		opt.value = option.value;
		opt.textContent = option.name;
		if (option.disabled != undefined) opt.disabled = option.disabled;
		return opt;
	}
	//build reuseable language selector
	Build.languageSelector = function(btnId, changeAction){
		return Build.optionSelector(btnId, 
			SepiaFW.local.getSupportedAppLanguages(), 
			SepiaFW.config.appLanguage, 
			function(ele){
				SepiaFW.config.broadcastLanguage(ele.value);
				if (SepiaFW.config.appRegionCode && SepiaFW.config.appRegionCode.indexOf(ele.value + "-") != 0){
					//reset region
					SepiaFW.config.broadcastRegionCode("");
				}
				//NOTE: we need to add all IDs here manually
				Build.updateRegionCodeSelector("sepiaFW-menu-account-region-dropdown");		
				changeAction(ele.value);
			}
		);
	}
	//build reuseable language-region selector
	Build.regionCodeSelector = function(btnId, changeAction){
		return Build.optionSelector(btnId, SepiaFW.local.getRegionCodesForActiveLang(), SepiaFW.config.appRegionCode, 
			function(ele){
				SepiaFW.config.broadcastRegionCode(ele.value);
				changeAction(ele.value);
			}
		);
	}
	Build.updateRegionCodeSelector = function(btnId){
		var regions = SepiaFW.local.getRegionCodesForActiveLang();
		var ele = document.getElementById(btnId);
		if (ele){
			ele.innerHTML = "";
			regions.forEach(function(option){
				ele.appendChild(buildOptionEle(option));
			});
			if (SepiaFW.config.appRegionCode != undefined) ele.value = SepiaFW.config.appRegionCode;
		}
	}
	
	//toggle button
	Build.toggleButton = function(btnId, onCallback, offCallback, initialState, disabled){
		var tglBtn = document.createElement('DIV');
		tglBtn.className = "sepiaFW-toggle-btn";
		if (disabled){
			tglBtn.disabled = disabled;
			tglBtn.classList.add("disabled");
		}
		if (btnId) tglBtn.id = btnId;
		if (initialState){
			tglBtn.innerHTML = "<div class='on'></div>";
			tglBtn.setAttribute("data-toggle-state", "on");
		}else{
			tglBtn.innerHTML = "<div class='off'></div>";
			tglBtn.setAttribute("data-toggle-state", "off");
		}
		$(tglBtn).off().on('click', function() {
			if (tglBtn.disabled) return;
			if (tglBtn.getAttribute("data-toggle-state") === "on"){
				tglBtn.setAttribute("data-toggle-state", "off");
				tglBtn.firstChild.className = "off";
				if (offCallback) offCallback();
			}else{
				tglBtn.setAttribute("data-toggle-state", "on");
				tglBtn.firstChild.className = "on";
				if (onCallback) onCallback();
			}
		});
		tglBtn.getValue = function(){
			return (tglBtn.getAttribute("data-toggle-state") === "on");
		}
		tglBtn.setValue = function(val){
			if (val == true || val == "on"){
				tglBtn.setAttribute("data-toggle-state", "on");
				tglBtn.firstChild.className = "on";
			}else{
				tglBtn.setAttribute("data-toggle-state", "off");
				tglBtn.firstChild.className = "off";
			}
		}
		tglBtn.setDisabled = function(isDisabled){
			tglBtn.disabled = isDisabled;
			if (isDisabled) tglBtn.classList.add("disabled");
			else tglBtn.classList.remove("disabled");
		}
		return tglBtn;
	}
	//switch toggle button state without triggering callbacks
	Build.toggleButtonSetState = function(btnId, newStateOnOrOff){
		var tglBtn = document.getElementById(btnId);
		if (tglBtn){
			if (typeof newStateOnOrOff == "boolean"){
				newStateOnOrOff = newStateOnOrOff? "on" : "off";
			}
			var state = tglBtn.getAttribute("data-toggle-state");
			if (state == newStateOnOrOff.toLowerCase()){
				return;
			}else{
				if (state === "on"){
					tglBtn.setAttribute("data-toggle-state", "off");
					tglBtn.firstChild.className = "off";
				}else{
					tglBtn.setAttribute("data-toggle-state", "on");
					tglBtn.firstChild.className = "on";
				}
			}
		}
	}

	//state indicator
	Build.stateIndicatorRGY = function(indicatorId, initialState, onGreenCallback, onYellowCallback, onRedCallback){
		var Indicator = {};

		var indicatorEle = document.createElement('DIV');
		indicatorEle.className = "sepiaFW-indicator-rgy";
		if (indicatorId) indicatorEle.id = indicatorId;
		indicatorEle.sepiaIndicator = Indicator;

		Indicator.getElement = function(){
			return indicatorEle;
		}

		if (!initialState || initialState == "r"){
			indicatorEle.innerHTML = "<div class='red'></div>";
			indicatorEle.setAttribute("data-rgy-indicator", "r");
		}else if (initialState == "y"){
			indicatorEle.innerHTML = "<div class='yellow'></div>";
			indicatorEle.setAttribute("data-rgy-indicator", "y");
		}else if (initialState == "g"){
			indicatorEle.innerHTML = "<div class='green'></div>";
			indicatorEle.setAttribute("data-rgy-indicator", "g");
		}

		Indicator.getState = function(){
			return indicatorEle.getAttribute("data-rgy-indicator");
		}
		Indicator.setState = function(state, skipCallback){
			indicatorEle.classList.remove("red", "yellow", "green");
			indicatorEle.setAttribute("data-toggle-state", state);
			if (state == "r"){
				indicatorEle.classList.add("red");
				if (!skipCallback && onRedCallback) onRedCallback();
			}else if (state == "y"){
				indicatorEle.classList.add("yellow");
				if (!skipCallback && onYellowCallback) onYellowCallback();
			}else if (state == "g"){
				indicatorEle.classList.add("green");
				if (!skipCallback && onGreenCallback) onGreenCallback();
			}
		}
		
		return Indicator;
	}
	
	//simple action button
	Build.inlineActionButton = function(btnId, btnName, callback){
		var btn = document.createElement('BUTTON');
		btn.className = "sepiaFW-button-inline";
		if (btnName) btn.innerHTML = SepiaFW.tools.sanitizeHtml(btnName);
		if (btnId) btn.id = btnId;
		SepiaFW.ui.onclick(btn, function(){
			callback(this);
		}, true);
		return btn;
	}
	
	//Confirm box
	Build.askConfirm = function(msg, okCallback, abortCallback){
		/* var r = confirm(msg);
		if (r == true) {
			if (okCallback) okCallback();
		} else {
			if (abortCallback) abortCallback();
		} */
		SepiaFW.ui.askForConfirmation(msg, function(){
			if (okCallback) okCallback();
		}, function(){
			if (abortCallback) abortCallback();
		});
	}
	
	//MAIN UI FUNCTIONALITY

	//MENU EVENTs - TODO: we should replace some older menu updates with those events
	function addOnMainMenuOpenAction(actionId, actionFun){
		mainMenuOpenActions[actionId] = actionFun;
	}
	function addOnMainMenuCloseAction(actionId, actionFun){
		mainMenuCloseActions[actionId] = actionFun;
	}
	//NOTE: order of actions is not guaranteed (and should not matter) 
	var mainMenuOpenActions = {};
	var mainMenuCloseActions = {};

	//BUTTONS and LOGIC
	Build.uiButtonsAndLogic = function(){
		//TOP BUTTONS
		
		//open close menue
		SepiaFW.ui.toggleSettings = function(page, onceOnClose){
			//previously: $("#sepiaFW-nav-menu-btn").trigger('click', {bm_force : true});
			var menu = $("#sepiaFW-chat-menu");
			if (menu.css('display') == 'none'){
				menu.fadeIn(300);
				SepiaFW.ui.closeAllMenusThatCollide("#sepiaFW-chat-menu");
				$('#sepiaFW-main-window').trigger('sepiaFwOpen-sepiaFW-chat-menu');
				if (page != undefined){
					SepiaFW.ui.soc.showPane(page);
				}
				if (onceOnClose){
					$('#sepiaFW-main-window').one('sepiaFwClose-sepiaFW-chat-menu', function(){ onceOnClose(); });
				}
			}else{
				menu.fadeOut(300);
				$('#sepiaFW-main-window').trigger('sepiaFwClose-sepiaFW-chat-menu');
			}
		}
		var menuBtn = document.getElementById("sepiaFW-nav-menu-btn");
		if (menuBtn){
			$(menuBtn).off();
			SepiaFW.ui.onclick(menuBtn, function(){
			//$(menuBtn).on("click", function (){
				SepiaFW.ui.toggleSettings();
			});
		}
		//main menue close/open event
		$('#sepiaFW-main-window').on("sepiaFwOpen-sepiaFW-chat-menu", function(){
			//open
			onMainMenuOpen();
		}).on("sepiaFwClose-sepiaFW-chat-menu", function(){
			//close
			onMainMenuClose();
		});
		function onMainMenuOpen(){
			SepiaFW.ui.switchSwipeBars('menu');
			$('#sepiaFW-chat-controls').addClass('chat-menu');
			SepiaFW.ui.isMenuOpen = true;
			if (SepiaFW.ui.soc) SepiaFW.ui.soc.refresh();
			//open actions (unsorted)
			Object.keys(mainMenuOpenActions).forEach(function(key){
				mainMenuOpenActions[key]();
			});
		}
		function onMainMenuClose(){
			SepiaFW.ui.switchSwipeBars("chat");		//we force "chat" here because its the only way to reset properly 
			$('#sepiaFW-chat-controls').removeClass('chat-menu');
			SepiaFW.ui.isMenuOpen = false;
			//close actions (unsorted)
			Object.keys(mainMenuCloseActions).forEach(function(key){
				mainMenuCloseActions[key]();
			});
		}
		
		//go left
		var goLeftBtn = document.getElementById("sepiaFW-nav-menu-go-left");
		if (goLeftBtn){
			$(goLeftBtn).off();
			SepiaFW.ui.onclick(goLeftBtn, function(){
				SepiaFW.ui.pageLeft();
			});
		}
		//go right
		var goRightBtn = document.getElementById("sepiaFW-nav-menu-go-right");
		if (goRightBtn){
			$(goRightBtn).off();
			SepiaFW.ui.onclick(goRightBtn, function(){
				SepiaFW.ui.pageRight();
			});
		}
		//notification bubble
		var noteBubble = document.getElementById("sepiaFW-nav-label-note");
		if (noteBubble){
			$(noteBubble).off();
			SepiaFW.ui.onclick(noteBubble, function(){
			//$(noteBubble).on("click", function () {
				SepiaFW.ui.showAndClearMissedMessages();
			});
		}
		//label button - note: for label content see ui.setLable/getLabel functions
		var sepiaLabel = document.getElementById("sepiaFW-nav-label-box");
		if (sepiaLabel){
			$(sepiaLabel).off();
			SepiaFW.ui.longPressShortPressDoubleTap(sepiaLabel, function(){
				//long-press
				//e.g.: force reconnect
				SepiaFW.client.closeClient(true, SepiaFW.client.resumeClient);
			},'',function(){
				//short press
			},function(){
				//double-tab
				if (SepiaFW.alwaysOn){
					SepiaFW.ui.closeAllMenus();
					SepiaFW.alwaysOn.start();
				}
			}, true);
		}
		
		//CHAT CONTROLS
	
		//Send message if "Send" is clicked (Input-form button)
		var chatSendBtn = document.getElementById("sepiaFW-chat-send");
		if (chatSendBtn){
			$(chatSendBtn).off();
			SepiaFW.ui.longPressShortPressDoubleTap(chatSendBtn, function(){
				//long-press - clear input
				$('#sepiaFW-chat-input').val('');
			},'',function(){
				//short press - send action
				if (SepiaFW.speech.isRecognizing()){
					SepiaFW.speech.stopRecognition();
				}else{
					if (SepiaFW.audio.initAudio(SepiaFW.client.sendInputText)){
						//skip because of callback
					}else{
						SepiaFW.client.sendInputText();
					}
				}
			},function(){
				//double-tab
				if (!SepiaFW.ui.useTouchBarControls){
					$('#sepiaFW-chat-controls-swipe-area').fadeIn(300, function(){
						//workaround to prevent ugly glitches at the frame
						$('#sepiaFW-chat-controls-form').css({"background-color" : $('#sepiaFW-chat-controls-swipe-area').find('.sepiaFW-swipeBar-switchable').css('background-color')});
					});
					//$('#sepiaFW-chat-controls-swipe-area').css({'background-color': SepiaFW.ui.secondaryColor}).fadeIn(300);
				}
			}, true);
		}
		//Send message if enter is pressed in the input field
		var chatInput = document.getElementById("sepiaFW-chat-input");
		if (chatInput){
			chatInput.placeholder = SepiaFW.local.g('chatInputPlaceholder');
			$(chatInput).off()
			//pressed RETURN
			.on("keypress", function(e){
				if (e.keyCode === 13){
					//Return-Key
					if (SepiaFW.audio && SepiaFW.audio.initAudio(SepiaFW.client.sendInputText)){
						//skip because of callback
					}else{
						SepiaFW.client.sendInputText();
					}
				}
			})
			//press UP
			.on("keydown", function(e){
				if (e.keyCode === 38){
					//Up
					chatInput.value = SepiaFW.ui.lastInput;
				}else if (e.keyCode === 40){
					//Down
					chatInput.value = '';
				}
			})
			//prevent input blur by send button (on mobile)
			.on('focusout', function(e){
				if (e.relatedTarget && (e.relatedTarget.id == 'sepiaFW-chat-send')){	// || e.relatedTarget.id == 'sepiaFW-assist-btn'
					//if (SepiaFW.ui.isMobile){
						setTimeout(function(){
							$('#sepiaFW-chat-input').get(0).focus();
						}, 0);
					//}
				}else{
					if (SepiaFW.ui.useTouchBarControls){
						$('#sepiaFW-chat-input').addClass("no-focus");
						$('#sepiaFW-chat-send').addClass("no-focus");
					}
				}
			})
			.on('focusin', function(e){
				if (SepiaFW.ui.useTouchBarControls){
					$('#sepiaFW-chat-input').removeClass("no-focus");
					$('#sepiaFW-chat-send').removeClass("no-focus");
				}
			});
		}
		//Touch-bar controls
		if (SepiaFW.ui.useTouchBarControls){
			$('#sepiaFW-chat-input').addClass("no-focus");
			$('#sepiaFW-chat-send').addClass("no-focus");
			$('#sepiaFW-chat-controls-form').addClass('touch-bar-controls');
		}
		//Edit message in Speech-bubble field and abort auto-send of result
		var speechEditBtn = document.getElementById("sepiaFW-chat-controls-speech-box-edit");
		if (speechEditBtn){
			$(speechEditBtn).off();
			SepiaFW.ui.onclick(speechEditBtn, function(){
			//$(speechEditBtn).on("click", function(){
				if (SepiaFW.speech && SepiaFW.speech.isRecognizing()){
					SepiaFW.speech.abortRecognition();
					var bubble = document.getElementById("sepiaFW-chat-controls-speech-box-bubble");
					$(bubble).show();
					$('#sepiaFW-chat-controls-speech-box-bubble-loader').hide();
					bubble.contentEditable = 'true';
					bubble.focus();
				}else{
					document.getElementById("sepiaFW-chat-controls-speech-box-bubble").innerHTML = '';
					//SepiaFW.animate.assistant.idle('closeSpeechBubble');
				}
			});
		}
		//Send message if "Send" is clicked (Speech-bubble button)
		var speechSendBtn = document.getElementById("sepiaFW-chat-controls-speech-box-finish");
		if (speechSendBtn){
			$(speechSendBtn).off();
			SepiaFW.ui.longPressShortPressDoubleTap(speechSendBtn, function(){
				//long-press
			},'',function(){
				//short press - send action
				if (SepiaFW.speech.isRecognizing()){
					SepiaFW.speech.stopRecognition();
				}else{
					var bubble = document.getElementById("sepiaFW-chat-controls-speech-box-bubble");
					var text = bubble.textContent;
					SepiaFW.animate.assistant.idle('closeSpeechBubble');
					if (text) SepiaFW.client.sendInputText(text);
				}
			},function(){
				//double-tab
			}, true);
		}
		//Send message if enter is pressed in the Speech-bubble field
		var speechInputBubble = document.getElementById("sepiaFW-chat-controls-speech-box-bubble");
		if (speechInputBubble){
			$(speechInputBubble).off();
			$(speechInputBubble).on("keypress", function(e){
				if (e.keyCode === 13){
					//Return-Key
					SepiaFW.client.sendInputText();
				}
			});
		}
		//hide swipe bar
		var chatSwipeBar = document.getElementById("sepiaFW-chat-controls-swipe-area");
		if (chatSwipeBar){
			$(chatSwipeBar).off();
			SepiaFW.ui.simpleDoubleTab(chatSwipeBar, function(){
				//double-tab
				if (SepiaFW.ui.useTouchBarControls){
					//TODO: make configurable?
					SepiaFW.ui.backButtonAction();
				}else{
					$('#sepiaFW-chat-controls-form').css({"background-color" : ""});	//$('#sepiaFW-chat-controls-right').css('background-color')
					$('#sepiaFW-chat-controls-swipe-area').fadeOut(300);
				}
			});
		}
		//open close chat controls more menue
		var chatMenuBtn = document.getElementById("sepiaFW-chat-controls-more-btn");
		if (chatMenuBtn){
			$(chatMenuBtn).off();
			var animateShortPress = false;
			SepiaFW.ui.onShortLongPress(chatMenuBtn, function(){
				//Short press
				var menu = $("#sepiaFW-chat-controls-more-menu");
				if (menu.css('display') == 'none'){
					menu.fadeIn(300);
					SepiaFW.ui.closeAllMenusThatCollide("#" + menu[0].id);
					$('#sepiaFW-main-window').trigger(('sepiaFwOpen-' + menu[0].id));
				}else{
					menu.fadeOut(300);
					$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + menu[0].id));
				}
				if (SepiaFW.audio){
					SepiaFW.audio.initAudio();
				}
			}, function(){
				//Long press - open settings menu
				SepiaFW.ui.toggleSettings();
			}, animateShortPress);
		}
		//catch the shortcuts menue close/open event
		$('#sepiaFW-main-window').on("sepiaFwOpen-sepiaFW-chat-controls-more-menu", function(){
			//open
			$('#sepiaFW-chat-controls').addClass('chat-controls-more-menu');
			SepiaFW.ui.isControlsMenuOpen = true;
		}).on("sepiaFwClose-sepiaFW-chat-controls-more-menu", function(){
			//close
			$('#sepiaFW-chat-controls').removeClass('chat-controls-more-menu');
			SepiaFW.ui.isControlsMenuOpen = false;
		});
		
		//vertical extra button (usually only visible in landscape mode)
		var controlsVerticalExtraBtn = document.getElementById("sepiaFW-chat-controls-vertical-btn");
		if (controlsVerticalExtraBtn){
			$(controlsVerticalExtraBtn).off().on("click", function () {
				if (SepiaFW.alwaysOn){
					SepiaFW.ui.closeAllMenus();
					SepiaFW.alwaysOn.start();
				}
			});
		}
		
		//MIC and SPEECH CONTROLS
	
		//Add default mic button logic to an element
		SepiaFW.ui.buildDefaultMicLogic = function(buttonEle, customCallbackShort, customCallbackLong){
			if (buttonEle){
				if (buttonEle.removeLongPressShortPressDoubleTap) buttonEle.removeLongPressShortPressDoubleTap();
				SepiaFW.ui.longPressShortPressDoubleTap(buttonEle, function(){
					//smart-reset
					SepiaFW.ui.longPressMicButton();
					//custom
					if (customCallbackLong) customCallbackLong();
				},'',function(){
					if (SepiaFW.audio && SepiaFW.audio.initAudio(SepiaFW.ui.toggleMicButton)){
						//skip because of callback
					}else{
						SepiaFW.ui.toggleMicButton(undefined, "app-button");
						//custom
						if (customCallbackShort) customCallbackShort();
					}
				},'', true);
			}
		}
		//... and apply it
		var assistBtn = document.getElementById("sepiaFW-assist-btn");
		SepiaFW.ui.buildDefaultMicLogic(assistBtn);
			
		//Toggle microphone button
		SepiaFW.ui.toggleMicButton = function(useConfirmationSound, sourceAction){
			if (sourceAction == undefined) sourceAction = "";
			//source actions (so far):
			//app-button, app-hotkey, controller-button, (remote-input), ble-beacon, ble-beacon-registered, clexi-remote, clexi-gpio, sepia-chat-server, 
			//smart-mic, wake-word, intent-assist, intent-voice-command, 
			//... more tbd
			//TODO: at some point we could use the source info to control when voice output should be triggered
			if (SepiaFW.speech.isSpeaking()){
				SepiaFW.speech.stopSpeech();
				return;
			}
			//stop alarm
			if (SepiaFW.audio.alarm.isPlaying){
				SepiaFW.audio.stopAlarmSound("toggleMic");
			}
			//fade audio
			SepiaFW.audio.fadeOut();
			//confirmation sound?
			if (useConfirmationSound == undefined){
				useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
			}
			//play a sound before activating mic?
			if (useConfirmationSound && !SepiaFW.speech.isRecognizing()){
				//TODO: depending on hardware (and browser) there is a gap between sound and record-start that can be to long!
				SepiaFW.audio.playURL(SepiaFW.audio.micConfirmSound, '2', '', function(){
					SepiaFW.speech.toggleRecognition(SepiaFW.client.asrCallbackFinal, SepiaFW.client.asrCallbackInterim, SepiaFW.client.asrErrorCallback, SepiaFW.client.asrLogCallback);
				}, SepiaFW.client.asrErrorCallback);
			//... else stick to the default
			}else{
				SepiaFW.speech.toggleRecognition(SepiaFW.client.asrCallbackFinal, SepiaFW.client.asrCallbackInterim, SepiaFW.client.asrErrorCallback, SepiaFW.client.asrLogCallback);
			}
		}
		//Long-press microphone button - aka: smart-reset
		SepiaFW.ui.longPressMicButton = function(){
			//switch issue
			if (SepiaFW.client.isMessagePending){
				//e.g.: force reconnect
				SepiaFW.client.closeClient(true, SepiaFW.client.resumeClient);
			}else{
				SepiaFW.ui.resetMicButton();
			}
		}
		//Reset microphone button
		SepiaFW.ui.resetMicButton = function(){
			SepiaFW.speech.reset();
			SepiaFW.assistant.resetState();
			SepiaFW.client.clearCommandQueue();
		}
	}
	
	//MENU
	Build.menu = function(){
		var menuArea = document.getElementById('sepiaFW-chat-menu'); 	//add other variations here? Or call it always the same?
		if (menuArea){
			var headDiv = document.createElement('div');	headDiv.id = 'sepiaFW-chat-menu-head';
			var centerDiv = document.createElement('div');	centerDiv.id = 'sepiaFW-chat-menu-center';
			var footDiv = document.createElement('div');	footDiv.id = 'sepiaFW-chat-menu-foot';
			
			//---HEAD---
			headDiv.innerHTML = ""
				//+ "<button>QuickButton1</button>"
				//+ "<button id='sepiaFW-geolocation-btn'>" + SepiaFW.local.g('locateMe') + "</button>"
				//+ "<p id='sepiaFW-menue-status-text'>Status text</p>"
				+ "<div id='sepiaFW-chat-menu-head-border'></div>";
			menuArea.appendChild(headDiv);
			
			//QUICK ACTIONS:
			
			//refresh GPS button
			var gpsBtn = document.getElementById("sepiaFW-geolocation-btn");
			if (gpsBtn){
				$(gpsBtn).off();
				SepiaFW.ui.longPressShortPressDoubleTap(gpsBtn, function(){
					//long-press
					SepiaFW.geocoder.reset();
					SepiaFW.geocoder.getBestLocation();
				},'',function(){
					//short-press
					SepiaFW.geocoder.getBestLocation();
				},'', true);
			}
			
			//---CENTER---
			SepiaFW.ui.MENU_OVERVIEW_PANE_NBR = 0;
			SepiaFW.ui.MENU_GENERAL_PANE_NBR = 1;
			SepiaFW.ui.MENU_ACCOUNT_PANE_NBR = 2;
			SepiaFW.ui.MENU_ADDRESSES_PANE_NBR = 3;
			
			centerDiv.className = 'sepiaFW-carousel';
			var centerCarouselPane = document.createElement('DIV');
			centerCarouselPane.className = 'sepiaFW-carousel-pane-container';
			centerDiv.appendChild(centerCarouselPane);
			var centerPage1 = document.createElement('DIV');
			centerPage1.className = "sepiaFW-chat-menu-list-container sepiaFW-carousel-pane";
			centerPage1.innerHTML = ""
				+ "<ul class='sepiaFW-menu-topics-list'>"
					+ "<li class='button' id='sepiaFW-menu-btn-general'><span>" + SepiaFW.local.g('general') + "</span><i class='material-icons md-mnu'>&#xE038;</i></li>"
					+ "<li class='button' id='sepiaFW-menu-btn-account'><span>" + SepiaFW.local.g('account') + "</span><i class='material-icons md-mnu'>&#xE038;</i></li>"
					+ "<li class='button' id='sepiaFW-menu-btn-addresses'><span>" + SepiaFW.local.g('addresses') + "</span><i class='material-icons md-mnu'>&#xE038;</i></li>"
					+ "<li class='button' id='sepiaFW-menu-btn-tutorial'><span>" + SepiaFW.local.g('tutorial') + "</span><i class='material-icons md-mnu'>school</i></li>"
					+ "<li class='button' id='sepiaFW-menu-btn-info'><span>" + SepiaFW.local.g('info_and_help') + "</span><i class='material-icons md-mnu'>help_outline</i></li>"
					+ "<li class='button' id='sepiaFW-menu-btn-control-hub'><span>" + SepiaFW.local.g('control_hub') + "</span><i class='material-icons md-mnu'>device_hub</i></li>"
					+ "<li class='button' id='sepiaFW-menu-btn-logout'><span>" + SepiaFW.local.g('sign_out') + "</span><i class='material-icons md-mnu'>person_outline</i></li>"
				+ "</ul>";
			centerCarouselPane.appendChild(centerPage1);
			var centerPage2 = document.createElement('DIV');
			centerPage2.className = "sepiaFW-chat-menu-list-container sepiaFW-carousel-pane";
			centerPage2.innerHTML = ""
				+ "<ul class='sepiaFW-menu-settings-list'>"
					+ "<li id='sepiaFW-menu-select-skin-li'><span>Skin: </span><select id='sepiaFW-menu-select-skin'><option disabled selected value>- select -</option></select></li>"
					+ "<li id='sepiaFW-menu-select-avatar-li'><span>Avatar: </span><select id='sepiaFW-menu-select-avatar'><option disabled selected value>- select -</option></select></li>"
					+ "<li id='sepiaFW-menu-toggle-bigScreenMode-li' title='Switch big-screen mode on/off'><span>Big-screen mode: </span></li>"
					+ "<li id='sepiaFW-menu-select-orientationMode-li' title='Set pref. screen orientation'><span>Screen orientation: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-touchBarControls-li' title='Switch new touch-bar controls mode on/off'><span>Touch-bar controls: </span></li>"
					+ "<li class='spacer'></li>"
					+ "<li id='sepiaFW-menu-server-access-li' title='Settings for core server connections'><span>" + SepiaFW.local.g('serverConnections') + ": </span></li>"
					+ "<li id='sepiaFW-menu-deviceId-li'><span>" + SepiaFW.local.g('deviceId') + ": </span><input id='sepiaFW-menu-deviceId' type='text' maxlength='24'></li>"
					+ "<li id='sepiaFW-menu-device-site-li' title='Settings for device local site'><span>" + SepiaFW.local.g('deviceSite') + ": </span></li>"
					+ "<li id='sepiaFW-menu-toggle-GPS-li'><span>GPS: </span></li>"
					+ "<li id='sepiaFW-menu-media-devices-li' title='Settings for microphone, audio sources, etc.'><span>" + SepiaFW.local.g('mediaDevices') + ": </span></li>"
					+ "<li id='sepiaFW-menu-toggle-voice-li'><span>Voice output: </span></li>"
					+ "<li id='sepiaFW-menu-select-voice-engine-li' title='Speech synthesis engine.'><span>Voice engine (TTS): </span></li>"
					+ "<li id='sepiaFW-menu-select-voice-li'><span>Voice: </span></li>" 	//option: <i class='material-icons md-mnu'>&#xE5C6;</i>
					+ "<li id='sepiaFW-menu-external-tts-url-li' title='Server URL for external custom speech synth. engine.'>"
						+ "<span id='sepiaFW-menu-external-tts-label'>" + "Voice server" + ": </span>"
						+ "<input id='sepiaFW-menu-external-tts-url' type='url' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-select-stt-li' title='Speech recognition engine.'><span>ASR engine (STT): </span></li>"
					+ "<li id='sepiaFW-menu-stt-socket-url-li' title='Server URL for custom speech recognition engine.'>"
						+ "<span id='sepiaFW-menu-stt-label'>" + "ASR server" + ": </span>"
						+ "<input id='sepiaFW-menu-stt-socket-url' type='url' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-toggle-wake-word-li' title='Use client wake-word detection?'><span>Hey SEPIA: </span></li>"
					+ "<li id='sepiaFW-menu-input-controls-li' title='Settings for remote input devices, e.g. gamepads'><span>Remote controls: </span></li>"
					+ "<li class='spacer'></li>"
					+ "<li id='sepiaFW-menu-toggle-smartMic-li' title='Automatically activate mic input after voice based question?'><span>Smart microphone: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-proactiveNotes-li' title='The assistant will remind you in a funny way to make a coffee break etc. :-)'><span>Well-being reminders: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-channelMessages-li' title='Show status messages in chat like someone joined the channel?'><span>Channel status messages: </span></li>"
					//NOTE: we show this only if battery status API supported:
					+ "<li id='sepiaFW-menu-toggle-trackPowerStatus-li' title='Observe power plug and battery status?'><span>Track power status: </span></li>"
					//---
					//Android-only background connect:
					+ "<li class='sepiaFW-android-settings' id='sepiaFW-menu-toggle-runBackgroundConnection-li' title='Try to keep connected in background?'><span>Allow background activity: </span></li>"
					//---
					+ "<li id='sepiaFW-menu-toggle-clexi-li' title='Connect to CLEXI server on start.'><span>Connect to CLEXI: </span></li>"
					+ "<li id='sepiaFW-menu-clexi-socket-url-li' title='Server for Node.js CLEXI by Bytemind.de'>"
						+ "<span>" + "CLEXI server" + ": </span>"
						+ "<input id='sepiaFW-menu-clexi-socket-url' type='url' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-clexi-server-id-li' title='Server ID of Node.js CLEXI. Trust only this connection ID.'>"
						+ "<span>" + "CLEXI ID" + ": </span>"
						+ "<input id='sepiaFW-menu-clexi-server-id' type='text' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-toggle-remote-terminal-li' title='Connect to remote terminal when CLEXI is running?'><span>Use CLEXI Terminal: </span></li>"
					+ "<li id='sepiaFW-menu-select-music-app-li' title='Select default music app for search intents.'>"
						+ "<span>Default music app: </span></li>"
						//+ "<span id='sepiaFW-menu-toggle-music-cards-btn'><i class='material-icons'>art_track</i></span>"
					+ "<li id='sepiaFW-menu-select-search-engine-li' title='Select preferred search engine for search intents.'>"
						+ "<span>Default search engine: </span></li>"
					+ "<li id='sepiaFW-menu-clear-app-cache-li'><span>Clear app data: </span></li>"
					+ "<li class='spacer'></li>"
					+ "<li id='sepiaFW-menu-experimental-settings-li'><span>Experimental settings </span></li>"
						+ "<li class='sepiaFW-menu-experimental'><span><u>Note: Changes will not be permanent</u></span></li>"
						+ "<li id='sepiaFW-menu-toggle-youtube-wp-li' class='sepiaFW-menu-experimental'><span>YouTube embedded </span></li>"
						+ "<li id='sepiaFW-menu-toggle-spotify-wp-li' class='sepiaFW-menu-experimental'><span>Spotify embedded </span></li>"
						+ "<li id='sepiaFW-menu-toggle-apple-music-wp-li' class='sepiaFW-menu-experimental'><span>Apple Music embedded </span></li>"
					+ "<li id='sepiaFW-menu-administration-li' class='info-box'>"
						+ "<button id='sepiaFW-menu-ui-dataprivacy-btn'>" + SepiaFW.local.g('data_privacy') + "</button>"
						+ "<button id='sepiaFW-menu-ui-license-btn'>" + SepiaFW.local.g('license') + "</button>"
						+ "<button id='sepiaFW-menu-ui-credits-btn'>" + SepiaFW.local.g('credits') + "</button>"
					+ "</li>"
					+ "<p id='sepiaFW-chat-menu-info'>"
						+ '<i class="material-icons md-txt" style="float: left;">info</i>'
						+ SepiaFW.tools.sanitizeHtml(SepiaFW.config.clientInfo.replace(/_/g, " ") + " - " + SepiaFW.config.appLanguage + " - " + (SepiaFW.ui.isMobile? "m" : "d") + (SepiaFW.ui.isCordova? "-c" : ""))
					+ "</p>"
					//+ "<p>" + navigator.userAgent + "</p>"
				+ "</ul>";
			centerCarouselPane.appendChild(centerPage2);
			var centerPage3 = document.createElement('DIV');
			centerPage3.className = "sepiaFW-chat-menu-list-container sepiaFW-carousel-pane";
			centerPage3.innerHTML = ""
				+ "<ul class='sepiaFW-menu-settings-list'>"
					+ "<li id='sepiaFW-menu-account-my-id-li'><span>" + "User ID" + ": </span><span id='sepiaFW-menu-account-my-id' style='float: right;'></span></li>"
					+ "<li id='sepiaFW-menu-account-language-li'><span>" + SepiaFW.local.g('language') + ": </span></li>"
					+ "<li id='sepiaFW-menu-account-region-li'><span>" + SepiaFW.local.g('country') + ": </span></li>"
					+ "<li id='sepiaFW-menu-account-nickname-li'><span>" + SepiaFW.local.g('nickname') + ": </span><input id='sepiaFW-menu-account-nickname' type='text' maxlength='24'></li>"
					+ "<li id='sepiaFW-menu-account-preftempunit-li'><span>" + SepiaFW.local.g('preferred_temp_unit') + ": </span></li>"
					+ "<li class='spacer'></li>"
					+ "<li style='min-height: auto; text-align: left;'><u>" + SepiaFW.local.g('shared_access_permissions') + "</u></li>"
					+ "<li id='sepiaFW-menu-account-shared-access-remote-actions-li'><span>Remote Actions:</span></li>"
					+ "<li class='spacer'></li>"
					+ "<li id='sepiaFW-menu-store-load-app-settings-li' class='flex'>"
						+ "<span>App settings: </span>"
						+ "<div>"
							+ "<button id='sepiaFW-menu-load-app-settings-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('load') + "</button>"
							+ "<button id='sepiaFW-menu-store-app-settings-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('save') + "</button>"
							+ "<button id='sepiaFW-menu-export-app-settings-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('export') + "</button>"
							//TODO: add delete button
						+ "</div>"
					+ "</li>"
					+ "<li class='spacer'></li>"
					+ "<li id='sepiaFW-menu-account-signoutall-li' class='flex'>"
						+ "<span>" + SepiaFW.local.g('mySepiaClients') + ":</span>"
						+ "<div>"
							+ "<button id='sepiaFW-menu-ui-signoutall-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('sign_out_all') + "</button>"
							+ "<button id='sepiaFW-menu-ui-admin-tools-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('apps_admin') + "</button>"
						+ "</div>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-account-pwd-reset-li' class='flex'>"
						+ "<span>Account:</span>"
						+ "<div>"
							+ "<button id='sepiaFW-menu-account-pwd-reset-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('change_account_password') + "</button>"
						+ "</div>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-ui-refresh-box' class='info-box'>"
						+ "<p id='sepiaFW-menu-ui-refresh-info'>" + SepiaFW.local.g('reloadAppInfo') + ":</p>"
						+ "<div style='display:flex; justify-content:center;'>"
							+ "<button id='sepiaFW-menu-ui-refresh-btn'>" + SepiaFW.local.g('reloadApp') + "</button>"
							+ "<button id='sepiaFW-menu-ui-new-sepia-popup-btn'>" + SepiaFW.local.g('newWindow') + "</button>"
						+ "</div>"
					+ "</li>"
				+ "</ul>";
			centerCarouselPane.appendChild(centerPage3);
			var centerPage4 = document.createElement('DIV');
			centerPage4.className = "sepiaFW-chat-menu-list-container sepiaFW-carousel-pane";
			centerPage4.innerHTML = ""
				+ "<ul class='sepiaFW-menu-addresses-list sepiaFW-menu-settings-list'>"
					+ "<li id='sepiaFW-menu-adr-home-header'><span>" + SepiaFW.local.g('adrHome') + "</span><i class='material-icons md-mnu'>&#xE88A;</i></li>"
					+ "<div id='sepiaFW-menu-adr-home' class='sepiaFW-menu-adr-box'>"
						+ "<input id='sepiaFW-menu-adr-home-street' class='big' type='text' placeholder='" + SepiaFW.local.g('street') + "'>"
						+ "<input id='sepiaFW-menu-adr-home-street_nbr' class='small' type='text' placeholder='" + SepiaFW.local.g('street_nbr') + "'>"
						+ "<input id='sepiaFW-menu-adr-home-city' class='big' type='text' placeholder='" + SepiaFW.local.g('city') + "'>"
						+ "<input id='sepiaFW-menu-adr-home-zip_code' class='small' type='text' placeholder='" + SepiaFW.local.g('zip_code') + "'>"
						+ "<input id='sepiaFW-menu-adr-home-country' class='big' type='text' placeholder='" + SepiaFW.local.g('country') + "'>"
						+ "<button id='sepiaFW-menu-adr-home-save'>" + SepiaFW.local.g('save') + "</button>"
					+ "</div>"
					+ "<li id='sepiaFW-menu-adr-work-header'><span>" + SepiaFW.local.g('adrWork') + "</span><i class='material-icons md-mnu'>&#xE8F9;</i></li>"
					+ "<div id='sepiaFW-menu-adr-work' class='sepiaFW-menu-adr-box'>"
						+ "<input id='sepiaFW-menu-adr-work-street' class='big' type='text' placeholder='" + SepiaFW.local.g('street') + "'>"
						+ "<input id='sepiaFW-menu-adr-work-street_nbr' class='small' type='text' placeholder='" + SepiaFW.local.g('street_nbr') + "'>"
						+ "<input id='sepiaFW-menu-adr-work-city' class='big' type='text' placeholder='" + SepiaFW.local.g('city') + "'>"
						+ "<input id='sepiaFW-menu-adr-work-zip_code' class='small' type='text' placeholder='" + SepiaFW.local.g('zip_code') + "'>"
						+ "<input id='sepiaFW-menu-adr-work-country' class='big' type='text' placeholder='" + SepiaFW.local.g('country') + "'>"
						+ "<button id='sepiaFW-menu-adr-work-save'>" + SepiaFW.local.g('save') + "</button>"
					+ "</div>"
				+ "</ul>";
			centerCarouselPane.appendChild(centerPage4);
			menuArea.appendChild(centerDiv);
			
			//MENU ACTIONS:
			
			//Goto account button
			var accountBtn = document.getElementById("sepiaFW-menu-btn-account");
			accountBtn.addEventListener("click", function(){
				if (SepiaFW.ui.soc){
					SepiaFW.ui.soc.showPane(SepiaFW.ui.MENU_ACCOUNT_PANE_NBR);
				}
			});
			//Goto general settings button
			var generalBtn = document.getElementById("sepiaFW-menu-btn-general");
			generalBtn.addEventListener("click", function(){
				if (SepiaFW.ui.soc){
					SepiaFW.ui.soc.showPane(SepiaFW.ui.MENU_GENERAL_PANE_NBR);
				}
			});
			//Goto addresses settings button
			var addressesBtn = document.getElementById("sepiaFW-menu-btn-addresses");
			addressesBtn.addEventListener("click", function(){
				if (SepiaFW.ui.soc){
					SepiaFW.ui.soc.showPane(SepiaFW.ui.MENU_ADDRESSES_PANE_NBR);
				}
			});
			//Sign out button
			var logoutBtn = document.getElementById("sepiaFW-menu-btn-logout");
			logoutBtn.addEventListener("click", function(){
				SepiaFW.account.logoutAction();
			});
			//Help button
			var helpBtn = document.getElementById("sepiaFW-menu-btn-info");
			helpBtn.addEventListener("click", function(){
				SepiaFW.ui.actions.openUrlAutoTarget("https://github.com/SEPIA-Framework/sepia-docs", true);
			});
			//Tutorial button
			var tutorialBtn = document.getElementById("sepiaFW-menu-btn-tutorial");
			tutorialBtn.addEventListener("click", function(){
				//SepiaFW.ui.closeAllMenus();
				SepiaFW.frames.open({pageUrl: "tutorial.html"});
			});
			//Control HUB button
			var ctrlHubBtn = document.getElementById("sepiaFW-menu-btn-control-hub");
			ctrlHubBtn.addEventListener("click", function(){
				SepiaFW.frames.open({ 
					pageUrl: "templates/dynamic-frame.html",
					theme: "dark flat",	//dark_full flat
					onFinishSetup: function(){
						var page1 = document.getElementById('sepiaFW-frame-page-1');
						if (SepiaFW.client.isDemoMode()){
							page1.innerHTML = "<iframe class='full-size' src='" 
								+ SepiaFW.config.replacePathTagWithActualPath("<assist_server>/tools/index.html") + "'>";
						}else{
							page1.innerHTML = "";
							var hubIframe = document.createElement('iframe');
							hubIframe.className = "full-size";
							var triedLogin = false;
							hubIframe.onload = function(){
								//login - TODO: potential race condition?
								if (!triedLogin){
									triedLogin = true;
									var loginEvent = {
										uid: SepiaFW.account.getUserId(),
										keyToken: SepiaFW.account.getToken(sepiaSessionId),
										user_lang_code: SepiaFW.account.getLanguage(),
										clientInfo: SepiaFW.config.getClientDeviceInfo(),
										apiURL: SepiaFW.config.host
									}
									SepiaFW.debug.log("Sending login event to SEPIA Control HUB Frame...");
									hubIframe.contentWindow.postMessage({type: "sepia-common-interface-event", fun:"login", ev: loginEvent}, "*");
								}
							};
							hubIframe.src = SepiaFW.config.assistAPI + "tools/index.html"; 
							page1.appendChild(hubIframe);
						}
					},
					onOpen: function(){},
					onClose: function(){}
				});
			});
			
			//add skins and avatars
			var skins = $('.sepiaFW-style-skin');
			skins.each(function(i, obj) {
				var option = document.createElement('OPTION');
					option.textContent = obj.dataset.name;
					option.value = obj.dataset.id;
				document.getElementById('sepiaFW-menu-select-skin').appendChild(option);
			});
			var activeSkin = SepiaFW.data.get('activeSkin');
			if (activeSkin){
				$('#sepiaFW-menu-select-skin').val(activeSkin);
			}
			$('#sepiaFW-menu-select-skin').off().on('change', function(){
				SepiaFW.ui.setSkin($('#sepiaFW-menu-select-skin').val());
			});
			var avatars = $('.sepiaFW-style-avatar');
			var defaultAvatarOption = document.createElement('OPTION');
				defaultAvatarOption.textContent = "Let skin choose";
				defaultAvatarOption.value = "0";
				document.getElementById('sepiaFW-menu-select-avatar').appendChild(defaultAvatarOption);
			avatars.each(function(i, obj) {
				var option = document.createElement('OPTION');
					option.textContent = obj.dataset.name;
					option.value = obj.dataset.id;
				document.getElementById('sepiaFW-menu-select-avatar').appendChild(option);
			});
			var activeAvatar = SepiaFW.data.get('activeAvatar');
			if (activeAvatar != undefined){
				$('#sepiaFW-menu-select-avatar').val(activeAvatar);
			}
			$('#sepiaFW-menu-select-avatar').off().on('change', function(){
				SepiaFW.ui.setAvatar($('#sepiaFW-menu-select-avatar').val());
			});
			//server access
			var serverAccess = document.getElementById('sepiaFW-menu-server-access-li');
			serverAccess.appendChild(Build.inlineActionButton('sepiaFW-menu-server-access-settings', "<i class='material-icons md-inherit'>settings</i>",
				function(btn){
					SepiaFW.config.openEndPointsSettings();
				})
			);
			//device ID
			var deviceIdInput = document.getElementById("sepiaFW-menu-deviceId");
			deviceIdInput.value = SepiaFW.config.getDeviceId();
			deviceIdInput.addEventListener("change", function(){
				var newDeviceId = this.value;
				SepiaFW.config.setDeviceId(newDeviceId);
				this.blur();
			});
			//device site settings
			var deviceSite = document.getElementById('sepiaFW-menu-device-site-li');
			deviceSite.appendChild(Build.inlineActionButton('sepiaFW-menu-device-site-settings', "<i class='material-icons md-inherit'>settings</i>",
				function(btn){
					SepiaFW.frames.open({ 
						pageUrl: "device-site.html"
					});
				})
			);
			//media devices settings
			var mediaDevicesSettings = document.getElementById('sepiaFW-menu-media-devices-li');
			mediaDevicesSettings.appendChild(Build.inlineActionButton('sepiaFW-menu-media-devices', "<i class='material-icons md-inherit'>settings</i>",
				function(btn){
					SepiaFW.frames.open({ 
						pageUrl: "media-devices.html"
					});
				})
			);
			//Speech stuff
			if (SepiaFW.speech){
				//add voice toggle
				document.getElementById('sepiaFW-menu-toggle-voice-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-voice', 
					function(){
						SepiaFW.speech.enableVoice();
					},function(){
						SepiaFW.speech.disableVoice();
					}, !SepiaFW.speech.skipTTS)
				);

				//add speech synthesis engine select
				document.getElementById('sepiaFW-menu-select-voice-engine-li').appendChild(SepiaFW.speech.getTtsEnginesSelector(
					function(selectedEngine){
						if (selectedEngine == "custom-mary-api"){
							$('#sepiaFW-menu-external-tts-url-li').show(300);
						}else{
							$('#sepiaFW-menu-external-tts-url-li').hide(300);
						}
					}
				));

				//add voice select options - delayed due to loading process - SEPIA engine requires active user
				var voiceSelectorBox = document.getElementById('sepiaFW-menu-select-voice-li');
				if (SepiaFW.speech.getVoiceEngine() == "sepia"){
					SepiaFW.client.addOnActiveOneTimeAction(function(){
						SepiaFW.speech.getVoices(function(voices, voiceSelector){
							voiceSelectorBox.appendChild(voiceSelector);
						});
					}, "tts-voice-setup");
				}else{
					setTimeout(function(){
						SepiaFW.speech.getVoices(function(voices, voiceSelector){
							voiceSelectorBox.appendChild(voiceSelector);
						});
					}, 1000);
				}

				//TTS custom external server
				var speechSynthServerInput = document.getElementById("sepiaFW-menu-external-tts-url");
				speechSynthServerInput.placeholder = "http://my-tts.local:59125";
				speechSynthServerInput.value = SepiaFW.speech.voiceCustomServer || "";
				speechSynthServerInput.addEventListener("change", function(){
					var newHost = this.value;
					this.blur();
					SepiaFW.speech.setVoiceCustomServer(newHost);
					//refresh voices
					SepiaFW.speech.getVoices(function(voices, voiceSelector){
						voiceSelectorBox.appendChild(voiceSelector);
					});
				});
				
				//add speech recognition engine select
				var asrSelectAndSettingsBox = document.createElement("div");
				document.getElementById('sepiaFW-menu-select-stt-li').appendChild(asrSelectAndSettingsBox);
				asrSelectAndSettingsBox.appendChild(Build.inlineActionButton('sepiaFW-menu-stt-settings', "<i class='material-icons md-inherit'>settings</i>",
					function(btn){
						SepiaFW.frames.open({
							pageUrl: "stt-settings.html"
						});
					})
				);
				asrSelectAndSettingsBox.appendChild(SepiaFW.speech.getSttEnginesSelector(
					function(selectedEngine){
						//do something here?
						if (selectedEngine != "native"){
							$('#sepiaFW-menu-stt-socket-url-li').show(300);
						}else{
							$('#sepiaFW-menu-stt-socket-url-li').hide(300);
						}
					}
				));
				
				//Socket STT server URL
				var speechRecoServerInput = document.getElementById("sepiaFW-menu-stt-socket-url");
				speechRecoServerInput.placeholder = "wss://my-sepia-asr.example/socket";
				speechRecoServerInput.value = SepiaFW.speechAudioProcessor.getSocketURI() || "";
				speechRecoServerInput.addEventListener("change", function(){
					var newHost = this.value;
					this.blur();
					SepiaFW.speechAudioProcessor.setSocketURI(newHost);
				});
				if (!SepiaFW.speechAudioProcessor || !SepiaFW.speechAudioProcessor.isAsrSupported){
					$("#sepiaFW-menu-stt-socket-url-li").hide();
				}else{
					//TODO: buffer hidden option (legacy setting - not tested! - keep?)
					SepiaFW.ui.longPressShortPressDoubleTap($("#sepiaFW-menu-stt-label")[0], function(){
						var defaultBufferLength = SepiaFW.audioRecorder.getWebAudioRecorderOptions()["processorBufferSize"];
						SepiaFW.ui.showPopup("Set new ASR streaming audio default buffer length (note: untested ^^).", {
							inputLabelOne: "New buffer length (currently: " + defaultBufferLength + ")",
							buttonOneName: SepiaFW.local.g("ok"),
							buttonOneAction: function(btn, input1){
								input1 = Number.parseInt(input1);
								console.log(input1);
								if (input1){
									SepiaFW.audioRecorder.setWebAudioRecorderOption("processorBufferSize", input1);
									//SepiaFW.data.setPermanent("sepia-asr-buffer-length", input1);
									setTimeout(function(){
										SepiaFW.ui.showPopup("New buffer length for custom ASR: " + input1);
									}, 303);
								}
							},
							buttonTwoName: "Default",
							buttonTwoAction: function(){
								SepiaFW.data.delPermanent("sepia-asr-buffer-length");
								setTimeout(function(){
									SepiaFW.ui.showPopup("Buffer length for custom ASR will reset after client reload.");
								}, 303);
							},
							buttonThreeName: SepiaFW.local.g("abort"),
							buttonThreeAction: function(){}
						});
					},'', undefined, '', true);
				}

				addOnMainMenuOpenAction("tts-and-stt", function(){
					if (SepiaFW.speech.voiceEngine == "native" || SepiaFW.speech.voiceEngine == "sepia"){
						$('#sepiaFW-menu-external-tts-url-li').hide();
					}else{
						$('#sepiaFW-menu-external-tts-url-li').show();
					}
					if (SepiaFW.speech.asrEngine == "native"){
						$('#sepiaFW-menu-stt-socket-url-li').hide();
					}else{
						$('#sepiaFW-menu-stt-socket-url-li').show();
					}
				});
			}
			//Smart microphone auto-toggle
			if (!SepiaFW.speech || !SepiaFW.speech.isAsrSupported){
				$('#sepiaFW-menu-toggle-smartMic-li').remove();
			}else{
				document.getElementById('sepiaFW-menu-toggle-smartMic-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-smartMic', 
					function(){
						SepiaFW.speech.useSmartMicToggle = true;
						SepiaFW.data.set('useSmartMicToggle', true);
						SepiaFW.debug.info("Smart mic-toggle is ON");
					},function(){
						SepiaFW.speech.useSmartMicToggle = false;
						SepiaFW.data.set('useSmartMicToggle', false);
						SepiaFW.debug.info("Smart mic-toggle is OFF");
					}, SepiaFW.speech.useSmartMicToggle)
				);
			}
			//CLEXI stuff
			if (SepiaFW.clexi && SepiaFW.clexi.isSupported){
				//add CLEXI toggle
				var clexiToggleLi = document.getElementById('sepiaFW-menu-toggle-clexi-li');
				clexiToggleLi.appendChild(Build.toggleButton('sepiaFW-menu-toggle-clexi', 
					function(){
						SepiaFW.data.set('clexiConnect', true);		//NOTE: see below at 'false'
						SepiaFW.debug.info("CLEXI connection is ENABLED");
						SepiaFW.clexi.setup();
					},function(){
						SepiaFW.data.set('clexiConnect', false);
						//NOTE: new 'doConnect' is calculated inside setup function and will stay active if URL parameter is used
						SepiaFW.debug.info("CLEXI connection is DISABLED");
						SepiaFW.clexi.close();
					}, SepiaFW.clexi.doConnect)
				);
				//add indicator
				var clexiIndicator = Build.stateIndicatorRGY('sepiaFW-menu-clexi-state', "r", function(){
					//green
				}, function(){
					//yellow
				}, function(){
					//red
				});
				clexiToggleLi.appendChild(clexiIndicator.getElement());
				SepiaFW.clexi.addStateIndicatorRGY(clexiIndicator);
				
				//CLEXI server URL
				var clexiServerInput = document.getElementById("sepiaFW-menu-clexi-socket-url");
				clexiServerInput.placeholder = "wss://raspberrypi.local:8443";
				clexiServerInput.value = SepiaFW.clexi.socketURI || "";
				clexiServerInput.addEventListener("change", function(){
					var newHost = this.value;
					this.blur();
					SepiaFW.clexi.setSocketURI(newHost);
				});
				//CLEXI server ID
				var clexiServerId = document.getElementById("sepiaFW-menu-clexi-server-id");
				clexiServerId.placeholder = "clexi-123";
				clexiServerId.value = SepiaFW.clexi.serverId || "";
				clexiServerId.addEventListener("change", function(){
					var newId = this.value;
					this.blur();
					SepiaFW.clexi.setServerId(newId);
				});

				//CLEXI Remote Terminal
				var clexiRemoteTerminalLi = document.getElementById("sepiaFW-menu-toggle-remote-terminal-li");
				clexiRemoteTerminalLi.appendChild(Build.toggleButton('sepiaFW-menu-toggle-remote-terminal', 
					function(){
						SepiaFW.data.set('useRemoteCmdl', true);
						SepiaFW.inputControls.cmdl.isAllowed = true;
						SepiaFW.debug.info("CLEXI Remote Terminal is ENABLED");
						SepiaFW.inputControls.cmdl.setup();
					},function(){
						SepiaFW.data.set('useRemoteCmdl', false);
						SepiaFW.inputControls.cmdl.isAllowed = false;
						SepiaFW.debug.info("CLEXI Remote Terminal is DISABLED");
						SepiaFW.inputControls.cmdl.setup();
					}, SepiaFW.inputControls.cmdl.isAllowed)
				);

			}else{
				$('#sepiaFW-menu-toggle-clexi-li').remove();
				$('#sepiaFW-menu-clexi-socket-url-li').remove();
				$('#sepiaFW-menu-toggle-remote-terminal-li').remove();
			}
			
			//Music app selector
			document.getElementById('sepiaFW-menu-select-music-app-li').appendChild(Build.musicAppSelector(SepiaFW.config.getMusicAppCollection()));
			SepiaFW.ui.onShortLongPress($('#sepiaFW-menu-select-music-app-li').find('span').first()[0], function(){
				//Short press
			}, function(){
				//Long press - this hidden setting moved to "experimental" below
			}, true);
			//$('#sepiaFW-menu-toggle-music-cards-btn').off().on('click', function(){});

			//Search engine selector
			document.getElementById('sepiaFW-menu-select-search-engine-li').appendChild(Build.searchEngineSelector(SepiaFW.config.webSearchEngines));

			//Wake-word stuff - Hey SEPIA
			if (!SepiaFW.wakeTriggers){
				$('#"sepiaFW-menu-toggle-wake-word-li"').remove();
			}else{
				var wakeWordLi = document.getElementById('sepiaFW-menu-toggle-wake-word-li');
				//settings - includes toggles
				wakeWordLi.appendChild(Build.inlineActionButton('sepiaFW-menu-wake-word-settings', "<i class='material-icons md-inherit'>settings</i>",
					function(btn){
						SepiaFW.wakeWordSettings.open();
					})
				);
			}
			//add GPS on start button
			if (SepiaFW.geocoder){
				document.getElementById('sepiaFW-menu-toggle-GPS-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-GPS', 
					function(){
						SepiaFW.data.set('autoGPS', true);
						SepiaFW.debug.info("GPS is on auto-mode");
						//refresh GPS
						SepiaFW.geocoder.getBestLocation();
					},function(){
						SepiaFW.data.set('autoGPS', false);
						SepiaFW.debug.info("GPS is on manual-mode");
					}, SepiaFW.geocoder.autoGPS)
				);
			}
			//toggle proactive notes
			document.getElementById('sepiaFW-menu-toggle-proactiveNotes-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-proactiveNotes', 
				function(){
					SepiaFW.assistant.isProActive = true;
					SepiaFW.data.set('proactiveNotes', true);
					SepiaFW.events.loadContextualEvents(); 						//refresh events
					SepiaFW.debug.info("Proactive notes are activated");
				},function(){
					SepiaFW.assistant.isProActive = false;
					SepiaFW.data.set('proactiveNotes', false);
					SepiaFW.events.clearAllProActiveBackgroundNotifications();	//remove notes
					SepiaFW.debug.info("Proactive notes are deactivated");
				}, SepiaFW.assistant.isProActive)
			);
			//toggle channel messages
			document.getElementById('sepiaFW-menu-toggle-channelMessages-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-channelMessages', 
				function(){
					SepiaFW.ui.showChannelStatusMessages = true;
					SepiaFW.data.set('channelStatusMessages', true);
					//show messages
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find(".statusMsg.info").each(function(){
						$(this).removeClass('hidden-by-settings');
					});
					SepiaFW.debug.info("Channel status messages are activated");
				},function(){
					SepiaFW.ui.showChannelStatusMessages = false;
					SepiaFW.data.set('channelStatusMessages', false);
					//hide messages
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find(".statusMsg.info").not(".always-show").each(function(){
						$(this).addClass('hidden-by-settings');
					});
					SepiaFW.debug.info("Channel status messages are deactivated");
				}, SepiaFW.ui.showChannelStatusMessages)
			);
			//toggle big-screen mode
			document.getElementById('sepiaFW-menu-toggle-bigScreenMode-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-bigScreenMode', 
				function(){
					SepiaFW.ui.useBigScreenMode = true;
					SepiaFW.data.setPermanent('big-screen-mode', true);
					SepiaFW.debug.info("Big-screen mode activated, please reload client.");
					SepiaFW.ui.showPopup("Please reload the interface to fully activate alternative controls.", {
						buttonOneName : "Reload now",
						buttonOneAction : function(){ setTimeout(function(){ location.reload(); }, 1000); },
						buttonTwoName : "Later",
						buttonTwoAction : function(){}
					});
					//resize
					$(window.document.body).removeClass("limit-size");
					$(window.document.body).addClass("big-screen");
					$(window).trigger('resize');
				},function(){
					SepiaFW.ui.useBigScreenMode = false;
					SepiaFW.data.setPermanent('big-screen-mode', false);
					SepiaFW.debug.info("Big-screen mode deactivated, please reload client.");
					SepiaFW.ui.showPopup("Please reload the interface to fully activate alternative controls.", {
						buttonOneName : "Reload now",
						buttonOneAction : function(){ setTimeout(function(){ location.reload(); }, 1000); },
						buttonTwoName : "Later",
						buttonTwoAction : function(){}
					});
					//resize
					$(window.document.body).addClass("limit-size");
					$(window.document.body).removeClass("big-screen");
					$(window).trigger('resize');
				}, SepiaFW.ui.useBigScreenMode)
			);
			//set screen orientation mode
			if (SepiaFW.ui.isScreenOrientationSupported()){
				document.getElementById('sepiaFW-menu-select-orientationMode-li').appendChild(Build.optionSelector('sepiaFW-menu-select-orientationMode', 
					[
						{value: "", name: "Default"}, 
						{value: "portrait", name: "Portrait"},
						{value: "landscape", name: "Landscape"}
					], 
					SepiaFW.ui.preferredScreenOrientation, 
					function(ele){
						SepiaFW.ui.setScreenOrientation(ele.value, function(or){
							SepiaFW.data.setPermanent('screen-orientation', ele.value);
						});
					}
				));
				addOnMainMenuOpenAction("screen-orientation", function(){
					$('#sepiaFW-menu-select-orientationMode').val(SepiaFW.ui.preferredScreenOrientation);
				});
			}else{
				$('#sepiaFW-menu-select-orientationMode-li').remove();
			}
			//toggle touch-bar controls
			document.getElementById('sepiaFW-menu-toggle-touchBarControls-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-touchBarControls', 
				function(){
					SepiaFW.ui.useTouchBarControls = true;
					SepiaFW.data.setPermanent('touch-bar-controls', true);
					SepiaFW.debug.info("Alternative touch-bar controls activated, please reload client.");
					SepiaFW.ui.showPopup("Please reload the interface to fully activate alternative controls.", {
						buttonOneName : "Reload now",
						buttonOneAction : function(){ setTimeout(function(){ location.reload(); }, 1000); },
						buttonTwoName : "Later",
						buttonTwoAction : function(){}
					});
				},function(){
					SepiaFW.ui.useTouchBarControls = false;
					SepiaFW.data.setPermanent('touch-bar-controls', false);
					SepiaFW.debug.info("Alternative touch-bar controls deactivated, please reload client.");
					SepiaFW.ui.showPopup("Please reload the interface to fully activate alternative controls.", {
						buttonOneName : "Reload now",
						buttonOneAction : function(){ setTimeout(function(){ location.reload(); }, 1000); },
						buttonTwoName : "Later",
						buttonTwoAction : function(){}
					});
				}, SepiaFW.ui.useTouchBarControls)
			);
			//Android only stuff
			if (!SepiaFW.ui.isAndroid){
				$('#sepiaFW-menu-toggle-runBackgroundConnection-li').remove();
			}else{
				//allow background activity
				document.getElementById('sepiaFW-menu-toggle-runBackgroundConnection-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-runBackgroundConnection', 
					function(){
						SepiaFW.client.allowBackgroundConnection = true;
						SepiaFW.data.set('allowBackgroundConnection', true);
						SepiaFW.debug.info("Background connection is allowed");
					},function(){
						SepiaFW.client.allowBackgroundConnection = false;
						SepiaFW.data.set('allowBackgroundConnection', false);
						SepiaFW.debug.info("Background connection is NOT allowed");
					}, SepiaFW.client.allowBackgroundConnection)
				);
			}
			//track power status for special events - e.g. plug-in -> switch to AO-mode
			if (!SepiaFW.alwaysOn || !SepiaFW.alwaysOn.isBatteryStatusSupported()){
				$('#sepiaFW-menu-toggle-trackPowerStatus-li').remove();
			}else{
				document.getElementById('sepiaFW-menu-toggle-trackPowerStatus-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-trackPowerStatus', 
					function(){
						SepiaFW.alwaysOn.trackPowerStatus = true;
						SepiaFW.data.set('trackPowerStatus', true);
						SepiaFW.debug.info("Power status tracking is allowed");
						SepiaFW.alwaysOn.setupBatteryStatus();
					},function(){
						SepiaFW.alwaysOn.trackPowerStatus = false;
						SepiaFW.data.set('trackPowerStatus', false);
						SepiaFW.debug.info("Power status tracking is NOT allowed");
						SepiaFW.alwaysOn.setupBatteryStatus();
					}, SepiaFW.alwaysOn.trackPowerStatus)
				);
			}
			//support gamepads as remotes and hotkeys in Always-On (by default)
			if (SepiaFW.inputControls){
				var inputControls = document.getElementById('sepiaFW-menu-input-controls-li');
				//settings
				inputControls.appendChild(Build.inlineActionButton('sepiaFW-menu-input-controls-settings', "<i class='material-icons md-inherit'>settings</i>",
					function(btn){
						SepiaFW.inputControls.openSettings();
					})
				);
			}
			//delete app cache
			document.getElementById('sepiaFW-menu-clear-app-cache-li').appendChild(Build.inlineActionButton('sepiaFW-menu-clear-app-cache', "Clear",
				function(btn){
					var config = {
						buttonOneName : SepiaFW.local.g('reload'),
						buttonOneAction : function(){ setTimeout(function(){ window.location.reload(); }, 1000); }
					};
					var keepPermanent = true;
					var localDataStatus = "---";
					SepiaFW.data.clearAppCache(function(status){
						//Success
						//clear all other data except permanent (e.g. host-name and device ID)
						var keepPermanent = true;
						localDataStatus = SepiaFW.data.clearAll(keepPermanent, function(){
							//delayed call
							SepiaFW.ui.showPopup((localDataStatus + " " + status), config);
						});
					}, function(status) {
						//Error
						//clear all other data except permanent (e.g. host-name and device ID)
						var keepPermanent = true;
						localDataStatus = SepiaFW.data.clearAll(keepPermanent, function(){
							//delayed call
							SepiaFW.ui.showPopup((localDataStatus + " " + status), config);
						});
					});
				}
			));
			//extended client info
			$('#sepiaFW-chat-menu-info').on("click", function(){
				var isStandalone = SepiaFW.ui.isStandaloneWebApp;
				var swRegistration, swState;
				if ('sepiaClientSwRegistration' in window){
					swRegistration = window.sepiaClientSwRegistration;
					swState = (swRegistration.active != undefined)? swRegistration.active.state : undefined;
				}
				var clientName = SepiaFW.config.clientInfo.replace(/_/g, " ").replace(SepiaFW.ui.version, "").trim();
				var container = document.createElement("div");
				container.className = "sepiaFW-client-info-popup";
				var infoBox = document.createElement("div");
				infoBox.innerHTML = ""
					+ "<p><b>Clien Info</b></p>"
					+ "<ul style='text-align: left;'>" 
						+ "<li><b>Device Type:</b> " + (SepiaFW.ui.isMobile? "Mobile" : "Desktop") + "</li>"
						+ "<li><b>Device Name:</b> " + (clientName) + "</li>"
						+ (SepiaFW.ui.isAnyChromium? ("<li><b>Chromium Brand:</b> " + (SepiaFW.ui.isEdge? "Microsoft Edge" : (SepiaFW.ui.isChrome? "Probably Google" : "Other")) + "</li>") : "")
						+ "<li><b>Version:</b> " + (SepiaFW.ui.version) + "</li>"
						+ "<li><b>App Type:</b> " + (isStandalone? "Standalone" : "Website") + "</li>"
						+ "<li><b>Type Info:</b> " + (SepiaFW.ui.isCordova? "Cordova App" : (isStandalone? "Homescreen/Custom" : "-")) + "</li>"
						+ "<li><b>Service Worker:</b> " + (swState) + "</li>"
					+ "</ul>";
				var debugBox = document.createElement("div");
				debugBox.innerHTML = "<p><b>Debug Options:</b></p>";
				debugBox.style.display = "flex";
				debugBox.style.flexDirection = "column";
				//reset SW
				function resetSw(callBack){
					if ('sepiaClientSwRegistration' in window){
						window.sepiaClientSwRegistration.unregister().then(function(boolean){
							if (callBack) callBack(boolean);
						});
					}else{
						if (callBack) callBack(false);
					}
				}
				var swDeactivateBtn = document.createElement("button");
				swDeactivateBtn.innerHTML = "Disable service-worker and restart";
				swDeactivateBtn.onclick = function(){
					resetSw(function(boolean){
						location.href = SepiaFW.tools.setParameterInURL(location.href, "noSW", true);
					});
				};
				var swDefaultBtn = document.createElement("button");
				swDefaultBtn.innerHTML = "Restore service-worker defaults";
				swDefaultBtn.onclick = function(){
					resetSw(function(boolean){
						location.href = SepiaFW.tools.removeParameterFromURL(location.href, "noSW");
					});
				};
				var pwaEnableBtn = document.createElement("button");
				pwaEnableBtn.innerHTML = "Enable PWA mode and restart";
				pwaEnableBtn.onclick = function(){
					var nuUrl = SepiaFW.tools.removeParameterFromURL(location.href, "noSW");
					location.href = SepiaFW.tools.setParameterInURL(nuUrl, "pwa", true);
				};
				container.appendChild(infoBox);
				container.appendChild(debugBox);
				debugBox.appendChild(swDeactivateBtn);
				debugBox.appendChild(swDefaultBtn);
				debugBox.appendChild(pwaEnableBtn);
				SepiaFW.ui.showPopup(container);
			});
			//show/hide experimental settings
			document.getElementById('sepiaFW-menu-experimental-settings-li').appendChild(Build.inlineActionButton('sepiaFW-menu-experimental-settings', "Toggle",
				function(btn){
					$('.sepiaFW-menu-experimental').toggle(300);
				}
			));
			//Embedded web-players
			document.getElementById('sepiaFW-menu-toggle-youtube-wp-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-youtube-wp', 
				function(){
					SepiaFW.ui.cards.canEmbedYouTube = true;
				},function(){
					SepiaFW.ui.cards.canEmbedYouTube = false;
				}, SepiaFW.ui.cards.canEmbedYouTube)
			);
			document.getElementById('sepiaFW-menu-toggle-spotify-wp-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-spotify-wp', 
				function(){
					SepiaFW.ui.cards.canEmbedSpotify = true;
				},function(){
					SepiaFW.ui.cards.canEmbedSpotify = false;
				}, SepiaFW.ui.cards.canEmbedSpotify)
			);
			document.getElementById('sepiaFW-menu-toggle-apple-music-wp-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-apple-music-wp', 
				function(){
					SepiaFW.ui.cards.canEmbedAppleMusic = true;
				},function(){
					SepiaFW.ui.cards.canEmbedAppleMusic = false;
				}, SepiaFW.ui.cards.canEmbedAppleMusic)
			);
			//Account-Language
			document.getElementById("sepiaFW-menu-account-language-li").appendChild(Build.languageSelector("sepiaFW-menu-account-language-dropdown", function(selectedLanguage){
				//save
				var lang = {};		lang[SepiaFW.account.LANGUAGE_PREF] = selectedLanguage;
				var data = {};		data[SepiaFW.account.INFOS] = lang;
				SepiaFW.account.saveAccountData(data);
				//change url to reflect change
				var url = SepiaFW.tools.setParameterInURL(window.location.href, 'lang', selectedLanguage);
				history.pushState({"language": selectedLanguage}, "", url);
			}));
			//Account-Region - for example used as: ASR (STT) voice input language
			document.getElementById('sepiaFW-menu-account-region-li').appendChild(Build.regionCodeSelector('sepiaFW-menu-account-region-dropdown', function(selectedRegion){
				//TODO: save in account?
				//...
				//change url to reflect change
				var url;
				if (selectedRegion){
					url = SepiaFW.tools.setParameterInURL(window.location.href, 'rc', selectedRegion);
				}else{
					url = SepiaFW.tools.removeParameterFromURL(window.location.href, 'rc');
				}
				history.pushState({"rc": selectedRegion}, "", url);
			}));
			//Account-Nickname
			document.getElementById("sepiaFW-menu-account-nickname").addEventListener("change", function(){
				var newName = this.value;
				//if (newName !== SepiaFW.account.getUserName()){
					var name = {};		name[SepiaFW.account.NICK_NAME] = newName;
					var data = {};		data[SepiaFW.account.USER_NAME] = name;
					SepiaFW.account.saveAccountData(data);
					/* ES6 (no IE11 support)
					SepiaFW.account.saveAccountData({
						[SepiaFW.account.USER_NAME] : { [SepiaFW.account.NICK_NAME] : newName }
					}); */
					SepiaFW.config.broadcastUserName(newName);
					this.blur();
				//}
			});
			//Account-Preferred Temperature Unit
			document.getElementById("sepiaFW-menu-account-preftempunit-li").appendChild(SepiaFW.ui.build.optionSelector(
					"sepiaFW-menu-account-preftempunit-dropdown", SepiaFW.account.OPTIONS_TEMPERATURE, SepiaFW.account.OPTIONS_TEMPERATURE_DEFAULT, 
					function(selectedOption){
				//save
				var unit = {};		unit[SepiaFW.account.UNIT_PREF_TEMP] = selectedOption.value;
				var data = {};		data[SepiaFW.account.INFOS] = unit;
				SepiaFW.account.saveAccountData(data);
				//update account cache
				SepiaFW.account.setUserPreferredTemperatureUnit(selectedOption.value);
			}));
			//Account-Shared Access Permissions (remote-action)
			document.getElementById("sepiaFW-menu-account-shared-access-remote-actions-li").appendChild(Build.inlineActionButton('sepiaFW-menu-input-shared-access-settings', "<i class='material-icons md-inherit'>settings</i>",
				function(btn){
					SepiaFW.frames.open({ 
						pageUrl: "shared-access.html"
					});
				})
			);
			//Store, load and export app settings
			document.getElementById("sepiaFW-menu-store-app-settings-btn").addEventListener("click", function(){
				SepiaFW.account.saveAppSettings();
			});
			document.getElementById("sepiaFW-menu-load-app-settings-btn").addEventListener("click", function(){
				SepiaFW.account.loadAppSettings();
			});
			document.getElementById("sepiaFW-menu-export-app-settings-btn").addEventListener("click", function(){
				SepiaFW.config.exportSettingsForHeadlessMode();
			});
			//Sign-out all clients
			document.getElementById("sepiaFW-menu-ui-signoutall-btn").addEventListener("click", function(){
				SepiaFW.account.logoutAction(true);
			});
			//Admin tools
			document.getElementById("sepiaFW-menu-ui-admin-tools-btn").addEventListener("click", function(){
				SepiaFW.frames.open({pageUrl: "admin.html"});
			});
			//Account Password reset
			document.getElementById("sepiaFW-menu-account-pwd-reset-btn").addEventListener("click", function(){
				SepiaFW.frames.open({
					pageUrl: "password-reset.html",
					onOpen: function(){ 
						$('#sepiaFW-pwd-reset-view').find('input').val(''); 
						$('#sepiaFW-pwd-reset-uid').val(SepiaFW.account.getUserId());
					},
					onClose: function(){ $('#sepiaFW-pwd-reset-view').find('input').val(''); }
				});
			});
			//Reload app
			document.getElementById("sepiaFW-menu-ui-refresh-btn").addEventListener("click", function(){
				window.location.reload(true);
			});
			//Pop-up window
			if (SepiaFW.ui.isCordova){
				$('#sepiaFW-menu-ui-new-sepia-popup-btn').hide();
			}else{
				document.getElementById("sepiaFW-menu-ui-new-sepia-popup-btn").addEventListener("click", function(){
					var h = Math.min(window.screen.availHeight, 800);
					var w = Math.min(window.screen.availWidth, 480);
					window.open(window.location.href, "SEPIA", "width=" + w + ",height=" + h + ",top=0,left=0");
					//check window.location.origin before?
				});
			}
			//Address home toggle
			$('#sepiaFW-menu-adr-home').hide();
			var firstAdrHomeOpen = true;
			document.getElementById("sepiaFW-menu-adr-home-header").addEventListener("click", function(){
				$('#sepiaFW-menu-adr-home').fadeToggle(300);
				if (firstAdrHomeOpen){
					firstAdrHomeOpen = false;
					SepiaFW.account.loadAddressByTag(SepiaFW.account.ADDRESS_TAG_HOME, function(adr){
						if (adr && Object.keys(adr).length > 0){
							if (adr.street) $("#sepiaFW-menu-adr-home-street").val(adr.street);
							if (adr.s_nbr) $("#sepiaFW-menu-adr-home-street_nbr").val(adr.s_nbr);
							if (adr.city) $("#sepiaFW-menu-adr-home-city").val(adr.city);
							if (adr.code) $("#sepiaFW-menu-adr-home-zip_code").val(adr.code);
							if (adr.country) $("#sepiaFW-menu-adr-home-country").val(adr.country);
						}
					},function(msg){
						SepiaFW.ui.showPopup(msg);
					});
				}
			});
			//Address home save
			document.getElementById("sepiaFW-menu-adr-home-save").addEventListener("click", function(){
				SepiaFW.account.saveAddressWithTag(SepiaFW.account.ADDRESS_TAG_HOME,
						$("#sepiaFW-menu-adr-home-street").val(), $("#sepiaFW-menu-adr-home-street_nbr").val(),
						$("#sepiaFW-menu-adr-home-city").val(),
						$("#sepiaFW-menu-adr-home-zip_code").val(),
						$("#sepiaFW-menu-adr-home-country").val());
			});
			//Address work toggle
			$('#sepiaFW-menu-adr-work').hide();
			var firstAdrWorkOpen = true;
			document.getElementById("sepiaFW-menu-adr-work-header").addEventListener("click", function(){
				$('#sepiaFW-menu-adr-work').fadeToggle(300);
				if (firstAdrWorkOpen){
					firstAdrWorkOpen = false;
					SepiaFW.account.loadAddressByTag(SepiaFW.account.ADDRESS_TAG_WORK, function(adr){
						if (adr && Object.keys(adr).length > 0){
							if (adr.street) $("#sepiaFW-menu-adr-work-street").val(adr.street);
							if (adr.s_nbr) $("#sepiaFW-menu-adr-work-street_nbr").val(adr.s_nbr);
							if (adr.city) $("#sepiaFW-menu-adr-work-city").val(adr.city);
							if (adr.code) $("#sepiaFW-menu-adr-work-zip_code").val(adr.code);
							if (adr.country) $("#sepiaFW-menu-adr-work-country").val(adr.country);
						}
					},function(msg){
						SepiaFW.ui.showPopup(msg);
					});
				}
			});
			//Address work save
			document.getElementById("sepiaFW-menu-adr-work-save").addEventListener("click", function(){
				SepiaFW.account.saveAddressWithTag(SepiaFW.account.ADDRESS_TAG_WORK, 
						$("#sepiaFW-menu-adr-work-street").val(), $("#sepiaFW-menu-adr-work-street_nbr").val(),
						$("#sepiaFW-menu-adr-work-city").val(),
						$("#sepiaFW-menu-adr-work-zip_code").val(),
						$("#sepiaFW-menu-adr-work-country").val());
			});
			
			//Data privacy
			document.getElementById("sepiaFW-menu-ui-dataprivacy-btn").addEventListener("click", function(){
				SepiaFW.ui.closeAllMenus();
				//SepiaFW.frames.open({ pageUrl: "data-policy.html" });
				SepiaFW.ui.actions.openUrlAutoTarget(SepiaFW.config.privacyPolicyUrl + "?host=" + encodeURIComponent(SepiaFW.config.host));
			});
			//License
			document.getElementById("sepiaFW-menu-ui-license-btn").addEventListener("click", function(){
				SepiaFW.ui.closeAllMenus();
				//SepiaFW.frames.open({ pageUrl: "license.html" });
				SepiaFW.ui.actions.openUrlAutoTarget(SepiaFW.config.clientLicenseUrl);
			});
			//Credits
			document.getElementById("sepiaFW-menu-ui-credits-btn").addEventListener("click", function(){
				SepiaFW.ui.closeAllMenus();
				SepiaFW.frames.open({ pageUrl: "credits.html" });
			});
			
			//---FOOT---
			footDiv.innerHTML = ""
				+ "<div id='sepiaFW-chat-menu-footer-border'></div>"
				+ "<div id='sepiaFW-chat-menu-page-selector'></div>"
				+ "<p id='sepiaFW-by-Florian-Quirin'>by Florian Quirin</p>";
			menuArea.appendChild(footDiv);
			
			//page selector
			//... moved to extra function and is called after SOC is created
		}
	}
	//Menue-page-selector
	Build.menuPageSelector = function(){
		var menuPageSelector = document.getElementById("sepiaFW-chat-menu-page-selector");
		if (menuPageSelector){
			if (SepiaFW.ui.soc){
				var pages = SepiaFW.ui.soc.getNumberOfPanes();
				for (var i=0; i<pages; i++){
					(function(menuPageSelector, index){
						var pageBtn = document.createElement('BUTTON');
						pageBtn.textContent = index+1;
						menuPageSelector.appendChild(pageBtn);
						pageBtn.addEventListener("click", function(){
							SepiaFW.ui.soc.showPane(index);
						});
					})(menuPageSelector, i);
				}
				//... and a close button
				var closeBtn = document.createElement('BUTTON');
				closeBtn.textContent = "×";
				menuPageSelector.appendChild(closeBtn);
				SepiaFW.ui.onclick(closeBtn, function(){
				//closeBtn.addEventListener("click", function(){
					SepiaFW.ui.toggleSettings();
				});
			}
		}
	}

	//Build music app selector
    Build.musicAppSelector = function(appCollection){
        var selector = document.getElementById('sepiaFW-menu-select-music-app') || document.createElement('select');
        selector.id = 'sepiaFW-menu-select-music-app';
        $(selector).find('option').remove();
        //fill
        Object.keys(appCollection).forEach(function(appTag){
            var option = document.createElement('option');
            option.value = appTag;
            option.textContent = appCollection[appTag].name;
            selector.appendChild(option);
            if (appTag == SepiaFW.config.getDefaultMusicApp()){
                option.selected = true;
            }
        });
        //add button listener
        $(selector).off().on('change', function() {
            SepiaFW.config.setDefaultMusicApp($('#sepiaFW-menu-select-music-app').val());
        });
        return selector;
	}
	
	//Build music app selector
    Build.searchEngineSelector = function(engineCollection){
        var selector = document.getElementById('sepiaFW-menu-select-search-engine') || document.createElement('select');
        selector.id = 'sepiaFW-menu-select-search-engine';
        $(selector).find('option').remove();
        //fill
        Object.keys(engineCollection).forEach(function(engine){
            var option = document.createElement('option');
            option.value = engine;
            option.textContent = engineCollection[engine].name;
            selector.appendChild(option);
            if (engine == SepiaFW.config.getPreferredSearchEngine()){
                option.selected = true;
            }
        });
        //add button listener
        $(selector).off().on('change', function() {
            SepiaFW.config.setPreferredSearchEngine($('#sepiaFW-menu-select-search-engine').val());
        });
        return selector;
    }
	
	//User-List
	Build.userList = function(userList, userId, deviceId){
		var userListEle = document.getElementById("sepiaFW-chat-userlist");
		if (!userList && userListEle){
			userListEle.innerHTML = '';
		
		}else if (userListEle){
			//clear all old listeners
			$('#sepiaFW-chat-userlist li').off();
			//create new list
			userListEle.innerHTML = "";
			var avoidDoubles = [];
			var activeChatPartner = SepiaFW.client.getActiveChatPartner();
			userList.forEach(function(user){
				var entryClass = "";
				var name = user.name; 		//TODO: distinguish identical names
				//prevent names that are like IDs
				if (SepiaFW.account.stringLooksLikeAnID(name)){
					name = "ID:" + name;
				}
				if ($.inArray(user.id + "_" + user.deviceId, avoidDoubles) == -1){
					if (user.id === userId && user.deviceId === deviceId){
						entryClass = "me";
					}else if (user.id === userId){
						entryClass = "me";
						name = name + " (" + user.deviceId + ")";
					}else if (activeChatPartner && (activeChatPartner.id == user.id)){
						entryClass = "user active";
					}else{
						entryClass = "user";
					}
					if (user.id == SepiaFW.assistant.id){
						entryClass += " assistant";
					}
					var ele = document.createElement("li");
					ele.className = entryClass;
					ele.dataset.userEntry = JSON.stringify(user);
					ele.title = user.id;
					ele.textContent = name;
					$(ele).appendTo("#sepiaFW-chat-userlist");
					avoidDoubles.push(user.id + "_" + user.deviceId);
				}
			});
			//add onclick again - @user to input
			$('#sepiaFW-chat-userlist li.user').on( "click", function() {
				if ($(this).hasClass('active')){
					SepiaFW.client.switchChatPartner('');
					$(this).removeClass('active');
				}else{
					$('#sepiaFW-chat-userlist').find('.user').each(function(){
						$(this).removeClass('active');
					});
					var thisUser = JSON.parse($(this).attr('data-user-entry'));
					SepiaFW.client.switchChatPartner(thisUser);
					$(this).addClass('active');
				}
								
				/* old button action:
				var inputLine = $('#sepiaFW-chat-input').val();
				if (inputLine.indexOf("@" + thisUser.name + ' ') === 0){
					//nothing but focus
				}else if (inputLine.indexOf("@") === 0){
					//replace
					inputLine = inputLine.replace(/^@.*?\s/, '@' + thisUser.name + ' ');
					$('#sepiaFW-chat-input').val(inputLine);
				}else{
					//add
					$('#sepiaFW-chat-input').val('@' + thisUser.name + ' ' + inputLine);
				}
				document.getElementById("sepiaFW-chat-input").focus();
				*/
			});
		}
	}
	
	//Channel-List
	Build.channelList = function(channelList, activeChannelId){
		var channelListEle = document.getElementById("sepiaFW-chat-channellist");
		if (channelList && channelListEle){
			//clear all old listeners
			$('#sepiaFW-chat-channellist li').off();
			//create new list
			channelListEle.innerHTML = "";
			channelList.forEach(function(channel){
				var entryClass = "channel";
				if (channel.name.indexOf("<assistant_name>") >= 0){
					channel.name = channel.name.replace("<assistant_name>", SepiaFW.assistant.name); 
				}
				if (channel.id == SepiaFW.account.getUserId()){
					entryClass += " my-channel";
				}
				if (channel.id === activeChannelId){
					entryClass += " active";
				}
				if (channel.isOpen || channel.isPublic){
					entryClass += " public";
				}
				var ele = document.createElement("li");
				ele.className = entryClass;
				ele.dataset.channelEntry = JSON.stringify(channel);
				ele.title = channel.name;
				ele.textContent = name;
				var spanEle = document.createElement("span");
				spanEle.dataset.channelId = channel.id;
				spanEle.textContent = channel.name;
				ele.appendChild(spanEle);
				$(ele).appendTo("#sepiaFW-chat-channellist");
			});
			//add on click again - @user to input
			$('#sepiaFW-chat-channellist li.channel').on( "click", function(){
				var thisChannel = JSON.parse($(this).attr('data-channel-entry'));
				//reset active chat partner
				SepiaFW.client.switchChatPartner('');
				SepiaFW.client.switchChannel(thisChannel.id); 		//there is also a key-option, but the server currently does it by userId check
				//switch to chat and close menues
				SepiaFW.ui.moc.showPane(1);
				SepiaFW.ui.closeAllMenusThatCollide("#sepiaFW-chat-output");
				//SepiaFW.ui.closeMenuWithId("sepiaFW-chat-channel-view");
			});
		}
	}
	Build.updateChannelList = function(activeChannelId){
		$("#sepiaFW-chat-channellist li.channel").each(function(){
			var thisChannel = JSON.parse($(this).attr('data-channel-entry'));
			if (thisChannel.id === activeChannelId){
				$(this).addClass('active');
			}else{
				$(this).removeClass('active');
			}
		});
	}
	Build.updateChannelControlButtons = function(activeChannelData){
		//hide all contextual buttons
		$('#sepiaFW-chat-channel-controls').find(".sepiaFW-chat-channel-controls-btn.contextual").hide();
		//show by context
		if (activeChannelData.owner && activeChannelData.owner != activeChannelData.id && activeChannelData.owner == SepiaFW.account.getUserId()){
			$('#sepiaFW-chat-invite-btn').show();
		}
	}
	
	//make message object
	Build.makeMessageObject = function(text, sender, senderType, receiver, channelId){
		//TODO: is this really needed or is webSocket.common.SepiaSocketMessage enough - this is for internal construction
		var message = {};
		message.text = text;
		message.sender = sender;
		message.senderType = senderType;
		message.receiver = receiver;
		message.channelId = channelId;
		message.time = SepiaFW.tools.getLocalTime();
		return message;
	}

	//chat entry block
	Build.chatEntry = function(msg, username, options){
		var isAssistMsg = (msg.data && (msg.data.dataType === "assistAnswer" || msg.data.dataType === "assistFollowUp"));
		var isSafeMsg = false;		//a safe message is a message sent by an assistant to the user specifically or in a private channel
		
		var type = msg.senderType;
		var text; 
		if (isAssistMsg){
			text = msg.data.assistAnswer.answer;
			if (text) text = SepiaFW.tools.escapeHtml(text); 		//we better escape this ... 'cause the server won't
		}else{
			text = msg.text;
		}
		var sender = msg.sender;
		var senderName = SepiaFW.account.contacts.getNameOfUser(sender) || "";
		var senderText = (senderName)? senderName : sender;
		var receiver = msg.receiver;
		var receiverName = SepiaFW.account.contacts.getNameOfUser(receiver) || "";
		//we try to show the original time in local client format if possible OR we just take the client recieve time
		var time = (msg.timeUNIX != undefined)? SepiaFW.tools.getLocalTime(undefined, msg.timeUNIX) : SepiaFW.tools.getLocalTime();	//msg.time;
		//var timeUNIX = msg.timeUNIX;
		
		if (!text)	options.skipText = true;
		
		//type analysis
		var classes = '';
		var classesBlock = 'chatMsg';
		if (sender === username){ 
			type = "me";
			classes += ' chatMe';
			classesBlock += ' right';
			if (receiver){
				senderText = "<em>" + SepiaFW.local.g("pmFor") + "</em>" + (receiverName? receiverName : receiver);
				type = "me-pm";
				classes += ' chatPm';
			}
		}
		else if (receiver === username){
			senderText = "<em>" + SepiaFW.local.g("pmFrom") + "</em>" + senderText;
			if (msg.senderType === "assistant"){
				isSafeMsg = true;
				type = "pm-assistant";
				classes += ' chatAssistant';
				classes += ' chatPm';
			}else{
				type = "pm";
				classes += ' chatPm';
			}
		}
		else if (msg.senderType === "assistant"){
			classes += ' chatAssistant';
		}
		classes = classes.trim();
		
		if (classes === ""){
			classes = "chatOther";
		}else if (classes === "chatPm"){
			classes = "chatOther chatPm";
		}

		//find correct channel
		var activeChannel = SepiaFW.client.getActiveChannel();
		if (msg.channelId && msg.channelId == "info"){
			if (activeChannel) msg.channelId = activeChannel;		//try active channel - if we don't have one stick with 'info'
		}
		if (!msg.channelId){
			msg.channelId = SepiaFW.account.getUserId() || ""; 		//TODO: what shall we do without channel ID?
			isSafeMsg = true;
		}else if (msg.channelId == SepiaFW.account.getUserId()){
			isSafeMsg = true;
		}
		if (!msg.channelId && !SepiaFW.client.isDemoMode()){		//Demo-mode allows empty channel
			//still no channel ID? then abort
			return undefined;
		}
		
		//switch carousel pane?
		if (!options.targetView){
			//if (SepiaFW.ui.moc) SepiaFW.ui.moc.showPane(1);
		}
		
		//make block
		var block = document.createElement('DIV');
		block.className = classesBlock;
		block.dataset.channelId = msg.channelId;
		if (activeChannel && activeChannel != msg.channelId){
			block.className += ' hidden-by-channel';
			//TODO: add some indicator for new channel messages of inactive channels
		}
		
		//make text
		if (!options.skipText){
			var msgArticle = document.createElement('ARTICLE');
			var msgHead = document.createElement('DIV');
			msgHead.className = 'header';
			msgHead.innerHTML = SepiaFW.tools.sanitizeHtml(""
				+ "<b class='sender' data-sender='" + sender + "'>" + senderText + ": </b>"
				+ "<span class='timestamp'>" + time + "</span>");
			msgArticle.className = classes;
			msgArticle.innerHTML = SepiaFW.tools.sanitizeHtml(""
				+ "<p>" + text.replace(/\n|\s\s/g, "<br>") + "</p>");		//NOTE: the server will deliver 'text' as HTML escaped string UNLESS its from the assistant data object (then we escape above)
			
			msgArticle.insertBefore(msgHead, msgArticle.childNodes[0]);	
			block.appendChild(msgArticle);
		
			//add quick private message button
			SepiaFW.ui.longPressShortPressDoubleTab(msgHead, function(){
				//different available options:
				var copyTextButton = {
					inputLabelOne: "Text",
					inputOneValue: SepiaFW.tools.unescapeHtml(text),		//since this is escaped we need to convert it back
					buttonOneName: "Copy text",
					buttonOneAction: function(btn, v1, v2, inputEle1, ie2){
						//select text and copy
						inputEle1.select();
						document.execCommand("copy");
					}
				};
				var copyUrlButton = {
					buttonTwoName: "Copy share link",
					buttonTwoAction: function(btn, v1, v2, inputEle1, ie2){
						//build link, set it, select it and copy
						inputEle1.value = SepiaFW.client.buildDeepLinkFromText(text);
						inputEle1.select();
						document.execCommand("copy");
					}
				};
				var replyButton = {
					buttonThreeName: "Reply",
					buttonThreeAction: function(){
						if (sender){
							$('#sepiaFW-chat-input').val("@" + sender + " ");
							$('#sepiaFW-chat-input').focus();
						}
					}
				};
				var abortButton = {
					buttonFourName: "Abort",
					buttonFourAction: function(){}
				};
				//long-press - copy or reply stuff
				if (sender == SepiaFW.assistant.id){
					//Assistant answer
					SepiaFW.ui.showPopup("Select:", $.extend(true, {}, copyTextButton, replyButton, abortButton));
				}else if (sender == SepiaFW.account.getUserId()){
					//User text
					SepiaFW.ui.showPopup("Select:", $.extend(true, {}, copyTextButton, copyUrlButton, abortButton));
				}else{
					//Other user
					SepiaFW.ui.showPopup("Select:", $.extend(true, {}, copyTextButton, copyUrlButton, replyButton, abortButton));
				}
			},'',function(){
				//short-press
			},function(){
				//double-tab - copy text to input
				$('#sepiaFW-chat-input').val(SepiaFW.tools.unescapeHtml(text));		//escaped text ...
			}, true);

			//add copy-text-button
			/*
			SepiaFW.ui.longPressShortPressDoubleTab(msgArticle, function(){
				//long-press
				var range, selection;
				msgArticle.style.userSelect = "";
				if (document.body.createTextRange) {
					range = document.body.createTextRange();
					range.moveToElementText(msgArticle);
					range.select();
				} else if (window.getSelection) {
					selection = window.getSelection();        
					range = document.createRange();
					range.selectNodeContents(msgArticle);
					selection.removeAllRanges();
					selection.addRange(range);
				}
			},'',function(){
				//short-press
			},function(){
				//double-tab
			}, true);
			*/
		}
		
		//add card-data - NOTE: we allow this even if isAssistMsg=false
		if (msg.data && msg.data.assistAnswer && msg.data.assistAnswer.hasCard){
			var card = SepiaFW.ui.cards.get(msg.data.assistAnswer, sender, isSafeMsg);
			
			//Inline data
			if (card.dataInline && card.dataInline.length>0){
				for (i=0; i<card.dataInline.length; i++){
					block.appendChild(card.dataInline[i]);
				}
				
			//Full screen cards
			}else if (card.dataFullScreen && card.dataFullScreen.length>0){
				//This is a bit quirky, since the parent function should decide how to handle the block ...
				//... but the card-handler method can overwrite the target-view

				//... so we don't add to block but big-results and check 'options.skipInsert' here instead
				//NOTE: do we need to check more options?
				if (!options.skipInsert){
					var bigResultView = document.getElementById('sepiaFW-result-view');
					bigResultView.innerHTML = '';
					for (i=0; i<card.dataFullScreen.length; i++){
						bigResultView.appendChild(card.dataFullScreen[i]);
					}
					if (SepiaFW.ui.moc){
						setTimeout(function(){
							SepiaFW.ui.moc.showPane(2);
						}, 500);
					}
				}
				
			//Unknown
			}else{
				var info;
				try{
					info = msg.data.assistAnswer.resultInfo.cmd;
				}catch(err){
					info = 'unknown';
				}
				SepiaFW.debug.info('Card: type not supported yet for cmd=' + info);
			}
		}

		//Actions
		if (isAssistMsg && SepiaFW.ui.actions){
			//skip auto-executed actions?
			if (options.skipNoneButtonActions){
				options.doButtonsOnly = true;
			}
			if (!options.skipActions || options.skipNoneButtonActions){		//NOTE: skipNoneButtonActions is allowed to overwrite skipAction ... I guess ^^
				SepiaFW.ui.actions.handle(msg.data.assistAnswer, block, sender, options, isSafeMsg);
			}
		}

		return block;
	}
	
	//chat status message block
	Build.statusMessage = function(msg, username, isErrorMessage, alwaysShow){
		var type = msg.senderType;
		var text = msg.text;
		if (text) text = text.replace(/<assistant_name>|\&lt;assistant_name\&gt;/ig, SepiaFW.assistant.name);		//TODO: collect these replacements in a central place
		var sender = msg.sender;
		var senderName = SepiaFW.account.contacts.getNameOfUser(sender) || "";
		var senderText = (senderName)? senderName : sender;
		var time = SepiaFW.tools.getLocalTime();	//msg.time; 	//for display we just take the client recieve time
		//var timeUNIX = msg.timeUNIX;
		var channelId = msg.channelId || SepiaFW.client.getActiveChannel();
		if (!channelId){
			channelId = 'info';		//TODO: do we want that here?
		}
		
		//type analysis
		var classes = type || ''; 	//assistant, client, server
		
		var block = document.createElement('DIV');
		block.className = 'statusMsg';
		block.dataset.channelId = channelId;
		var article = document.createElement('ARTICLE');
		article.className = 'statusUpdate';
		if (isErrorMessage){
			//error message
			article.className += ' errorMsg';
			block.className += ' error';
		}else{
			//everything else is status message
			block.className += ' info';
			if (!alwaysShow && !SepiaFW.ui.showChannelStatusMessages){
				block.className += ' hidden-by-settings';
			}
		}
		//inner HTML:
		var articleSender = document.createElement('b');
		articleSender.className = classes;
		articleSender.textContent = (senderText + ": ");
		article.appendChild(articleSender);

		var articleText = document.createElement('span');
		articleText.className = 'status';
		articleText.innerHTML = SepiaFW.tools.sanitizeHtml(text);			//NOTE: the server will deliver 'text' as HTML escaped string (XSS vector?)
		article.appendChild(articleText);

		var articleTimestamp = document.createElement('span');
		articleTimestamp.className = 'timestamp';
		articleTimestamp.textContent = time;
		article.appendChild(articleTimestamp);
			
		block.appendChild(article);

		//add quick private message button
		var closeBtn = articleTimestamp;
		SepiaFW.ui.longPressShortPressDoubleTab(closeBtn, function(){
			//long-press
		},'',function(){
			//short-press
			$(article).remove();
		},function(){
			//double-tab
		}, true);

		return block;
	}
	
	//my-view specific actions block - used only internally?
	Build.myViewActionsBlock = function(actionsArray, sender, options){
		//make block
		var classesBlock = 'chatMsg';
		var block = document.createElement('DIV');
		block.className = classesBlock;
		block.dataset.channelId = SepiaFW.client.getActiveChannel();
		
		//build dummy assistant answer
		var assistAnswer = {
			actionInfo: actionsArray
		};
		
		//Actions
		if (SepiaFW.ui.actions){
			var isSafe = true;		//this is triggered by user and thus safe by default
			if (options.skipNoneButtonActions){
				options.doButtonsOnly = true;
			}
			if (!options.skipActions || options.skipNoneButtonActions){		//NOTE: skipNoneButtonActions is allowed to overwrite skipAction ... I guess ^^
				SepiaFW.ui.actions.handle(assistAnswer, block, sender, options, isSafe);
			}
		}
		return block;
	}
	
	return Build;
}