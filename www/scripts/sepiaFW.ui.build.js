//BUILD - code blocks to build dynamic objects of the app
function sepiaFW_build_ui_build(){
	var Build = {};
	
	//build reuseable language selector
	Build.languageSelector = function(btnId, languageChangeAction){
		var ele = document.createElement("SELECT");
		if (btnId) ele.id = btnId;
		var code = ''
			+ '<option value="de">&nbsp;DE&nbsp;</option>'
			+ '<option value="en">&nbsp;EN&nbsp;</option>';
		ele.innerHTML = code;
		
		for(var i, j = 0; i = ele.options[j]; j++) {
			if(i.value == SepiaFW.config.appLanguage) {
				ele.selectedIndex = j;
				break;
			}
		}
		
		$(ele).off();
		$(ele).on('change', function(){
			SepiaFW.config.broadcastLanguage(this.value);
			languageChangeAction(this.value);
		});
		return ele;
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
	
	//simple action button
	Build.inlineActionButton = function(btnId, btnName, callback){
		var btn = document.createElement('BUTTON');
		btn.className = "sepiaFW-button-inline";
		if (btnName) btn.innerHTML = btnName;
		if (btnId) btn.id = btnId;
		$(btn).off();
		$(btn).on('click', function(){
			callback(this);
		});
		return btn;
	}
	
	//Confirm box
	Build.askConfirm = function(msg, okCallback, abortCallback){
		var r = confirm(msg);
		if (r == true) {
			if (okCallback) okCallback();
		} else {
			if (abortCallback) abortCallback();
		}
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
		//kind'a clumsy way to catch the main menue close/open event
		$('#sepiaFW-main-window').on("sepiaFwOpen-sepiaFW-chat-menu", function(){
			//open
			SepiaFW.ui.switchSwipeBars('menu');
			SepiaFW.ui.isMenuOpen = true;
			if (SepiaFW.ui.soc) SepiaFW.ui.soc.refresh();
		}).on("sepiaFwClose-sepiaFW-chat-menu", function(){
			//close
			SepiaFW.ui.switchSwipeBars('chat');
			SepiaFW.ui.isMenuOpen = false;
		});
		
		//go left 
		var goLeftBtn = document.getElementById("sepiaFW-nav-menu-go-left");
		if (goLeftBtn){
			$(goLeftBtn).off();
			SepiaFW.ui.onclick(goLeftBtn, function(){
			//$(goLeftBtn).on("click", function () {
				if (SepiaFW.ui.isMenuOpen){
					if (SepiaFW.ui.soc) SepiaFW.ui.soc.prev();
				}else{
					if (SepiaFW.ui.moc) SepiaFW.ui.moc.prev();
				}
			});
		}
		//go right
		var goRightBtn = document.getElementById("sepiaFW-nav-menu-go-right");
		if (goRightBtn){
			$(goRightBtn).off();
			SepiaFW.ui.onclick(goRightBtn, function(){
			//$(goRightBtn).on("click", function () {
				if (SepiaFW.ui.isMenuOpen){
					if (SepiaFW.ui.soc) SepiaFW.ui.soc.next();
				}else{
					if (SepiaFW.ui.moc) SepiaFW.ui.moc.next();
				}
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
			chatInput.placeholder = SepiaFW.local.chatInputPlaceholder;
			$(chatInput).off();
			$(chatInput).on("keypress", function(e){
				if (e.keyCode === 13){
					//Return-Key
					if (SepiaFW.audio && SepiaFW.audio.initAudio(SepiaFW.client.sendInputText)){
						//skip because of callback
					}else{
						SepiaFW.client.sendInputText();
					}
				}
			});
			$(chatInput).on("keydown", function(e){
				if (e.keyCode === 38){
					//Up
					chatInput.value = SepiaFW.ui.lastInput;
				}else if (e.keyCode === 40){
					//Down
					chatInput.value = '';
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
				$('#sepiaFW-chat-controls-form').css({"background-color" : $('#sepiaFW-chat-controls-right').css('background-color')});
				$('#sepiaFW-chat-controls-swipe-area').fadeOut(300);
			});
		}
		//open close chat controls more menue
		var chatMenuBtn = document.getElementById("sepiaFW-chat-controls-more-btn");
		if (chatMenuBtn){
			$(chatMenuBtn).off();
			SepiaFW.ui.onclick(chatMenuBtn, function(){
			//$(chatMenuBtn).on("click", function () {
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
			});
		}
		//catch the shortcuts menue close/open event
		$('#sepiaFW-main-window').on("sepiaFwOpen-sepiaFW-chat-controls-more-menu", function(){
			//open
			SepiaFW.ui.isControlsMenuOpen = true;
		}).on("sepiaFwClose-sepiaFW-chat-controls-more-menu", function(){
			//close
			SepiaFW.ui.isControlsMenuOpen = false;
		});
		
		//MIC and SPEECH CONTROLS
	
		var assistBtn = document.getElementById("sepiaFW-assist-btn");
		if (assistBtn){
			$(assistBtn).off();
			SepiaFW.ui.longPressShortPressDoubleTap(assistBtn, function(){
				SepiaFW.speech.reset();
				SepiaFW.assistant.resetState();
				SepiaFW.client.clearCommandQueue();
			},'',function(){
				if (SepiaFW.audio && SepiaFW.audio.initAudio(SepiaFW.ui.toggleMicButton)){
					//skip because of callback
				}else{
					SepiaFW.ui.toggleMicButton();
				}
			},'', true);
		}
			
		//Toggle microphone button
		SepiaFW.ui.toggleMicButton = function(useConfirmationSound){
			if (SepiaFW.speech.isSpeaking()){
				SepiaFW.speech.stopSpeech();
				return;
			}
			//fade audio
			SepiaFW.audio.fadeOutMain();
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
				+ "<button id='sepiaFW-geolocation-btn'>" + SepiaFW.local.g('locateMe') + "</button>"
				//+ "<button>QuickButton2</button>"
				+ "<p id='sepiaFW-menue-status-text'>Status text</p>"
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
					+ "<li class='button' id='sepiaFW-menu-btn-logout'><span>" + SepiaFW.local.g('sign_out') + "</span><i class='material-icons md-mnu'>person_outline</i></li>"
				+ "</ul>";
			centerCarouselPane.appendChild(centerPage1);
			var centerPage2 = document.createElement('DIV');
			centerPage2.className = "sepiaFW-chat-menu-list-container sepiaFW-carousel-pane";
			centerPage2.innerHTML = ""
				+ "<ul class='sepiaFW-menu-settings-list'>"
					+ "<li id='sepiaFW-menu-select-skin-li'><span>Skin: </span><select id='sepiaFW-menu-select-skin'><option disabled selected value>- select -</option></select></li>"
					+ "<li id='sepiaFW-menu-deviceId-li'><span>" + SepiaFW.local.g('deviceId') + ": </span><input id='sepiaFW-menu-deviceId' type='text' maxlength='24'></li>"
					+ "<li id='sepiaFW-menu-toggle-GPS-li'><span>GPS: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-voice-li'><span>Voice output: </span></li>"
					+ "<li id='sepiaFW-menu-select-voice-li'><span>Voice: </span></li>" 	//option: <i class='material-icons md-mnu'>&#xE5C6;</i>
					+ "<li id='sepiaFW-menu-toggle-proactiveNotes-li' title='The assistant will remind you in a funny way to make a coffee break etc. :-)'><span>Chatty reminders: </span></li>"
					+ "<li id='sepiaFW-menu-clear-app-cache-li'><span>Clear app data: </span></li>"
					+ "<li id='sepiaFW-menu-toggle-channelMessages-li' title='Show status messages in chat like someone joined the channel?'><span>Channel status messages: </span></li>"
					//TODO: this depends on the OS, maybe use only for Android?
					+ "<li id='sepiaFW-menu-toggle-runBackgroundConnection-li' title='Try to keep connected in background?'><span>Allow background activity: </span></li>"
					+ "<li id='sepiaFW-menu-assistant-host-li' title='Assistant hostname, e.g.: my.example.org/sepia, localhost or [IP]'>"
						+ "<span>Hostname: </span>"
						+ "<input id='sepiaFW-menu-assistant-host' type='text' placeholder='my.example.org/sepia'>"
					+ "</li>"
					+ "<li id='sepiaFW-menu-select-stt-li' title='Speech recognition engine.'><span>ASR engine: </span></li>"
					+ "<li id='sepiaFW-menu-stt-socket-url-li' title='Server for custom (socket) speech recognition engine.'>"
						+ "<span>" + "ASR server" + ": </span>"
						+ "<input id='sepiaFW-menu-stt-socket-url' type='text'>"
					+ "</li>"
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
					+ "<li id='sepiaFW-menu-account-language-li'><span>" + SepiaFW.local.g('language') + ": </span></li>"
					+ "<li id='sepiaFW-menu-account-nickname-li'><span>" + SepiaFW.local.g('nickname') + ": </span><input id='sepiaFW-menu-account-nickname' type='text' maxlength='24'></li>"
					+ "<li id='sepiaFW-menu-account-signoutall-li'>"
						+ "<button id='sepiaFW-menu-ui-signoutall-btn'>" + SepiaFW.local.g('sign_out_all') + "</button>"
						+ "<button id='sepiaFW-menu-ui-admin-tools-btn'>" + SepiaFW.local.g('apps_admin') + "</button>"
					+ "</li>"
					+ "<div id='sepiaFW-menu-ui-refresh-box'>"
						+ "<p id='sepiaFW-menu-ui-refresh-info'>" + SepiaFW.local.g('refreshUI_info') + ":</p>"
						+ "<button id='sepiaFW-menu-ui-refresh-btn'>" + SepiaFW.local.g('refreshUI') + "</button>"
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
			//Tutorial button
			var tutorialBtn = document.getElementById("sepiaFW-menu-btn-tutorial");
			tutorialBtn.addEventListener("click", function(){
				//SepiaFW.ui.closeAllMenus();
				SepiaFW.frames.open({pageUrl: "tutorial.html"});
			});
			
			//add skins
			var skins = $('.sepiaFW-style-skin');
			skins.each(function(i, obj) {
				var option = document.createElement('OPTION');
					option.innerHTML = obj.dataset.name;
					option.value = i+1;
				document.getElementById('sepiaFW-menu-select-skin').appendChild(option);
			});
			$('#sepiaFW-menu-select-skin').off();
			$('#sepiaFW-menu-select-skin').on('change', function() {
				SepiaFW.ui.setSkin($('#sepiaFW-menu-select-skin').val());
			});
			//hostname
			var hostNameInput = document.getElementById("sepiaFW-menu-assistant-host");
			hostNameInput.value = SepiaFW.config.host;
			hostNameInput.addEventListener("change", function(){
				var newHost = this.value;
				this.blur();
				SepiaFW.config.setHostName(newHost);
			});
			//device ID
			var deviceIdInput = document.getElementById("sepiaFW-menu-deviceId");
			deviceIdInput.value = SepiaFW.config.getDeviceId();
			deviceIdInput.addEventListener("change", function(){
				var newDeviceId = this.value;
				SepiaFW.config.setDeviceId(newDeviceId);
				this.blur();
			});
			//Speech stuff
			if (SepiaFW.speech){
				//add voice toggle
				document.getElementById('sepiaFW-menu-toggle-voice-li').appendChild(Build.toggleButton('sepiaFW-menu-toggle-voice', 
					function(){
						SepiaFW.speech.skipTTS = false;
						SepiaFW.data.set('skipTTS', false);
						SepiaFW.debug.info("TTS is ON");
					},function(){
						SepiaFW.speech.skipTTS = true;
						SepiaFW.data.set('skipTTS', true);
						SepiaFW.debug.info("TTS is OFF");
					}, !SepiaFW.speech.skipTTS)
				);

				//add voice select options
				document.getElementById('sepiaFW-menu-select-voice-li').appendChild(SepiaFW.speech.getVoices());
				
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
			//delete app cache
			document.getElementById('sepiaFW-menu-clear-app-cache-li').appendChild(Build.inlineActionButton('sepiaFW-menu-clear-app-cache', "Clear",
				function(btn){
					var config = {
						buttonOneName : SepiaFW.local.g('reload'),
						buttonOneAction : function(){ location.reload(); }
					};
					var keepPermanent = true;
					var localDataStatus = SepiaFW.data.clearAll(keepPermanent);		//clear all data except permanent (e.g. host-name)
					SepiaFW.data.clearAppCache(function(status){
						//Success
						SepiaFW.ui.showPopup((localDataStatus + " " + status), config);
					}, function(status) {
						//Error
						SepiaFW.ui.showPopup((localDataStatus + " " + status), config);
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
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find(".statusMsg.info").each(function(){
						$(this).addClass('hidden-by-settings');
					});
					SepiaFW.debug.info("Channel status messages are deactivated");
				}, SepiaFW.ui.showChannelStatusMessages)
			);
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
			//Sign-out all clients
			document.getElementById("sepiaFW-menu-ui-signoutall-btn").addEventListener("click", function(){
				SepiaFW.account.logoutAction(true);
			});
			//Admin tools
			document.getElementById("sepiaFW-menu-ui-admin-tools-btn").addEventListener("click", function(){
				SepiaFW.frames.open({pageUrl: "admin.html"});
			});
			//Reload app
			document.getElementById("sepiaFW-menu-ui-refresh-btn").addEventListener("click", function(){
				window.location.reload(true);
			});
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
				SepiaFW.ui.actions.openUrlAutoTarget(SepiaFW.config.privacyPolicyUrl + "?host=" + encodeURI(SepiaFW.config.host));
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
	
	//User-List
	Build.userList = function(userList, userName){
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
				//if (user.isActive){
				if ($.inArray(user.id, avoidDoubles) == -1){		//TODO: as soon as it makes sense we should split the users again and offer individual device targeting
					if (user.id === userName){
						SepiaFW.ui.insert("sepiaFW-chat-userlist", "<li class='me' data-user-entry='" + JSON.stringify(user) + "' title='" + user.id + "'>" + user.name + "</li>");
					}else if (activeChatPartner && (activeChatPartner == user.id)){
						SepiaFW.ui.insert("sepiaFW-chat-userlist", "<li class='user active' data-user-entry='" + JSON.stringify(user) + "' title='" + user.id + "'>" + user.name + "</li>");
					}else{
						SepiaFW.ui.insert("sepiaFW-chat-userlist", "<li class='user' data-user-entry='" + JSON.stringify(user) + "' title='" + user.id + "'>" + user.name + "</li>");
					}
					avoidDoubles.push(user.id);
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
					SepiaFW.client.switchChatPartner(thisUser.id);
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
	Build.channelList = function(channelList, activeChannel){
		var channelListEle = document.getElementById("sepiaFW-chat-channellist");
		if (channelList && channelListEle){
			//clear all old listeners
			$('#sepiaFW-chat-channellist li').off();
			//create new list
			channelListEle.innerHTML = "";
			channelList.forEach(function (channel) {
				if (channel.id === activeChannel){
					SepiaFW.ui.insert("sepiaFW-chat-channellist", "<li class='channel active' data-channel-entry='" + JSON.stringify(channel) + "'>" + channel.id + "</li>");
				}else{
					SepiaFW.ui.insert("sepiaFW-chat-channellist", "<li class='channel' data-channel-entry='" + JSON.stringify(channel) + "'>" + channel.id + "</li>");
				}
			});
			//add on click again - @user to input
			$('#sepiaFW-chat-channellist li.channel').on( "click", function() {
				var thisChannel = JSON.parse($(this).attr('data-channel-entry'));
				//reset active chat partner
				SepiaFW.client.switchChatPartner('');
				SepiaFW.client.switchChannel(thisChannel.id); 		//there is also a key-option, but the server currently does it by userId check
			});
		}
	}
	
	//make message object
	Build.makeMessageObject = function(text, sender, senderType, receiver){
		//TODO: is this really needed or is webSocket.common.SepiaSocketMessage enough - this is for internal construction
		var message = {};
		message.text = text;
		message.sender = sender;
		message.senderType = senderType;
		message.receiver = receiver;
		message.time = SepiaFW.tools.getLocalTime();
		return message;
	}

	//chat entry block
	Build.chatEntry = function(msg, username, options){
		var isAssistAnswer = (msg.data && msg.data.dataType === "assistAnswer");
		
		var type = msg.senderType;
		var text = (isAssistAnswer)? msg.data.assistAnswer.answer : msg.text;
		var sender = msg.sender;
		var senderName = (SepiaFW.webSocket)? SepiaFW.webSocket.client.getNameFromUserList(sender) : "";
		var senderText = (senderName)? senderName : sender;
		var receiver = msg.receiver;
		var receiverName = (SepiaFW.webSocket)? SepiaFW.webSocket.client.getNameFromUserList(receiver) : "";
		var time = msg.time;
		
		if (!text)	options.skipText = true;
		
		//type analysis
		var classes = '';
		var classesBlock = 'chatMsg';
		if (sender === username){ 
			type = "me";
			classes += ' chatMe';
			classesBlock += ' right';
			if (receiver){
				senderText = "Me to " + (receiverName? receiverName : receiver);
				type = "me-pm";
				classes += ' chatPm';
			}
		}
		else if (receiver === username){
			senderText += " to me";
			if (msg.senderType === "assistant"){
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
		
		//switch carousel pane?
		if (!options.targetView){
			//if (SepiaFW.ui.moc) SepiaFW.ui.moc.showPane(1);
		}
		
		//make block
		var block = document.createElement('DIV');
		block.className = classesBlock;
		block.dataset.channelId = SepiaFW.client.getActiveChannel();
		
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
				+ "<p>" + text + "</p>";
			
			msgArticle.insertBefore(msgHead, msgArticle.childNodes[0]);	
			block.appendChild(msgArticle);
		
			//add quick private message button
			SepiaFW.ui.longPressShortPressDoubleTab(msgHead, function(){
				//long-press - copy name to input
				if (sender){
					$('#sepiaFW-chat-input').val("@" + sender + " ");
					$('#sepiaFW-chat-input').focus();
				}
			},'',function(){
				//short-press
			},function(){
				//double-tab - copy text to input
				$('#sepiaFW-chat-input').val(text);
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
		
		//Actions
		if (isAssistAnswer && SepiaFW.ui.actions){
			if (!options.skipActions){
				SepiaFW.ui.actions.handle(msg.data.assistAnswer, block, sender, options);
			}else if (options.skipNoneButtonActions){
				options.doButtonsOnly = true;
				SepiaFW.ui.actions.handle(msg.data.assistAnswer, block, sender, options);
			}
		}
		
		//add card-data
		if (isAssistAnswer && msg.data.assistAnswer.hasCard){
			if (SepiaFW.ui.cards){
				var card = SepiaFW.ui.cards.get(msg.data.assistAnswer, sender);
				//TODO: handle both? Right now its 'take inline if you can and ignore fullscreen'
				
				//Inline data
				if (card.dataInline && card.dataInline.length>0){
					for (i=0; i<card.dataInline.length; i++){
						block.appendChild(card.dataInline[i]);
					}
					
				//Full screen cards
				}else if (card.dataFullScreen && card.dataFullScreen.length>0){
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
			}else{
				//SepiaFW.debug.info('Cards are not supported');
			}
		}

		return block;
	}
	
	//chat status message block
	Build.statusMessage = function(msg, username, isErrorMessage){
		var type = msg.senderType;
		var text = msg.text;
		var sender = msg.sender;
		var senderName = (SepiaFW.webSocket)? SepiaFW.webSocket.client.getNameFromUserList(sender) : "";
		var senderText = (senderName)? senderName : sender;
		var time = msg.time;
		
		//type analysis
		var classes = type || ''; 	//assistant, client, server
		
		var block = document.createElement('DIV');
		block.className = 'statusMsg';
		block.dataset.channelId = SepiaFW.client.getActiveChannel(); 		//TODO: do we want that here?
		var article = document.createElement('ARTICLE');
		article.className = 'statusUpdate';
		if (isErrorMessage){
			article.className += ' errorMsg';
			block.className += ' error';
		}else{
			block.className += ' info';
			if (!SepiaFW.ui.showChannelStatusMessages){
				block.className += ' hidden-by-settings';
			}
		}
		article.innerHTML = ""
			+ "<b class='" + classes + "'>" + senderText + ": </b>"
			+ "<span class='status'>" + text + "</span>"
			+ "<span class='timestamp'>" + time + "</span>";
			
		block.appendChild(article);
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
			if (!options.skipActions){
				SepiaFW.ui.actions.handle(assistAnswer, block, sender, options);
			}else if (options.skipNoneButtonActions){
				options.doButtonsOnly = true;
				SepiaFW.ui.actions.handle(assistAnswer, block, sender, options);
			}
		}
		return block;
	}
	
	return Build;
}