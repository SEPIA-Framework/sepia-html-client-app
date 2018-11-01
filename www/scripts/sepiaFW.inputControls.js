//Handle input controls like gamepads for remote triggers etc.
function sepiaFW_build_input_controls() {
    var InputControls = {};

    InputControls.setup = function () {
        //console.log('Input controls setup');
        InputControls.listenToGamepadConnectEvent();
    }

    //---------------- Gamepad Support ------------------

    var controllers = {};           //Object to hold all connected controllers {"1":..,"2":..}
    var buttonMatrix = {};          //2D "array" with {controllerIndex}[buttonIndex] that holds current "pressed" state
    var buttonActionMatrix = {};    //2D "array" with {controllerIndex}[buttonIndex] that holds action method (if any)
    var isGamepadListening = false;

    InputControls.useGamepads = true;

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
            buttonMatrix[gamepad.index] = new Array(gamepad.buttons.length);
            //temporary button mapping              - TODO: make button actions configurable
            buttonActionMatrix[gamepad.index] = new Array(gamepad.buttons.length);
            buttonActionMatrix[gamepad.index][0] = defaultButtonActionOnRelease;
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
        }else if (wasPressed && !pressed){
            //console.log('Controler ' + controllerIndex + ' button ' + buttonIndex + ' released, value: ' + value);
            var action = buttonActionMatrix[controllerIndex][buttonIndex];
            if (action){
                //Call button onRelease action
                action();
            }
        }else{
            //console.log('Controler ' + controllerIndex + ' button ' + buttonIndex + ' unknown, value: ' + value);
        }
    }

    //Update status of gamepads - needs to be reloaded every time (at least on Chrome)
    function scangamepads() {
        var gamepads = navigator.getGamepads? navigator.getGamepads() : (navigator.webkitGetGamepads? navigator.webkitGetGamepads() : []);
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

    //------- Button Actions -------

    function defaultButtonActionOnRelease(){
        toggleMicrophone();
    }

    function toggleMicrophone(){
        var useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
        SepiaFW.ui.toggleMicButton(useConfirmationSound);
    }

    return InputControls;
}