//TTS - Base lib (part 0) of SepiaFW.speech that imports STT and TTS
function sepiaFW_build_speech(sepiaSessionId){
	var Speech = {};
	
	//Parameters and states
	
	//Common
	var speechLanguage = SepiaFW.config.appLanguage;
	var speechCountryCode = "";
	Speech.getLanguage = function(){
		return speechLanguage;
	}
	Speech.setLanguage = function(newLang){
		speechLanguage = newLang;
		Speech.refreshVoice();
		if (SepiaFW.speechAudioProcessor){
			SepiaFW.speechAudioProcessor.refreshEngineSettings(Speech.getAsrEngine(), newLang);
		}
	}
	Speech.setCountryCode = function(countryCode){
		speechCountryCode = countryCode;
	}
	//it might be necessary to use the long codes
	function getLongLanguageCode(langCodeShort){
		if (!langCodeShort && speechCountryCode) return speechCountryCode;
		else if (!langCodeShort) langCodeShort = speechLanguage;
		return SepiaFW.local.getDefaultBcp47LanguageCode(langCodeShort) || "en-US";
	}
	Speech.getLongLanguageCode = getLongLanguageCode;

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
	sepiaFW_build_speech_recognition(Speech);
	sepiaFW_build_speech_synthesis(Speech, sepiaSessionId);

	//--------- COMMON INTERFACE -----------

	//reset all states of speech
	Speech.reset = function(){
		Speech.resetTTS();
		Speech.resetRecognition();
	}
		
	return Speech;
}
