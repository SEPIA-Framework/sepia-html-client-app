function sepiaFW_build_ui_custom_buttons(){
    var CustomButtons = {};

    var customButtonObjects = [];
    var lastCustomButtonsLoad = 0;

    CustomButtons.isOutdated = false;       //set this to true to reload icons on next my-view refresh

    //My view refresh event
    CustomButtons.onMyViewRefresh = function(){
        //console.log('test my view refresh custom buttons');
        if (CustomButtons.isOutdated){
            CustomButtons.load();
        }
    }

    //Load first buttons via teach-API (max. 10 by default)
    CustomButtons.load = function(){
        if (SepiaFW.client.isDemoMode()){
            //Load demo-buttons and publish
            customButtonObjects = CustomButtons.loadDemoButtons();
            publishMyViewCustomButtons(customButtonObjects);
            return;
        }
        if (!SepiaFW.teach){
            SepiaFW.debug.err("CustomButtons.load - Call prevented due to missing module 'SepiaFW.teach'.");
            return;
        }
        //prevent multiple consecutive calls in short intervall...
		var now = new Date().getTime();
		if ((now - lastCustomButtonsLoad) > 10*1000){ 		//interval: 10s
            lastCustomButtonsLoad = now;
            var withButtonOnly = true;
            var startingFrom = 0;
            SepiaFW.teach.loadPersonalCommands(SepiaFW.account.getKey(), startingFrom, function(data){
                //success
                var res = data.result;
                customButtonObjects = [];
                $.each(res, function(i, pc){
                    var pcInfo = pc.sentence[0];
                    var buttonData = pcInfo.data.button || {};
                    customButtonObjects.push(
                        {
                            "name": buttonData.name,
                            "icon": buttonData.icon,
                            "cmd" : pcInfo.cmd_summary,
                            "text": pcInfo.text,
                            "language" : pcInfo.language
                        }
                    );
                });
                //console.log(JSON.stringify(customButtonObjects));
                publishMyViewCustomButtons(customButtonObjects);

            }, function(msg){
                //error
                SepiaFW.debug.err('CustomButtons.load - Error! Could not load buttons: ');
                SepiaFW.debug.err(msg);
            }, '', withButtonOnly);
        }else{
            SepiaFW.debug.err('CustomButtons.load - Call prevented due to rapid, multiple requests.');
        }
    }

    //Load some offline demo buttons
    CustomButtons.loadDemoButtons = function(){
        if (SepiaFW.offline){
            var lang = SepiaFW.config.appLanguage;
            var offlineCustomButtonObjects = [
                SepiaFW.offline.createCustomButton("My Radio", "music_note", "dummy;;info=my_radio_dummy", SepiaFW.local.g('myRadioDemoBtn'), lang),
                SepiaFW.offline.createCustomButton("My News", "local_library", "dummy;;info=my_news_dummy", SepiaFW.local.g('myNewsDemoBtn'), lang),
                SepiaFW.offline.createCustomButton("To-Do List", "list", "dummy;;;;info=my_todo_list_dummy", SepiaFW.local.g('myToDoDemoBtn'), lang)
            ];
        }
        return offlineCustomButtonObjects;
    }

    //Build client-first-start box
    CustomButtons.buildMyCustomButtonsBox = function(parentBlock){
		//fadeout old
		var	aButtonsAreaReplaced = document.getElementById('sepiaFW-myCustom-buttons');
		if (aButtonsAreaReplaced){
			aButtonsAreaReplaced.id = 'sepiaFW-myCustom-buttons-replaced';
			//var oldFirstStartParent = $(aButtonsAreaReplaced).closest('.chatMsg');
			$(aButtonsAreaReplaced).fadeOut(300, function(){
				$(aButtonsAreaReplaced).remove();
			});
		}
		//make new
		var	aButtonsArea = document.createElement('DIV');
		aButtonsArea.id = 'sepiaFW-myCustom-buttons';
		aButtonsArea.className = 'chat-buttons-area';
		aButtonsArea.style.display = 'none';
		//header
		var titleNote = document.createElement('P');
		titleNote.className = 'sepiaFW-myCustomButtons-titleNote';
		titleNote.innerHTML = SepiaFW.local.g('myCustomButtons') + ":";
		$(aButtonsArea).prepend(titleNote);
		
		//show again on top
		$(parentBlock).prepend(aButtonsArea);   //or append?
		$(aButtonsArea).fadeIn(500);
		
		return aButtonsArea;
    }

    //Publish custom buttons
	function publishMyViewCustomButtons(customButtons){
        var resultViewInfo = SepiaFW.ui.getResultViewByName("myView");
        var resView = document.getElementById(resultViewInfo.target);
        var buttonsBox = CustomButtons.buildMyCustomButtonsBox(resView);
        $.each(customButtons, function(i, button){
            //console.log(JSON.stringify(button));
            var button = buildCustomButton(button);
            buttonsBox.appendChild(button);
        });
        //UI.scrollToTop(resView);
    }

    //Build button
    function buildCustomButton(buttonData){
        //Button
        var button = document.createElement("button");
        button.className = "my-view-custom-button";
        if (buttonData.icon){
            button.innerHTML = '<i class="material-icons md-24">' + buttonData.icon + '</i><span>' + buttonData.name + '</span>';
        }else{
            button.innerHTML = '<span>' + buttonData.name + '</span>';
        }
        
        //Action
        var animateShortPress = true;
        SepiaFW.ui.onShortLongPress(button, function(){
            //Short press
            CustomButtons.callAction(buttonData);
            
        }, function(){
            //Long press
            //TODO: we could use that to edit the button
            
        }, animateShortPress);

        return button;
    }

    //Call button action
    CustomButtons.callAction = function(buttonData){
        /* --> TODO: THIS LEADS TO DOUBLE EXECUTION OF sentence-connect commands O_o, need to find bug! <--
        var isText = true;
        var cmd = buttonData.text;
        var newAction = SepiaFW.offline.getCmdButtonAction(cmd, buttonData.name, isText);
        newAction.options = { 
            skipTTS : true, 
            //skipText : true,
            autoSwitchView: true,
            switchDelay: 1000
        };
        SepiaFW.debug.info("CustomButtons - sending button-cmd: " + newAction.cmd);
        console.log('open CMD: ' + buttonData.name + ': ' + newAction.cmd);         //DEBUG
        SepiaFW.ui.actions.openCMD(newAction);
        */
        SepiaFW.debug.info("CustomButtons - sending button-text: " + buttonData.text);
        SepiaFW.client.sendInputText(buttonData.text);
    }

    return CustomButtons;
}