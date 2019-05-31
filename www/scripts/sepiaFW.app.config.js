//CONFIG
function sepiaFW_build_config(){
	var Config = {};
	
	Config.clientInfo = "web_app_v1.0.0";	//defined by client properties
	var deviceId = "";						//set in settings and chosen by user to address his devices directly (only numbers and letters, space is replaced by '-', lower-case)
	Config.environment = "default";			//default for now - switched to "avatar_display" in AO-Mode
	
	//set client info
	Config.setClientInfo = function(clientInfo){
		Config.clientInfo = clientInfo;
		SepiaFW.debug.log('Config: clientInfo=' + Config.clientInfo);
	}
	//get client-device info (for server communication etc.)
	Config.getClientDeviceInfo = function(){
		if (deviceId){
			return (deviceId.toLowerCase() + "_" + Config.clientInfo);
		}else{
			return (Config.clientInfo);
		}
	}
	//set device ID			
	Config.setDeviceId = function(newDeviceId, skipReload){
		deviceId = newDeviceId.replace(/[\W]+/g, " ").replace(/\s+/g, " ").trim().split(" ").join("-").toLowerCase();
		if (deviceId.length > 8) deviceId = deviceId.substring(0, 8);
		if (newDeviceId != deviceId){
			SepiaFW.ui.showPopup("Please note: Your device ID has been modified due to new format conventions. Your new ID is: " + deviceId
				+ ". If you plan to change your ID please use only lower-case letters, numbers, '-' and keep it short (2-8 characters)!"); 		//TODO: translate
		}
		SepiaFW.data.setPermanent('deviceId', deviceId);
		Config.broadcastDeviceId(deviceId);
		if (!skipReload){
			logoutAndReload();
		}
	}
	//get device ID
	Config.getDeviceId = function(){
		return deviceId;
	}
	//set hostname
	Config.setHostName = function(hostName, skipReload){
		if (hostName){
			Config.host = hostName;
			SepiaFW.data.setPermanent("host-name", Config.host);
			Config.broadcastHostName(Config.host);
			if (!skipReload){
				logoutAndReload();
			}
		}
	}
	
	//language
	var lang = SepiaFW.tools.getURLParameter("lang") || SepiaFW.data.get('app-language') || navigator.language || navigator.userLanguage;
	if (lang && lang.toLowerCase().indexOf('de') === 0){
		lang = 'de';
	}else{
		lang = 'en';
	}
	Config.appLanguage = lang; 
	SepiaFW.debug.log('Config: language=' + Config.appLanguage);
	
	//set API URLs
	Config.host = "localhost:20726/sepia"; 	//location.hostname + ":" + location.port
	Config.assistAPI = "http://" + Config.host + "/assist/";
	Config.teachAPI = "http://" + Config.host + "/teach/";
	Config.webSocketURI = "ws://" + Config.host + "/chat/messages/";
	Config.webSocketAPI = "http://" + Config.host + "/chat/";
		
	//set base URLs to end-points
	Config.setEndPoints = function(apiURLs){
		if (apiURLs.assistAPI){
			Config.assistAPI = apiURLs.assistAPI;
			SepiaFW.debug.log('Config: assistAPI=' + apiURLs.assistAPI);
		}
		if (apiURLs.teachAPI) Config.teachAPI = apiURLs.teachAPI;
		if (apiURLs.webSocketURI) Config.webSocketURI = apiURLs.webSocketURI;
		if (apiURLs.webSocketAPI) Config.webSocketAPI = apiURLs.webSocketAPI;
	}
	
	//set policy and license links
	Config.privacyPolicyUrl = "https://sepia-framework.github.io/privacy-policy.html";
	Config.clientLicenseUrl = "license.html";
	
	//some settings require app-reload
	function logoutAndReload() {
		setTimeout(function(){
			var config = {
				buttonOneName : SepiaFW.local.g('doit'),
				buttonOneAction : function(){ 
					SepiaFW.account.afterLogout = function(){
						location.reload();
					}
					SepiaFW.account.logoutAction();
				},
				buttonTwoName : SepiaFW.local.g('back'),
				buttonTwoAction : function(){}
			};
			SepiaFW.ui.showPopup(SepiaFW.local.g("logoutAndReload"), config);
		}, 500);
	}
	
	//------------ broadcasting functions --------------
	//TODO: they are sometimes called from other modules which makes them 
	//kind of setter functions too, ... we should change that
	
	//add everything here that needs to be refreshed after host change
	Config.broadcastHostName = function(hostName){
		//log
		SepiaFW.debug.log('Config: broadcasted host=' + hostName);
	}
	//add everything here that needs to be refreshed after language change
	Config.broadcastLanguage = function(language){
		//app
		Config.appLanguage = language; 		//TODO: interface reload to set texts?
		//speech
		if (SepiaFW.speech){ 	
			SepiaFW.speech.setLanguage(language);
			SepiaFW.speech.refreshVoice();
		}
		//geocoder
		if (SepiaFW.geocoder) 	SepiaFW.geocoder.setLanguage(language);
		//menue
		$('#sepiaFW-menu-account-language-li').find('select').val(language);
		//log and save
		SepiaFW.data.updateAccount('language', language);
		SepiaFW.data.set('app-language', language);
		SepiaFW.debug.log('Config: broadcasted language=' + language);
	}
	//broadcast-event when userName (really the name not the id) is changed
	Config.broadcastUserName = function(userName){
		//menue
		$('#sepiaFW-menu-account-nickname').val(userName);
		//log and save
		SepiaFW.data.updateAccount('userName', userName);
		SepiaFW.debug.log('Config: broadcasted userName=' + userName);
	}
	//broadcast-event when deviceId changed
	Config.broadcastDeviceId = function(newDeviceId){
		//menue
		$('#sepiaFW-menu-deviceId').val(newDeviceId);
		//log
		SepiaFW.debug.log('Config: broadcasted deviceId=' + newDeviceId);
	}

	//------------ PLATFORM & APP CONNECTORS -------------

	//Collection of universally supported apps and their names
    Config.musicApps = {
		"youtube": {name: "YouTube"},
		"spotify_link": {name: "Spotify"},
		"apple_music_link": {name: "Apple Music"}
    }
	var defaultMusicApp = "youtube";

	Config.getMusicAppCollection = function(){
		if (SepiaFW.ui.isAndroid){
			return SepiaFW.android.musicApps;
		}else{
			return Config.musicApps;
		}
	}
	Config.setDefaultMusicApp = function(appTag){
        if (Config.getMusicAppCollection()[appTag]){
            defaultMusicApp = appTag;
            SepiaFW.data.set('defaultMusicApp', appTag);
			SepiaFW.debug.info("Default music app is set to " + appTag);
        }else{
            SepiaFW.debug.error("Music app-name not found in list: " + appTag);
        }
    }
    Config.getDefaultMusicApp = function(){
        return defaultMusicApp;
	}
	
	//----------------------------------------------

	//link to URL parameter functions - TODO: can we remove this?
	Config.getURLParameter = SepiaFW.tools.getURLParameter;
	Config.setParameterInURL = SepiaFW.tools.setParameterInURL;

	//------------ LOAD SETTINGS -------------

	Config.loadAppSettings = function(){
		//TODO: this should be simplified with a service! ...
		
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
		SepiaFW.ui.showChannelStatusMessages = SepiaFW.data.get('channelStatusMessages');
			if (typeof SepiaFW.ui.showChannelStatusMessages == 'undefined') SepiaFW.ui.showChannelStatusMessages = true;
			SepiaFW.debug.info("Channel status messages are " + ((SepiaFW.ui.showChannelStatusMessages)? "ON" : "OFF"));
		//Allow background connection
		if (SepiaFW.client){
			SepiaFW.client.allowBackgroundConnection = SepiaFW.data.get('allowBackgroundConnection');
			if (typeof SepiaFW.client.allowBackgroundConnection == 'undefined') SepiaFW.client.allowBackgroundConnection = false;
			SepiaFW.debug.info("Background connections are " + ((SepiaFW.client.allowBackgroundConnection)? "ALLOWED" : "NOT ALLOWED"));
		}
		//Allow power status tracking (e.g. power plugIn event)
		if (SepiaFW.alwaysOn){
			SepiaFW.alwaysOn.trackPowerStatus = SepiaFW.data.get('trackPowerStatus');
			if (typeof SepiaFW.alwaysOn.trackPowerStatus == 'undefined') SepiaFW.alwaysOn.trackPowerStatus = false;
			if (SepiaFW.alwaysOn.trackPowerStatus){
				SepiaFW.alwaysOn.setupBatteryStatus();
			}
			SepiaFW.debug.info("Power-status tracking is " + ((SepiaFW.alwaysOn.trackPowerStatus)? "ALLOWED" : "NOT ALLOWED"));
		}
		//Gamepad, Hotkeys and BLE-Beacon support
		if (SepiaFW.inputControls){
			SepiaFW.inputControls.initializeGamepads();
			SepiaFW.inputControls.initializeBluetoothBeacons();
		}
		//Wake-word trigger
		if (SepiaFW.wakeTriggers){
			SepiaFW.wakeTriggers.initialize();
		}
		//Smart microphone toggle
		if (SepiaFW.speech){
			SepiaFW.speech.useSmartMicToggle = SepiaFW.data.get('useSmartMicToggle');
			if (typeof SepiaFW.speech.useSmartMicToggle == 'undefined') SepiaFW.speech.useSmartMicToggle = true;
			SepiaFW.debug.info("Smart microphone toggle is " + ((SepiaFW.speech.useSmartMicToggle)? "ON" : "OFF"));
		}
		//CLEXI.js support
		if (SepiaFW.clexi){
			SepiaFW.clexi.initialize();
		}

		//Default music app
		var defaultMusicAppStored = SepiaFW.data.get('defaultMusicApp');
		if (defaultMusicAppStored){
			Config.setDefaultMusicApp(defaultMusicAppStored);
		}
	}
	
	return Config;
}
