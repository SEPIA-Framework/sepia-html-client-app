var SepiaFW = new Object();

//Core modules - NOTE: this happens before cordova's deviceReady !!
SepiaFW.debug = sepiaFW_build_debug();
SepiaFW.data = sepiaFW_build_dataService();
SepiaFW.tools = sepiaFW_build_tools();
SepiaFW.config = sepiaFW_build_config();

//"Interface" modules - NOTE: this happens after cordova's deviceReady
SepiaFW.buildSepiaFwPlugins = function(){
	SepiaFW.account = sepiaFW_build_account();
	SepiaFW.assistant = sepiaFW_build_assistant();
	SepiaFW.ui = sepiaFW_build_ui();
	SepiaFW.animate = sepiaFW_build_animate();
	SepiaFW.ui.Carousel = sepiaFW_build_ui_carousel();
	SepiaFW.ui.dragDrop = sepiaFW_build_ui_drag_and_drop();
	SepiaFW.ui.notification = sepiaFW_build_ui_notifications();
	SepiaFW.ui.build = sepiaFW_build_ui_build();
	SepiaFW.ui.cards = sepiaFW_build_ui_cards();
	SepiaFW.ui.actions = sepiaFW_build_ui_actions();
	SepiaFW.ui.customButtons = sepiaFW_build_ui_custom_buttons();
	SepiaFW.events = sepiaFW_build_events();
	SepiaFW.geocoder = sepiaFW_build_geocoder();
	SepiaFW.audio = sepiaFW_build_audio();
	SepiaFW.audioRecorder = sepiaFW_build_audio_recorder();
	SepiaFW.speechWebSocket = sepiaFW_build_speechWebSocket();
	SepiaFW.speech = sepiaFW_build_speech();
	SepiaFW.webSocket = new Object();
	SepiaFW.webSocket.common = sepiaFW_build_webSocket_common();
	SepiaFW.webSocket.client = sepiaFW_build_webSocket_client();
	SepiaFW.client = sepiaFW_build_client_interface();
	SepiaFW.client.controls = sepiaFW_build_client_controls();
	SepiaFW.files = sepiaFW_build_files();
	SepiaFW.frames = sepiaFW_build_frames();
	SepiaFW.teach = sepiaFW_build_teach();
	SepiaFW.offline = sepiaFW_build_offline();
	SepiaFW.alwaysOn = sepiaFW_build_always_on();
	SepiaFW.inputControls = sepiaFW_build_input_controls();
	SepiaFW.wakeTriggers = sepiaFW_build_wake_triggers();
	SepiaFW.wakeWordSettings = sepiaFW_build_wake_word_settings();
	SepiaFW.embedded = new Object();
	SepiaFW.embedded.nlu = sepiaFW_build_embedded_nlu();
	SepiaFW.embedded.services = sepiaFW_build_embedded_services();
	SepiaFW.clexi = sepiaFW_build_clexi();
	SepiaFW.android = sepiaFW_build_android();
}

