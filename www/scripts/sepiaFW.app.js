var SepiaFW = new Object();

//Core modules
SepiaFW.debug = sepiaFW_build_debug();
SepiaFW.data = sepiaFW_build_dataService();
SepiaFW.tools = sepiaFW_build_tools();
SepiaFW.config = sepiaFW_build_config();

//"Interface" modules
SepiaFW.buildSepiaFwPlugins = function(){
	SepiaFW.account = sepiaFW_build_account();
	SepiaFW.assistant = sepiaFW_build_assistant();
	SepiaFW.ui = sepiaFW_build_ui();
	SepiaFW.animate = sepiaFW_build_animate();
	SepiaFW.ui.Carousel = sepiaFW_build_ui_carousel();
	SepiaFW.ui.notification = sepiaFW_build_ui_notifications();
	SepiaFW.ui.build = sepiaFW_build_ui_build();
	SepiaFW.ui.cards = sepiaFW_build_ui_cards();
	SepiaFW.ui.actions = sepiaFW_build_ui_actions();
	SepiaFW.events = sepiaFW_build_events();
	SepiaFW.geocoder = sepiaFW_build_geocoder();
	SepiaFW.audio = sepiaFW_build_audio();
	SepiaFW.speechWebSocket = sepiaFW_build_speechWebSocket();
	SepiaFW.speech = sepiaFW_build_speech();
	SepiaFW.webSocket = new Object();
	SepiaFW.webSocket.common = sepiaFW_build_webSocket_common();
	SepiaFW.webSocket.client = sepiaFW_build_webSocket_client();
	SepiaFW.client = sepiaFW_build_client_interface();
	SepiaFW.frames = sepiaFW_build_frames();
	SepiaFW.teach = sepiaFW_build_teach();
	SepiaFW.offline = sepiaFW_build_offline();
}

//DATA STORAGE
function sepiaFW_build_dataService(){
	var DataService = {};
	
	var data = load();					//deleted after log-out
	var dataPermanent = load(true);		//remains after log-out, e.g. host-name

	function save(permanent){
		try{
			if (permanent){
				localStorage.setItem('sepiaFW-data-permanent', JSON.stringify(dataPermanent));
			}else{
				localStorage.setItem('sepiaFW-data', JSON.stringify(data));
			}
		}catch (e){
			SepiaFW.debug.err('Data: localStorage write error! Not available?');
		}
	}
	function load(permanent){
		try{
			if (permanent){
				dataPermanent = JSON.parse(localStorage.getItem('sepiaFW-data-permanent')) || {};
			}else{
				data = JSON.parse(localStorage.getItem('sepiaFW-data')) || {};
			}
		}catch (e){
			if (permanent){
				dataPermanent = {};
			}else{
				data = {};
			}
		}
		return data;
	}
	DataService.get = function(key){
		load();
		return (data && (key in data)) ? data[key] : undefined;
	}
	DataService.set = function(key, value){
		data[key] = value;
		save();
	}
	DataService.getPermanent = function(key){
		load(true);
		return (dataPermanent && (key in dataPermanent)) ? dataPermanent[key] : undefined;
	}
	DataService.setPermanent = function(key, value){
		dataPermanent[key] = value;
		save(true);
	}
	DataService.updateAccount = function(key, value){
		var account = DataService.get('account');
		if (!account){
			account = {};
		}
		account[key] = value;
		account.lastRefresh = new Date().getTime();
		DataService.set('account', account);
	}
	DataService.del = function(key){
		load();
		delete data[key];
		save();
	}
	DataService.clearAll = function(){
		window.localStorage.clear();
		data = {};
		//restore permanent data
		save(true);
	}
	
	return DataService;
}

