//Handle input controls like gamepads for remote triggers etc.
function sepiaFW_build_input_controls() {
    var InputControls = {};

    InputControls.settingsAreOpen = false;
    $settingsDebugField = undefined;

    //---- Initializers ----

    InputControls.initializeGamepads = function(){
        //NOTE: this currently also applies to Hotkeys and CLEXI buttons
        InputControls.useGamepads = SepiaFW.data.get('useGamepads');
		if (typeof InputControls.useGamepads == 'undefined') InputControls.useGamepads = false;
        SepiaFW.debug.info("Gamepads are " + ((InputControls.useGamepads)? "SUPPORTED" : "NOT SUPPORTED"));
        
        //Add onActive action:
        SepiaFW.client.addOnActiveOneTimeAction(inputControlsOnActiveActionPadAndKeys);
    }
    InputControls.initializeBluetoothBeacons = function(){
        if (InputControls.areBluetoothBeaconsSupported()){
            InputControls.useBluetoothBeacons = SepiaFW.data.get('useBluetoothBeacons');
            if (typeof InputControls.useBluetoothBeacons == 'undefined') InputControls.useBluetoothBeacons = false;
            SepiaFW.debug.info("Listening to Bluetooth Beacons is " + ((InputControls.useBluetoothBeacons)? "ACTIVATED" : "NOT ACTIVATED"));

            InputControls.useBluetoothBeaconsInAoModeOnly = SepiaFW.data.get('useBluetoothBeaconsInAoModeOnly');
            if (typeof InputControls.useBluetoothBeaconsInAoModeOnly == 'undefined') InputControls.useBluetoothBeaconsInAoModeOnly = false;
            SepiaFW.debug.info("Bluetooth Beacons 'in AO-mode only' is " + ((InputControls.useBluetoothBeaconsInAoModeOnly)? "TRUE" : "FALSE"));

            InputControls.useBluetoothBeaconsOnlyWithPower = SepiaFW.data.get('useBluetoothBeaconsOnlyWithPower');
            if (typeof InputControls.useBluetoothBeaconsOnlyWithPower == 'undefined') InputControls.useBluetoothBeaconsOnlyWithPower = false;
            SepiaFW.debug.info("Bluetooth Beacons 'only with power plug' is " + ((InputControls.useBluetoothBeaconsOnlyWithPower)? "TRUE" : "FALSE"));

            //Add onActive action:
            SepiaFW.client.addOnActiveOneTimeAction(inputControlsOnActiveActionBeacons);
        }
    }
    function inputControlsOnActiveActionPadAndKeys(){
        if (InputControls.useGamepads){
            //wait a bit
            setTimeout(function(){
                InputControls.setup();
            }, 1000);
        }
    }
    function inputControlsOnActiveActionBeacons(){
        if (InputControls.useBluetoothBeacons && !InputControls.useBluetoothBeaconsInAoModeOnly){
            //wait a bit
            setTimeout(function(){
                InputControls.listenToBluetoothBeacons();
            }, 2000);
        }
    }

    //----------------------

    InputControls.setup = function () {
        //console.log('Input controls setup');
        InputControls.listenToGamepadConnectEvent();
        InputControls.listenToGlobalHotkeys();
        InputControls.listenToClexiButtons();
        //Import settings
        InputControls.importMappings();
    }

    InputControls.useGamepads = false;          //switchable in settings    -   NOTE: this currently also applies to Hotkeys and CLEXI buttons
    InputControls.useHotkeysInAlwaysOn = true;  //hardcoded here for now
    InputControls.useBluetoothBeacons = false;  //switchable in settings
    InputControls.useBluetoothBeaconsInAoModeOnly = false;  //switchable in settings
    InputControls.useBluetoothBeaconsOnlyWithPower = false; //switchable in settings

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
        //Ignore keys
        $('#SepiaFW-hotkeys-ignore-key1').off().on('change', function(){
            if (this.value){
                ignoreKeys = JSON.parse("[" + this.value + "]");
                settingsAppendDebug("New ignore keys: " + JSON.stringify(ignoreKeys));
            }
        });
        //Buttons for button mappings
        $('#SepiaFW-buttons-define-mic').off().on('click', function(){
            InputControls.defineButtonFunction(toggleMicrophone);
        });
        $('#SepiaFW-buttons-define-back').off().on('click', function(){
            InputControls.defineButtonFunction(backButton);
        });
        //build toggles
        //--Gamepad
        var gamepadUse = document.getElementById('sepiaFW-input-controls-gamepad-box');
        gamepadUse.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-input-controls-toggle-gamepad', 
            function(){
                InputControls.useGamepads = true;
                SepiaFW.data.set('useGamepads', true);
                SepiaFW.debug.info("Gamepad support activated");
                SepiaFW.inputControls.setup(); //.listenToGamepadConnectEvent();
            },function(){
                InputControls.useGamepads = false;
                SepiaFW.data.set('useGamepads', false);
                SepiaFW.debug.info("Gamepad support deactivated");
                SepiaFW.inputControls.setup();
            }, InputControls.useGamepads)
        );
        //--BLE Beacons
        var beaconScan = document.getElementById('sepiaFW-input-controls-beacon-box');
        beaconScan.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-input-controls-beacon', 
            function(){
                InputControls.useBluetoothBeacons = true;
                SepiaFW.data.set('useBluetoothBeacons', true);
                InputControls.listenToBluetoothBeacons();
                SepiaFW.debug.info("Listening to Bluetooth Beacons.");
            },function(){
                InputControls.useBluetoothBeacons = false;
                SepiaFW.data.set('useBluetoothBeacons', false);
                InputControls.stopListeningToBluetoothBeacons();
                SepiaFW.debug.info("NOT listening to Bluetooth Beacons.");
            }, InputControls.useBluetoothBeacons)
        );
        var beaconAoModeOnly = document.getElementById('sepiaFW-input-controls-beacon-ao-box');
        beaconAoModeOnly.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-input-controls-beacon-ao', 
            function(){
                InputControls.useBluetoothBeaconsInAoModeOnly = true;
                SepiaFW.data.set('useBluetoothBeaconsInAoModeOnly', true);
                SepiaFW.debug.info("Listening to Bluetooth Beacons in AO-Mode only.");
            },function(){
                InputControls.useBluetoothBeaconsInAoModeOnly = false;
                SepiaFW.data.set('useBluetoothBeaconsInAoModeOnly', false);
                SepiaFW.debug.info("Listening to Bluetooth Beacons in every mode (if enabled).");
            }, InputControls.useBluetoothBeaconsInAoModeOnly)
        );
        var beaconPowerPlugOnly = document.getElementById('sepiaFW-input-controls-beacon-power-box');
        beaconPowerPlugOnly.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-input-controls-beacon-power', 
            function(){
                InputControls.useBluetoothBeaconsOnlyWithPower = true;
                SepiaFW.data.set('useBluetoothBeaconsOnlyWithPower', true);
                SepiaFW.debug.info("Listening to Bluetooth Beacons only with power-plug.");
            },function(){
                InputControls.useBluetoothBeaconsOnlyWithPower = false;
                SepiaFW.data.set('useBluetoothBeaconsOnlyWithPower', false);
                SepiaFW.debug.info("Listening to Bluetooth Beacons with and without power-plug.");
            }, InputControls.useBluetoothBeaconsOnlyWithPower)
        );
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
        settingsAppendDebug("<b>Ignoring keys:</b>");
        settingsAppendDebug(JSON.stringify(ignoreKeys));
        settingsAppendDebug("<b>Button matrix:</b>");
        settingsAppendDebug(convertActionMatrixToString(buttonActionMatrix));
        settingsAppendDebug("<hr>");
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
        SepiaFW.data.set("input-controls-ignore", JSON.stringify({
            "keys": ignoreKeys,
            "buttons": ignoreButtons
        }));
        SepiaFW.debug.log('Stored hotkeys and button settings in client storage.');
        SepiaFW.ui.showPopup('Stored hotkeys and button settings.');
    }
    InputControls.clearMappings = function(){
        SepiaFW.data.set("input-controls-buttons", "");
        SepiaFW.data.set("input-controls-hotkeys", "");
        SepiaFW.data.set("input-controls-ignore", "");
        SepiaFW.debug.log('Cleared hotkeys and button settings from client storage.');
        SepiaFW.ui.showPopup('Cleared hotkeys and button settings (please reload app).');
    }
    InputControls.importMappings = function(){
        var buttonsMapString = SepiaFW.data.get("input-controls-buttons");
        var keysMapString = SepiaFW.data.get("input-controls-hotkeys");
        var ignoresString = SepiaFW.data.get("input-controls-ignore");
        if (buttonsMapString)   buttonActionMatrix = importJsonToActionMatrix(buttonsMapString);
        if (keysMapString)      hotkeyActionMatrix = importJsonToActionMatrix(keysMapString);
        if (ignoresString){
            ignoresJson = JSON.parse(ignoresString);
            ignoreKeys = ignoresJson.keys;
            $('#SepiaFW-hotkeys-ignore-key1').val(JSON.stringify(ignoreKeys).replace(/\[|\]/g, ""));
            ignoreButtons = ignoresJson.buttons;
        }
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

    //-------------- shared event handler ---------------

    function handleRemoteInputEvent(e){
        if (!e) return;        
        //MIC with permission check
        if (e == "F4"){
            if (SepiaFW.wakeTriggers && SepiaFW.wakeTriggers.useWakeWord){
                toggleMicrophone();
            }else{
                SepiaFW.debug.log("InputControls remoteAction - NOT ALLOWED to use remote wake-word! Key: " + e);    
            }
        //MIC
        }else if (e == "mic"){
            toggleMicrophone();
        //BACK
        }else if (e == "back"){
            backButton();
        //AO-Mode
        }else if (e == "ao"){
            openAlwaysOn();
        //Next and previous view
        }else if (e == "next"){
            nextChatView();
        }else if (e == "prev"){
            previousChatView();
        //Unknown
        }else{
            SepiaFW.debug.log("InputControls remoteAction - no handler yet for key: " + e);
        }
    }

    //---------------- Bluetooth Beacons ----------------

    var isScannigBeacons = false;
    var bleBeaconInterface = undefined;
    InputControls.isScannigForBeacons = function(){
        return isScannigBeacons;
    }

    InputControls.areBluetoothBeaconsSupported = function(){
        if ("evothings" in window && evothings.eddystone){
            bleBeaconInterface = "evothings";
            return true;
        }else if (SepiaFW.clexi){
            bleBeaconInterface = "clexi";
            return  SepiaFW.clexi.isSupported;      //actually at this point we do not yet know if CLEXI runs with BLE support
        }else{
            bleBeaconInterface = "none";
            return false;
        }
    }
    InputControls.listenToBluetoothBeacons = function(){
        if (InputControls.areBluetoothBeaconsSupported()){
            if (!isScannigBeacons){
                //evothings scanner - TODO: what if we want to force CLEXI BLE?
                if (bleBeaconInterface == "evothings"){
                    evothings.eddystone.startScan(function(beaconData){
                        //Found
                        InputControls.handleBluetoothBeaconData(beaconData);
                    }, function(error){
                        //Error
                        InputControls.handleBluetoothBeaconError(error);
                    });
                    isScannigBeacons = true;
                
                //clexi xtension scanner
                }else if (bleBeaconInterface == "clexi"){
                    SepiaFW.clexi.startBleBeaconScanner();
                    SepiaFW.clexi.addBleBeaconEventListener(InputControls.handleBluetoothBeaconData);
                    SepiaFW.clexi.addBleBeaconErrorListener(InputControls.handleBluetoothBeaconError);
                    isScannigBeacons = true;
                }
            }
        }else{
            alert("Sorry, but Bluetooth-Beacons are not yet supported on this device.");
            SepiaFW.ui.build.toggleButtonSetState('sepiaFW-input-controls-beacon', 'off');  //note: will not trigger "off" actions. OK?
            isScannigBeacons = false;
        }
    }
    InputControls.stopListeningToBluetoothBeacons = function(){
        if (InputControls.areBluetoothBeaconsSupported() && isScannigBeacons){
            //evothings scanner
            if (bleBeaconInterface == "evothings"){
                evothings.eddystone.stopScan();
                isScannigBeacons = false;
            
            //clexi xtension scanner
            }else if (bleBeaconInterface == "clexi"){
                SepiaFW.clexi.stopBleBeaconScanner();
                SepiaFW.clexi.removeBleBeaconEventListener(InputControls.handleBluetoothBeaconData);
                SepiaFW.clexi.removeBleBeaconErrorListener(InputControls.handleBluetoothBeaconError);
                isScannigBeacons = false;
            }
        }
    }

    InputControls.handleBluetoothBeaconError = function(error){
        SepiaFW.debug.error("Bluetooth-Beacon - " + error);
        if (InputControls.settingsAreOpen){
            settingsAppendDebug("Bluetooth-Beacon - " + error);
        }
        //TODO: do we want to switch off and reset or just set the button to off with no other effect?
        SepiaFW.ui.build.toggleButtonSetState('sepiaFW-input-controls-beacon', 'off');  //note: will not trigger "off" actions. OK?
        isScannigBeacons = false;
    }

    InputControls.handleBluetoothBeaconData = function(beaconData){
        if (beaconData && beaconData.detail && beaconData.detail.beacon){
            beaconData = beaconData.detail.beacon.eddystoneUrl;     //for now we just use eddystone URL
        }
        //TODO: we probably need a method to filter duplicated calls ... e.g. an ID of the beacon "session"
        //console.error("Beacon URL: " + beaconData.url + ", power: " + beaconData.txPower);
        if (InputControls.settingsAreOpen && beaconData){
            if (bleBeaconInterface == "evothings"){
                //debug with distance
                var distance = evothings.eddystone.calculateAccuracy(beaconData.txPower, beaconData.rssi);
                settingsAppendDebug("Beacon URL: " + beaconData.url + ", distance: " + distance);
            }else if (bleBeaconInterface == "clexi"){
                //debug
                //console.log(beaconData);
                settingsAppendDebug("Beacon URL: " + beaconData.url);
            }
        }else{
            if (!beaconData || !beaconData.url){
                return;
            }
            if (beaconData.url == lastBeaconUrl){
                if (!blockAllFurtherBeaconEvents){
                    //checkForBeaconLongpress(beaconData);      //currently this will never trigger (first event will block it)
                }
                return;
            }else{
                lastBeaconUrl = beaconData.url;
                currentBeaconRepeat = 0;
                blockAllFurtherBeaconEvents = false;
            }
            var e = getBeaconEvent(beaconData);
            handleRemoteInputEvent(e);

            blockAllFurtherBeaconEvents = true;
        }
    }
    function getBeaconEvent(beaconData){
        //Examples (device ID A1, case insensitive):
        //https://b07z.net/BT/A1/mic0
        //https://b07z.net/_A1/r
        //https://b07z.net/A1/back
        var baseUrl = "b07z.net";
        var basePath = "BT/";
        var deviceId = SepiaFW.config.getDeviceId();
        if (deviceId){
            basePath = (deviceId + "/");
        }
        baseUrl = baseUrl.toLowerCase();
        basePath = basePath.toLowerCase();
        var beaconDataUrlLower = (beaconData.url)? beaconData.url.toLowerCase() : "";
        if (beaconDataUrlLower.indexOf(baseUrl + "/") < 0){
            //Not an accepted SEPIA URL
            return "";
        }
        if (beaconDataUrlLower.indexOf("/" + basePath) < 0 && beaconDataUrlLower.indexOf("_" + basePath + "/") < 0){
            //Not a valid URL path (should be e.g.: /BT/ or /A1/ or _A1)
            return "";
        }
        //MIC (Record)
        if (beaconDataUrlLower.indexOf(basePath + "mic") >= 0 || beaconDataUrlLower.indexOf(basePath + "r") >= 0){
            return "mic";
        //BACK
        }else if (beaconDataUrlLower.indexOf(basePath + "back") >= 0 || beaconDataUrlLower.indexOf(basePath + "b") >= 0){
            return "back";
        //AO-mode
        }else if (beaconDataUrlLower.indexOf(basePath + "ao") >= 0){
            return "ao";
        //Next & previous
        }else if (beaconDataUrlLower.indexOf(basePath + "next") >= 0 || beaconDataUrlLower.indexOf(basePath + "nx") >= 0){
            return "next";
        }else if (beaconDataUrlLower.indexOf(basePath + "prev") >= 0 || beaconDataUrlLower.indexOf(basePath + "pr") >= 0){
            return "prev";
        }else{
            return "";
        }
    }
    var lastBeaconUrl = "";
    var currentBeaconRepeat = 0;
    var blockAllFurtherBeaconEvents = false;
    function checkForBeaconLongpress(beaconData){
        currentBeaconRepeat++;
        if (currentBeaconRepeat > 6){
            blockAllFurtherBeaconEvents = true;
            //handle long-press once
            //TODO: can we make proper use of this?
        }
    }

    //----------------- Remote Hotkeys/Buttons ------------------

    //This will be sent over the chat-server connection
    InputControls.handleRemoteHotkeys = function(data){
        handleRemoteInputEvent(data.key);
    }

    //This will be received via CLEXI connection
    InputControls.handleClexiRemoteButton = function(data){
        if (data.detail){
            //console.log(data.detail);
            if (data.detail.name == "remoteButton"){
                var remoteData = data.detail.data;
                var deviceId = SepiaFW.config.getDeviceId();
                if (remoteData && remoteData.deviceId && remoteData.deviceId.toLowerCase() == deviceId){
                    handleRemoteInputEvent(remoteData.button);
                }
            }
        }
    }
    //This will listen to the proper event
    InputControls.listenToClexiButtons = function(){
        if (InputControls.useGamepads && SepiaFW.clexi){
            SepiaFW.clexi.addHttpEventsListener(InputControls.handleClexiRemoteButton);
        }else{
            SepiaFW.clexi.removeHttpEventsListener(InputControls.handleClexiRemoteButton);
        }
    }

    //--------------- Keyboard Shortcuts ----------------

    var hotkeyActionMatrix = {};    //{unicode-key} -> action
    var ignoreKeys = [];            //for quirky controllers that always fire more than one event at the same time

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
        //ignore?
        if (ignoreKeys && ignoreKeys.length > 0 && $.inArray(e.which, ignoreKeys) > -1){
            return;
        }
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
    var ignoreButtons = [];         //for quirky controllers that always fire more than one event at the same time
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
    function openAlwaysOn(){
        SepiaFW.ui.closeAllMenus();
        SepiaFW.alwaysOn.start();
    }
    function resetMic(){
        SepiaFW.ui.resetMicButton();
    }
    function test1(){
        console.log('TEST 1');
    }
    function test2(){
        console.log('TEST 2');
    }

    return InputControls;
}