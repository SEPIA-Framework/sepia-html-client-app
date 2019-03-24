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
	
	//assistant animations - NOTE: assistant.animation is also central point to control follow-up actions!

	//-- follow-up actions:

	function possibilityToAutoSwitchMic(source){
		if (source && source == "asrNoResult"){
			return false;
		}else{
			//console.log('Last input was ASR? ' + SepiaFW.client.wasLastInputSourceAsr());
			if (SepiaFW.client.wasLastInputSourceAsr() 
				&& SepiaFW.speech.useSmartMicToggle
				&& (SepiaFW.assistant && SepiaFW.assistant.isWaitingForDialog)
			){
				//console.log('Mic auto-trigger window - source: ' + source);
				SepiaFW.speech.toggleSmartMic();									//TODO: TEST!
				return true;
			}else{
				return false;
			}
		}
	}
	function possibilityToSwitchOnWakeWordListener(source){
		//console.log('Wake-word window - source: ' + source); 						//TODO: implement
	}
	function possibilityToCleanCommandQueue(){
		var action = SepiaFW.client.getAndRemoveNextCommandInQueue();
		SepiaFW.ui.actions.openCMD(action);
	}
	function possibilityToExecuteDelayedFunction(source){
		if (SepiaFW.ui.actions && SepiaFW.ui.actions.getDelayQueueSize() > 0){
			if (source == "asrFinished"){
				SepiaFW.ui.actions.executeDelayedFunctionsAndRemove(source); //only after-asr (or any) state 
			}else{
				SepiaFW.ui.actions.executeDelayedFunctionsAndRemove(); 		 //no state filters
			}
		}
	}
	function possibilityToFadeInBackgroundAudio(){
		if (SepiaFW.audio){
			SepiaFW.audio.fadeInMainIfOnHold();
		}
	}

	//---------------------

	var animState = "idle";
	Animate.assistant.getState = function(){
		return animState;
	}
	
	Animate.assistant.idle = function(source){
		if (!source) source = "unknown";
		SepiaFW.debug.info('Animate.idle, source: ' + source); 		//DEBUG
		if (SepiaFW.assistant && SepiaFW.assistant.isWaitingForDialog){
			Animate.assistant.awaitDialog(source);
		}else if (SepiaFW.ui.actions && SepiaFW.client.getCommandQueueSize() > 0){
			Animate.assistant.loading();
			//get next command form commandQueue
			possibilityToCleanCommandQueue();
		}else{
			//get all functions from delayQueue
			possibilityToExecuteDelayedFunction(source);
			//reset state
			SepiaFW.ui.assistBtn.innerHTML = (SepiaFW.speech.isAsrSupported)? SepiaFW.ui.assistIconIdle : SepiaFW.ui.assistIconIdleNoAsr;
			SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.micBackgroundColor;
			$("#sepiaFW-assist-btn-orbiters").addClass("sepiaFW-animation-pause");
			if (source != "asrFinished"){
				possibilityToFadeInBackgroundAudio();
				possibilityToSwitchOnWakeWordListener(source);
			}
			//Avatar
			if (SepiaFW.alwaysOn){
				SepiaFW.alwaysOn.avatarIdle();
			}
			//Dispatch - NOTE: this will also trigger the timer for idle-time events (see: Client.queueIdleTimeEvent)
			animState = "idle";
			dispatchAnimationStateEvent(animState);
		}
		//hide extra input box
		SepiaFW.ui.hideLiveSpeechInputBox();
	}
	Animate.assistant.loading = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconLoad;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.loadingColor;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//Avatar
		if (SepiaFW.alwaysOn){
			SepiaFW.alwaysOn.avatarLoading();
		}
		//Dispatch
		animState = "loading";
		dispatchAnimationStateEvent(animState);
	}
	Animate.assistant.speaking = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconSpeak;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.accentColor2;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		if (SepiaFW.alwaysOn){
			SepiaFW.alwaysOn.avatarSpeaking();
		}
	}
	Animate.assistant.listening = function(){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconRec;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.accentColor;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//extra input box
		SepiaFW.ui.showLiveSpeechInputBox();
		//Avatar
		if (SepiaFW.alwaysOn){
			SepiaFW.alwaysOn.avatarListening();
		}
		//Dispatch
		animState = "listening";
		dispatchAnimationStateEvent(animState);
	}
	Animate.assistant.awaitDialog = function(source){
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconAwaitAnswer;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.awaitDialogColor;
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//Avatar
		if (SepiaFW.alwaysOn){
			SepiaFW.alwaysOn.avatarAwaitingInput();
		}
		//Dispatch
		animState = "awaitDialog";
		dispatchAnimationStateEvent(animState);
		//check for automatic microphone trigger
		var didTriggerMic = possibilityToAutoSwitchMic(source);
		if (!didTriggerMic){
			possibilityToSwitchOnWakeWordListener(source);
		}
	}

	//animation state dispatcher
	function dispatchAnimationStateEvent(animEvent){
		var event = new CustomEvent('sepia_state_change', { detail: {
			state: animEvent
		}});
		document.dispatchEvent(event);
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