//CONFIG
function sepiaFW_build_config(){
	var Config = {};
	
	Config.clientInfo = "web_app_v1.0.0";
	Config.environment = "default";
	
	//set client info
	Config.setClientInfo = function(clientInfo){
		Config.clientInfo = clientInfo;
	}
	SepiaFW.debug.log('Config: clientInfo=' + Config.clientInfo);
	
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
	
	//add everything here that needs to be refreshed after host change
	Config.broadcastHostName = function(hostName){
		if (hostName){
			SepiaFW.data.setPermanent("host-name", hostName);
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
				SepiaFW.ui.showPopup("New host requires log-out and app reload.", config);
			}, 500);
			SepiaFW.debug.log('Config: broadcasted new host=' + hostName);
		}
	}
	//add everything here that needs to be refreshed after language change
	Config.broadcastLanguage = function(language){
		//app
		Config.appLanguage = language; 		//TODO: interface reload to set texts?
		//speech
		if (SepiaFW.speech) 	SepiaFW.speech.language = language;
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
		//log and save
		SepiaFW.data.set('deviceId', newDeviceId);
		SepiaFW.debug.log('Config: broadcasted deviceId=' + newDeviceId);
	}

	//link to URL parameter functions - TODO: can we remove this?
	Config.getURLParameter = SepiaFW.tools.getURLParameter;
	Config.setParameterInURL = SepiaFW.tools.setParameterInURL;
	
	return Config;
}

//TOOLS
function sepiaFW_build_tools(){
	var Tools = {};
	
	//prepend a zero to a number if it is lower than 10
	function addZero(i) {
		return (i < 10)? "0" + i : i;
	}
	Tools.addZero = addZero;
	
	//get server default local date/timeout - TODO: note that this needs to be adjusted to server settings
	Tools.getLocalDateTime = function(){
		var d = new Date();
		var HH = addZero(d.getHours());
		var mm = addZero(d.getMinutes());
		var ss = addZero(d.getSeconds());
		var dd = addZero(d.getDate());
		var MM = addZero(d.getMonth() + 1);
		var yyyy = d.getFullYear();
		return '' + yyyy + '.' + MM + '.' + dd + '_' + HH + ':' + mm + ':' + ss;
	}
	//get server default time (only) - TODO: note that this needs to be adjusted to server settings
	Tools.getLocalTime = function(){
		var d = new Date();
		var HH = addZero(d.getHours());
		var mm = addZero(d.getMinutes());
		var ss = addZero(d.getSeconds());
		return '' + HH + ':' + mm + ':' + ss;
	}
	
	//get URL parameters
	Tools.getURLParameter = function(name){
		return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
	}
	//set or add a parameter of a given URL with encoding and return modified url
	Tools.setParameterInURL = function(url, parameter, value){
		if ((url.indexOf('?' + parameter + '=') > -1) || (url.indexOf('&' + parameter + '=') > -1)){
			url = url.replace(new RegExp("(\\?|&)(" + parameter + "=.*?)(&|$)"), "$1" + parameter + "=" + encodeURIComponent(value) + "$3");
		}else{
			if (url.indexOf('?') > -1){
				url += '&' + parameter + "=" + encodeURIComponent(value);
			}else{
				url += '?' + parameter + "=" + encodeURIComponent(value);
			}
		}
		return url;
	}
	
	//check for IP
	Tools.isIP = function(ip) {
		if (!ip){
			return false;
		}
		//IPv4
		if (ip.indexOf(".") > 0){
			var arrIp = ip.split(".");
			if (arrIp.length == 4) return true;		//we keep it simple here and assume that there are no exotic adresses used
		//IPv6
		}else if (ip.indexOf(":") > 0){
			var arrIp = ip.split(":");
			if (arrIp.length > 3) return true;		//we keep it simple here and assume that there are no exotic adresses used
		}
		return false;
	}
	
	//check if string ends with certain suffix
	Tools.endsWith = function(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}
	
	//randomize array element
	Tools.shuffleArray = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	}
	//round to 5 positions after colum
	Tools.round5 = function(x) {
		var num = parseFloat(x + ' ');
		var rres = Math.round(num * 100000) / 100000 ;
		return rres;
	}
	//round to 3 positions after colum
	Tools.round3 = function(x) {
		var num = parseFloat(x + ' ');
		var rres = Math.round(num * 1000) / 1000 ;
		return rres;
	}
	//round to 2 positions after colum
	Tools.round2 = function(x) {
		var num = parseFloat(x + ' ');
		var rres = Math.round(num * 100) / 100 ;
		return rres;
	}
	//round to 1 positions after colum
	Tools.round1 = function (x){
		var num = parseFloat(x + ' ');
		var rres = Math.round(num * 10) / 10 ;
		return rres;
	}
	//random number between 1-9
	function rnd9(){
		return Math.floor((Math.random() * 9) + 1);
	}
	Tools.rnd9 = rnd9;
	
	//get best color contrast - returns values 'black' or 'white' - accepts #333333, 333333 and rgb(33,33,33) (rgba is trated as rgb)
	Tools.getBestContrast = function(hexcolor){
		if (hexcolor === '#000') return 'white';
		if (hexcolor === '#fff') return 'black';
		if ((hexcolor + '').indexOf('rgb') === 0){
			var rgb = Tools.convertRgbColorStringToRgbArray(hexcolor);
			hexcolor = Tools.rgbToHex(rgb[0], rgb[1], rgb[2]);
		}
		if ((hexcolor + '').indexOf('#') === 0) hexcolor = hexcolor.replace(/^#/,'');
		//console.log(hexcolor);
		var r = parseInt(hexcolor.substr(0,2), 16);
		var g = parseInt(hexcolor.substr(2,2), 16);
		var b = parseInt(hexcolor.substr(4,2), 16);
		var yiq = ((r*299)+(g*587)+(b*114))/1000;
		return (yiq >= 128) ? 'black' : 'white';
	}
	//get RGB from RGB-stringify
	Tools.convertRgbColorStringToRgbArray = function(rgbColorString){
		rgbColorString = rgbColorString.replace(/rgb(a|)\(/,'').replace(/\)/,'');
		var rgb = rgbColorString.split(',');
		var r = parseInt(rgb[0]);
		var g = parseInt(rgb[1]);
		var b = parseInt(rgb[2]);
		return [r, g, b];
	}
	//convert RGB color value to HEX
	Tools.rgbToHex = function(r, g, b){
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}
	
	return Tools;
}

