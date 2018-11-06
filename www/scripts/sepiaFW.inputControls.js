//Handle input controls like gamepads for remote triggers etc.
function sepiaFW_build_input_controls() {
    var InputControls = {};

    InputControls.settingsAreOpen = false;
    $settingsDebugField = undefined;

    InputControls.setup = function () {
        //console.log('Input controls setup');
        InputControls.listenToGamepadConnectEvent();
        InputControls.listenToGlobalHotkeys();
        //Import settings
        InputControls.importMappings();
    }

    InputControls.useGamepads = false;          //switchable in settings
    InputControls.useHotkeysInAlwaysOn = true;  //hardcoded here for now

    //Load controls settings view
    InputControls.openSettings = function(){
        SepiaFW.frames.open({ 
            pageUrl: "input-controls.html",
            onFinishSetup: onSetupFinish,
            onOpen: onSettingsOpen,
            onClose: onSettingsClose,
            theme: "dark"
        });
    }
    function onSetupFinish(){
        //Buttons for hotkey mappings
        $('#SepiaFW-hotkeys-define-mic').off().on('click', function(){
            InputControls.defineHotkeyFunction(toggleMicrophone);
        });
        $('#SepiaFW-hotkeys-define-back').off().on('click', function(){
            InputControls.defineHotkeyFunction(backButton);
        });
        //Buttons for button mappings
        $('#SepiaFW-buttons-define-mic').off().on('click', function(){
            InputControls.defineButtonFunction(toggleMicrophone);
        });
        $('#SepiaFW-buttons-define-back').off().on('click', function(){
            InputControls.defineButtonFunction(backButton);
        });
        //Storage
        $('#SepiaFW-input-controls-store').off().on('click', function(){
            InputControls.storeMappings();
        });
        $('#SepiaFW-input-controls-clear').off().on('click', function(){
            InputControls.clearMappings();
        });
    }
    function onSettingsOpen(){
        InputControls.settingsAreOpen = true;
        //For now write everything into the debugger field
        $settingsDebugField = $('#SepiaFW-input-controls-debug');
        $settingsDebugField.html("");
        settingsAppendDebug("<b>Connected controllers:</b>");
        $.each(getControllers(), function(i, gamepad){
            if (gamepad){
                settingsAppendDebug(gamepad.index + ": " + gamepad.id + " with "
                    + (gamepad.buttons? gamepad.buttons.length : "0") + " buttons and "
                    + (gamepad.axes? gamepad.axes.length : "0") + " axes.");
            }
        });
        settingsAppendDebug("<b>Registered controllers:</b>");
        $.each(controllers, function(i, gamepad){
            settingsAppendDebug(gamepad.index + ": " + gamepad.id);
        });
        settingsAppendDebug("<b>Hotkey matrix:</b>");
        settingsAppendDebug(convertActionMatrixToString(hotkeyActionMatrix));
        settingsAppendDebug("<b>Button matrix:</b>");
        settingsAppendDebug(convertActionMatrixToString(buttonActionMatrix));
        settingsAppendDebug("<b>Controller and key events:</b>");

        SepiaFW.ui.scrollToTop('sepiaFW-frame-page-1');
    }
    function onSettingsClose(){
        $settingsDebugField = undefined;
        InputControls.settingsAreOpen = false;
    }
    function settingsAppendDebug(msg){
        $settingsDebugField.append("<p>" + msg + "</p>");
        $settingsDebugField[0].scrollIntoView(false);
    }

    //Store and load button and key mappings
    InputControls.storeMappings = function(){
        var buttons = convertActionMatrixToString(buttonActionMatrix);
        var keys = convertActionMatrixToString(hotkeyActionMatrix);
        SepiaFW.data.set("input-controls-buttons", buttons);
        SepiaFW.data.set("input-controls-hotkeys", keys);
        SepiaFW.debug.log('Stored hotkeys and button settings in client storage.');
        SepiaFW.ui.showPopup('Stored hotkeys and button settings.');
    }
    InputControls.clearMappings = function(){
        SepiaFW.data.set("input-controls-buttons", "");
        SepiaFW.data.set("input-controls-hotkeys", "");
        SepiaFW.debug.log('Cleared hotkeys and button settings from client storage.');
        SepiaFW.ui.showPopup('Cleared hotkeys and button settings (please reload app).');
    }
    InputControls.importMappings = function(){
        var buttonsMapString = SepiaFW.data.get("input-controls-buttons");
        var keysMapString = SepiaFW.data.get("input-controls-hotkeys");
        if (buttonsMapString)   buttonActionMatrix = importJsonToActionMatrix(buttonsMapString);
        if (keysMapString)      hotkeyActionMatrix = importJsonToActionMatrix(keysMapString);
        SepiaFW.debug.log('Imported hotkeys and button settings from client storage.');
    }
    function convertActionMatrixToString(actionMatrix){
        if (actionMatrix){
            return JSON.stringify(actionMatrix, 
                function(key, val) { return (typeof val === 'function')? val.name : val; }, 1
            );
        }else{
            return "";
        }
    }
    function importJsonToActionMatrix(jsonString){
        if (jsonString){
            return JSON.parse(jsonString,
                function(key, val) { return (typeof val === 'string')? eval(val) : val; }       //NOTE: USES EVAL !!!
            );
        }else{
            return {};
        }
    }

    //--------------- Keyboard Shortcuts ----------------

    var hotkeyActionMatrix = {};    //{unicode-key} -> action

    InputControls.listenToGlobalHotkeys = function(){
        if (InputControls.useGamepads && InputControls.useHotkeysInAlwaysOn){
            document.addEventListener("keyup", onHotkey);
            //temporary button mapping              - TODO: make button actions configurable
            /*
            hotkeyActionMatrix[40] = defaultButtonActionOnRelease;      //Arrow down
            hotkeyActionMatrix[74] = defaultButtonActionOnRelease;      //j - for gamepad mapped as keyboard e.g.
            */
        }else{
            document.removeEventListener("keyup", onHotkey);
        }
    }

    //Evaluate hotkey press
    function onHotkey(event){
        var e = event || window.event; // for IE to cover IEs window event-object
        if (InputControls.settingsAreOpen){
            settingsAppendDebug('Key pressed with unicode: ' + e.which);
        }
        //check always on display
        if (InputControls.useHotkeysInAlwaysOn && SepiaFW.alwaysOn && SepiaFW.alwaysOn.isOpen){
            var action = hotkeyActionMatrix[e.which];
            if (action)     action();
        }
        return false;
    }

    //Define a new hotkey
    InputControls.defineHotkeyFunction = function(newKeyAction){
        function defineHotkey(event){
            document.removeEventListener("keyup", defineHotkey);
            hotkeyActionMatrix[event.which] = newKeyAction;
            settingsAppendDebug("Set key '" + event.which + "' to '" + newKeyAction.name + "'");
            //SepiaFW.ui.showPopup('Set new hotkey');
            newKeyAction = undefined;
        }
        document.addEventListener("keyup", defineHotkey);
        settingsAppendDebug("Press a key to assign it to: " + newKeyAction.name);
    }

    //---------------- Gamepad Support ------------------

    var controllers = {};           //Object to hold all connected controllers {"1":..,"2":..}
    var buttonMatrix = {};          //2D "object" with {controllerIndex}{buttonIndex} that holds current "pressed" state
    var buttonActionMatrix = {};    //2D "object" with {controllerIndex}{buttonIndex} that holds action method (if any)
    var isGamepadListening = false;

    //Used for state scan-loop
    var rAF = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame;

    //Start listening for gamepad connections or restart state scan-loop
    InputControls.listenToGamepadConnectEvent = function(){
        if (!isGamepadListening && InputControls.useGamepads){
            //Listen for connection
            if ('GamepadEvent' in window){
                window.addEventListener("gamepadconnected", connecthandler);
                window.addEventListener("gamepaddisconnected", disconnecthandler);
                isGamepadListening = true;
            }else if ('WebKitGamepadEvent' in window){
                window.addEventListener("webkitgamepadconnected", connecthandler);
                window.addEventListener("webkitgamepaddisconnected", disconnecthandler);
                isGamepadListening = true;
            }else{
                SepiaFW.debug.err('Gamepad controls are not supported by client!');
            }
        }else if (isGamepadListening && InputControls.useGamepads){
            //Restart state update loop
            rAF(updateStatus);
        }
    }

    //Called on new connection
    function connecthandler(e) {
        addgamepad(e.gamepad);
    }

    //Add controller if it is a valid gamepad
    function addgamepad(gamepad) {        
        SepiaFW.debug.log("Controller connected at index " + gamepad.index 
                + ": " + gamepad.id + " with "
                + gamepad.buttons.length + " buttons and "
                + gamepad.axes.length + " axes."
        );
        //is valid gamepad? 
        if (isValidGamepad(gamepad)){
            controllers[gamepad.index] = gamepad;
            buttonMatrix[gamepad.index] = {};       //new Array(gamepad.buttons.length);
            //temporary button mapping          - TODO: make button actions configurable
            /*
            buttonActionMatrix[gamepad.index] = {}; //new Array(gamepad.buttons.length);
            buttonActionMatrix[gamepad.index][0] = defaultButtonActionOnRelease;
            */
            //start (or re-start) state scan-loop
            rAF(updateStatus);
        }else{
            SepiaFW.debug.err("Controller " + gamepad.index + " is NOT a gamepad (will not be used).");
        }
    }
    //Check if controller is valid
    function isValidGamepad(gamepad){
        return (gamepad.axes.length > 0);
    }

    //Called on controller disconnection event
    function disconnecthandler(e) {
        removegamepad(e.gamepad);
    }

    //Remove gamepad from controllers (if available)
    function removegamepad(gamepad) {
        SepiaFW.debug.log("Controller disconnected at index " + gamepad.index 
                + ": " + gamepad.id + "."
        );
        if (isValidGamepad(gamepad)){
            delete controllers[gamepad.index];
            delete buttonMatrix[gamepad.index];
        }
    }

    //Scan for controller state changes, e.g. button events in an endless loop
    function updateStatus() {
        //any gamepads left?
        if (!InputControls.useGamepads || controllers.length <= 0){
            //abort loop
            return;
        }
        scangamepads();
        for (j in controllers) {
            var controller = controllers[j];
            //Buttons
            for (var i = 0; i < controller.buttons.length; i++) {
                checkButtonState(j, i, controller.buttons[i]);
            }
            //Axis
            /*
            for (var i = 0; i < controller.axes.length; i++) {
                var val = controller.axes[i];
                //console.log('axis ' + i + ' value: ' + controller.axes[i].toFixed(4));
            }
            */
        }
        rAF(updateStatus);
    }

    //Check button event for press/release
    function checkButtonState(controllerIndex, buttonIndex, button){
        var pressed = false;
        var value = 0;
        if (typeof (button) == "object") {
            pressed = button.pressed;
            value = button.value;
        }else{
            pressed = (button == 1.0);
        }
        var wasPressed = buttonMatrix[controllerIndex][buttonIndex];
        buttonMatrix[controllerIndex][buttonIndex] = pressed;
        if (!wasPressed && pressed) {
            //console.log('Controler ' + controllerIndex + ' button ' + buttonIndex + ' pressed, value: ' + value);
            if (InputControls.settingsAreOpen){
                settingsAppendDebug('Pressed controller ' + controllerIndex + ' button ' + buttonIndex);
            }
        }else if (wasPressed && !pressed){
            //console.log('Controler ' + controllerIndex + ' button ' + buttonIndex + ' released, value: ' + value);
            if (InputControls.settingsAreOpen){
                settingsAppendDebug('Released controller ' + controllerIndex + ' button ' + buttonIndex);
            }
            if (defineNewButtonAction){
                gotNewButtonForAction(controllerIndex, buttonIndex);
            }else{
                var actionController = buttonActionMatrix[controllerIndex];
                if (actionController){
                    var action = actionController[buttonIndex];
                    if (action){
                        //Call button onRelease action
                        action();
                    }
                }
            }
        }else{
            //console.log('Controler ' + controllerIndex + ' button ' + buttonIndex + ' unknown, value: ' + value);
        }
    }

    //Update status of gamepads - needs to be reloaded every time (at least on Chrome)
    function scangamepads() {
        var gamepads = getControllers();
        for (var i = 0; i < controllers.length; i++) {
            if (gamepads[i]) {
                controllers[i] = gamepads[i];
            }
        }
        /* we don't support this mode
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                if (!(gamepads[i].index in controllers)) {
                    addgamepad(gamepads[i]);
                } else {
                    controllers[gamepads[i].index] = gamepads[i];
                }
            }
        }
        */
    }
    function getControllers(){
        return (navigator.getGamepads? navigator.getGamepads() : (navigator.webkitGetGamepads? navigator.webkitGetGamepads() : []));
    }

    //Define a new button action
    InputControls.defineButtonFunction = function(newAction){
        if (Object.keys(controllers).length > 0){
            defineNewButtonAction = true;
            newButtonAction = newAction;
            settingsAppendDebug("Press a button to assign it to: " + newAction.name);
            //set up to be triggered on next scan loop ...
        }else{
            settingsAppendDebug("No controller with buttons connected/active!");
        }
    }
    function gotNewButtonForAction(controllerIndex, buttonIndex){
        //... called from scan loop
        defineNewButtonAction = false;
        var actionController = buttonActionMatrix[controllerIndex];
        if (!actionController){
            buttonActionMatrix[controllerIndex] = {};
        }
        buttonActionMatrix[controllerIndex][buttonIndex] = newButtonAction;
        settingsAppendDebug("Set button action '" + newButtonAction.name 
            + "' for button c" + controllerIndex + "b" + buttonIndex);
        //SepiaFW.ui.showPopup('Set new button action');
        newButtonAction = undefined;
    }
    var defineNewButtonAction = false;
    var newButtonAction = undefined;

    //------- Button Actions -------

    function defaultButtonActionOnRelease(){
        toggleMicrophone();
    }
    function toggleMicrophone(){
        SepiaFW.ui.toggleMicButton();
    }
    function nextChatView(){
        SepiaFW.ui.moc.next();
    }
    function previousChatView(){
        SepiaFW.ui.moc.prev();
    }
    function backButton(){
        SepiaFW.ui.backButtonAction();
    }
    function test1(){
        console.log('TEST 1');
    }
    function test2(){
        console.log('TEST 2');
    }

    return InputControls;
}