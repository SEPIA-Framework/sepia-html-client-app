//Handle wake triggers like "Hey SEPIA" wake-word.
function sepiaFW_build_wake_triggers() {
	var WakeTriggers = {};
	
	WakeTriggers.useWakeWord = false;	//allows to use client side and remote wake-word trigger
	
	//Interface 
	
	WakeTriggers.setupWakeWords = function(){
	}
	
	WakeTriggers.listenToWakeWords = function(onSuccessCallback, onErrorCallback){
		//Porcupine integration
		ppListenToWakeWords(onSuccessCallback, onErrorCallback);
	}
	
	WakeTriggers.stopListeningToWakeWords = function(onSuccessCallback, onErrorCallback){
		//Porcupine integration
		ppStopListeningToWakeWords(onSuccessCallback, onErrorCallback);
	}
	
	WakeTriggers.getWakeWords = function(){
		//Porcupine integration
		return ppKeywordNames;
	}
	
	WakeTriggers.setWakeWordSensitivities = function(newValues, onSuccessCallback, onErrorCallback){
		//Porcupine integration
		ppSetWakeWordSensitivities(newValues, onSuccessCallback, onErrorCallback);
	}
	WakeTriggers.getWakeWordSensitivities = function(){
		//Porcupine integration
		return ppGetWakeWordSensitivities();
	}
	
	//------ Porcupine Javascript (Picovoice.ai) ------
	
	var ppKeywordIDs = {
		'hey sepia': new Uint8Array([
			0xE0, 0x33, 0x02, 0xB3, 0x7D, 0x67, 0xEC, 0xA6, 0x39, 0x01, 0x70, 0x44, 
			0x70, 0xB2, 0xCE, 0x48, 0x05, 0xE5, 0x45, 0x72, 0xC4, 0x8E, 0x03, 0xBF, 
			0x32, 0x90, 0x33, 0xA9, 0x9E, 0x8A, 0x53, 0x17, 0x00, 0x69, 0x26, 0x2F, 
			0x7E, 0xF4, 0xDD, 0x9B, 0x8A, 0xF4, 0xAC, 0x9B, 0x51, 0x99, 0xEC, 0x33, 
			0x68, 0xFF, 0xEB, 0x72, 0x7D, 0x10, 0x0B, 0xAD, 0xD2, 0x1F, 0xD9, 0x0C, 
			0x54, 0x0E, 0xF9, 0xBF, 0x6B, 0xB3, 0x21, 0xD4, 0x59, 0xBD, 0xFF, 0x4E, 
			0x18, 0x4B, 0xCE, 0x31, 0xBC, 0x4F, 0xBC, 0xF4, 0xDA, 0xA6, 0x0D, 0x6C, 
			0x5D, 0xA5, 0x50, 0x0F])
    };
	var ppSensitivities = new Float32Array([0.75]); 	//1: low threshold, 0.1: high threshold
	var ppKeywordNames = Object.keys(ppKeywordIDs);
	
	var ppAudioManager;
	
	function ppSetWakeWordSensitivities(newValues, onSuccessCallback, onErrorCallback){
		ppSensitivities =  new Float32Array(newValues);
		if (onSuccessCallback) onSuccessCallback();
	}
	function ppGetWakeWordSensitivities(){
		return ppSensitivities;
	}

    function ppListenToWakeWords(onSuccessCallback, onErrorCallback){
		if (!onSuccessCallback) onSuccessCallback = defaultPpSuccessCallback;
		if (!onErrorCallback) onErrorCallback = defaultPpErrorCallback;
		
		if (!ppAudioManager){
			ppAudioManager = new PicovoiceAudioManager();
		}
		ppAudioManager.start(Porcupine.create(Object.values(ppKeywordIDs), ppSensitivities), onSuccessCallback, onErrorCallback);
    }

    function ppStopListeningToWakeWords(onSuccessCallback, onErrorCallback){
        ppAudioManager.stop();
		
		//can this throw an error?
		if (onSuccessCallback) onSuccessCallback();
    }
	
	function defaultPpSuccessCallback(keywordIndex){
		if (keywordIndex === -1) {
            return;
        }else{
			var keyword = ppKeywordNames[keywordIndex];
			alert(keyword);
		}
    }
	function defaultPpErrorCallback(ex){
        alert(ex.toString());
    };
	
	//-------------------------------------------------
	
	return WakeTriggers;
}