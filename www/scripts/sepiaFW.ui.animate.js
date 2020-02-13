//ANIMATIONS
function sepiaFW_build_animate(){
	var Animate = {};
	Animate.assistant = {};
	Animate.audio = {};
	Animate.wakeWord = {};
	Animate.channels = {};

	//timers
	//...
	
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
				SepiaFW.speech.toggleSmartMic();
				return true;
			}else{
				return false;
			}
		}
	}
	function possibilityToSwitchOnWakeWordListener(source){
		//check and schedule
		if (SepiaFW.wakeTriggers.useWakeWord && SepiaFW.wakeTriggers.engineLoaded && !SepiaFW.wakeTriggers.isListening()){
			//console.log('Wake-word window - source: ' + source); 	//TODO: use?
			SepiaFW.wakeTriggers.listenToWakeWords(undefined, undefined, true);
		}
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
			SepiaFW.audio.fadeInIfOnHold();
		}
	}

	//---------------------

	var animState = "idle";		//idle, loading, speaking, listening, awaitDialog
	Animate.assistant.getState = function(){
		return animState;
	}
	function clearAllStateClassesAndAdd(ele, addClass){
		var $ele = $(ele);
		$ele.removeClass("idle loading speaking listening awaitDialog");
		if (addClass){
			$ele.addClass(addClass);
		}
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
			animState = "idle";
			//get all functions from delayQueue
			possibilityToExecuteDelayedFunction(source);
			//reset state
			SepiaFW.ui.assistBtn.innerHTML = (SepiaFW.speech.isAsrSupported)? SepiaFW.ui.assistIconIdle : SepiaFW.ui.assistIconIdleNoAsr;
			SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.micBackgroundColor;
			clearAllStateClassesAndAdd(SepiaFW.ui.assistBtnArea, animState);
			$("#sepiaFW-assist-btn-orbiters").addClass("sepiaFW-animation-pause");
			if (source != "asrFinished"){
				possibilityToFadeInBackgroundAudio();
				possibilityToSwitchOnWakeWordListener(source);
			}
			//Avatar
			if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
				SepiaFW.alwaysOn.avatarIdle();
			}
			//Dispatch - NOTE: this will also trigger the timer for idle-time events (see: Client.queueIdleTimeEvent)
			dispatchAnimationStateEvent(animState);
		}
		//hide extra input box
		SepiaFW.ui.hideLiveSpeechInputBox();
	}
	Animate.assistant.loading = function(){
		animState = "loading";
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconLoad;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.loadingColor;
		clearAllStateClassesAndAdd(SepiaFW.ui.assistBtnArea, animState);
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//Avatar
		if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
			SepiaFW.alwaysOn.avatarLoading();
		}
		//Dispatch
		dispatchAnimationStateEvent(animState);
	}
	Animate.assistant.speaking = function(){
		animState = "speaking";
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconSpeak;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.accentColor2;
		clearAllStateClassesAndAdd(SepiaFW.ui.assistBtnArea, animState);
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
			SepiaFW.alwaysOn.avatarSpeaking();
		}
		//Dispatch
		dispatchAnimationStateEvent(animState);
	}
	Animate.assistant.listening = function(){
		animState = "listening";
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconRec;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.accentColor;
		clearAllStateClassesAndAdd(SepiaFW.ui.assistBtnArea, animState);
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//extra input box
		SepiaFW.ui.showLiveSpeechInputBox();
		//Avatar
		if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
			SepiaFW.alwaysOn.avatarListening();
		}
		//Dispatch
		dispatchAnimationStateEvent(animState);
	}
	Animate.assistant.awaitDialog = function(source){
		animState = "awaitDialog";
		SepiaFW.ui.assistBtn.innerHTML = SepiaFW.ui.assistIconAwaitAnswer;
		SepiaFW.ui.assistBtnArea.style.backgroundColor = SepiaFW.ui.awaitDialogColor;
		clearAllStateClassesAndAdd(SepiaFW.ui.assistBtnArea, animState);
		$("#sepiaFW-assist-btn-orbiters").removeClass("sepiaFW-animation-pause");
		//Avatar
		if (SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
			SepiaFW.alwaysOn.avatarAwaitingInput();
		}
		//Dispatch
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
	
	//audio player animations:
	
	Animate.audio.playerActive = function(){
		//$("#sepiaFW-audio-ctrls-title").addClass("playerActive");
		$("#sepiaFW-audio-ctrls-soundbars").addClass("playerActive");
	}
	Animate.audio.playerIdle = function(){
		//$("#sepiaFW-audio-ctrls-title").removeClass("playerActive");
		$("#sepiaFW-audio-ctrls-soundbars").removeClass("playerActive");
	}

	//wake-word animations:

	Animate.wakeWord.active = function(){
		$('#sepiaFW-nav-label-online-status').addClass("wake-word-active");
	}
	Animate.wakeWord.inactive = function(){
		$('#sepiaFW-nav-label-online-status').removeClass("wake-word-active");
	}

	//channel animations for missed off-channel messages:

	var markedChannels = new Set();
	Animate.channels.setStateCheckChannels = function(){
		$('#sepiaFW-nav-users-btn').addClass('marked');
		$('#sepiaFW-alwaysOn-notifications').addClass('check-channels');
	}
	Animate.channels.clearStateCheckChannels = function(){
		$('#sepiaFW-nav-users-btn').removeClass('marked');
		$('#sepiaFW-alwaysOn-notifications').removeClass('check-channels');
	}
	Animate.channels.refreshStateCheckChannels = function(){
		if (markedChannels.size == 0){
			Animate.channels.clearStateCheckChannels();
		}else{
			Animate.channels.setStateCheckChannels();
		}
	}
	Animate.channels.markChannelEntry = function(channelId){
		var $channelEntry = $('#sepiaFW-chat-channel-view').find('[data-channel-id="' + channelId + '"]');
		if ($channelEntry.length > 0){
			$channelEntry.addClass('marked');
			markedChannels.add(channelId);
			Animate.channels.setStateCheckChannels();
		}
	}
	Animate.channels.unmarkChannelEntry = function(channelId){
		$('#sepiaFW-chat-channel-view').find('[data-channel-id="' + channelId + '"]').removeClass('marked');
		markedChannels.delete(channelId);
		if (markedChannels.size == 0){
			Animate.channels.clearStateCheckChannels();
		}
	}
	
	return Animate;
}