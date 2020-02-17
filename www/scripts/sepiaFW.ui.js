//UI, UI.ANIMATIONS and UI.BUILD
function sepiaFW_build_ui(){
	var UI = {};
	
	//some constants
	UI.version = "v0.21.0";
	UI.requiresServerVersion = "2.4.1";
	UI.JQ_RES_VIEW_IDS = "#sepiaFW-result-view, #sepiaFW-chat-output, #sepiaFW-my-view";	//a selector to get all result views e.g. $(UI.JQ_RES_VIEW_IDS).find(...) - TODO: same as $('.sepiaFW-results-container') ??
	UI.JQ_ALL_MAIN_VIEWS = "#sepiaFW-result-view, #sepiaFW-chat-output, #sepiaFW-my-view, #sepiaFW-teachUI-editor, #sepiaFW-teachUI-manager, #sepiaFW-frame-page-0, #sepiaFW-frame-page-1, #sepiaFW-frame-page-2, #sepiaFW-frame-page-3"; 	//TODO: frames can have more ...
	UI.JQ_ALL_SETTINGS_VIEWS = ".sepiaFW-chat-menu-list-container";
	UI.JQ_ALL_MAIN_CONTAINERS = "#sepiaFW-my-view, #sepiaFW-chat-output-container, #sepiaFW-result-view";
	
	UI.isCordova = ('cordova' in window);
	
	UI.isTouchDevice = false;
	UI.isAndroid = false;
	UI.isIOS = false;
	UI.isMobile = false;
	UI.isStandaloneWebApp = false;
	UI.isChromeDesktop = false;
	UI.isSafari = false;
	UI.isEdge = false;

	UI.isSecureContext = UI.isCordova? true : (('isSecureContext' in window)? window.isSecureContext : (window.location.protocol == "https:"));

	UI.getPreferredColorScheme = function(){
		if ('matchMedia' in window){
			if (window.matchMedia('(prefers-color-scheme: dark)').matches){
				return "dark";
			}else if (window.matchMedia('(prefers-color-scheme: light)').matches){
				return "light";
			}
		}
		return "";
	}
	UI.preferredColorScheme = UI.getPreferredColorScheme();
	
	UI.windowExpectedSize = window.innerHeight;
	var windowSizeDifference = 0;
	window.addEventListener('orientationchange', function(){
		//document.getElementById('sepiaFW-chat-output').innerHTML += ('<br>orientationchange, new size: ' + window.innerHeight);
		$('input').blur();
		setTimeout(function(){
			UI.windowExpectedSize = window.innerHeight;
		},100);
	});
	window.addEventListener('resize', function(){
		UI.resizeEvent();
	});
	UI.resizeEvent = function(){
		//document.getElementById('sepiaFW-chat-output').innerHTML += ('<br>resize, new size: ' + window.innerHeight);
		windowSizeDifference = (window.innerHeight - UI.windowExpectedSize);
		UI.windowExpectedSize = window.innerHeight;
		
		//fix scroll position on window resize to better place content on soft-keyboard appearance
		if (UI.isAndroid && (windowSizeDifference < 0)){
			setTimeout(function(){
				$(UI.JQ_ALL_MAIN_VIEWS + ", " + UI.JQ_ALL_SETTINGS_VIEWS).each(function(){
					this.scrollTop -= windowSizeDifference;
				});
				if (document.activeElement){
					document.activeElement.scrollIntoView({block: 'center', inline: 'nearest'}); 	//note: this is experimental and might change!
					//other versions: (true) is ok but right at the top edge, (false) covered by controls, "inline: 'nearest'" should prevent horizontal scroll
				}
				/*
				var activeEle = $(document.activeElement);
				if (activeEle.length > 0){
					var scrollBox = activeEle.closest(UI.JQ_ALL_MAIN_VIEWS + ", " + UI.JQ_ALL_SETTINGS_VIEWS);
					if (scrollBox && scrollBox.offset() && (scrollBox.offset().top > activeEle.offset().top)){
						scrollBox[0].scrollTop -= (scrollBox.offset().top - activeEle.offset().top); 			//TODO: pull it a bit down like 8px or so
					}
				}
				*/
			},100);
		}
	}

	//Listen to change of active element (Note: not very reliable)
	UI.listenToActiveElementChange = function(){
		window.addEventListener('focus', function(e){
			dispatchActiveElementChangeEvent();
		}, true);
		window.addEventListener('blur', function(e){
			dispatchActiveElementChangeEvent();
		}, true);
	}
	function dispatchActiveElementChangeEvent(){
		clearTimeout(activeElementChangeBuffer);
		activeElementChangeBuffer = setTimeout(function(){
			//note: cannot happen faster than every Xms
			if (document.activeElement){
				var event = new CustomEvent('sepia_active_element_change', { detail: {
					id: document.activeElement.id,
					className: document.activeElement.className,
					tagName: document.activeElement.tagName
				}});
				document.dispatchEvent(event);
				//console.error("new active ele.: " + (document.activeElement.id || document.activeElement.className || document.activeElement.tagName));
			}
		}, 100);
	}
	var activeElementChangeBuffer = undefined;

	//Open a view or frame by key (e.g. for URL parameter 'view=xy')
	UI.openViewOrFrame = function(openView){
		openView = openView.replace(".html", "").trim();
		//AO-Mode
		if (openView == "ao" || openView == "aomode" || openView == "alwayson"){
			if (SepiaFW.alwaysOn) SepiaFW.alwaysOn.start();
	
		//Teach-UI
		}else if (openView == "teach" || openView == "teachui"){
			if (SepiaFW.teach) SepiaFW.teach.openUI();
		
		//Frame
		}else{
			if (SepiaFW.frames) SepiaFW.frames.open({pageUrl: (openView + ".html")});
			//TODO: this will currently ignore all open-options for frames like onOpen callbacks and theme etc.
		}
	}
	
	UI.primaryColor = '#ceff1a';
	UI.secondaryColor = '#2f3035';
	UI.secondaryColor2 = '#f0f0fa';
	UI.accentColor = '#94365b';
	UI.accentColor2 = '#16817b'; 	//'rgba(86, 47, 145, 0.95)';
	UI.awaitDialogColor = 'gold';
	UI.loadingColor = '#b4b4b4';
	UI.assistantColor = '';
	UI.micBackgroundColor = '#fff';  //reassigned during UI setup
	UI.htmlBackgroundColor = window.getComputedStyle(document.documentElement).getPropertyValue("background-color") || "#fff";
	UI.navBarColor = '';
	UI.statusBarColor = '';
	
	UI.isMenuOpen = false;
	UI.lastInput = "";
	var activeSkin = 0;
	var activeSkinStyle = "light";
	
	//get/refresh skin colors
	UI.refreshSkinColors = function(){
		var pC = document.getElementById('sepiaFW-pC');
		var sC = document.getElementById('sepiaFW-sC');		var sC2 = document.getElementById('sepiaFW-sC2');
		var aC = document.getElementById('sepiaFW-aC');		var aC2 = document.getElementById('sepiaFW-aC2');
		var asC = document.getElementById('sepiaFW-asC');	var adC = document.getElementById('sepiaFW-adC');
		var lC = document.getElementById('sepiaFW-lC');
		var navB = document.getElementById('sepiaFW-navC');
		var statB = document.getElementById('sepiaFW-statC');
		UI.primaryColor = 	 pC?  window.getComputedStyle(pC, null).getPropertyValue("background-color") : UI.primaryColor;
		UI.secondaryColor =  sC?  window.getComputedStyle(sC, null).getPropertyValue("background-color") : UI.secondaryColor;
		UI.secondaryColor2 = sC2? window.getComputedStyle(sC2, null).getPropertyValue("background-color"): UI.secondaryColor2;
		UI.accentColor = 	 aC?  window.getComputedStyle(aC, null).getPropertyValue("background-color") : UI.accentColor;
		UI.accentColor2 = 	 aC2? window.getComputedStyle(aC2, null).getPropertyValue("background-color"): UI.accentColor2;
		UI.awaitDialogColor = adC? window.getComputedStyle(adC, null).getPropertyValue("background-color"): 'gold';
		UI.assistantColor =	 asC? window.getComputedStyle(asC, null).getPropertyValue("background-color"): UI.primaryColor;
		UI.loadingColor =	 lC? window.getComputedStyle(lC, null).getPropertyValue("background-color"): 'rgba(180, 180, 180, 1.0)';
		UI.htmlBackgroundColor = window.getComputedStyle(document.documentElement).getPropertyValue("background-color") || "#fff";
		//UI.assistantColor = $('#sepiaFW-chat-output').find('article.chatAssistant').first().css("background-color");
		UI.navBarColor = navB?  window.getComputedStyle(navB, null).getPropertyValue("background-color") : UI.navBarColor;
		UI.statusBarColor = statB?  window.getComputedStyle(statB, null).getPropertyValue("background-color") : UI.statusBarColor;
		if (UI.navBarColor == "rgba(0, 0, 0, 0)" || UI.navBarColor == "transparent" || UI.navBarColor == "#00000000" || UI.navBarColor == "#0000"){
			UI.navBarColor = "";
		}
		if (UI.statusBarColor == "rgba(0, 0, 0, 0)" || UI.statusBarColor == "transparent" || UI.statusBarColor == "#00000000" || UI.statusBarColor == "#0000"){
			UI.statusBarColor = "";
		}
		//refresh theme-color
		$('meta[name="theme-color"]').replaceWith('<meta name="theme-color" content="' + UI.primaryColor + '">');
		//set general skin style
		var backColor = UI.htmlBackgroundColor;
		if ((backColor + '').indexOf('rgb') === 0){
			var rgbBack = SepiaFW.tools.convertRgbColorStringToRgbArray(backColor);
			backColor = SepiaFW.tools.rgbToHex(rgbBack[0], rgbBack[1], rgbBack[2]);
		}
		if (SepiaFW.tools.getBestContrast(backColor) === 'white'){
			$(document.documentElement).removeClass('light-skin').addClass("dark-skin");
			activeSkinStyle = "dark";
		}else{
			$(document.documentElement).removeClass('dark-skin').addClass("light-skin");
			activeSkinStyle = "light";
		}
		//update statusbar and navbar
		if ('StatusBar' in window){
			var statusBarColor = UI.statusBarColor || UI.primaryColor;
			if ((statusBarColor + '').indexOf('rgb') === 0){
				var rgb = SepiaFW.tools.convertRgbColorStringToRgbArray(statusBarColor);
				statusBarColor = SepiaFW.tools.rgbToHex(rgb[0], rgb[1], rgb[2]);
			}
			//console.log('statusBarColor: ' + statusBarColor + " - contrast: " + SepiaFW.tools.getBestContrast(statusBarColor));
			if (SepiaFW.tools.getBestContrast(statusBarColor) === 'white'){
				StatusBar.backgroundColorByHexString(statusBarColor);
				StatusBar.styleLightContent();
			}else{
				if (UI.isAndroid){
					StatusBar.backgroundColorByHexString('#000000');
				}else{
					StatusBar.backgroundColorByHexString(statusBarColor);
					StatusBar.styleDefault();
				}
			}
		}
		if ('NavigationBar' in window){
			var navBarColor =  UI.navBarColor || UI.primaryColor;
			if ((navBarColor + '').indexOf('rgb') === 0){
				var rgb = SepiaFW.tools.convertRgbColorStringToRgbArray(navBarColor);
				navBarColor = SepiaFW.tools.rgbToHex(rgb[0], rgb[1], rgb[2]);
			}
			//console.log('navBarColor: ' + navBarColor + " - contrast: " + SepiaFW.tools.getBestContrast(navBarColor));
            NavigationBar.backgroundColorByHexString(navBarColor);
		}
	}
	
	//set skin
	UI.setSkin = function(newIndex, rememberSelection){
		if (rememberSelection == undefined) rememberSelection = true;
		var skins = $('.sepiaFW-style-skin');
		if (newIndex == 0){
			activeSkin = 0;
			if (rememberSelection){
				SepiaFW.data.set('activeSkin', activeSkin);
			}
		}
		skins.each(function(index){
			if (index == (newIndex-1)){	
				$(this).prop('title', 'main');
				$(this).prop('disabled', false);
				SepiaFW.debug.log("UI active skin: " + $(this).attr('href'));
				activeSkin = newIndex;
				if (rememberSelection){
					SepiaFW.data.set('activeSkin', activeSkin);
				}
			}else{
				$(this).prop('title', '');
				$(this).prop('disabled', true);
			}
		});
		UI.refreshSkinColors();
		$(window).trigger('resize'); 	//this might not work on IE
		setTimeout(function(){
			UI.refreshSkinColors();
			$(window).trigger('resize'); 	//this might not work on IE
		}, 2500);		//safety refresh for slow connection, TODO: will still fail on very slow connection
	}
	UI.getSkin = function(){
		return activeSkin;
	}
	UI.getSkinStyle = function(){
		return activeSkinStyle;
	}
	
	//setup dynamic label
	var defaultLabel = $('#sepiaFW-nav-label').html();
	UI.setLabel = function(newLabel){
		if (!newLabel && defaultLabel){
			$('#sepiaFW-nav-label').html(defaultLabel);
		}else{
			$('#sepiaFW-nav-label').html(newLabel);
		}
	}
	UI.getLabel = function(){
		return $('#sepiaFW-nav-label').html();
	}
	UI.getDefaultLabel = function(){
		return defaultLabel;
	}
	//Note: for label button actions see ui.build module
	
	//make an info message
	UI.showInfo = function(text, isErrorMessage, customTag, beSilent, channelId){
		if (UI.build){
			if (channelId == undefined) channelId = 'info';		//note: channelId=info will use the active channel or user-channel
			var message = UI.build.makeMessageObject(text, 'UI', 'client', '', channelId);
			var sEntry = UI.build.statusMessage(message, 'username', true);		//we handle UI messages as errors for now - TODO: add non-error msg
			if (customTag){
				sEntry.dataset.msgCustomTag = customTag;
				//weekday indicator
				if (customTag.indexOf("weekday-note") == 0 || customTag.indexOf("unread-note") == 0){
					sEntry.classList.add("chat-history-note");
				}
			}
			//get right view
			var targetViewName = "chat";
			var resultView = UI.getResultViewByName(targetViewName);
			//add to view
			UI.addDataToResultView(resultView, sEntry, beSilent);
					
		}else{
			alert(text);
		}
	}
	//make a chat message - compared to the publish methods in 'Client' this only creates a simple chat-bubble (no note, no voice, etc.)
	UI.showCustomChatMessage = function(text, data, options){
		//build message object
		if (!options) options = {};
		if (!data) data = {};
		var sender = data.sender || 'UI';
		var senderType = data.senderType || 'client';
		var receiver = data.receiver || '';
		var channelId = data.channelId || ((SepiaFW.client.isDemoMode())? "info" : "");
		var message = UI.build.makeMessageObject(text, sender, senderType, receiver, channelId);
		message.timeUNIX = data.timeUNIX;
		message.data = data.data;
		var cOptions = options.buildOptions || {};
		var displayOptions = options.displayOptions || {};
		var userId = SepiaFW.account.getUserId() || 'username';
		
		//build entry
		SepiaFW.client.optimizeAndPublishChatMessage(message, userId, function(){

			var cEntry = UI.build.chatEntry(message, userId, cOptions);
			if (!cEntry){
				SepiaFW.debug.error('Failed to show custom chat-entry, data was invalid! ChannelId issue?');
				return;
			}
			//get right view
			var targetViewName = cOptions.targetView || "chat";
			var resultView = UI.getResultViewByName(targetViewName);
			//add to view
			var beSilent = displayOptions.beSilent || false;
			var skipAnimation = displayOptions.skipAnimation || false;
			var autoSwitchView = displayOptions.autoSwitchView || false;
			var switchDelay = displayOptions.switchDelay || 0;
			UI.addDataToResultView(resultView, cEntry, beSilent, autoSwitchView, switchDelay, skipAnimation);

			//show results in frame as well? (SHOW ONLY!)
			if (message.senderType === "assistant"){
				if (SepiaFW.frames && SepiaFW.frames.isOpen && SepiaFW.frames.canShowChatOutput()){
					SepiaFW.frames.handleChatOutput({
						"text": message.text
					});
				}
			}
			return cEntry;
		});
	}
	
	//get/switch/show/hide active swipe-bars - TODO: can we get rid of the hard-coded dom ids?
	UI.switchSwipeBars = function(setName){
		$('.sepiaFW-swipeBar-switchable').hide();
		if (setName){
			lastActiveSwipeBars = activeSwipeBars;
		}else{
			setName = lastActiveSwipeBars;
		}
		if (setName === "chat"){
			$('#sepiaFW-swipeBar-chat-left').show();
			$('#sepiaFW-swipeBar-chat-right').show();
			$('#sepiaFW-swipeBar-chat-controls').show();
		}else if (setName === "menu"){
			$('#sepiaFW-swipeBar-menu-left').show();
			$('#sepiaFW-swipeBar-menu-right').show();
			$('#sepiaFW-swipeBar-menu-controls').show();
		}else if (setName === "teach"){
			$('#sepiaFW-swipeBar-teach-left').show();
			$('#sepiaFW-swipeBar-teach-right').show();
		}else if (setName === "frames"){
			$('#sepiaFW-swipeBar-frames-left').show();
			$('#sepiaFW-swipeBar-frames-right').show();
		}
		activeSwipeBars = setName;
	}
	UI.getActiveSwipeBars = function(){
		return activeSwipeBars;
	}
	UI.hideActiveSwipeBars = function(){
		$('#sepiaFW-swipeBar-container-left').hide();
		$('#sepiaFW-swipeBar-container-right').hide();
	}
	UI.showActiveSwipeBars = function(){
		$('#sepiaFW-swipeBar-container-left').show();
		$('#sepiaFW-swipeBar-container-right').show();
	}
	var activeSwipeBars = "chat";
	var lastActiveSwipeBars = "chat";
	
	//clear all views
	UI.clearAllOutputViews = function(){
		$(UI.JQ_RES_VIEW_IDS).html('');
	}
	
	//show/hide speech-input-box
	UI.showLiveSpeechInputBox = function(){
		$('#sepiaFW-chat-controls-speech-box').fadeIn(300);
		//hide swipe areas for better button access
		$('#sepiaFW-swipeBar-container-left').hide();
		$('#sepiaFW-swipeBar-container-right').hide();
	}
	UI.hideLiveSpeechInputBox = function(){
		$('#sepiaFW-chat-controls-speech-box').fadeOut(300);
		document.getElementById("sepiaFW-chat-controls-speech-box-bubble").contentEditable='false';
		//restore swipe areas
		$('#sepiaFW-swipeBar-container-left').show();
		$('#sepiaFW-swipeBar-container-right').show();
	}
	//$('#sepiaFW-chat-controls-speech-box').hide(); 		//initially hidden
	
	//switch channel view (show messages of specific channel)
	UI.switchChannelView = function(channelId){
		//hide all messages with channelId but wrong one
		$('#sepiaFW-chat-output').find("[data-channel-id]").not("[data-channel-id='" + channelId + "']").not("[data-channel-id='info']").each(function(){
			//$(this).fadeOut(150);
			$(this).addClass('hidden-by-channel');
		});
		$('#sepiaFW-chat-output').find("[data-channel-id='" + channelId + "']").each(function(){
			//$(this).fadeIn(300);
			$(this).removeClass('hidden-by-channel');
		});
	}
	
	//missed message handling
	var missedMessages = 0;
	UI.handleMissedMessage = function(missed, msgInfo){
		//is there a frame that can handle missed messages?
		if (SepiaFW.frames && SepiaFW.frames.isOpen && SepiaFW.frames.canHandleMissedMessages()){
			SepiaFW.frames.handleMissedMessages(msgInfo);
		}else{
			UI.addMissedMessage(missed);		
		}
	}
	UI.addMissedMessage = function(missed){
		if (missed){
			missedMessages += missed; 	//Note: use negative to substract
		}else{
			missedMessages++;
		}
		if (missedMessages <= 0){
			$('#sepiaFW-nav-label-note').hide();
		}else if ($('#sepiaFW-nav-label-note').css('display') === "none"){
			$('#sepiaFW-nav-label-note').fadeIn(300);
		}
		if (missedMessages < 999){
			$('#sepiaFW-nav-label-note').html(missedMessages);
		}else{
			$('#sepiaFW-nav-label-note').html("...");
		}
	}
	UI.showAndClearMissedMessages = function(){
		//close teach UI
		if (SepiaFW.teach && SepiaFW.teach.isOpen){
			SepiaFW.teach.closeUI();
		}
		//close frames
		if (SepiaFW.frames && SepiaFW.frames.isOpen){
			SepiaFW.frames.close();
		}
		//close open menus
		if (UI.getOpenMenus().length > 0){
			UI.closeAllMenus();
		}
		//UI.closeAllMenus();
		UI.moc.showPane(1);
		UI.clearMissedMessages();
	}
	UI.clearMissedMessages = function(){
		if ($('#sepiaFW-nav-label-note').css('display') !== "none"){
			$('#sepiaFW-nav-label-note').fadeOut(300);
		}
		missedMessages = 0;
	}
	UI.getNumberOfMissedMessages = function(){
		return missedMessages;
	}
	
	//-------- SETUP --------

	//setup device properties and stuff
	UI.beforeSetup = function(){
		//is touch device?
		if ("ontouchstart" in document.documentElement){
			UI.isTouchDevice = true;
			document.documentElement.className += " sepiaFW-touch-device";
		}else{
			UI.isTouchDevice = false;
			document.documentElement.className += " sepiaFW-notouch-device";
		}
		
		//is Android or Chrome? - TODO: what about Chromium?
		UI.isAndroid = (UI.isCordova)? (device.platform === "Android") : (navigator.userAgent.match(/(Android)/ig)? true : false);
		UI.isChrome = (/Chrome/gi.test(navigator.userAgent)) && !(/Edge/gi.test(navigator.userAgent));
		//is iOS or Safari?
		UI.isIOS = (UI.isCordova)? (device.platform === "iOS") : (/iPad|iPhone|iPod/g.test(navigator.userAgent) && !window.MSStream);
		UI.isSafari = /Safari/g.test(navigator.userAgent) && !UI.isAndroid && !UI.isChrome; //exclude iOS chrome (not recommended since its still appleWebKit): && !navigator.userAgent.match('CriOS');
		//is Chrome Desktop?
		if (UI.isChrome && !UI.isAndroid){
			UI.isChromeDesktop = true;
		}
		//is Edge?
		UI.isEdge = (/Edge/gi.test(navigator.userAgent));
		//is mobile?
		UI.isMobile = !UI.isEdge && !UI.isChromeDesktop && (UI.isAndroid || UI.isIOS);
		if (UI.isMobile){
			document.documentElement.className += " sepiaFW-mobile-device";
		}

		//logout?
		function doLogout(){
			var urlParam = SepiaFW.tools.isURLParameterTrue("logout");
			if (urlParam){
				SepiaFW.account.logoutAction();
				setTimeout(function(){
					window.location.href = SepiaFW.tools.removeParameterFromURL(window.location.href, "logout");
				}, 3000);
			}
			return urlParam;
		}
		doLogout();
		
		//is standalone app?
		function isStandaloneWebApp(){
			var isStandalone = false;
			if (UI.isCordova){
				isStandalone = true;
			}else{
				var urlParam = SepiaFW.tools.isURLParameterTrue("isApp");
				var google = window.matchMedia('(display-mode: standalone)').matches;
				var apple = window.navigator.standalone;
				isStandalone = (urlParam || google || apple);
			}
			if (isStandalone){
				document.documentElement.className += " sepiaFW-standalone-app";
			}
			return isStandalone;
		}
		UI.isStandaloneWebApp = isStandaloneWebApp();

		//is tiny app?
		function isTinyApp(){
			var urlParam = SepiaFW.tools.isURLParameterTrue("isTiny");
			if (urlParam){
				document.documentElement.className += " sepiaFW-tiny-app";
			}
			return urlParam;
		}
		UI.isTinyApp = isTinyApp();

		//Setup headless mode
		if (SepiaFW.config.isUiHeadless){
			SepiaFW.config.loadHeadlessModeSetup();
			//if client not active or in demo-mode after 5s run setup
			setTimeout(function(){
				if (!SepiaFW.client.isActive() && !SepiaFW.client.isDemoMode()){
					SepiaFW.data.set('isDemoLogin', 'setup');
					setTimeout(function(){
						window.location.reload();
					}, 2000);
					SepiaFW.debug.log("Client will restart automatically in 2s to activate settings!");
				}
			}, 8000);
		}
	}

	//get default device ID
	UI.getDefaultDeviceId = function(){
		if (UI.isIOS){
			return "i1";
		}else if (UI.isAndroid){
			return "a1";
		}else if (UI.isStandaloneWebApp){
			return "o1";
		}else{
			return "b1";
		}
	}
	
	//setup UI components and client variables - requires UI.beforeSetup() !
	UI.setup = function(){
		
		//client
		SepiaFW.config.setClientInfo(((UI.isIOS)? 'iOS_' : '') 
							+ ((UI.isAndroid)? 'android_' : '') 
							+ ((UI.isChromeDesktop)? 'chrome_' : '')
							+ ((UI.isEdge)? 'edge_' : '')
							+ ((UI.isSafari)? 'safari_' : '')
							+ ((UI.isStandaloneWebApp)? "app_" : "browser_") + UI.version);
		
		//---------------------- LOAD other SETTINGS before building the UI:

		//load skin
		var lastSkin = SepiaFW.data.get('activeSkin');
		if (lastSkin){
			UI.setSkin(lastSkin, false);
		}else{
			//get user preferred color scheme
			if (UI.preferredColorScheme == "dark"){
				UI.setSkin(2, false);
			}
			//get skin colors
			UI.refreshSkinColors();
		}
		
		//module specific settings
		SepiaFW.config.loadAppSettings();

		//-------------------------------------------------------------------------------------------------

		//set assist-button defaults
		UI.assistBtn = document.getElementById("sepiaFW-assist-btn") || document.createElement("BUTTON");
		UI.assistBtnArea = document.getElementById("sepiaFW-assist-btn-area") || document.createElement("DIV");
		UI.micBackgroundColor = UI.assistBtnArea.style.backgroundColor;

		UI.assistIconIdle = (UI.assistBtn)? UI.assistBtn.innerHTML : '<i class="material-icons md-mic">&#xE029;</i>';
		UI.assistIconIdleNoAsr = '<i class="material-icons md-mic">&#xE02B;</i>';
		UI.assistIconLoad = '<i class="material-icons md-mic">&#xE627;</i>';
		UI.assistIconSpeak = '<i class="material-icons md-mic">&#xE1B8;</i>';
		UI.assistIconRec = '<i class="material-icons md-mic">&#xE1B8;</i>';
		UI.assistIconStop = '<i class="material-icons md-mic">&#xE034;</i>';
		UI.assistIconAwaitAnswer = '<i class="material-icons md-mic-dia">&#xE0B7;</i>';  //&#xE90F;
		
		//build UI logic and general buttons
		UI.build.uiButtonsAndLogic();
		
		//add main view onClick actions like menu close
		$(UI.JQ_ALL_MAIN_CONTAINERS).on('click', function(){
			//close shortcuts menu
			if (UI.isControlsMenuOpen){
				$('#sepiaFW-chat-controls-more-btn').trigger('click', { bm_force : true });
			}
		});
		
		//prepare central container with output carousel (moc = main output carousel) and it's swipe areas
		if (UI.moc) UI.moc.unbind();
		//make the swipe areas auto-resizable to avoid problems with mouse-hover over content
		UI.makeAutoResizeSwipeArea("#sepiaFW-swipeBar-container-left");
		UI.makeAutoResizeSwipeArea("#sepiaFW-swipeBar-container-right");
		UI.makeAutoResizeSwipeArea("#sepiaFW-swipeBar-container-top");
		UI.makeAutoResizeSwipeArea("#sepiaFW-swipeBar-container-bottom");
		//create carousel
		UI.moc = new SepiaFW.ui.Carousel('#sepiaFW-main-output-carousel', '#sepiaFW-swipeBar-chat-controls', '#sepiaFW-swipeBar-chat-left', '#sepiaFW-swipeBar-chat-right', '',
			function(currentPane){
				$("#sepiaFW-nav-bar-page-indicator").find('div').removeClass("active");
				$("#sepiaFW-nav-bar-page-indicator > div:nth-child(" + (currentPane+1) + ")").addClass('active').fadeTo(350, 1.0).fadeTo(350, 0.0);
				//check note bubble
				if (currentPane == 1 && (!SepiaFW.frames || !SepiaFW.frames.isOpen)){
					UI.clearMissedMessages();
				}else if (currentPane == 0){
					broadcastShowMyView();
				}
			});
		UI.moc.init();
		UI.moc.showPane(0);
		UI.switchSwipeBars('chat'); 		//use this to switch the swipe-bars depending on the open window
		
		//-- up till here every saved setting must be loaded to show up in menue properly --
		
		//build MENUE with soc (= settings and options carousel)
		UI.build.menu();
		UI.isMenuOpen = false;
		UI.isControlsMenuOpen = false;
		if (UI.soc) UI.soc.unbind();
		UI.soc = new SepiaFW.ui.Carousel('#sepiaFW-chat-menu-center', '#sepiaFW-swipeBar-menu-controls', '#sepiaFW-swipeBar-menu-left', '#sepiaFW-swipeBar-menu-right', '',
			function(currentPane){
				$("#sepiaFW-chat-menu-page-selector").find('button').removeClass("active");
				$("#sepiaFW-chat-menu-page-selector > button:nth-child(" + (currentPane+1) + ")").addClass('active').fadeTo(350, 0.1).fadeTo(350, 1.0);
			});
		UI.soc.init();
		UI.soc.showPane(0);
		UI.build.menuPageSelector();
		
		//track idle time
		UI.trackIdleTime();
		
		//listen to visibilityChangeEvent
		UI.listenToVisibilityChange();
		
		//listen to mouse stuff and active element
		//UI.trackMouse();
		//UI.trackTouch();
		UI.listenToActiveElementChange();
		
		//execute stuff on ready:
		
		//Setup audio
		if (SepiaFW.audio) SepiaFW.audio.setup();
		
		//Load GPS
		if (SepiaFW.geocoder && SepiaFW.geocoder.autoGPS){
			SepiaFW.geocoder.getBestLocation();
		}
		
		//override back button behaviour
		if (UI.isCordova){
			document.addEventListener("backbutton", function(){
				UI.backButtonAction();
			}, false);
		}
		
		//DEBUG
		//$('#sepiaFW-chat-output').html();
	}
	
	//-------- END SETUP --------
	
	//Back button
	var backButtonPressed = 0;
	UI.backButtonAction = function(){
		backButtonPressed++;
		//close teach UI
		if (SepiaFW.teach && SepiaFW.teach.isOpen){
			SepiaFW.teach.closeUI();
			backButtonPressed = 0;
			return;
		}
		//close frames
		if (SepiaFW.frames && SepiaFW.frames.isOpen){
			SepiaFW.frames.close();
			backButtonPressed = 0;
			return;
		}
		//close open menus
		if (UI.getOpenMenus().length > 0){
			UI.closeAllMenus();
			backButtonPressed = 0;
		}
		//go back to my view
		if (UI.moc){
			if (UI.moc.getCurrentPane() != 0){
				UI.moc.showPane(0);
				backButtonPressed = 0;
			}
		}
		//check back button quick double tap
		if (backButtonPressed > 1){
			backButtonPressed = 0;
			//hard exit app (no background)
			/* if (navigator.app && navigator.app.exitApp){
				navigator.app.exitApp();
			} */
			//Always-On mode
			if (SepiaFW.alwaysOn){
				SepiaFW.alwaysOn.start();
			}
		}else{
			setTimeout(function(){
				backButtonPressed = 0;
			}, 750);
		}
	}
	
	//Update myView
	var myViewUpdateInterval = 15*60*1000; 		//<- updates will not be done more than once within this interval
	UI.myViewAutoUpdateDelay = 60*60*1000;		//1h
	var lastMyViewUpdate = 0;
	var myViewPostponedUpdateTries = 0;
	var myViewUpdateTimer;
	var myViewAutoUpdateTimer;
	var contextEventsLoadDelayTimer = undefined;
	var timeEventsLoadDelayTimer = undefined;
	UI.updateMyView = function(forceUpdate, checkGeolocationFirst, updateSource){
		//console.log('My-view update source: ' + updateSource); 		//DEBUG
		
		//is client active or demo-mode?
		if ((!SepiaFW.client.isActive() || !SepiaFW.assistant.id) && !SepiaFW.client.isDemoMode()){
			clearTimeout(myViewUpdateTimer);
			myViewPostponedUpdateTries++;
			myViewUpdateTimer = setTimeout(function(){
				//try again
				if (myViewPostponedUpdateTries <= 3){
					UI.updateMyView(true, checkGeolocationFirst, 'notActiveRetry');
				}else{
					myViewPostponedUpdateTries = 0;
				}
			}, 8000);
			SepiaFW.debug.err("Events: tried to update my-view before client is active! Will try again in 8s.");
			return;
		}
		//console.log('passed');
		myViewPostponedUpdateTries = 0;
		
		//with GPS first
		if (checkGeolocationFirst){
			//location update?
			if (SepiaFW.geocoder && SepiaFW.geocoder.autoGPS){
				if ((new Date().getTime() - SepiaFW.geocoder.lastBestLocationUpdate) > SepiaFW.geocoder.autoRefreshInterval){
					//console.log('---------------GET BEST LOCATION--------------'); 		//DEBUG
					SepiaFW.geocoder.getBestLocation();
				}else{
					UI.updateMyView(forceUpdate, false, 'geoCoderBlockedUpdate'); 	//TODO: should we use 'forceUpdate' variable instead of false?
				}
			}else{
				UI.updateMyView(forceUpdate, false, 'geoCoderSkippedUpdate');		//TODO: should we use 'forceUpdate' variable instead of false?
			}
		
		//without/after GPS
		}else{
			var now = new Date().getTime();
			if (forceUpdate || ((now - lastMyViewUpdate) > myViewUpdateInterval)){
				//now we can update the view

				//first we reset the timer
				clearTimeout(myViewUpdateTimer);
				lastMyViewUpdate = now;
				//TODO: in theory the idle timer and the view switching should update my-view but we should consider an auto-timer again? (cause it hangs sometimes)
				
				//contextual events update
				UI.updateMyContextualEvents(forceUpdate);
				
				//reload timers and check for near timeEvents
				UI.updateMyTimeEvents(forceUpdate);

				//trigger my custom buttons refresh (checks internally if buttons have changed)
				if (SepiaFW.ui.customButtons){
					SepiaFW.ui.customButtons.onMyViewRefresh();
				}

				//schedule the next update
				scheduleNextMyViewAutoUpdate();
			}
		}
	}
	function scheduleNextMyViewAutoUpdate(overwriteDelay){
		//schedule the next update
		clearTimeout(myViewAutoUpdateTimer);
		myViewAutoUpdateTimer = setTimeout(function(){
			if (SepiaFW.client.isActive()){
				UI.updateMyView(false, true, 'myViewAutoUpdate');
			}else{
				scheduleNextMyViewAutoUpdate(1000*60*15);	//try again in 15min
			}
		}, (overwriteDelay || UI.myViewAutoUpdateDelay));
	}
	//Update the timers shown on my-view (no database reload)
	UI.updateMyTimers = function(maximumPreviewTargetTime){
		var maxTargetTime = maximumPreviewTargetTime || (new Date().getTime() + 18*60*60*1000);		//within 18h (before) and 120h (past)
		var includePastMs = 120*60*60*1000;
		var nextTimers = SepiaFW.events.getNextTimeEvents(maxTargetTime, '', includePastMs);
		var myView = document.getElementById('sepiaFW-my-view'); 		//TODO: don't we have a method for this or a permanent variable?
		//TODO: smart clean-up of old timers - This has to be done before when we get the new list
		$.each(nextTimers, function(index, Timer){
			//check if alarm is present in myView 	
			var timerPresentInMyView = $(myView).find('[data-id="' + Timer.data.eventId + '"]');	//TODO: we don't need this if we clean first
			if (timerPresentInMyView.length == 0){
				//recreate timer and add to myView
				var action = Timer.data;
				action.info = "set";
				action.type = Timer.data.eleType; 	//TODO: this is just identical by chance!!!
				SepiaFW.ui.actions.timerAndAlarm(action, myView);
			}
		});
	}

	//Reload from database and show events
	UI.updateMyTimeEvents = function(forceUpdate){
		if (timeEventsLoadDelayTimer) clearTimeout(timeEventsLoadDelayTimer);
		timeEventsLoadDelayTimer = setTimeout(function(){
			//console.log('---------------GET TIME EVENTS--------------'); 			//DEBUG
			SepiaFW.events.setupTimeEvents(forceUpdate); 							//just in case we want to use GPS some day (see below)
		}, 1000);
	}
	UI.updateMyContextualEvents = function(forceUpdate){
		if (contextEventsLoadDelayTimer) clearTimeout(contextEventsLoadDelayTimer);
		contextEventsLoadDelayTimer = setTimeout(function(){
			//console.log('---------------GET CONTEXT EVENTS--------------'); 		//DEBUG
			SepiaFW.events.loadContextualEvents(forceUpdate); 						//We use a safety wait here because GPS is usually to late
		}, 1000);
	}
	
	//Visibility
	var hidden = ('hidden' in document)? 'hidden' : ('webkitHidden' in document)? 'webkitHidden' : ('mozHidden' in document)? 'mozHidden' : null;
	var visibility = ('visibilityState' in document)? 'visibilityState' : ('webkitVisibilityState' in document)? 'webkitVisibilityState' : ('mozVisibilityState' in document)? 'mozVisibilityState' : null;
	var isPaused = false;
	//state
	UI.isVisible = function(){
	    if (isPaused){
	        return false;

	    }else if (hidden === null || visibility === null){
			//next best workaround
			return (document.hasFocus());

        }else{
            var visibilityChangeEvent = hidden.replace(/hidden/i, 'visibilitychange');
			return (!document[hidden]);
        }
	}
	UI.isPaused = function(){
		return isPaused;
	}
	//-listener
	var onResumeTimer;
	var onResumeVisibilityTimer;
	var onPauseTimer;
	UI.listenToVisibilityChange = function(){
		//HTML
		if (hidden !== null && visibility !== null){
			var visibilityChangeEvent = hidden.replace(/hidden/i, 'visibilitychange');
			document.addEventListener(visibilityChangeEvent, function(e){
					broadcastVisibilityChange(); 
			});
		}
		//Cordova
		if (UI.isCordova){
			document.addEventListener("resume", function(){ 
				isPaused = false;
				setTimeout(function(){
					broadcastResumeFromPause();
				}, 200);
				clearTimeout(onResumeVisibilityTimer);
				onResumeVisibilityTimer = setTimeout(function(){
					broadcastVisibilityChange(true); 
				}, 1000);
			}, false);
			document.addEventListener("pause", function(){
				if (UI.isAndroid){
					isPaused = true;
					clearTimeout(onResumeVisibilityTimer);
					setTimeout(function(){
						broadcastPause();
					}, 200);
				}
				//iOS is quirky: https://cordova.apache.org/docs/en/latest/cordova/events/events.html#pause
			}, false);
		}
	}
	//-broadcaster
	var isFirstVisibilityChange = true;
	function broadcastVisibilityChange(forceTriggerVisible){
		clearTimeout(onResumeVisibilityTimer);	//try to prevent double-fire due to "resume" and "visibilitychange"
		//EXAMPLE:
		SepiaFW.debug.info('UI.listenToVisibilityChange: ' + document[visibility]);
		
		//became visible
		if (!SepiaFW.account || !SepiaFW.account.isLoginBoxOpen()){		//SepiaFW.client.isActive()
			if (!isFirstVisibilityChange && (UI.isVisible() || forceTriggerVisible)){
				//update myView (is automatically skipped if called too early)
				UI.updateMyView(false, true, 'visibilityChange');
			}
			isFirstVisibilityChange = false;
		}
	}
	//broadcaster for myView show
	var isFirstMyViewShow = true;
	function broadcastShowMyView(){
		//EXAMPLE:
		SepiaFW.debug.info('UI.broadcastShowMyView');
		
		//update myView (is automatically skipped if called too early)
		if (!isFirstMyViewShow){
			if (SepiaFW.client.isActive()){
				UI.updateMyView(false, false, 'showMyView');
			}
		}
		isFirstMyViewShow = false;
	}
	//broadcaster for resume event when app was paused
	function broadcastResumeFromPause(){
		clearTimeout(onPauseTimer);
		clearTimeout(onResumeTimer);
		onResumeTimer = setTimeout(function(){
			if (!SepiaFW.client.allowBackgroundConnection){
				//reconnect
				SepiaFW.client.resumeClient();
				//GPS

			}
		}, 100);
	}
	//broadcast when app goes to pause
	function broadcastPause(){
		clearTimeout(onPauseTimer);
		clearTimeout(onResumeTimer);
		onPauseTimer = setTimeout(function(){
			if (!SepiaFW.client.allowBackgroundConnection){
				//disconnect
				SepiaFW.client.pauseClient();
			}
		}, 9000);
	}
	
	//Idle-time and events
	var lastDomEventTS = new Date().getTime();
	//listener - NOTE: not to be confused with Client.queueIdleTimeEvent
	UI.trackIdleTime = function(){
		function resetTimer() {
			lastDomEventTS = new Date().getTime();
		}
		//DOM Events
		document.addEventListener("keypress", resetTimer);
		document.addEventListener("mousemove", resetTimer);
		document.addEventListener("mousedown", resetTimer);		// touchscreen presses
		document.addEventListener("click", resetTimer);			// touchpad clicks
		document.addEventListener("touchstart", resetTimer);
		//custom events
		document.addEventListener("sepia_state_change", function(e){		//e.g. stt, tts, loading
			//This one is tricky ... idle time is used for example to show notifications when the UI had no interactons for a while
			//... but hands-free controls do not trigger one of the upper DOM events. What if SEPIA is covered by a window but used hands-free?
			if (e.detail && e.detail.state == "listening"){
				resetTimer();
			}
			//console.log(e.detail.state);
		});
		/*
		document.onload = resetTimer;
		document.onscroll = resetTimer;    // scrolling with arrow keys
		*/
	}
	//state
	UI.getIdleTime = function(){
		return (new Date().getTime() - lastDomEventTS);
	}
	
	//Mouse and touch position
	UI.trackMouse = function(){
		if (!SepiaFW.mouse) SepiaFW.mouse = {};
		$("body").mousedown(function(e) {
			//console.log("Mouse down");
			SepiaFW.mouse.posx = e.clientX; //pageX;
			SepiaFW.mouse.posy = e.clientY; //pageY;
		});
	}
	UI.trackTouch = function(){
		if (!SepiaFW.mouse) SepiaFW.mouse = {};
		$("body").bind("touchstart", function(e) {        
			//console.log("Touch Start");
			var touch = e.touches[0]; 
			SepiaFW.mouse.posx = touch.clientX;
			SepiaFW.mouse.posy = touch.clientY;
		}); 
	}		
	
	//Helper function for inserting HTML as the first child of an element
	UI.insert = function(targetId, html){
		document.getElementById(targetId).insertAdjacentHTML("beforeend", html); 	//"afterbegin"
	}
	UI.insertEle = function(targetId, newEle, skipAnimation){
		if (skipAnimation){
			$(newEle).appendTo("#" + targetId);
		}else{
			var target = document.getElementById(targetId);
			newEle.style.height = "0px";
			$(newEle).appendTo(target);
			autoHeightAnimate($(newEle), 150);
		}
	}
	function autoHeightAnimate($element, time){
		var curHeight = $element.height();
		var autoHeight = $element.css('height', 'auto').height();
		$element.height(curHeight);
		$element.stop().animate({ height: autoHeight }, time, function(){
			$element.css('height', 'auto');
		});
	}
	
	//loading animation
	var loaderTimer;
	UI.showLoader = function(noDelay){
		if (noDelay){
			$('#sepiaFW-loader').show();
		}else{
			loaderTimer = setTimeout(function(){ 
				$('#sepiaFW-loader').show();
			}, 750);
		}
	}
	UI.hideLoader = function(){
		clearTimeout(loaderTimer);
		$('#sepiaFW-loader').hide();
	}
	
	//Show message popup - TODO: there can only be one pop-up at the same time
	UI.showPopup = function(content, config){
		//var primaryColor, secondaryColor; 		//could be added as config variables
		if (!config) config = {};
		var $input1 = $('#sepiaFW-popup-message-input-one');
		var $input2 = $('#sepiaFW-popup-message-input-two');
		if (config.inputLabelOne){
			$input1.val(config.inputOneValue || "").attr("placeholder", config.inputLabelOne).show();
		}else{
			$input1.val("").attr("placeholder", "").hide();
		}
		if (config.inputLabelTwo){
			$input2.val(config.inputTwoValue || "").attr("placeholder", config.inputLabelTwo).show();
		}else{
			$input2.val("").attr("placeholder", "").hide();
		}
		//NOTE: currently only button one and two receive the input data
		if (config.buttonOneName && config.buttonOneAction){
			var btn1 = $('#sepiaFW-popup-message-btn-one');
			btn1.html(config.buttonOneName);	
			btn1.off().on('click', function(){	
				config.buttonOneAction(
					this, 
					$input1.val(), 
					$input2.val(),
					$input1[0],
					$input2[0]
				); 	
				UI.hidePopup();		
			});
		}else{
			var btn1 = $('#sepiaFW-popup-message-btn-one');
			btn1.html('OK');			
			btn1.off().on('click', function(){	UI.hidePopup();		});
		}
		if (config.buttonTwoName && config.buttonTwoAction){
			var btn2 = $('#sepiaFW-popup-message-btn-two');
			btn2.html(config.buttonTwoName).show();	
			btn2.off().on('click', function(){	
				config.buttonTwoAction(
					this, 
					$input1.val(), 
					$input2.val(),
					$input1[0],
					$input2[0]
				); 	
				UI.hidePopup();		
			});
		}else{
			$('#sepiaFW-popup-message-btn-two').off().hide();
		}
		if (config.buttonThreeName && config.buttonThreeAction){
			var btn3 = $('#sepiaFW-popup-message-btn-three');
			btn3.html(config.buttonThreeName).show();	
			btn3.off().on('click', function(){	config.buttonThreeAction(this); 	UI.hidePopup();		});
		}else{
			$('#sepiaFW-popup-message-btn-three').off().hide();
		}
		if (config.buttonFourName && config.buttonFourAction){
			var btn4 = $('#sepiaFW-popup-message-btn-four');
			btn4.html(config.buttonFourName).show();	
			btn4.off().on('click', function(){	config.buttonFourAction(this); 	UI.hidePopup();		});
		}else{
			$('#sepiaFW-popup-message-btn-four').off().hide();
		}
		if (typeof content == 'object'){
			$('#sepiaFW-popup-message-content').html('').append(content);
		}else{
			$('#sepiaFW-popup-message-content').html(content);
		}
		$('#sepiaFW-cover-layer').fadeIn(150);
		$('#sepiaFW-popup-message').fadeIn(300);
	}
	UI.hidePopup = function(){
		$('#sepiaFW-popup-message').fadeOut(300);
		$('#sepiaFW-cover-layer').fadeOut(300);
	}

	//Use pop-up to ask for permission
	UI.askForPermissionToExecute = function(question, allowedCallback, refusedCallback){
		var request = SepiaFW.local.g('allowedToExecuteThisCommand') + "<br>" + question;
		UI.showPopup(request, {
			buttonOneName : SepiaFW.local.g('looksGood'),
			buttonOneAction : function(){
				//yes
				if (allowedCallback) allowedCallback();
			},
			buttonTwoName : SepiaFW.local.g('betterNot'),
			buttonTwoAction : function(){
				//no
				if (refusedCallback) refusedCallback();
			}
		});
	}
	UI.askForConfirmation = function(question, allowedCallback, refusedCallback){
		UI.showPopup(question, {
			buttonOneName : SepiaFW.local.g('ok'),
			buttonOneAction : function(){
				//yes
				if (allowedCallback) allowedCallback();
			},
			buttonTwoName : SepiaFW.local.g('abort'),
			buttonTwoAction : function(){
				//no
				if (refusedCallback) refusedCallback();
			}
		});
	}
	
	//Test for support of special sepiaFW trigger events
	UI.elementSupportsCustomTriggers = function(ele){
		var eventsListeners = $._data(ele, "events");
		return (eventsListeners && !!eventsListeners['sepiaFW-events']);
	}

	//Simple double-tap
	UI.simpleDoubleTab = function(ele, callback){
		var delay = 333;
		var clicks = 0;
		var tabs = 0;
		function checkClicksAndTabs(){
			if (clicks > 1){ 	
				clicks = 0;	tabs = 0;	callback();
			}else if (tabs > 1){
				clicks = 0;	tabs = 0;	callback();
			}else{				
				setTimeout(function(){ clicks=0; tabs=0; }, delay);			
			}
		}
		$(ele).mousedown(function(event){
			clicks++;
			checkClicksAndTabs();
		}).on('touchstart', function(event){	
			tabs++;
			checkClicksAndTabs();
		});
	}
	//Long-press / Short-press combo - Version without Hammer.js - basically deprecated, use: onShortLongPress
	UI.longPressShortPress = function(ele, callbackLong, callbackShort){
		var pressTimer;
		var delay = 750;
		var activatedAt;
		$(ele).mousedown(function(event){
			if (event.which !== 1){		return false; 	}
			pressTimer = setTimeout(function(){ callbackLong() }, delay);
			activatedAt = new Date().getTime();
			//console.log('mousedown');
			return false; 
		}).on('touchstart', function(event){	
			pressTimer = setTimeout(function(){ callbackLong() }, delay);
			activatedAt = new Date().getTime();
			//console.log('touchstart');
			return false; 
		}).mouseup(function(event){
			if (event.which !== 1){		return false; 	}
			if((new Date().getTime() - activatedAt) <= delay){
				clearTimeout(pressTimer);
				callbackShort();
			}
			//console.log('mouseup');
			return false;
		}).on('touchend', function(event){
			if((new Date().getTime() - activatedAt) <= delay){
				clearTimeout(pressTimer);
				callbackShort();
			}
			//console.log('touchend');
			return false;
		});
	}
	//Default on-click method with optional haptik press-feedback
	UI.useFastTouch = false; 	//reduced delay for e.g. iOS' UIWebView (basically deprecated, not needed anymore since use of WKWebview)
	UI.onclick = function(ele, callback, animatePress){
		if (UI.useFastTouch){
			UI.longPressShortPressDoubleTap(ele, '', '', callback);
			//this prevents the ghost-click but leads to a more complicated trigger event, use: $(ele).trigger('click', {bm_force : true})
			$(ele).on('click', function(ev, data){
				if (data && data.bm_force){
					//if (animatePress){ SepiaFW.animate.flashObj(ele); }
					callback(ev);
				}else{
					ev.preventDefault();
				}
			});
			//PreventGhostClick(ele);
		}else{
			$(ele).on('click', function(ev){
				if (animatePress){
					SepiaFW.animate.flashObj(ele);
				}
				callback(ev);
			});
		}
	}
	//Long-press / Short-press / Double-Tab combo
	UI.longPressShortPressDoubleTap = function(ele, callbackLong, callbackLongRelease, callbackShort, callbackDouble, 
							useLongPressIndicator, preventTapOnDoubleTap, animateShortPress){
		//Hammertime!
		var pressTimer;
		var delay = 625;
		var mc = new Hammer.Manager(ele);
		mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
		mc.add(new Hammer.Tap());
		mc.add(new Hammer.Press({ event: 'firstpress', time: 300 })); 	//catches the press at 300ms to start animations 
		mc.add(new Hammer.Press({ time: delay }));
		
		if (preventTapOnDoubleTap){
			mc.get('tap').requireFailure('doubletap');		//use this to prevent a 'tap' together with 'doubletap' ... but to introduce a delay on tap
		}

		//TODO: test sepiaFW-events handler ...
		$(ele).on('sepiaFW-events', function(e, data){
			if (data.name === "shortpress"){
				//console.log('shortpress-trigger');
				if (callbackShort) callbackShort();
			}else if (data.name === "longpress"){
				//console.log('longpress-trigger');
				if (callbackLong) callbackLong();
				else if (callbackLongRelease) callbackLongRelease(); 	//... assuming this is what makes most sense according to 'UI.onShortLongPress'
			}else if (data.name === "doubletap"){
				if (callbackDouble) callbackDouble();
			}
		});

		//if (callbackShort) mc.on("tap", callbackShort);
		if (callbackShort) mc.on("tap", function(ev){
			if (useLongPressIndicator) UI.hidelongPressIndicator();
			if (animateShortPress){
				SepiaFW.animate.flashObj(ele);
			}
			callbackShort(ev);
			//console.log('tab');
		});
		if (callbackDouble) mc.on("doubletap", function(ev){
			if (useLongPressIndicator) UI.hidelongPressIndicator();
			callbackDouble(ev);
			//console.log('doubletab');
		});
		if (callbackLong) mc.on("firstpress", function(ev){ 
			if (useLongPressIndicator){ 
				UI.showlongPressIndicator(ev);
				pressTimer = setTimeout(UI.hidelongPressIndicator, delay);
			}
			//console.log('firstpress');
		});
		if (callbackLong) mc.on("press", function(ev){ 
			callbackLong(ev); 
			//console.log('press');
		});
		if (callbackLong) mc.on("firstpressup", function(ev){ 
			clearTimeout(pressTimer);
			if (useLongPressIndicator) UI.hidelongPressIndicator(); 
			if (callbackLongRelease) callbackLongRelease(ev);
			//console.log('pressup');
		});
		//maybe even easier?
		/*mc.on("hammer.input", function(ev) {
		   console.log(ev.pointers);
		});*/
		//add a normal event listener with data to enable trigger method
		$(ele).on('click', function(ev, data){
			if (data && data.bm_force){
				if (callbackShort) callbackShort();
			}else{
				ev.preventDefault();
			}
		});
	}
	UI.longPressShortPressDoubleTab = UI.longPressShortPressDoubleTap;
	//Shortcut for Short/Long combo with some default settings
	UI.onShortLongPress = function(ele, shortCallback, longCallback, animateShort){
		UI.longPressShortPressDoubleTap(ele, function(){
			//Long press
			if (longCallback) longCallback();
		}, undefined, function(){
			//Short press
			if (shortCallback) shortCallback();
		}, undefined, true, false, animateShort);
	}
	//Long-press indicator
	var longPressIndicator = '';
	UI.showlongPressIndicator = function(ev){
		var x, y;
		if (SepiaFW.mouse && SepiaFW.mouse.posx){
			//TODO: rethink
			x = SepiaFW.mouse.posx;
			y = SepiaFW.mouse.posy;
			longPressIndicator = document.getElementById('sepiaFW-long-press-indicator-div');
			if (longPressIndicator) longPressIndicator.style.backgroundColor = "rgba(0, 235, 0, 0.25)";
		}else{
			if (ev.center){
				x = ev.center.x;
				y = ev.center.y;
			}else if (ev.originalEvent && ev.originalEvent.touches){
				x = ev.originalEvent.touches[0].pageX;
				x = ev.originalEvent.touches[0].pageY;
			}else if (ev.target){
				var target = $(ev.target);
				x = target[0].getBoundingClientRect().left + (target[0].getBoundingClientRect().width/2);
				y = target[0].getBoundingClientRect().top + (target[0].getBoundingClientRect().height/2);
			}else{
				return;
			}
		}
		//correction for virtual keyboard offset
		//document.getElementById('sepiaFW-chat-output').innerHTML += ("<p>" + UI.windowExpectedSize + "</p>"); 	//debug
		if (window.innerHeight != UI.windowExpectedSize){
			y = y + (UI.windowExpectedSize - window.innerHeight);
		}
		//do it 
		if (!longPressIndicator) longPressIndicator = document.getElementById('sepiaFW-long-press-indicator-div');
		if (longPressIndicator){
			longPressIndicator.className = 'sepiaFW-long-press-indicator grow';
			longPressIndicator.style.left = x + "px";
			longPressIndicator.style.top = y + "px";
		}
	}
	UI.hidelongPressIndicator = function(){
		if (!longPressIndicator) longPressIndicator = document.getElementById('sepiaFW-long-press-indicator-div');
		if (longPressIndicator){
			longPressIndicator.style.left = "-100px";
			longPressIndicator.style.top = "-100px";
			longPressIndicator.className = 'sepiaFW-long-press-indicator';
		}
	}

	//Trigger a mouse event on a specific element or the element at x,y coordinates
	UI.triggerMouseClick = function(el, x, y){
		var ev = new MouseEvent('click', {
			'view': window,
			'bubbles': true,
			'cancelable': true,
			'screenX': x,
			'screenY': y
		});
		if (!el) el = document.elementFromPoint(x, y);
		console.log(el);
		el.dispatchEvent(ev);
	}

	//make auto-resize swipe bar
	UI.makeAutoResizeSwipeArea = function(selector, onClickCallback){
		var $swipeArea = $(selector);
		var didDown = false;	var didUp = false;
		var xDown = 0;			var xUp = 0;
		var yDown = 0;			var yUp = 0;
		var timeDown = 0;
		var longPressTime = 625;
		var timeDownTimer;
		var resetTimer;
		$swipeArea.mouseup(function(event){			up(this, event);
			}).mousedown(function(event){			down(this, event);
            //}).on('touchstart', function(event){	console.log('touchstart');
			//}).on('touchend', function(event){	console.log('touchend'); up(this, event);
			});
        if (UI.isIOS){
            $swipeArea.on('touchstart', function(event){    touchdown(this, event); });
        }
        function touchdown(that, ev){
            //console.log('touchstart');
            timeDown = new Date().getTime();
        }
		function down(that, ev){
			//console.log('down');
			if (!didDown){
				didDown = true;
				didUp = false;
				xDown = (ev.center)? ev.center.x : ev.clientX;
				yDown = (ev.center)? ev.center.y : ev.clientY;
				$(that).addClass('sepiaFW-fullSize');
                if (!timeDown){
                    timeDown = new Date().getTime();
                }
				//console.log(ev);
				timeDownTimer = setTimeout(function(){
					up(that, ev); 		//note: ev will not be up-to-date here
				}, longPressTime);
			}
		}
		function up(that, ev){
			//console.log('up');
			if (timeDownTimer) clearTimeout(timeDownTimer);
			if (!didUp){
				didUp = true;
				$(that).removeClass('sepiaFW-fullSize');
				checkClick(ev);
				resetTimer = setTimeout(function(){
					didDown = false;
				}, 500);
			}
            timeDown = 0;
		}
		function checkClick(ev){
			xUp = (ev.center)? ev.center.x : ev.clientX;
			yUp = (ev.center)? ev.center.y : ev.clientY;
			var moved = (xDown-xUp)*(xDown-xUp) + (yDown-yUp)*(yDown-yUp);
			//console.log(moved);
			if (moved < 100){
				click(ev);
			}
		}
		function click(ev){
			if (onClickCallback){
				onClickCallback(ev);
			}
			//pass through the click event to underlying element
			var x = (ev.center)? ev.center.x : ev.clientX;
			var y = (ev.center)? ev.center.y : ev.clientY;
			var that = $swipeArea[0];
			var thatDisplay = that.style.display;
			that.style.display = 'none';
			var elementMouseIsOver = document.elementFromPoint(x, y);
			that.style.display = thatDisplay;
			//console.log(elementMouseIsOver.id);
			//supports sepiaFW-events?
			if (UI.elementSupportsCustomTriggers(elementMouseIsOver)){
				var durationDown = new Date().getTime() - timeDown;
				if (timeDown && (durationDown > longPressTime)){
					$(elementMouseIsOver).trigger('sepiaFW-events', { name: 'longpress'});
				}else{
					$(elementMouseIsOver).trigger('sepiaFW-events', { name: 'shortpress'});
				}
			}else{
				$(elementMouseIsOver).trigger('click', { bm_force: true });
			}
			/* setTimeout(function(){
				that.style.display = thatDisplay;
			}, 500); */
		}
		return $swipeArea[0];
	}
	
	//Scroll to bottom
	UI.scrollToBottom = function(targetId, delay){
		setTimeout(function(){
			var scrollable = $('#' + targetId);
			scrollable.animate({ scrollTop: scrollable[0].scrollHeight}, 380);
		}, (delay? delay : 200));
	}
	//Scroll to top
	UI.scrollToTop = function(targetId, delay){
		setTimeout(function(){
			var scrollable = $('#' + targetId);
			scrollable.animate({ scrollTop: 0}, 380);
		}, (delay? delay : 200));
	}
	//Scroll to id inside scrollable element given by id, if scrollable is empty uses 'sepiaFW-chat-output'
	UI.scrollToId = function(targetId, scrollViewId, delay){
		var targetEle = $('#' + targetId);
		if (targetEle.length > 0){
			if (!scrollViewId) scrollViewId = targetEle.closest(UI.JQ_RES_VIEW_IDS)[0].id;
			UI.scrollToElement(targetEle[0], $('#' + scrollViewId)[0], delay);
		}
	}
	//Scroll to dom element inside a scrollable element, if scrollable is empty uses 'sepiaFW-chat-output'
	UI.scrollToElement = function(targetEle, scrollViewEle, delay){
		if (targetEle && scrollViewEle){
			setTimeout(function(){
				//$(scrollViewEle).finish().animate({ scrollTop: $(targetEle).offset().top}, 250);
				$(scrollViewEle).finish().animate({ scrollTop: $(targetEle).offset().top - $(scrollViewEle).offset().top + $(scrollViewEle).scrollTop()}, 250);
			}, (delay? delay : 330));
		}
	}

	//Is the top of the child (+offset) visible inside a scrollable element - TODO: will only work if child disappears above (not below)
	UI.isTopOfChildVisibleInsideScrollable = function(childElement, scrollableElement, childOffset){
		var offset = childElement.offsetTop + childOffset;
		var scrollTop = scrollableElement.scrollTop;
		var isScrollable = scrollableElement.scrollHeight > scrollableElement.clientHeight;
		return (!isScrollable || (offset > scrollTop));		//TODO: take scrollableElement.clientHeight and child.clientHeight into account for "below" case
	}
	
	//do these elements collide?
	UI.doCollide = function($el1, $el2){
		//TODO: should we check for element visibility first?
		var x1 = $el1.offset().left;
		var y1 = $el1.offset().top;
		var h1 = $el1.outerHeight(true);
		var w1 = $el1.outerWidth(true);
		var b1 = y1 + h1;
		var r1 = x1 + w1;
		var x2 = $el2.offset().left;
		var y2 = $el2.offset().top;
		var h2 = $el2.outerHeight(true);
		var w2 = $el2.outerWidth(true);
		var b2 = y2 + h2;
		var r2 = x2 + w2;

		return !(b1 < y2 || y1 > b2 || r1 < x2 || x1 > r2);
    }
	
	//helper: close all menues ... except
	UI.closeAllMenus = function (except){
		$('.sepiaFW-menu').not(except).fadeOut(100, function(){
			$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + $(this)[0].id));
		});
	}
	//helper: close all menues that collide with the ref ... except
	UI.closeAllMenusThatCollide = function (ref, except){
		//wait for other element to show up before checking collision
		setTimeout(function(){
			$('.sepiaFW-menu').not(except).not(ref).each(function(){
				if (UI.doCollide($(ref), $(this))){
					$(this).fadeOut(100, function(){
						$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + $(this)[0].id));
					});
				}
			});
			//stupid Apple bug in Safari requires last-element margin-bottom refresh
			if (UI.isSafari || UI.isIOS){
				var spacer = document.createElement('DIV');
				spacer.className = 'sepiaFW-safari-bug-fix-spacer';
				$(UI.JQ_RES_VIEW_IDS).prepend(spacer);
			
				setTimeout(function(){
					$(UI.JQ_RES_VIEW_IDS).find('.sepiaFW-safari-bug-fix-spacer').remove();
				}, 15);
			}
		}, 15);
	}
	//get all open menus as elemets
	UI.getOpenMenus = function(){
		var openMenus = [];
		$('.sepiaFW-menu').each(function(){
			if ($(this).css("display") != "none"){
				openMenus.push(this);
			}
		});
		return openMenus;
	}
	
	//Get the target and pane number that belongs to a results view name (e.g. chat, myView, bigResults)
	UI.getResultViewByName = function(viewName){
		var target = "sepiaFW-chat-output";
		var paneNbr = 1;
		
		if (!viewName || viewName === "chat"){
			target = "sepiaFW-chat-output";
			paneNbr = 1;
		}else if (viewName === "myView"){
			target = "sepiaFW-my-view";
			paneNbr = 0;
		}else if (viewName === "bigResults"){
			target = "sepiaFW-result-view";
			paneNbr = 2;
		}
		return ({
			"target": target,
			"paneNumber": paneNbr
		});
	}
	//Add elements to certain result view
	UI.maxChatMessages = 40;
	UI.addDataToResultView = function(resultView, entryData, beSilent, autoSwitchView, switchDelay, skipAnimation){
		var target = resultView.target;
		var $target = $('#' + target);
		var paneNbr = resultView.paneNumber;
		
		if (paneNbr == 1){
			if (!skipAnimation && ((entryData.className.indexOf("hidden") >= 0) || window.getComputedStyle(entryData, null).getPropertyValue("display") == "none")){
				skipAnimation = true; 	//force skip
			}
			UI.insertEle(target, entryData, skipAnimation);
			//remove old message(s)?
			var $allMessages = $target.find('.chatMsg').filter(":visible");
			if (UI.maxChatMessages && UI.maxChatMessages <= $allMessages.length){
				//remove old:
				//$allMessages.slice(0, UI.maxChatMessages).hide();
				$allMessages.first().hide();
				//remove status message as well if first now? ... if its a day/date tag it should stay until directly followed by next day tag
			}
			if (!skipAnimation){
				UI.scrollToBottom(target);
			}
			//check if we should show the missed message note bubble
			if (!beSilent){
				if (!UI.isVisible() 
					|| (UI.moc && UI.moc.getCurrentPane() !== 1)
					|| (SepiaFW.frames && SepiaFW.frames.isOpen)
					|| (SepiaFW.teach && SepiaFW.teach.isOpen)
					//Note: this should be all possibilities, don't add more! 
				){
					//if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen) ... use this and let AO-mode decide what to do?
					var name = (entryData)? entryData.className : undefined;
					if (name && entryData.firstChild){
						name += (" " + entryData.firstChild.className);
					}
					var info = {
						"data": entryData,
						"name": name
					};
					UI.handleMissedMessage(1, info);
				}
			}
		}else if (paneNbr == 0){
			$target.prepend(entryData);
			UI.scrollToTop(target);
		}else{
			$target.html('');
			$target.prepend(entryData);
			UI.scrollToTop(target);
		}
		
		if (autoSwitchView && UI.moc && (UI.moc.getCurrentPane() != paneNbr)){
			setTimeout(function(){
				UI.moc.showPane(paneNbr);
			}, switchDelay);
		}
	}
	
	//Toggle interface "soft" fullscreen mode
	UI.toggleInterfaceFullscreen = function(){
		$navBar = $('#sepiaFW-nav-bar');
		$inputBar = $('#sepiaFW-chat-controls-form');
		if ($navBar.css('display') == 'none'){
			$navBar.fadeIn(300);
			if (inputBarFullscreenFadeIn){
				$inputBar.fadeIn(300);
			}
			$('.sepiaFW-carousel-pane').removeClass('full-screen');
			$('#sepiaFW-chat-menu').removeClass('full-screen');
			$('#sepiaFW-chat-controls').removeClass('full-screen');
			/*if ('StatusBar' in window){
                StatusBar.show();
            }*/
            if ('NavigationBar' in window){
                NavigationBar.show();
			}
			UI.isInterfaceFullscreen = false;
		}else{
			$navBar.fadeOut(300);
			if ($inputBar.css('display') != 'none'){
				$inputBar.fadeOut(300);
				inputBarFullscreenFadeIn = true;
			}
			$('.sepiaFW-carousel-pane').addClass('full-screen');
			$('#sepiaFW-chat-menu').addClass('full-screen');
			$('#sepiaFW-chat-controls').addClass('full-screen');
			/*if ('StatusBar' in window){
                StatusBar.hide();
            }*/
            if ('NavigationBar' in window){
                NavigationBar.hide();
            }
			UI.isInterfaceFullscreen = true;
		}
		setTimeout(function(){
			$(window).trigger('resize'); 	//this might not work on IE
		}, 500);
		UI.closeAllMenus();
	}
	UI.isInterfaceFullscreen = ($('#sepiaFW-nav-bar').css('display') == 'none');
	var inputBarFullscreenFadeIn = false;
	
	//Use fullscreen API
	UI.toggleFullscreen = function(elem){
		elem = elem || document.documentElement;
		if (!document.fullscreenElement && !document.mozFullScreenElement &&
				!document.webkitFullscreenElement && !document.msFullscreenElement){
			if (elem.requestFullscreen){				elem.requestFullscreen();
			}else if (elem.msRequestFullscreen){		elem.msRequestFullscreen();
			}else if (elem.mozRequestFullScreen){		elem.mozRequestFullScreen();
			}else if (elem.webkitRequestFullscreen){	elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			}
		}else{
			if (document.exitFullscreen){				document.exitFullscreen();
			}else if (document.msExitFullscreen){		document.msExitFullscreen();
			}else if (document.mozCancelFullScreen){	document.mozCancelFullScreen();
			}else if (document.webkitExitFullscreen){	document.webkitExitFullscreen();
			}
		}
	}

	//Icon stuff

	UI.showAllIconsInPopUp = function(clickCallback){
		var box = document.createElement('div');
		googleMaterialIcons.forEach(function(g){
			var c = document.createElement('i');
			c.className = "material-icons icon-glyph";
			c.dataset.glyphCode = "&#x" + g + ";";
			c.innerHTML = c.dataset.glyphCode;
			box.appendChild(c);
			c.addEventListener('click', function(){
				if (clickCallback) clickCallback(this.dataset.glyphCode);
			});
		});
		UI.showPopup(box);
	}

	//----- Post Message Interface -----

	var sepiaPostMessageHandlers = {
		"test": 	console.log
	}
	UI.addPostMessageHandler = function(handlerName, handlerFun){
		sepiaPostMessageHandlers[handlerName] = handlerFun;
	}
	window.addEventListener('message', function(message){
		if (message.data && message.data.type){
			if (message.data.type == "sepia-common-interface-event"){
				//console.log(message);
				console.log("SEPIA Client received message for handler: " + message.data.fun);
				var handler = sepiaPostMessageHandlers[message.data.fun];
				if (handler && typeof handler == "function"){
					handler(message.data.ev);
				}else{
					console.error('SEPIA - sendInputEvent of ' + message.source + ': Message handler not available!');
				}
			}
		}
	});
	//Example:  iframe.contentWindow.postMessage({type: "sepia-common-interface-event", fun:"test", ev: "Hello"}, "*");
	//			see Control HUB button for 'login' implementation
	/*
	//postMessage to parent window
	function parentPostMsg(msg){
		//post only if really a child
		if (window !== parent){
			parent.postMessage(msg, "*");
		}
	}
	*/
	if (window !== parent){
		console.log("SEPIA Client loaded inside frame. PostMessage interface available.");
	}
	
	return UI;
}