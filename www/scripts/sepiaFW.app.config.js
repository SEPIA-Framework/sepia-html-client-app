//CONFIG
function sepiaFW_build_config(){
	var Config = {};
	
	Config.clientInfo = "web_app_v1.0.0";	//defined by client properties
	var deviceId = "";						//set in settings and chosen by user to address his devices directly (only numbers and letters, space is replaced by '-', lower-case)
	Config.environment = SepiaFW.tools.getURLParameter("env") || "default";		//'default' supports all features, other options: 'speaker', 'smart_display', 'silent_display', 'car_display'
	//NOTE: switches to "avatar_display" in AO-Mode !
	
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
		if (hostName != undefined){
			Config.host = hostName;
			SepiaFW.data.setPermanent("host-name", Config.host);
			Config.broadcastHostName(Config.host);
			if (!skipReload){
				logoutAndReload();
			}
		}
	}
	//check any URL if its from server
	Config.urlIsSepiaFileHost = function(url){
		//return SepiaFW.tools.isSameOrigin(url, Config.assistAPI); 		//protocol + host + port
		return (url.indexOf(Config.assistAPI) == 0);
	}
	//replace specific path
	Config.replacePathTagWithActualPath = function(path){
		//server paths
		path = path
			.replace("<assist_server>/", Config.assistAPI)
			.replace("<teach_server>/", Config.teachAPI)
			.replace("<chat_server>/", Config.webSocketAPI);
		//local app paths - e.g. <custom_data>, <local_data>, <app_data>
		path = SepiaFW.files.replaceSystemFilePath(path);
		return path;
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
	Config.setEndPoints = function(hostname, customData, isTest){
		//test config
		if (isTest){
			Config.assistAPI = "http://" + "localhost" + ":20721/";
			Config.teachAPI = "http://" + "localhost" + ":20722/";
			Config.webSocketURI = "ws://" + "localhost" + ":20723/messages/";
			Config.webSocketAPI = "http://" + "localhost" + ":20723/";
		//custom server config with proxy or IP (uses SSL when explicitly defined or hostname ends with '/sepia')
		}else{
			//get stored
			var serverAccess = customData || SepiaFW.data.getPermanent("server-access");
			if (serverAccess && Object.keys(serverAccess)){
				if (serverAccess.forHost == hostname){
					Config.assistAPI = serverAccess.assist;
					Config.teachAPI = serverAccess.teach;
					Config.webSocketAPI = serverAccess.chat;
					Config.webSocketURI = serverAccess.chatSocket;
					return;
				}else{
					SepiaFW.data.delPermanent("server-access");
					SepiaFW.debug.log("Config: cleaned-up old 'server-access' data");
				}
			}

			//get protocol
			var http = "https://";
			var ws = "wss://";
			var cleanHost = hostname.trim().replace(/\/$/, '').replace(/:20721/, '');
			if (SepiaFW.tools.startsWith(cleanHost, "http://")){
				cleanHost = cleanHost.replace(/^http:\/\//,'');
				http = "http://";
				ws = "ws://";
			}else if (SepiaFW.tools.startsWith(cleanHost, "https://")){
				cleanHost = cleanHost.replace(/^https:\/\//,'');
			}else if (!SepiaFW.tools.endsWith(cleanHost, "/sepia")){
				//hostnames without protocol will only keep 'https' if they end with "/sepia"
				http = "http://";
				ws = "ws://";
			}
			//set default
			if (SepiaFW.tools.endsWith(cleanHost, "/sepia")){
				//proxy
				Config.assistAPI = http + cleanHost + "/assist/";
				Config.teachAPI = http + cleanHost + "/teach/";
				Config.webSocketAPI = http + cleanHost + "/chat/";
				Config.webSocketURI = ws + cleanHost + "/chat/messages/";
			}else{
				Config.assistAPI = http + cleanHost + ":20721/";
				Config.teachAPI = http + cleanHost + ":20722/";
				Config.webSocketAPI = http + cleanHost + ":20723/";
				Config.webSocketURI = ws + cleanHost + ":20723/messages/";
			}
		}
		SepiaFW.debug.log('Config: assistAPI=' + Config.assistAPI);
	}
	Config.openEndPointsSettings = function(){
		SepiaFW.frames.open({ 
			pageUrl: "server-access.html",
			onFinishSetup: function(){
				SepiaFW.frames.currentScope.onFinishSetup();
			},
			onOpen: function(){
				SepiaFW.frames.currentScope.onOpen();
			},
			onClose: function(){
				if (!SepiaFW.account.getUserId() && !SepiaFW.client.isDemoMode()){
					SepiaFW.account.toggleLoginBox();
				}
			},
			/*onClose: onSettingsClose,*/
			theme: SepiaFW.ui.getSkinStyle()
		});
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
						setTimeout(function(){
							window.location.reload();
						}, 500);
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

	var deviceLocalSiteData = {
		location: "",		//e.g.: "home", "mobile", empty
		type: "",			//e.g.: "room" (location=home), empty
		name: "unassigned",	//e.g.: "office" (type=room), "unassigned"
		index: "",			//e.g.: 1, 2, 212, ...
		updates: "off"		//e.g.: "off", "auto" (not supported yet)
	};
	Config.setDeviceLocalSiteData = function(data, skipStorageWrite){
		if (data.location != undefined) deviceLocalSiteData.location = data.location;
		if (data.type != undefined) deviceLocalSiteData.type = data.type;
		if (data.name != undefined) deviceLocalSiteData.name = data.name;
		if (data.index != undefined) deviceLocalSiteData.index = data.index;
		if (data.updates != undefined) deviceLocalSiteData.updates = data.updates;
		if (!skipStorageWrite){
			SepiaFW.data.setPermanent('deviceLocalSiteData', deviceLocalSiteData);
			//publish to chat server
			if (SepiaFW.client.isActive() && !SepiaFW.client.isDemoMode()){
				SepiaFW.client.sendOrRequestDataUpdate("userOrDeviceInfo", {
					deviceLocalSite: deviceLocalSiteData
				});
			}
		}
	}
	Config.getDeviceLocalSiteData = function(){
		return deviceLocalSiteData;
	}
	//SEE: Config.deviceLocalSiteOptions in frames file - TODO: we should load this data from server

	var deviceGlobalLocation = {
		latitude: "",
		longitude: ""
	}
	Config.setDeviceGlobalLocation = function(data, skipStorageWrite){
		if (data.latitude != undefined) deviceGlobalLocation.latitude = data.latitude;
		if (data.longitude != undefined) deviceGlobalLocation.longitude = data.longitude;
		if (!skipStorageWrite){
			SepiaFW.data.setPermanent('deviceGlobalLocation', deviceGlobalLocation);
			//publish to chat server
			if (SepiaFW.client.isActive() && !SepiaFW.client.isDemoMode()){
				SepiaFW.client.sendOrRequestDataUpdate("userOrDeviceInfo", {
					deviceGlobalLocation: deviceGlobalLocation
				});
			}
		}
	}
	Config.getDeviceGlobalLocation = function(){
		return deviceGlobalLocation;
	}

	//Collection of selectable search engines
	Config.webSearchEngines = {
		"google": {name: "Google"},
		"bing": {name: "Bing"},
		"yahoo": {name: "Yahoo"},
		"duck duck go": {name: "Duck Duck Go"},
		"qwant": {name: "Qwant"},
		"ecosia": {name: "Ecosia"}
	}
	Config.getPreferredSearchEngine = function(){
		return prefSearchEngine;
	}
	Config.setPreferredSearchEngine = function(engine){
		if (engine && Config.webSearchEngines[engine]){
			prefSearchEngine = engine;
			SepiaFW.debug.info("Preferred web search engine set to " + engine);
			SepiaFW.data.set('prefSearchEngine', engine);
		}else{
			SepiaFW.debug.error("Preferred web search engine NOT found in list: " + engine);
		}
	}
	var prefSearchEngine = "google";

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
            SepiaFW.debug.error("Music app-name NOT found in list: " + appTag);
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

	Config.autoSetup = false;		//set by URL parameter 'autoSetup=true'
	Config.isUiHeadless = false;	//set by URL parameter 'isHeadless=true'

	//load headless settings
	Config.loadSettingsForHeadlessMode = function(){
		if (SepiaFW.settings && SepiaFW.settings.headless){
			//device
			if (SepiaFW.settings.headless.device){
				SepiaFW.debug.log("Loading headless settings for device ...");
				Object.keys(SepiaFW.settings.headless.device).forEach(function(key){
					//SepiaFW.debug.log("* " + key);
					console.log("* " + key);
					SepiaFW.data.setPermanent(key, SepiaFW.settings.headless.device[key]);
				});
				//TODO: Note that this will usually come too late for this session and requires client reload to take effect!
			}
			//user
			if (SepiaFW.settings.headless.user){
				SepiaFW.debug.log("Loading headless settings for user ...");
				Object.keys(SepiaFW.settings.headless.user).forEach(function(key){
					//SepiaFW.debug.log("* " + key);
					console.log("* " + key);
					SepiaFW.data.set(key, SepiaFW.settings.headless.user[key]);
				});
			}
		}
	}
	Config.loadHeadlessModeSetup = function(){
		if (SepiaFW.settings && SepiaFW.settings.headless){
			//location
			if (SepiaFW.settings.headless.location &&
					SepiaFW.settings.headless.location.latitude && SepiaFW.settings.headless.location.longitude){
				SepiaFW.client.addOnActiveOneTimeAction(function(){
					//Get address for GPS location
					if (SepiaFW.geocoder.isSupported && !SepiaFW.geocoder.autoGPS){
						SepiaFW.geocoder.getAddress(undefined, undefined, 
							SepiaFW.settings.headless.location.latitude, SepiaFW.settings.headless.location.longitude, 
						true);
					}
				});
			}
			//other
			if (SepiaFW.settings.headless.broadcast){
				SepiaFW.inputControls.cmdl.broadcasters = SepiaFW.settings.headless.broadcast;
			}
		}
	}
	//NOTE: see SepiaFW.account #skipLogin for temporary setup settings (e.g. TTS off)

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
			//pre-defined location?
			var dglData = SepiaFW.data.getPermanent('deviceGlobalLocation'); 
			if (dglData){
				Config.setDeviceGlobalLocation(dglData, true);
				if (dglData.latitude && dglData.longitude){
					SepiaFW.client.addOnActiveOneTimeAction(function(){
						//Get address for GPS location
						if (SepiaFW.geocoder.isSupported && !SepiaFW.geocoder.autoGPS){
							SepiaFW.geocoder.getAddress(undefined, undefined, 
								dglData.latitude, dglData.longitude, 
							true);
						}
					});
				}
			}
		}
		//Proactive notes
		if (SepiaFW.assistant){
			var storedValue = SepiaFW.data.get('proactiveNotes');
			if (typeof storedValue != 'undefined') SepiaFW.assistant.isProActive = storedValue;
			SepiaFW.debug.info("Proactive notes are " + ((SepiaFW.assistant.isProActive)? "ON" : "OFF"));
		}
		//Channel status messages
		SepiaFW.ui.showChannelStatusMessages = SepiaFW.data.get('channelStatusMessages');
			if (typeof SepiaFW.ui.showChannelStatusMessages == 'undefined') SepiaFW.ui.showChannelStatusMessages = false;
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
		//Remote commandline interface
		if (SepiaFW.inputControls && SepiaFW.inputControls.cmdl){
			SepiaFW.inputControls.cmdl.initialize();
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

		//Device local site configuration
		var dlsData = SepiaFW.data.getPermanent('deviceLocalSiteData'); 
		if (dlsData){
			Config.setDeviceLocalSiteData(dlsData, true);
		}

		//Default music app
		var defaultMusicAppStored = SepiaFW.data.get('defaultMusicApp');
		if (defaultMusicAppStored){
			Config.setDefaultMusicApp(defaultMusicAppStored);
		}

		//Preferred search engine
		var prefSearchEngineStored = SepiaFW.data.get('prefSearchEngine');
		if (prefSearchEngineStored){
			Config.setPreferredSearchEngine(prefSearchEngineStored);
		}
	}
	
	return Config;
}
