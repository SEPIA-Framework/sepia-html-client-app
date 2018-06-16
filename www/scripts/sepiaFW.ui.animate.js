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