//DATA STORAGE
function sepiaFW_build_dataService(){
	var DataService = {};
	
	var data = load();					//deleted after log-out
	var dataPermanent = load(true);		//remains after log-out, e.g. host-name

	if (!window.localStorage){
		SepiaFW.debug.err("Data: localStorage not supported! Storing data will most likely fail.");
	}
	
	//NativeStorage abstraction layer - we need to manage the async nature (compared to localStorage)

	function nativeStorageClear(){
		if (nativeStorageState != 0){
			nativeStorageState++;
			if (nativeStorageState > 25){
				nativeStorageFail({exception: "Too many items in queue.", code: 10});
			}else{
				setTimeout(function(){
					nativeStorageClear();				//repeat until queue is free
				}, 250);
			}
		}else{
			nativeStorageState = 1;	
			NativeStorage.clear(nativeStorageSuccess, nativeStorageFail);
		}
	}
	function nativeStorageSet(key, value){
		if (nativeStorageState != 0){
			nativeStorageState++;
			if (nativeStorageState > 25){
				nativeStorageFail({exception: "Too many items in queue.", code: 10});
			}else{
				setTimeout(function(){
					nativeStorageSet(key, value);		//repeat until queue is free
				}, 250);
			}
		}else{
			nativeStorageState = 1;	
			NativeStorage.setItem(key, value, nativeStorageSuccess, nativeStorageFail);
		}
	}
	function nativeStorageSuccess(obj){
		nativeStorageState = 0;
	}
	function nativeStorageFail(error){
		nativeStorageState = 0;
		alert("Data: NativeStorage ERROR! This should not happen! If you tried to clear your data please try again. Msg.: " + error.exception);
	}
	var nativeStorageState = 0;

	//-------------------------------

	function save(permanent){
		try{
			//Note: we duplicate the localStorage to NativeStorage if we can, in case the app closes, but
			//due to native storage's async nature this might not finish if app closes before
			if (permanent){
				if (window.NativeStorage){
					nativeStorageSet('sepiaFW-data-permanent', dataPermanent);
				}
				if (window.localStorage){
					localStorage.setItem('sepiaFW-data-permanent', JSON.stringify(dataPermanent));
				}
			}else{
				if (window.NativeStorage){
					nativeStorageSet('sepiaFW-data', data);
				}
				if (window.localStorage){
					localStorage.setItem('sepiaFW-data', JSON.stringify(data));
				}
			}
		}catch (e){
			SepiaFW.debug.err('Data: storage write error! Not available?');
		}
	}
	function load(permanent){
		//TODO: load is called everytime a variable is retrived ... for safety reasons (not running out of sync) ... but could be smarter ^^
		try{
			//Note: we can't load from NativeStorage on-the-fly due to it's async nature (it's not a drop-in replacement for LS).
			//That's why we load NativeStorage only once to localStorage when the app loads (see start.js ... it redirects to main app after async call completes).
			if (permanent){
				if (window.localStorage){
					var entry = localStorage.getItem('sepiaFW-data-permanent');
					if (entry){
						dataPermanent = JSON.parse(entry);
					}else{
						dataPermanent = {};
					}
					return dataPermanent;
				}
			}else{
				if (window.localStorage){
					var entry = localStorage.getItem('sepiaFW-data');
					if (entry){
						data = JSON.parse(entry);
					}else{
						data = {};
					}
					return data;
				}
			}
		}catch (e){
			if (permanent){
				dataPermanent = {};
			}else{
				data = {};
			}
			return {};
		}
	}
	DataService.get = function(key){
		load();
		return (data && (key in data)) ? data[key] : undefined;
	}
	DataService.getAll = function(){
		return load();
	}
	DataService.set = function(key, value){
		if (!data) data = {};
		data[key] = value;
		save();
	}
	DataService.getPermanent = function(key){
		load(true);
		return (dataPermanent && (key in dataPermanent)) ? dataPermanent[key] : undefined;
	}
	DataService.getAllPermanent = function(){
		return load(true);
	}
	DataService.setPermanent = function(key, value){
		if (!dataPermanent) dataPermanent = {};
		dataPermanent[key] = value;
		save(true);
	}
	DataService.del = function(key){
		load();
		delete data[key];
		save();
	}
	DataService.delPermanent = function(key){
		load(true);
		delete dataPermanent[key];
		save(true);
	}
	
	//clear all stored data (optionally keeping 'permanent') except app-cache
	DataService.clearAll = function(keepPermanent, delayedCallback, delay){
		var localDataStatus = "";
		if (window.NativeStorage){
			nativeStorageClear();
			storageClearRequested = true;
		}
		if (window.localStorage){
			window.localStorage.clear();
			storageClearRequested = true;
		}
		if (storageClearRequested){
			localDataStatus = "Storage has been cleared (request sent). Permanent data kept: " + keepPermanent + ".";
			SepiaFW.debug.log("Data: " + localDataStatus);
		}
		data = {};
		//restore permanent data - NOTE: a potential race condition with nativeStorageClear() should be prevented by the nativeStorageState queue
		if (keepPermanent){
			save(true); 	//restores current state to local and native storage
		}
		//support for a delayed callback in case you want to e.g. close/reload the app after this method
		if (delayedCallback){
			setTimeout(function(){
				delayedCallback();
			}, (delay || 1550));
		}
		return localDataStatus;
	}
	
	//clear app cache if possible - NOTE: it will most likely kill localStorage too
	DataService.clearAppCache = function(successCallback, errorCallback){
		if (SepiaFW.ui.isCordova && window.CacheClear){
			window.CacheClear(function(status) {
				//Success
				SepiaFW.debug.log("Data: App cache has been cleared.");
				if (successCallback) successCallback(status);
			},function(status) {
				//Error
				SepiaFW.debug.err("Data: Error in app cache plugin, deletion failed!");
				if (errorCallback) errorCallback(status);
			});
		}else{
			SepiaFW.debug.log("Data: No app cache found, deletion not required!?");
			var status = 'No app cache found, deletion not required!?';
			if (successCallback) successCallback(status);
		}
	}
	
	//--------- specific data ----------
	
	DataService.updateAccount = function(key, value){
		var account = DataService.get('account');
		if (!account){
			account = {};
		}
		account[key] = value;
		account.lastRefresh = new Date().getTime();
		DataService.set('account', account);
	}
	
	return DataService;
}