//DEBUG
function sepiaFW_build_debug(){
	var Debug = {};
	
	Debug.doLog = true;
	Debug.doError = true;
	Debug.doInfo = false;
	
	Debug.log = function(msg){
		if (Debug.doLog){
			console.log('SepiaFW - ' + Debug.getLocalDateTime() + ' - LOG - ' + msg);
		}
	}
	Debug.err = function(msg){
		if (Debug.doError){
			console.error('SepiaFW - ' + Debug.getLocalDateTime() + ' - ERROR - ' + msg);
		}
	}
	Debug.info = function(msg){
		if (Debug.doInfo){
			console.log('SepiaFW - ' + Debug.getLocalDateTime() + ' - INFO - ' + msg);
		}
	}
	Debug.object = function(obj, logType){
		var output, property;
		if (obj !== null && typeof obj === 'object'){
			for (property in obj) {
				output += property + ': ' + obj[property] + '; ';
			}
		}else{
			output = obj;
		}
		if (logType === 'log'){
			Debug.log(output);
		}else if (logType === 'info'){
			Debug.info(output);
		}else if (logType === 'err'){
			Debug.err(output);
		}else{
			Debug.log(output);
		}
	}
	
	//get default local date/timeout for debugger
	Debug.getLocalDateTime = function(){
		var d = new Date();
		var HH = addZero(d.getHours());
		var mm = addZero(d.getMinutes());
		var ss = addZero(d.getSeconds());
		var dd = addZero(d.getDate());
		var MM = addZero(d.getMonth() + 1);
		var yyyy = d.getFullYear();
		return '' + yyyy + '.' + MM + '.' + dd + '_' + HH + ':' + mm + ':' + ss;
	}
	function addZero(i) {
		return (i < 10)? "0" + i : i;
	}
	
	return Debug;
}