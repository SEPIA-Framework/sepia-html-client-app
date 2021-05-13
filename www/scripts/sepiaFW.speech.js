//TTS - Base lib (part 0) of SepiaFW.speech that imports STT and TTS
function sepiaFW_build_speech(){
	var Speech = {};
	Speech.Interface = {};
	
	//Parameters and states
	
	//Common
	var speechLanguage = SepiaFW.config.appLanguage;
	var speechCountryCode = "";
	Speech.getLanguage = function(){
		return speechLanguage;
	}
	Speech.setLanguage = function(newLang){
		speechLanguage = newLang;
	}
	Speech.setCountryCode = function(countryCode){
		speechCountryCode = countryCode;
	}
	//it might be necessary to use the long codes
	function getLongLanguageCode(langCodeShort){
		if (langCodeShort.length === 2){
			if (langCodeShort.toLowerCase() === "de"){
				return "de-DE";
			}else{
				return "en-US";
			}
		}
	}
	function getLanguageForASR(){
		if (speechCountryCode){
			return speechCountryCode;
		}else if (speechLanguage === "de"){
			return "de-DE";
		}else{
			return "en-US";
		}
	}
	Speech.getLongLanguageCode = getLongLanguageCode;
	Speech.getLanguageForASR = getLanguageForASR;

	//Check if busy
	Speech.isSpeakingOrListening = function(){
		return (Speech.isSpeaking() || Speech.isWaitingForSpeech() || Speech.isWaitingForSpeechStop()
			|| Speech.isRecognizing() || Speech.isWaitingForResult());
	}
	
	//Global speech events
	Speech.dispatchSpeechEvent = function(eventType, eventMsg){
		var event = new CustomEvent('sepia_speech_event', { detail: {
			type: eventType,
			msg: eventMsg
		}});
		document.dispatchEvent(event);
	}

	//Import TTS and STT sub-libs
	sepiaFW_build_speech_stt(Speech);
	sepiaFW_build_speech_tts(Speech);

	//--------- COMMON INTERFACE -----------

	//reset all states of speech
	Speech.reset = function(){
		Speech.resetTTS();
		Speech.resetRecognition();
	}
		
	return Speech;
}