//TOOLS
function sepiaFW_build_tools(){
	var Tools = {};
	
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
	Tools.getLocalTime = function(short){
		var d = new Date();
		var HH = addZero(d.getHours());
		var mm = addZero(d.getMinutes());
		if (!short){
			var ss = addZero(d.getSeconds());
			return '' + HH + ':' + mm + ':' + ss;
		}else{
			return '' + HH + ':' + mm;
		}
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
	//remove a parameter of a given URL (parameter has to contain a '=' e.g. x=1)
	Tools.removeParameterFromURL = function(url, parameter){
		if (!!url.match(new RegExp("(\\?)(" + parameter + "=.*?)(&)"))){
			url = url.replace(new RegExp("(\\?)(" + parameter + "=.*?)(&)"), "?");
		}else if (url.indexOf('&' + parameter + '=') > -1){
			url = url.replace(new RegExp("(&)(" + parameter + "=.*?)(&|$)"), "$3");
		}else{
			url = url.replace(new RegExp("(\\?)(" + parameter + "=.*?)($)"), "");
		}
		return url;
	}

	//load script to element (body by default)
	Tools.loadJS = function(url, successCallback, domParent){
		if (!domParent) domParent = document.body;

		//Check if already exists
		var alreadyThere = false;
		var urlWithOrigin = (location.origin + "/" + url);
		$(domParent).find('script').each(function(index){
			if (this.src == url || this.src == urlWithOrigin){
				alreadyThere = true;
				return;
			}
		});
		if (!alreadyThere){
			//build new
			var scriptTag = document.createElement('script');
			scriptTag.src = url;

			if (successCallback){
				var didExecuteCallback = false;
				function execute(){
					if (!didExecuteCallback){
						didExecuteCallback = true;
						successCallback();
					}
				}
				scriptTag.onload = execute;
				scriptTag.onreadystatechange = execute;
			}
			domParent.appendChild(scriptTag);
			SepiaFW.debug.info("Added script to DOM: " + url);
		
		}else{
			SepiaFW.debug.log("Skipped loading of '" + url + "' ... was already there!");
			//just call callback
			if (successCallback) successCallback();
		}
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
	
	//check if string starts with certain suffix
	Tools.startsWith = function(str, prefix) {
		return str.indexOf(prefix) === 0;
	}
	//check if string ends with certain suffix
	Tools.endsWith = function(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}
	//Match regular expression - shortcut for boolean regExp matching
	Tools.doesMatchRegExp = function(str, regEx, flags) {
		return !!str.match(new RegExp(regEx, flags));
	}
		
	//prepend a zero to a number if it is lower than 10
	function addZero(i) {
		return (i < 10)? "0" + i : i;
	}
	Tools.addZero = addZero;

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

	//Encryption basics
	Tools.encryptBasic = function(password, data){
		var dataIn = (typeof data == "object")? JSON.stringify(data) : data;
		var encryptedData = JSON.parse(sjcl.encrypt(password, dataIn));
		return {
			iv: encryptedData.iv,
			salt: encryptedData.salt,
			ct: encryptedData.ct
		}
	}
	Tools.decryptBasic = function(password, basicEncryptedData){
		var dataIn = (typeof basicEncryptedData == "object")? JSON.stringify(basicEncryptedData) : basicEncryptedData;
		try {
			var decryptedData = sjcl.decrypt(password, dataIn);
			if (decryptedData.indexOf("{") == 0){ 		//this might be a bit weak contidion ^^
				return JSON.parse(decryptedData);
			}else{
				return decryptedData;
			}
		} catch (e) {
			return "";
		}
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
	Debug.error = Debug.err;
	
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