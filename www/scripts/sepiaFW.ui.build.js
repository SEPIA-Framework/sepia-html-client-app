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
		var code = "";
		optionsObjectArray.forEach(function(option){
			code += '<option value="' + option.value + '">' + option.name + '</option>';
		});
		ele.innerHTML = code;
		
		//initialize selected value
		for(var i, j = 0; i = ele.options[j]; j++) {
			if(i.value == selectedValue) {
				ele.selectedIndex = j;
				break;
			}
		}

		//change listener
		$(ele).off().on('change', function(){
			if (optionChangeAction) optionChangeAction(ele);
		});
		return ele;
	}
	//build reuseable language selector
	Build.languageSelector = function(btnId, languageChangeAction){
		return Build.optionSelector(btnId, 
			SepiaFW.local.getSupportedAppLanguages(), 
			SepiaFW.config.appLanguage, 
			function(ele){
				SepiaFW.config.broadcastLanguage(ele.value);
				languageChangeAction(ele.value);
			}
		);
	}
	
	//toggle button
	Build.toggleButton = function(btnId, onCallback, offCallback, initialState){
		var tglBtn = document.createElement('DIV');
		tglBtn.className = "sepiaFW-toggle-btn";
		if (btnId) tglBtn.id = btnId;
		if (initialState){
			tglBtn.innerHTML = "<div class='on'></div>";
			tglBtn.setAttribute("data-toggle-state", "on");
		}else{
			tglBtn.innerHTML = "<div class='off'></div>";
			tglBtn.setAttribute("data-toggle-state", "off");
		}
		
		$(tglBtn).off();
		$(tglBtn).on('click', function() {
			if (this.getAttribute("data-toggle-state") === "on"){
				this.setAttribute("data-toggle-state", "off");
				this.firstChild.className = "off";
				if (offCallback) offCallback();
			}else{
				this.setAttribute("data-toggle-state", "on");
				this.firstChild.className = "on";
				if (onCallback) onCallback();
			}
		});
		
		return tglBtn;
	}
	//switch toggle button state without triggering callbacks
	Build.toggleButtonSetState = function(btnId, newStateOnOrOff){
		var tglBtn = document.getElementById(btnId);
		if (tglBtn){
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
		if (btnName) btn.innerHTML = btnName;
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
	Build.uiButtonsAndLogic = function(){
		//TOP BUTTONS
		
		//open close menue
		var menuBtn = document.getElementById("sepiaFW-nav-menu-btn");
		if (menuBtn){
			$(menuBtn).off();
			SepiaFW.ui.onclick(menuBtn, function(){
			//$(menuBtn).on("click", function (){
				var menu = $("#sepiaFW-chat-menu");
				if (menu.css('display') == 'none'){
					menu.fadeIn(300);
					SepiaFW.ui.closeAllMenusThatCollide("#" + menu[0].id);
					$('#sepiaFW-main-window').trigger(('sepiaFwOpen-' + menu[0].id));
				}else{
					menu.fadeOut(300);
					$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + menu[0].id));
				}
			});
		}
		//kind'a tricky way to catch the main menue close/open event
		$('#sepiaFW-main-window').on("sepiaFwOpen-sepiaFW-chat-menu", function(){
			//open
			SepiaFW.ui.switchSwipeBars('menu');
			$('#sepiaFW-chat-controls').addClass('chat-menu');
			SepiaFW.ui.isMenuOpen = true;
			if (SepiaFW.ui.soc) SepiaFW.ui.soc.refresh();
		}).on("sepiaFwClose-sepiaFW-chat-menu", function(){
			//close
			SepiaFW.ui.switchSwipeBars('chat');
			$('#sepiaFW-chat-controls').removeClass('chat-menu');
			SepiaFW.ui.isMenuOpen = false;
		});
		
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
				if (SepiaFW.speech && SepiaFW.speech.isRecognizing()){
					SepiaFW.speech.stopRecognition();
				}else{
					if (SepiaFW.audio && SepiaFW.audio.initAudio(SepiaFW.client.sendInputText)){
						//skip because of callback
					}else{
						SepiaFW.client.sendInputText();
					}
				}
			},function(){
				//double-tab
				$('#sepiaFW-chat-controls-swipe-area').fadeIn(300, function(){
					//workaround to prevent ugly glitches at the frame
					$('#sepiaFW-chat-controls-form').css({"background-color" : $('#sepiaFW-chat-controls-swipe-area').find('.sepiaFW-swipeBar-switchable').css('background-color')});
				});
				//$('#sepiaFW-chat-controls-swipe-area').css({'background-color': SepiaFW.ui.secondaryColor}).fadeIn(300);
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
					if (SepiaFW.ui.isMobile){
						setTimeout(function(){
							$('#sepiaFW-chat-input').get(0).focus();
						}, 0);
					}
				}
			});
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
					bubble.contentEditable='true';
					bubble.focus();
				}else{
					document.getElementById("sepiaFW-chat-controls-speech-box-bubble").innerHTML = '';
					SepiaFW.animate.assistant.idle('closeSpeechBubble');
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
				if (SepiaFW.speech && SepiaFW.speech.isRecognizing()){
					SepiaFW.speech.stopRecognition();
				}else{
					SepiaFW.animate.assistant.idle('closeSpeechBubble');
					SepiaFW.client.sendInputText();
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
				$('#sepiaFW-chat-controls-form').css({"background-color" : ""});	//$('#sepiaFW-chat-controls-right').css('background-color')
				$('#sepiaFW-chat-controls-swipe-area').fadeOut(300);
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
				$("#sepiaFW-nav-menu-btn").trigger('click', {bm_force : true});
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
		
		//MIC and SPEECH CONTROLS
	
		//Add default mic button logic to an element
		SepiaFW.ui.buildDefaultMicLogic = function(buttonEle, customCallbackShort, customCallbackLong){
			if (buttonEle){
				$(buttonEle).off();
				SepiaFW.ui.longPressShortPressDoubleTap(buttonEle, function(){
					//switch issue
					if (SepiaFW.client.isMessagePending){
						//e.g.: force reconnect
						SepiaFW.client.closeClient(true, SepiaFW.client.resumeClient);
					}else{
						SepiaFW.ui.resetMicButton();
					}
					//custom
					if (customCallbackLong) customCallbackLong();
				},'',function(){
					if (SepiaFW.audio && SepiaFW.audio.initAudio(SepiaFW.ui.toggleMicButton)){
						//skip because of callback
					}else{
						SepiaFW.ui.toggleMicButton();
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
		SepiaFW.ui.toggleMicButton = function(useConfirmationSound){
			if (SepiaFW.speech.isSpeaking()){
				SepiaFW.speech.stopSpeech();
				return;
			}
			//stop alarm
			if (SepiaFW.audio && SepiaFW.audio.alarm.isPlaying){
				SepiaFW.audio.stopAlarmSound();
			}
			//fade audio
			SepiaFW.audio.fadeOut();
			//confirmation sound?
			if (useConfirmationSound == undefined){
				useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
			}
			//play a sound before activating mic?
			if (useConfirmationSound && !SepiaFW.speech.isRecognizing() && SepiaFW.audio){ 		//&& (SepiaFW.config.clientInfo.indexOf('chrome_')>-1)
				SepiaFW.audio.playURL('sounds/coin.mp3', '2', '', function(){
					SepiaFW.speech.toggleRecognition(SepiaFW.client.asrCallbackFinal, SepiaFW.client.asrCallbackInterim, SepiaFW.client.asrErrorCallback, SepiaFW.client.asrLogCallback);
				}, SepiaFW.client.asrErrorCallback);
			//... else stick to the default
			}else{
				SepiaFW.speech.toggleRecognition(SepiaFW.client.asrCallbackFinal, SepiaFW.client.asrCallbackInterim, SepiaFW.client.asrErrorCallback, SepiaFW.client.asrLogCallback);
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
					+ "<li id='sepiaFW-menu-server-access-li' title='Settings for core server connections'><span>" + SepiaFW.local.g('serverConnections') + ": </span></li>"
					+ "<li id='sepiaFW-menu-deviceId-li'><span>" + SepiaFW.local.g('deviceId') + ": </span><input id='sepiaFW-menu-deviceId' type='text' maxlength='24'></li>"
					+ "<li id='sepiaFW-menu-device-site-li' title='Settings for device local site'><span>" + SepiaFW.local.g('deviceSite') + ": </span></li>"
					+ "<li id='sepiaFW-menu-toggle-GPS-li'><span>GPS: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-voice-li'><span>Voice output: </span></li>"
					+ "<li id='sepiaFW-menu-select-voice-engine-li' title='Speech synthesis engine.'><span>Voice engine: </span></li>"
					+ "<li id='sepiaFW-menu-select-voice-li'><span>Voice: </span></li>" 	//option: <i class='material-icons md-mnu'>&#xE5C6;</i>
					+ "<li id='sepiaFW-menu-toggle-proactiveNotes-li' title='The assistant will remind you in a funny way to make a coffee break etc. :-)'><span>Well-being reminders: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-channelMessages-li' title='Show status messages in chat like someone joined the channel?'><span>Channel status messages: </span></li>"
					//NOTE: we show this only if battery status API supported:
					+ "<li id='sepiaFW-menu-toggle-trackPowerStatus-li' title='Observe power plug and battery status?'><span>Track power status: </span></li>"
					//---
					+ "<li id='sepiaFW-menu-input-controls-li' title='Settings for remote input devices, e.g. gamepads'><span>Remote controls: </span></li>"
					//Android-only background connect:
					+ "<li class='sepiaFW-android-settings' id='sepiaFW-menu-toggle-runBackgroundConnection-li' title='Try to keep connected in background?'><span>Allow background activity: </span></li>"
					//---
					+ "<li id='sepiaFW-menu-toggle-smartMic-li' title='Automatically activate mic input after voice based question?'><span>Smart microphone: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-wake-word-li' title='Use client wake-word detection?'><span>Hey SEPIA: </span></li>"
					+ "<li id='sepiaFW-menu-select-stt-li' title='Speech recognition engine.'><span>ASR engine: </span></li>"
					+ "<li id='sepiaFW-menu-stt-socket-url-li' title='Server for custom (socket) speech recognition engine.'>"
						+ "<span>" + "ASR server" + ": </span>"
						+ "<input id='sepiaFW-menu-stt-socket-url' type='url' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-toggle-clexi-li' title='Connect to CLEXI server on start.'><span>Connect to CLEXI: </span></li>"
					+ "<li id='sepiaFW-menu-clexi-socket-url-li' title='Server for Node.js CLEXI by Bytemind.de'>"
						+ "<span>" + "CLEXI server" + ": </span>"
						+ "<input id='sepiaFW-menu-clexi-socket-url' type='url' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-clexi-server-id-li' title='Server ID of Node.js CLEXI. Trust only this connection ID.'>"
						+ "<span>" + "CLEXI ID" + ": </span>"
						+ "<input id='sepiaFW-menu-clexi-server-id' type='url' spellcheck='false'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-toggle-remote-terminal-li' title='Connect to remote terminal when CLEXI is running?'><span>Use CLEXI Terminal: </span></li>"
					+ "<li id='sepiaFW-menu-select-music-app-li' title='Select default music app for search intents.'>"
						+ "<span>Default music app: </span></li>"
						//+ "<span id='sepiaFW-menu-toggle-music-cards-btn'><i class='material-icons'>art_track</i></span>"
					+ "<li id='sepiaFW-menu-clear-app-cache-li'><span>Clear app data: </span></li>"
					+ "<li id='sepiaFW-menu-experimental-settings-li'><span>Experimental settings </span></li>"
						+ "<li class='sepiaFW-menu-experimental'><span><u>Note: Changes will not be permanent</u></span></li>"
						+ "<li id='sepiaFW-menu-select-stt-language-li' class='sepiaFW-menu-experimental'><span>ASR country </span></li>"
						+ "<li id='sepiaFW-menu-toggle-youtube-wp-li' class='sepiaFW-menu-experimental'><span>YouTube embedded </span></li>"
						+ "<li id='sepiaFW-menu-toggle-spotify-wp-li' class='sepiaFW-menu-experimental'><span>Spotify embedded </span></li>"
						+ "<li id='sepiaFW-menu-toggle-apple-music-wp-li' class='sepiaFW-menu-experimental'><span>Apple Music embedded </span></li>"
					+ "<li id='sepiaFW-menu-administration-li'>"
						+ "<button id='sepiaFW-menu-ui-dataprivacy-btn'>" + SepiaFW.local.g('data_privacy') + "</button>"
						+ "<button id='sepiaFW-menu-ui-license-btn'>" + SepiaFW.local.g('license') + "</button>"
						+ "<button id='sepiaFW-menu-ui-credits-btn'>" + SepiaFW.local.g('credits') + "</button>"
					+ "</li>"
					+ "<p id='sepiaFW-chat-menu-info'>"
						+ "client: " + SepiaFW.config.clientInfo.replace(/_/g, " ") + " - " + SepiaFW.config.appLanguage + " - " + (SepiaFW.ui.isMobile? "m" : "d") + (SepiaFW.ui.isCordova? "-c" : "")
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
					+ "<li id='sepiaFW-menu-account-nickname-li'><span>" + SepiaFW.local.g('nickname') + ": </span><input id='sepiaFW-menu-account-nickname' type='text' maxlength='24'></li>"
					+ "<li id='sepiaFW-menu-account-preftempunit-li'><span>" + SepiaFW.local.g('preferred_temp_unit') + ": </span></li>"
					+ "<li id='sepiaFW-menu-store-load-app-settings-li'>"
						+ "<span>App settings: </span>"
						+ "<button id='sepiaFW-menu-load-app-settings-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('load') + "</button>"
						+ "<button id='sepiaFW-menu-store-app-settings-btn' class='sepiaFW-button-inline'>" + SepiaFW.local.g('save') + "</button>"
						//TODO: add delete button
					+ "</li>"
					+ "<li id='sepiaFW-menu-account-signoutall-li'>"
						+ "<button id='sepiaFW-menu-ui-signoutall-btn'>" + SepiaFW.local.g('sign_out_all') + "</button>"
						+ "<button id='sepiaFW-menu-ui-admin-tools-btn'>" + SepiaFW.local.g('apps_admin') + "</button>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-account-pwd-reset-li'>"
						+ "<button id='sepiaFW-menu-account-pwd-reset-btn'>" + SepiaFW.local.g('change_account_password') + "</button>"
					+ "</li>"
					+ "<div id='sepiaFW-menu-ui-refresh-box'>"
						+ "<p id='sepiaFW-menu-ui-refresh-info'>" + SepiaFW.local.g('refreshUI_info') + ":</p>"
						+ "<div style='display:flex; justify-content:center;'>"
							+ "<button id='sepiaFW-menu-ui-refresh-btn'>" + SepiaFW.local.g('refreshUI') + "</button>"
							+ "<button id='sepiaFW-menu-ui-new-sepia-popup-btn'>" + SepiaFW.local.g('newSepiaWindow') + "</button>"
						+ "</div>"
					+ "</div>"
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
					pageUrl: "dynamic-frame.html",
					theme: "dark flat",	//dark_full flat
					onFinishSetup: function(){
						var page1 = document.getElementById('sepiaFW-frame-page-1');
						if (SepiaFW.client.isDemoMode()){
							page1.innerHTML = "<iframe class='full-size' src='" + "https://sepia-framework.github.io/tools/index.html" + "'>";
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
			
			//add skins
			var skins = $('.sepiaFW-style-skin');
			skins.each(function(i, obj) {
				var option = document.createElement('OPTION');
					option.innerHTML = obj.dataset.name;
					option.value = i+1;
				document.getElementById('sepiaFW-menu-select-skin').appendChild(option);
			});
			var activeSkin = SepiaFW.data.get('activeSkin');
			if (activeSkin){
				$('#sepiaFW-menu-select-skin').val(activeSkin);
			}
			$('#sepiaFW-menu-select-skin').off();
			$('#sepiaFW-menu-select-skin').on('change', function() {
				SepiaFW.ui.setSkin($('#sepiaFW-menu-select-skin').val());
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
						pageUrl: "device-site.html",
						onFinishSetup: function(){
							SepiaFW.frames.currentScope.onFinishSetup();
						},
						onOpen: function(){
							SepiaFW.frames.currentScope.onOpen();
						},
						/*onClose: onSettingsClose,*/
						theme: SepiaFW.ui.getSkinStyle()
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
				document.getElementById('sepiaFW-menu-select-voice-engine-li').appendChild(SepiaFW.speech.getTtsEngines());

				//add voice select options - delayed due to loading process
				setTimeout(function(){
					SepiaFW.speech.getVoices(function(voices, voiceSelector){
						document.getElementById('sepiaFW-menu-select-voice-li').appendChild(voiceSelector);
					});
				}, 1000);
				
				//add speech recognition engine select
				document.getElementById('sepiaFW-menu-select-stt-li').appendChild(SepiaFW.speech.getSttEngines());
				
				//Socket STT server URL
				var speechRecoServerInput = document.getElementById("sepiaFW-menu-stt-socket-url");
				speechRecoServerInput.placeholder = "wss://my-sepia-asr/socket";
				speechRecoServerInput.value = SepiaFW.speechWebSocket.socketURI || "";
				speechRecoServerInput.addEventListener("change", function(){
					var newHost = this.value;
					this.blur();
					SepiaFW.speechWebSocket.setSocketURI(newHost);
				});
				if (!SepiaFW.speechWebSocket || !SepiaFW.speechWebSocket.isAsrSupported){
					$("#sepiaFW-menu-stt-socket-url-li").hide();
				}
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
			//show/hide experimental settings
			document.getElementById('sepiaFW-menu-experimental-settings-li').appendChild(Build.inlineActionButton('sepiaFW-menu-experimental-settings', "Toggle",
				function(btn){
					$('.sepiaFW-menu-experimental').toggle(300);
				}
			));
			//ASR (STT) voice input language
			document.getElementById('sepiaFW-menu-select-stt-language-li').appendChild(Build.optionSelector('sepiaFW-menu-select-stt-language', 
				SepiaFW.local.getExperimentalAsrLanguages(), 
				"", 
				function(ele){
					SepiaFW.speech.setCountryCode(ele.value);
				}
			));
			//Toggle embedded web-players
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
			//delete app cache
			document.getElementById('sepiaFW-menu-clear-app-cache-li').appendChild(Build.inlineActionButton('sepiaFW-menu-clear-app-cache', "Clear",
				function(btn){
					var config = {
						buttonOneName : SepiaFW.local.g('reload'),
						buttonOneAction : function(){ location.reload(); }
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
			//Account-Language
			document.getElementById("sepiaFW-menu-account-language-li").appendChild(SepiaFW.ui.build.languageSelector("sepiaFW-menu-account-language-dropdown", function(selectedLanguage){
				//save
				var lang = {};		lang[SepiaFW.account.LANGUAGE_PREF] = selectedLanguage;
				var data = {};		data[SepiaFW.account.INFOS] = lang;
				SepiaFW.account.saveAccountData(data);
				//change url to reflect change
				var url = SepiaFW.tools.setParameterInURL(window.location.href, 'lang', selectedLanguage);
				history.pushState({"language":selectedLanguage}, "", url);
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
			//Store and load app settings
			document.getElementById("sepiaFW-menu-store-app-settings-btn").addEventListener("click", function(){
				SepiaFW.account.saveAppSettings();
			});
			document.getElementById("sepiaFW-menu-load-app-settings-btn").addEventListener("click", function(){
				SepiaFW.account.loadAppSettings();
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
					theme: SepiaFW.ui.getSkinStyle(),
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
						pageBtn.innerHTML = index+1;
						menuPageSelector.appendChild(pageBtn);
						pageBtn.addEventListener("click", function(){
							SepiaFW.ui.soc.showPane(index);
						});
					})(menuPageSelector, i);
				}
				//... and a close button
				var closeBtn = document.createElement('BUTTON');
				closeBtn.innerHTML = "×";
				menuPageSelector.appendChild(closeBtn);
				SepiaFW.ui.onclick(closeBtn, function(){
				//closeBtn.addEventListener("click", function(){
					$('#sepiaFW-nav-menu-btn').trigger('click', { bm_force : true });
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
            option.innerHTML = appCollection[appTag].name;
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
			userList.forEach(function (user) {
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
					SepiaFW.ui.insert("sepiaFW-chat-userlist", "<li class='" + entryClass + "' data-user-entry='" + JSON.stringify(user) + "' title='" + user.id + "'>" 
							+ name + "</li>");
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
				SepiaFW.ui.insert("sepiaFW-chat-channellist", 
					"<li class='" + entryClass + "' data-channel-entry='" + JSON.stringify(channel) + "' title='" + channel.name + "'>"
					+ "<span data-channel-id='" + channel.id + "'>" + channel.name + "</span></li>"
				);
			});
			//add on click again - @user to input
			$('#sepiaFW-chat-channellist li.channel').on( "click", function(){
				var thisChannel = JSON.parse($(this).attr('data-channel-entry'));
				//reset active chat partner
				SepiaFW.client.switchChatPartner('');
				SepiaFW.client.switchChannel(thisChannel.id); 		//there is also a key-option, but the server currently does it by userId check
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
			msgHead.innerHTML = ""
				+ "<b class='sender' data-sender='" + sender + "'>" + senderText + ": </b>"
				+ "<span class='timestamp'>" + time + "</span>";
			msgArticle.className = classes;
			msgArticle.innerHTML = ""
				+ "<p>" + text + "</p>";		//NOTE: the server will deliver 'text' as HTML escaped string UNLESS its from the assistant data object (then we escape above)
			
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
			//TODO: handle both? Right now its 'take inline if you can and ignore fullscreen'
			
			//Inline data
			if (card.dataInline && card.dataInline.length>0){
				for (i=0; i<card.dataInline.length; i++){
					block.appendChild(card.dataInline[i]);
				}
				
			//Full screen cards
			}else if (card.dataFullScreen && card.dataFullScreen.length>0){
				//This is a bit quirky, since the parent function should decide how to handle the block ...
				//... but we currently depend on the card-handler method that can overwrite the target-view options

				/* -- this is how it should be, but for big-results there should be no text-message or action-buttons included --
				for (i=0; i<card.dataFullScreen.length; i++){
					block.appendChild(card.dataFullScreen[i]);
				}
				*/
				
				//... this is how we need it currently ... but at least we should check the options.skipInsert
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
		articleSender.innerHTML = (senderText + ": ");
		article.appendChild(articleSender);

		var articleText = document.createElement('span');
		articleText.className = 'status';
		articleText.innerHTML = text;			//NOTE: the server will deliver 'text' as HTML escaped string
		article.appendChild(articleText);

		var articleTimestamp = document.createElement('span');
		articleTimestamp.className = 'timestamp';
		articleTimestamp.innerHTML = time;
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