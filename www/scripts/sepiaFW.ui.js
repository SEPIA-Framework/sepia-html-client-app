//UI, UI.ANIMATIONS and UI.BUILD
function sepiaFW_build_ui(){
	var UI = {};
	
	//some constants
	UI.version = "v0.10.0";
	UI.JQ_RES_VIEW_IDS = "#sepiaFW-result-view, #sepiaFW-chat-output, #sepiaFW-my-view";			//a selector to get all result views e.g. $(UI.JQ_RES_VIEW_IDS).find(...)
	UI.JQ_ALL_MAIN_VIEWS = "#sepiaFW-result-view, #sepiaFW-chat-output, #sepiaFW-my-view, #sepiaFW-teachUI-editor, #sepiaFW-teachUI-manager";	// " "
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
				$(UI.JQ_ALL_MAIN_VIEWS).each(function(){
					this.scrollTop -= windowSizeDifference;
				});
				var activeEle = $(document.activeElement);
				if (activeEle.length > 0){
					var scrollBox = activeEle.closest(UI.JQ_ALL_MAIN_VIEWS);
					if (scrollBox && scrollBox.offset() && (scrollBox.offset().top > activeEle.offset().top)){
						scrollBox[0].scrollTop -= (scrollBox.offset().top - activeEle.offset().top); 			//TODO: pull it a bit down like 8px or so
					}
				}
			},100);
		}
	}
	
	UI.primaryColor = '#ceff1a';
	UI.secondaryColor = '#2f3035';
	UI.secondaryColor2 = 'rgba(235, 235, 255, 0.95)';
	UI.accentColor = 'rgba(145, 47, 86, 0.95)';
	UI.accentColor2 = 'rgba(11, 122, 117, 0.95)'; //'rgba(86, 47, 145, 0.95)';
	UI.awaitDialogColor = 'gold';
	UI.loadingColor = 'rgba(180, 180, 180, 1.0)';
	UI.assistantColor = '';
	UI.micBackgroundColor = '#fff';  //reassigned during UI setup
	
	UI.isMenuOpen = false;
	UI.lastInput = "";
	var activeSkin = 0;
	
	//get/refresh skin colors
	UI.refreshSkinColors = function(){
		var pC = document.getElementById('sepiaFW-pC');
		var sC = document.getElementById('sepiaFW-sC');		var sC2 = document.getElementById('sepiaFW-sC2');
		var aC = document.getElementById('sepiaFW-aC');		var aC2 = document.getElementById('sepiaFW-aC2');
		var asC = document.getElementById('sepiaFW-asC');	var adC = document.getElementById('sepiaFW-adC');
		var lC = document.getElementById('sepiaFW-lC');
		UI.primaryColor = 	 pC?  window.getComputedStyle(pC, null).getPropertyValue("background-color") : UI.primaryColor;
		UI.secondaryColor =  sC?  window.getComputedStyle(sC, null).getPropertyValue("background-color") : UI.secondaryColor;
		UI.secondaryColor2 = sC2? window.getComputedStyle(sC2, null).getPropertyValue("background-color"): UI.secondaryColor2;
		UI.accentColor = 	 aC?  window.getComputedStyle(aC, null).getPropertyValue("background-color") : UI.accentColor;
		UI.accentColor2 = 	 aC2? window.getComputedStyle(aC2, null).getPropertyValue("background-color"): UI.accentColor2;
		UI.awaitDialogColor = adC? window.getComputedStyle(adC, null).getPropertyValue("background-color"): 'gold';
		UI.assistantColor =	 asC? window.getComputedStyle(asC, null).getPropertyValue("background-color"): UI.primaryColor;
		UI.loadingColor =	 lC? window.getComputedStyle(lC, null).getPropertyValue("background-color"): 'rgba(180, 180, 180, 1.0)';
		//UI.assistantColor = $('#sepiaFW-chat-output').find('article.chatAssistant').first().css("background-color");
		//refresh theme-color
		$('meta[name="theme-color"]').replaceWith('<meta name="theme-color" content="' + UI.primaryColor + '">');
		//update statusbar
		if ('StatusBar' in window){
			var colorString = UI.primaryColor;
			if ((colorString + '').indexOf('rgb') === 0){
				var rgb = SepiaFW.tools.convertRgbColorStringToRgbArray(colorString);
				colorString = SepiaFW.tools.rgbToHex(rgb[0], rgb[1], rgb[2]);
			}
			//console.log('color: ' + colorString + " - contrast: " + SepiaFW.tools.getBestContrast(colorString));
			if (SepiaFW.tools.getBestContrast(colorString) === 'white'){
				StatusBar.backgroundColorByHexString(colorString);
				StatusBar.styleLightContent();
			}else{
				if (UI.isAndroid){
					StatusBar.backgroundColorByHexString('#000000');
				}else{
					StatusBar.backgroundColorByHexString(colorString);
					StatusBar.styleDefault();
				}
			}
		}
	}
	
	//set skin
	UI.setSkin = function(newIndex){
		var skins = $('.sepiaFW-style-skin');
		if (newIndex == 0){
			activeSkin = 0;
			SepiaFW.data.set('activeSkin', activeSkin);
		}
		skins.each(function(index){
			if (index == (newIndex-1)){	
				$(this).prop('title', 'main');
				$(this).prop('disabled', false);
				SepiaFW.debug.log("UI active skin: " + $(this).attr('href'));
				activeSkin = newIndex;
				SepiaFW.data.set('activeSkin', activeSkin);
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
	
	//setup dynamic label
	var defaultLabel = $('#sepiaFW-nav-label').html();
	UI.setLabel = function(newLabel){
		if (!newLabel && defaultLabel){
			$('#sepiaFW-nav-label').html(defaultLabel);
		}else{
			$('#sepiaFW-nav-label').html(newLabel);
		}
	}
	$('#sepiaFW-nav-label').on('click', function(){
		//TODO: do some button action (maybe depending on scope?)
	});
	
	//make an info message
	UI.showInfo = function(text){
		if (UI.build){
			var message = UI.build.makeMessageObject(text, 'UI', 'client', '');
			var sEntry = UI.build.statusMessage(message);
			UI.insertEle("sepiaFW-chat-output", sEntry);
			UI.scrollToBottom("sepiaFW-chat-output");
			//check if we should show the missed message note bubble
			if (!UI.isVisible() || (UI.moc && UI.moc.getCurrentPane() !== 1)){
				UI.addMissedMessage();
			}
					
		}else{
			alert(text);
		}
	}
	
	//switch active swipe-bars
	UI.switchSwipeBars = function(setName){
		$('.sepiaFW-swipeBar-switchable').hide();
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
		}
	}
	
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
		$('#sepiaFW-chat-output').find("[data-channel-id]").not("[data-channel-id='" + channelId + "']").each(function(){
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
	UI.addMissedMessage = function(missed){
		if (missed){
			missedMessages += missed;
		}else{
			missedMessages++;
		}
		if ($('#sepiaFW-nav-label-note').css('display') === "none"){
			$('#sepiaFW-nav-label-note').fadeIn(300);
		}
		if (missedMessages < 999){
			$('#sepiaFW-nav-label-note').html(missedMessages);
		}else{
			$('#sepiaFW-nav-label-note').html("...");
		}
	}
	UI.showAndClearMissedMessages = function(){
		UI.moc.showPane(1);
		UI.clearMissedMessages();
	}
	UI.clearMissedMessages = function(){
		if ($('#sepiaFW-nav-label-note').css('display') !== "none"){
			$('#sepiaFW-nav-label-note').fadeOut(300);
		}
		missedMessages = 0;
	}
	
	//-------- SETUP --------
	
	//setup UI components and client variables
	UI.setup = function(){
		//is touch device?
		if ("ontouchstart" in document.documentElement){
			UI.isTouchDevice = true;
			document.documentElement.className += " sepiaFW-touch-device";
		}else{
			UI.isTouchDevice = false;
			document.documentElement.className += " sepiaFW-notouch-device";
		}
		
		//is Android or Chrome?
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
		
		//is standalone app?
		UI.isStandaloneWebApp = isStandaloneWebApp();
		function isStandaloneWebApp(){
			if (UI.isCordova){
				isStandalone = true;
			}else{
				var urlParam = SepiaFW.tools.getURLParameter("isApp");
				if (urlParam && urlParam == "true"){
					urlParam = true;
				}
				var google = window.matchMedia('(display-mode: standalone)').matches;
				var apple = window.navigator.standalone;
				var isStandalone = (urlParam || google || apple);
			}
			if (isStandalone){
				document.documentElement.className += " sepiaFW-standalone-app";
			}
			return isStandalone;
		}
		
		//client
		SepiaFW.config.setClientInfo(((UI.isIOS)? 'iOS_' : '') 
							+ ((UI.isAndroid)? 'android_' : '') 
							+ ((UI.isChromeDesktop)? 'chrome_' : '')
							+ ((UI.isEdge)? 'edge_' : '')
							+ ((UI.isSafari)? 'safari_' : '')
							+ ((UI.isStandaloneWebApp)? "app_" : "browser_") + UI.version);
							
		//load skin
		var lastSkin = SepiaFW.data.get('activeSkin');
		if (lastSkin){
			UI.setSkin(lastSkin);
			//var selBox = document.getElementById("sepiaFW-menu-select-skin");
			//if (selBox) selBox.selectedIndex = activeSkin;		//<- not working, box not there yet?
		}else{
			//get skin colors
			UI.refreshSkinColors();
		}
		
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
		
		//LOAD other SETTINGS before building the UI:
		//TODO: this shoule be simplified with a service!
		
		//Device ID
		if (SepiaFW.client){
			var storedValue = SepiaFW.data.get('deviceId');
			if (typeof storedValue != 'undefined') SepiaFW.client.setDeviceId(storedValue);
		}
		//TTS
		if (SepiaFW.speech){
			var storedValue = SepiaFW.data.get('skipTTS');
			if (typeof storedValue != 'undefined') SepiaFW.speech.skipTTS = storedValue;
			SepiaFW.debug.info("TTS is " + ((SepiaFW.speech.skipTTS)? "OFF" : "ON"));
		}
		//GPS
		if (SepiaFW.geocoder){
			var storedValue = SepiaFW.data.get('autoGPS');
			if (typeof storedValue != 'undefined') SepiaFW.geocoder.autoGPS = storedValue;
			SepiaFW.debug.info("GPS is in " + ((SepiaFW.geocoder.autoGPS)? "AUTO" : "MANUAL") + " mode.");
		}
		//Proactive notes
		if (SepiaFW.assistant){
			var storedValue = SepiaFW.data.get('proactiveNotes');
			if (typeof storedValue != 'undefined') SepiaFW.assistant.isProActive = storedValue;
			SepiaFW.debug.info("Proactive notes are " + ((SepiaFW.assistant.isProActive)? "ON" : "OFF"));
		}
		//Channel status messages
		UI.showChannelStatusMessages = SepiaFW.data.get('channelStatusMessages');
			if (typeof UI.showChannelStatusMessages == 'undefined') UI.showChannelStatusMessages = true;
			SepiaFW.debug.info("Channel status messages are " + ((UI.showChannelStatusMessages)? "ON" : "OFF"));
		//Allow background connection
		if (SepiaFW.client){
			SepiaFW.client.allowBackgroundConnection = SepiaFW.data.get('allowBackgroundConnection');
			if (typeof SepiaFW.client.allowBackgroundConnection == 'undefined') SepiaFW.client.allowBackgroundConnection = true;
			SepiaFW.debug.info("Background connections are " + ((SepiaFW.client.allowBackgroundConnection)? "ALLOWED" : "NOT ALLOWED"));
		}
		
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
				if (currentPane == 1){
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
		
		//listen to mouse stuff
		//UI.trackMouse();
		//UI.trackTouch();
		
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
			if (navigator.app && navigator.app.exitApp){
				navigator.app.exitApp();
			}
		}else{
			setTimeout(function(){
				backButtonPressed = 0;
			}, 750);
		}
	}
	
	//Update myView
	var myViewUpdateInterval = 30*60*1000; 		//<- automatic updates will not be done more than once within this interval
	var lastMyViewUpdate = 0;
	var myViewUpdateTimer;
	UI.updateMyView = function(forceUpdate, checkGeolocationFirst){
		//is client active?
		if (!SepiaFW.client.isActive() || !SepiaFW.assistant.id){
			clearTimeout(myViewUpdateTimer);
			myViewUpdateTimer = setTimeout(function(){
				//try again
				UI.updateMyView(true);
			}, 10000);
			SepiaFW.debug.err("Events: tried to get events before channel-join completed!");
			return;
		}
		//console.log('passed');
		
		//with GPS first
		if (checkGeolocationFirst){
			//location update?
			if (SepiaFW.geocoder && SepiaFW.geocoder.autoGPS){
				if ((new Date().getTime() - SepiaFW.geocoder.lastBestLocationUpdate) > SepiaFW.geocoder.autoRefreshInterval){
					SepiaFW.geocoder.getBestLocation();
				}else{
					UI.updateMyView(false, false);
				}
			}else{
				UI.updateMyView(false, false);
			}
		
		//without GPS
		}else{
			var now = new Date().getTime();
			if (forceUpdate || ((now - lastMyViewUpdate) > myViewUpdateInterval)){
				//now we can cancel all timers
				clearTimeout(myViewUpdateTimer);
				lastMyViewUpdate = now;
				
				//contextual events update
				SepiaFW.events.loadContextualEvents();
				
				//check for near timeEvents (within 18h (before) and 120h (past))
				var maxTargetTime = now + 18*60*60*1000;
				var includePastMs = 120*60*60*1000;
				var nextTimers = SepiaFW.events.getNextTimeEvents(maxTargetTime, '', includePastMs);
				$.each(nextTimers, function(index, Timer){
					//check if alarm is present in myView 	
					var timerPresentInMyView = $('#sepiaFW-my-view').find('[data-id="' + Timer.data.eventId + '"]');
					if (timerPresentInMyView.length == 0){
						//recreate timer and add to myView
						var action = Timer.data;
						action.info = "set";
						action.type = Timer.data.eleType; 	//TODO: this is just identical by chance!!!
						SepiaFW.ui.actions.timerAndAlarm(action, document.getElementById('sepiaFW-my-view'));
					}
				});
			}
		}
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
		if (SepiaFW.client.isActive()){
			if (!isFirstVisibilityChange && (UI.isVisible() || forceTriggerVisible)){
				//update myView (is automatically skipped if called too early)
				UI.updateMyView(false, true);
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
			UI.updateMyView();
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
	
	//Idle-time
	var lastDomEventTS = new Date().getTime();
	//listener
	UI.trackIdleTime = function(){
		//DOM Events
		document.addEventListener("keypress", resetTimer);
		document.addEventListener("mousemove", resetTimer);
		document.addEventListener("mousedown", resetTimer);		// touchscreen presses
		document.addEventListener("click", resetTimer);			// touchpad clicks
		document.addEventListener("touchstart", resetTimer);
		/*
		document.onload = resetTimer;
		document.onscroll = resetTimer;    // scrolling with arrow keys
		*/
		function resetTimer() {
			lastDomEventTS = new Date().getTime();
		}
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
	
	//Show message popup
	UI.showPopup = function(content, config){
		var buttonOneName, buttonOneAction, buttonTwoName, buttonTwoAction, buttonThreeName, buttonThreeAction, buttonFourName, buttonFourAction;
		var primaryColor, secondaryColor;
		if (config){
			buttonOneName = config.buttonOneName;
			buttonOneAction = config.buttonOneAction;
			buttonTwoName = config.buttonTwoName;
			buttonTwoAction = config.buttonTwoAction;
			buttonThreeName = config.buttonThreeName;
			buttonThreeAction = config.buttonThreeAction;
			buttonFourName = config.buttonFourName;
			buttonFourAction = config.buttonFourAction;
			primaryColor = config.primaryColor;
			secondaryColor = config.secondaryColor;
		}
		if (buttonOneName && buttonOneAction){
			var btn1 = $('#sepiaFW-popup-message-btn-one');
			btn1.html(buttonOneName);	
			btn1.off();		
			btn1.on('click', function(){	buttonOneAction(this); 	UI.hidePopup();		});
		}else{
			var btn1 = $('#sepiaFW-popup-message-btn-one');
			btn1.html('OK');			
			btn1.off();
			btn1.on('click', function(){	UI.hidePopup();		});
		}
		if (buttonTwoName && buttonTwoAction){
			var btn2 = $('#sepiaFW-popup-message-btn-two');
			btn2.html(buttonTwoName).show();	
			btn2.off();		
			btn2.on('click', function(){	buttonTwoAction(this); 	UI.hidePopup();		});
		}else{
			$('#sepiaFW-popup-message-btn-two').off().hide();
		}
		if (buttonThreeName && buttonThreeAction){
			var btn3 = $('#sepiaFW-popup-message-btn-three');
			btn3.html(buttonThreeName).show();	
			btn3.off();		
			btn3.on('click', function(){	buttonThreeAction(this); 	UI.hidePopup();		});
		}else{
			$('#sepiaFW-popup-message-btn-three').off().hide();
		}
		if (buttonFourName && buttonFourAction){
			var btn4 = $('#sepiaFW-popup-message-btn-four');
			btn4.html(buttonFourName).show();	
			btn4.off();		
			btn4.on('click', function(){	buttonFourAction(this); 	UI.hidePopup();		});
		}else{
			$('#sepiaFW-popup-message-btn-four').off().hide();
		}
		$('#sepiaFW-popup-message-content').html(content);
		$('#sepiaFW-cover-layer').fadeIn(150);
		$('#sepiaFW-popup-message').fadeIn(300);
	}
	UI.hidePopup = function(){
		$('#sepiaFW-popup-message').fadeOut(300);
		$('#sepiaFW-cover-layer').fadeOut(300);
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
	//Long-press / Short-press combo
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
	//Simple tap with reduced delay for e.g. iOS' UIWebView (not needed anymore on WKWebview)
	UI.useFastTouch = false;
	UI.onclick = function(ele, callback){
		if (UI.useFastTouch){
			UI.longPressShortPressDoubleTap(ele, '', '', callback);
			//this prevents the ghost-click but leads to a more complicated trigger event, use: $(ele).trigger('click', {bm_force : true})
			$(ele).on('click', function(ev, data){
				if (data && data.bm_force){
					callback(ev);
				}else{
					ev.preventDefault();
				}
			});
			//PreventGhostClick(ele);
		}else{
			$(ele).on('click', function(ev){
				callback(ev);
			});
		}
	}
	//Long-press / Short-press / Double-Tab combo
	UI.longPressShortPressDoubleTap = function(ele, callbackLong, callbackLongRelease, callbackShort, callbackDouble, useLongPressIndicator, preventTapOnDoubleTap){
		//Hammertime!
		var pressTimer;
		var delay = 625;
		var mc = new Hammer.Manager(ele);
		mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
		mc.add(new Hammer.Tap());
		mc.add(new Hammer.Press({ event: 'firstpress', time : 300}));
		mc.add(new Hammer.Press({ time : delay}));
		
		if (preventTapOnDoubleTap){
			mc.get('tap').requireFailure('doubletap');		//use this to prevent a 'tap' together with 'doubletap' ... but to introduce a delay on tap
		}

		//if (callbackShort) mc.on("tap", callbackShort);
		if (callbackShort) mc.on("tap", function(ev){
			if (useLongPressIndicator) UI.hidelongPressIndicator(); 
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
	}
	UI.longPressShortPressDoubleTab = UI.longPressShortPressDoubleTap;
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

	//make auto-resize swipe bar
	UI.makeAutoResizeSwipeArea = function(selector, onClickCallback){
		var $swipeArea = $(selector);
		var didDown = false;	var didUp = false;
		var xDown = 0;			var xUp = 0;
		var yDown = 0;			var yUp = 0;
		$swipeArea.mouseup(function(event){			up(this, event);
			}).mousedown(function(event){			down(this, event);
			//}).on('touchstart', function(event){	console.log('touchstart'); down(this, event);
			//}).on('touchend', function(event){	console.log('touchend'); up(this, event);
			});
		function down(that, ev){
			if (!didDown){
				didDown = true;
				didUp = false;
				xDown = (ev.center)? ev.center.x : ev.clientX;
				yDown = (ev.center)? ev.center.y : ev.clientY;
				$(that).addClass('sepiaFW-fullSize');
				//console.log(ev);
			}
		}
		function up(that, ev){
			if (!didUp){
				didUp = true;
				xUp = (ev.center)? ev.center.x : ev.clientX;
				yUp = (ev.center)? ev.center.y : ev.clientY;
				$(that).removeClass('sepiaFW-fullSize');
				var moved = (xDown-xUp)*(xDown-xUp) + (yDown-yUp)*(yDown-yUp);
				//console.log(moved);
				if (moved < 100){
					click(ev);
				}
				resetTimer = setTimeout(function(){
					didDown = false;
				}, 500);
			}
		}
		function click(ev){
			if (onClickCallback){
				onClickCallback(ev);
			}
			var x = (ev.center)? ev.center.x : ev.clientX;
			var y = (ev.center)? ev.center.y : ev.clientY;
			var that = $swipeArea[0];
			var thatDisplay = that.style.display;
			that.style.display = 'none';
			var elementMouseIsOver = document.elementFromPoint(x, y);
			//console.log(elementMouseIsOver.id);
			$(elementMouseIsOver).trigger('click', { bm_force : true });
			setTimeout(function(){
				that.style.display = thatDisplay;
			}, 500);
		}
		return $swipeArea[0];
	}
	
	//Scroll to bottom
	UI.scrollToBottom = function(targetId, delay){
		setTimeout(function(){
			var scrollable = $('#' + targetId);
			scrollable.animate({ scrollTop: scrollable[0].scrollHeight}, 250);
		}, (delay? delay : 330));
	}
	//Scroll to top
	UI.scrollToTop = function(targetId, delay){
		setTimeout(function(){
			var scrollable = $('#' + targetId);
			scrollable.animate({ scrollTop: 0}, 250);
		}, (delay? delay : 330));
	}
	//Scroll to id inside scrollable element 8given by id), if scrollable is empty uses 'sepiaFW-chat-output'
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
	UI.addDataToResultView = function(resultView, entryData, beSilent, autoSwitchView, switchDelay){
		var target = resultView.target;
		var paneNbr = resultView.paneNumber;
		
		if (paneNbr == 1){
			UI.insertEle(target, entryData);
			UI.scrollToBottom(target);
			//check if we should show the missed message note bubble
			if (!beSilent && (!UI.isVisible() || (UI.moc && UI.moc.getCurrentPane() !== 1))){
				UI.addMissedMessage();
			}
		}else if (paneNbr == 0){
			$('#' + target).prepend(entryData);
			UI.scrollToTop(target);
		}else{
			$('#' + target).html('');
			$('#' + target).prepend(entryData);
			UI.scrollToTop(target);
		}
		
		if (autoSwitchView && UI.moc && (UI.moc.getCurrentPane() != paneNbr)){
			setTimeout(function(){
				UI.moc.showPane(paneNbr);
			}, switchDelay);
		}
	}
	
	return UI;
}

//ANIMATIONS
function sepiaFW_build_animate(){
	var Animate = {};
	Animate.assistant = {};
	Animate.audio = {};
	
	//general animations
	
	Animate.flash = function(id, duration){
		if (!duration) duration = 350;
		$("#" + id).fadeTo(duration, 0.1).fadeTo(duration, 1.0);
	}
	Animate.flashObj = function(obj, duration){
		if (!duration) duration = 350;
		$(obj).fadeTo(duration, 0.1).fadeTo(duration, 1.0);
	}
	
	//assistant animations
	
	Animate.assistant.idle = function(event){
		SepiaFW.debug.info('Animate.idle, source: ' + ((event)? event : "unknown")); 		//DEBUG
		if (SepiaFW.assistant && SepiaFW.assistant.isWaitingForDialog){
			Animate.assistant.awaitDialog();
		}else if (SepiaFW.ui.actions && SepiaFW.client.getCommandQueueSize() > 0){
			Animate.assistant.loading();
			var action = SepiaFW.client.getAndRemoveNextCommandInQueue();
			SepiaFW.ui.actions.openCMD(action);
		}else{
			SepiaFW.ui.assistBtn.innerHTML = (SepiaFW.speech.isAsrSupported)? SepiaFW.ui.assistIconIdle : SepiaFW.ui.assistIconIdleNoAsr;
			SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.micBackgroundColor;
			$("#sepiaFW-assist-btn-orbiters").addClass("sepiaFW-animation-pause");
			if (SepiaFW.audio){
				SepiaFW.audio.fadeInMainIfOnHold();
			}
		}
		//hide extra input box
		SepiaFW.ui.hideLiveSpeechInputBox();
	}
	Animate.assistant.loading = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconLoad;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.loadingColor;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
	}
	Animate.assistant.speaking = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconSpeak;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.accentColor2;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
	}
	Animate.assistant.listening = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconRec;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.accentColor;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//extra input box
		SepiaFW.ui.showLiveSpeechInputBox();
	}
	Animate.assistant.awaitDialog = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconAwaitAnswer;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.awaitDialogColor;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
	}
	
	//audio player animations
	
	Animate.audio.playerActive = function(){
		$("#sepiaFW-audio-ctrls-title").addClass("playerActive");
	}
	Animate.audio.playerIdle = function(){
		$("#sepiaFW-audio-ctrls-title").removeClass("playerActive");
	}
	
	return Animate;
}

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
			SepiaFW.ui.longPressShortPressDoubleTab(chatSendBtn, function(){
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
			SepiaFW.ui.longPressShortPressDoubleTab(speechSendBtn, function(){
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
			SepiaFW.ui.longPressShortPressDoubleTab(assistBtn, function(){
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
				SepiaFW.ui.longPressShortPressDoubleTab(gpsBtn, function(){
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
					+ "<li class='button' id='sepiaFW-menu-btn-logout'><span>" + SepiaFW.local.g('sign_out') + "</span><i class='material-icons md-mnu'>&#xE038;</i></li>"
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
					+ "<li id='sepiaFW-menu-assistant-host-li' title='Assistant host name'><span>Host name: </span><input id='sepiaFW-menu-assistant-host' type='text'></li>"
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
					+ "<li id='sepiaFW-menu-account-signoutall-li'><button id='sepiaFW-menu-ui-signoutall-btn'>" + SepiaFW.local.g('sign_out_all') + "</button></li>"
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
			//Sign out button
			var logoutBtn = document.getElementById("sepiaFW-menu-btn-logout");
			logoutBtn.addEventListener("click", function(){
				SepiaFW.account.logoutAction();
			});
			//Host name
			var hostNameInput = document.getElementById("sepiaFW-menu-assistant-host");
			hostNameInput.value = SepiaFW.config.host;
			hostNameInput.addEventListener("change", function(){
				var newHost = this.value;
				this.blur();
				SepiaFW.config.broadcastHostName(newHost);
			});
			//Device ID
			var deviceIdInput = document.getElementById("sepiaFW-menu-deviceId");
			deviceIdInput.value = SepiaFW.client.getDeviceId();
			deviceIdInput.addEventListener("change", function(){
				var newDeviceId = this.value;
				SepiaFW.client.setDeviceId(newDeviceId);
				this.blur();
			});
			//add voice toggle and select
			if (SepiaFW.speech){
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
				document.getElementById('sepiaFW-menu-select-voice-li').appendChild(SepiaFW.speech.getVoices());
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
					if (SepiaFW.ui.isCordova && window.CacheClear){
						SepiaFW.data.clearAll();		//clear all data except permanent (e.g. host-name)
						window.CacheClear(function(status){
							SepiaFW.ui.showPopup(status, config);
						}, function(status) {
							SepiaFW.ui.showPopup(status, config);
						});
					}else if (window.localStorage){
						SepiaFW.data.clearAll();		//clear all data except permanent (e.g. host-name)
						SepiaFW.ui.showPopup('App data has been cleared.', config); 		//TODO: translate
					}
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
	
	return Build;
}