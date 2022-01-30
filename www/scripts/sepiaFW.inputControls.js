//Handle input controls like gamepads for remote triggers etc.
function sepiaFW_build_input_controls() {
    var InputControls = {};
    InputControls.cmdl = sepiaFW_build_input_controls_cmdl();

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

            InputControls.knownBluetoothBeaconAddresses = SepiaFW.data.get('knownBluetoothBeaconAddresses') || [];
            if (typeof InputControls.knownBluetoothBeaconAddresses.length != 'number') InputControls.knownBluetoothBeaconAddresses = [];
            SepiaFW.debug.info("Bluetooth Beacons allowed addresses: " + InputControls.knownBluetoothBeaconAddresses.length);

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
        //console.error('Input controls setup');
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
    InputControls.knownBluetoothBeaconAddresses = [];

    //Load controls settings view
    InputControls.openSettings = function(){
        SepiaFW.frames.open({ 
            pageUrl: "input-controls.html",
            onFinishSetup: onSetupFinish,
            onOpen: onSettingsOpen,
            onClose: onSettingsClose
        });
    }
    function onSetupFinish(){
        //Buttons for hotkey mappings
        $('#SepiaFW-hotkeys-define-mic').off().on('click', function(){
            InputControls.defineHotkeyFunction(toggleMicrophone);
        });
        $('#SepiaFW-hotkeys-define-reset-mic').off().on('click', function(){
            InputControls.defineHotkeyFunction(resetMic);
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
        $('#SepiaFW-buttons-define-reset-mic').off().on('click', function(){
            InputControls.defineButtonFunction(resetMic);
        });
        $('#SepiaFW-buttons-define-next-view').off().on('click', function(){
            InputControls.defineButtonFunction(nextView);
        });
        $('#SepiaFW-buttons-define-prev-view').off().on('click', function(){
            InputControls.defineButtonFunction(previousView);
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
        var beaconKnownAddresses = document.getElementById('sepiaFW-input-controls-beacon-known-addresses');
        beaconKnownAddresses.value = InputControls.knownBluetoothBeaconAddresses.join(", ");
        $(beaconKnownAddresses).off().on('change', function(){
            if (this.value){
                InputControls.knownBluetoothBeaconAddresses = this.value.trim().split(/\s*,\s*/g);
            }else{
                InputControls.knownBluetoothBeaconAddresses = [];
            }
            SepiaFW.debug.log("Known BLE Beacons:", InputControls.knownBluetoothBeaconAddresses);
            SepiaFW.data.set('knownBluetoothBeaconAddresses', InputControls.knownBluetoothBeaconAddresses);
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
        settingsAppendDebug(convertActionMatrixToString(hotkeyActionMatrix, true));
        settingsAppendDebug("<b>Ignoring keys:</b>");
        settingsAppendDebug(JSON.stringify(ignoreKeys, undefined, 1));
        settingsAppendDebug("<b>Button matrix:</b>");
        settingsAppendDebug(convertActionMatrixToString(buttonActionMatrix, true));
        settingsAppendDebug("<hr>");
        settingsAppendDebug("<b>Controller and key events:</b>");

        SepiaFW.ui.scrollToTop('sepiaFW-frame-page-1');
    }
    function onSettingsClose(){
        $settingsDebugField = undefined;
        InputControls.settingsAreOpen = false;
    }
    function settingsAppendDebug(msg){
        if ($settingsDebugField){
            $settingsDebugField.append(SepiaFW.tools.sanitizeHtml("<p>" + msg + "</p>"));
            $settingsDebugField[0].scrollIntoView(false);
        }
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
    function convertActionMatrixToString(actionMatrix, pretty){
        if (actionMatrix){
            if (pretty){
                return JSON.stringify(actionMatrix, 
                    function(key, val) { return (typeof val === 'function')? val.name : val; }, 1
                );
            }else{
                return JSON.stringify(actionMatrix, 
                    function(key, val) { return (typeof val === 'function')? val.name : val; }
                );
            }
        }else{
            return "";
        }
    }
    function importJsonToActionMatrix(jsonString){
        if (jsonString){
            return JSON.parse(jsonString,
                function(key, val) { return (typeof val === 'string')? buttonFunctionsAvailable[val] : val; }
            );
        }else{
            return {};
        }
    }

    //-------------- shared event handler ---------------

    function handleRemoteInputEvent(e, source, sourceDetails){
        //sources: ble-beacon, ble-beacon-registered, clexi-remote, clexi-gpio, sepia-chat-server
        if (!source) source = "remote-input";
        if (!sourceDetails) sourceDetails = {};
        var isProtectedSource = false;
        if (source && source.indexOf("sepia-chat-server") >= 0){
            isProtectedSource = true;
        }else if (source && SepiaFW.clexi.serverId && (
            source.indexOf("clexi-remote") >= 0 ||
            source.indexOf("clexi-gpio") >= 0
        )){
            isProtectedSource = true;
        }else if (source && source.indexOf("ble-beacon-registered") >= 0){
            isProtectedSource = true;
        }
        if (!e) return;
        //Protected events - source must be trusted
        if (isProtectedSource){
            //MIC with permission check
            if (e == "F4" || e == "1"){
                if (SepiaFW.wakeTriggers && SepiaFW.wakeTriggers.useWakeWord){
                    toggleMicrophone(source);
                }else{
                    SepiaFW.debug.log("InputControls remoteAction - NOT ALLOWED to use remote wake-word! Key:", e);
                }
            //MIC
            }else if (e == "mic"){
                toggleMicrophone(source);
            }else if (e == "mr" || e == "micReset"){
                resetMic();
            //BACK
            }else if (e == "back" || e == "2"){
                backButton();
            //AO-Mode
            }else if (e == "ao" || e == "5"){
                openAlwaysOn();
            //Next and previous view
            }else if (e == "next" || e == "3"){
                nextView();
            }else if (e == "prev" || e == "4"){
                previousView();
            //Client connection
            }else if (e == "co" || e == "connect"){
                clientConnect();
            }else if (e == "dc" || e == "disconnect"){
                clientDisconnect();
            //Wake-word
            }else if (e == "ww" || e == "wakeWordOn"){
                wakeWordOn();
            }else if (e == "wm" || e == "wakeWordOff"){
                wakeWordOff();
            //Reload client
            }else if (e == "F5" || e == "reload"){
                reloadClient();
            //Unknown
            }else{
                SepiaFW.debug.log("InputControls remoteAction - no handler yet for key:", e);
            }
        }else{
            logProtectedRemoteInputFail(e, source, sourceDetails);
        }
    }
    function logProtectedRemoteInputFail(e, source, sourceDetails){
        SepiaFW.debug.error("InputControls remoteAction - failed to call protected action: " + e + " - source: " + source);
        if (source == "ble-beacon" && sourceDetails && sourceDetails.address){
            SepiaFW.debug.error("Note: If you want to use BLE beacon '" + sourceDetails.address + "' add it to known devices!");
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
                    if (InputControls.settingsAreOpen){
                        settingsAppendDebug("Starting BLE scan via device interface.");
                    }
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
                    if (InputControls.settingsAreOpen){
                        settingsAppendDebug("Starting BLE scan via CLEXI interface. Please make sure CLEXI is connected.");
                    }
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
            let reducedData = beaconData.detail.beacon.eddystoneUrl || {};
            reducedData.address = beaconData.detail.beacon.address;
            reducedData.beaconType = beaconData.detail.beacon.beaconType;
            beaconData = reducedData;     //for now we use eddystone URL, power level, address and beaconType
        }
        //console.error("Beacon: " + JSON.stringify(beaconData));
        var isKnown = false;
        if (beaconData && beaconData.address){
            if (InputControls.knownBluetoothBeaconAddresses.indexOf(beaconData.address) >= 0){
                isKnown = true;
            }
        }
        if (InputControls.settingsAreOpen && beaconData){
            if (!beaconData.url){
                settingsAppendDebug("Unsupported Beacon signal: " + JSON.stringify(beaconData));
            }else if (bleBeaconInterface == "evothings"){
                //debug with distance
                var distance = evothings.eddystone.calculateAccuracy(beaconData.txPower, beaconData.rssi);
                settingsAppendDebug("Beacon URL (device: " + (isKnown? "known" : "unknown") + "): " + beaconData.url + ", distance: " + distance + ", address: " + beaconData.address);
            }else if (bleBeaconInterface == "clexi"){
                //debug
                settingsAppendDebug("Beacon URL (device: " + (isKnown? "known" : "unknown") + "): " + beaconData.url + ", address: " + beaconData.address);
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
            var source = isKnown? "ble-beacon-registered" : "ble-beacon";
            handleRemoteInputEvent(e, source, beaconData);

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
        handleRemoteInputEvent(data.key, "sepia-chat-server");
        //TODO: there is an optional 'language' parameter available as well ...
    }

    //This will be received via CLEXI connection
    InputControls.handleClexiRemoteButton = function(remoteData){
        //console.log(remoteData);
        var deviceId = SepiaFW.config.getDeviceId();
        if (remoteData.deviceId && remoteData.deviceId == deviceId){
            handleRemoteInputEvent(remoteData.button, "clexi-remote");
        }
    }
    //This will listen to the proper event
    InputControls.listenToClexiButtons = function(){
        if (InputControls.useGamepads && SepiaFW.clexi){
            SepiaFW.clexi.addHttpEventsListener("remote-button", InputControls.handleClexiRemoteButton);
        }else if (SepiaFW.clexi){
            SepiaFW.clexi.removeHttpEventsListener("remote-button");
        }
    }
    //This will be called by CLEXI GPIO hardware buttons/events (the listener is inside clexi module)
    InputControls.handleClexiHardwareButton = function(eventData){
        handleRemoteInputEvent(eventData, "clexi-gpio");
    }

    //--------------- Keyboard Shortcuts ----------------

    var hotkeyActionMatrix = {};    //{unicode-key} -> action
    var ignoreKeys = [];            //for quirky controllers that always fire more than one event at the same time
    var isHotkeyListening = false;

    InputControls.listenToGlobalHotkeys = function(){
        if (InputControls.useGamepads && InputControls.useHotkeysInAlwaysOn){
            if (!isHotkeyListening){
                document.addEventListener("keyup", onHotkey);
                //temporary button mapping              - TODO: make button actions configurable
                /*
                hotkeyActionMatrix[40] = defaultButtonActionOnRelease;      //Arrow down
                hotkeyActionMatrix[74] = defaultButtonActionOnRelease;      //j - for gamepad mapped as keyboard e.g.
                */
                isHotkeyListening = true;
            }
        }else{
            document.removeEventListener("keyup", onHotkey);
            isHotkeyListening = false;
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
            if (action) action("app-hotkey");
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

    InputControls.showControllers = function(){
        return controllers;
    }

    //Start listening for gamepad connections or restart state scan-loop
    InputControls.listenToGamepadConnectEvent = function(){
        if (InputControls.useGamepads){
            if (!isGamepadListening){
                //Listen for connection
                if ('GamepadEvent' in window){
                    window.addEventListener("gamepadconnected", connecthandler);
                    window.addEventListener("gamepaddisconnected", disconnecthandler);
                    isGamepadListening = true;
                    rAF(updateStatus);
                }else if ('WebKitGamepadEvent' in window){
                    window.addEventListener("webkitgamepadconnected", connecthandler);
                    window.addEventListener("webkitgamepaddisconnected", disconnecthandler);
                    isGamepadListening = true;
                    rAF(updateStatus);
                }else{
                    SepiaFW.debug.err('Gamepad controls are not supported by client!');
                }
            }else{
                //Restart state update loop
                rAF(updateStatus);
            }
        }else{
            //remove listeners if they were set
            window.removeEventListener("gamepadconnected", connecthandler);
            window.removeEventListener("gamepaddisconnected", disconnecthandler);
            window.removeEventListener("webkitgamepadconnected", connecthandler);
            window.removeEventListener("webkitgamepaddisconnected", disconnecthandler);
            isGamepadListening = false;
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
        if (gamepadUpdateLoopRunning){
            return;
        }else{
            gamepadUpdateLoopRunning = true;
        }
        //any gamepads left?
        if (!InputControls.useGamepads || controllers.length <= 0){
            //abort loop
            gamepadUpdateLoopRunning = false;
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
        gamepadUpdateLoopRunning = false;
        rAF(updateStatus);
    }
    var gamepadUpdateLoopRunning = false;

    //Check button event for press/release
    function checkButtonState(controllerIndex, buttonIndex, button){
        //console.error('checkButtonState: ' + controllerIndex + " - " + buttonIndex + " - " + button.pressed);
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
                        action("controller-button");
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
        for (var i = 0; i < Object.keys(controllers).length; i++) {
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
        toggleMicrophone("app-hotkey");
    }
    function toggleMicrophone(sourceAction){
        SepiaFW.ui.toggleMicButton(undefined, sourceAction);
    }
    function nextView(sourceAction){
        SepiaFW.ui.pageRight();
    }
    function previousView(sourceAction){
        SepiaFW.ui.pageLeft();
    }
    function backButton(sourceAction){
        SepiaFW.ui.backButtonAction();
    }
    function openAlwaysOn(sourceAction){
        SepiaFW.ui.closeAllMenus();
        SepiaFW.alwaysOn.start();
    }
    function resetMic(sourceAction){
        SepiaFW.ui.resetMicButton();
    }
    function clientConnect(sourceAction){
        SepiaFW.client.resumeClient();
    }
    function clientDisconnect(sourceAction){
        SepiaFW.client.closeClient();
    }
    function wakeWordOn(sourceAction){
        if (!SepiaFW.wakeTriggers.engineLoaded){
            SepiaFW.wakeTriggers.setupWakeWords();      //will auto-start after setup
        }else if (!SepiaFW.wakeTriggers.isListening()){
            SepiaFW.wakeTriggers.listenToWakeWords();
        }
    }
    function wakeWordOff(sourceAction){
        if (SepiaFW.wakeTriggers.engineLoaded && SepiaFW.wakeTriggers.isListening()){
            SepiaFW.wakeTriggers.stopListeningToWakeWords();
        }
    }
    function reloadClient(sourceAction){
        setTimeout(function(){
            window.location.reload();
        }, 1000);
    }
    function test1(sourceAction){
        console.log('TEST 1');
    }
    function test2(sourceAction){
        console.log('TEST 2');
    }

    var buttonFunctionsAvailable = {
        "toggleMicrophone": toggleMicrophone,
        "nextView": nextView,
        "previousView": previousView,
        "backButton": backButton,
        "openAlwaysOn": openAlwaysOn,
        "resetMic": resetMic,
        "clientConnect": clientConnect,
        "clientDisconnect": clientDisconnect,
        "wakeWordOn": wakeWordOn,
        "wakeWordOff": wakeWordOff,
        "reloadClient": reloadClient
    }

    return InputControls;
}