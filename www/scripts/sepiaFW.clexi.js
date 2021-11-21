function sepiaFW_build_clexi(){
    var Clexi = {};

    Clexi.isSupported = ('ClexiJS' in window);
    Clexi.socketURI = "";       //default CLEXI server: wss://raspberrypi.local:8443
    Clexi.serverId = "";
    Clexi.doConnect = false;
    function doConnect(clexiUrlParam, clexiIdUrlParam){
        if (clexiUrlParam == undefined) clexiUrlParam = SepiaFW.tools.getURLParameter('clexi');
        if (clexiIdUrlParam == undefined) clexiIdUrlParam = SepiaFW.tools.getURLParameter('clexiId');
        var useClexi = SepiaFW.data.get('clexiConnect') || (clexiUrlParam && clexiIdUrlParam);
        if (useClexi == undefined){
            return false;   //default
        }else{
            return !!useClexi;
        }
    }
    Clexi.numOfSendRetries = 10;

    Clexi.setSocketURI = function(newURI){
        SepiaFW.data.set('clexiSocketURI', newURI);
        Clexi.socketURI = newURI;
    }
    Clexi.setServerId = function(newId){
        SepiaFW.data.set('clexiServerId', newId);
        Clexi.serverId = newId;
        ClexiJS.serverId = Clexi.serverId;
    }

    Clexi.initialize = function(){
        var clexiUrlParam = SepiaFW.tools.getURLParameter('clexi');
        var clexiIdUrlParam = SepiaFW.tools.getURLParameter('clexiId');
        Clexi.socketURI = clexiUrlParam || SepiaFW.data.get('clexiSocketURI') || "";
        Clexi.serverId = clexiIdUrlParam || SepiaFW.data.get('clexiServerId') || "";
        
        ClexiJS.serverId = Clexi.serverId;
        ClexiJS.clientBaseId = "SEPIA-" + SepiaFW.config.getDeviceId() + "-";
        
        Clexi.doConnect = doConnect(clexiUrlParam || '', clexiIdUrlParam || '');
        SepiaFW.debug.info("CLEXI support is " + ((Clexi.isSupported && Clexi.doConnect)? "ENABLED" : "DISABLED"));

        //Add onActive action:
        SepiaFW.client.addOnActiveAction(clexiOnAction);
    }
    function clexiOnAction(){
        if (SepiaFW.clexi.isSupported && SepiaFW.clexi.doConnect){
            setTimeout(function(){
                //check first if already running
                if (!Clexi.isConnected()){
                    Clexi.setup();
                }
            }, 500);
        }
    }

    //This is called after user login via 'Client.onActive' (see above)
    Clexi.setup = function(){
        //Logging
        ClexiJS.onLog = SepiaFW.debug.log;
        ClexiJS.onDebug = SepiaFW.debug.info;
        ClexiJS.onError = SepiaFW.debug.error;
          
        if (Clexi.socketURI){
            Clexi.connect();    
        }else{
            //show warning
            var config = {
                buttonOneName : "Ok",
                buttonOneAction : function(){}
                //we could add a 'more info' button here
            };
            SepiaFW.ui.showPopup("Can't connect to CLEXI, enter valid server first.", config);
            //reset button
            if ($('#sepiaFW-menu-toggle-clexi').attr('data-toggle-state') == "on"){
                $('#sepiaFW-menu-toggle-clexi').trigger('click');
            }
        }
    }

    var rgyIndicators = [];
    Clexi.addStateIndicatorRGY = function(sepiaIndicator){
        rgyIndicators.push(sepiaIndicator);
    }

    Clexi.isConnected = function(){
        return ClexiJS.isConnected();
    }

    Clexi.connect = function(){
        Clexi.doConnect = doConnect();
        ClexiJS.connect(Clexi.socketURI, function(e){
            //connected
            rgyIndicators.forEach(function(indi){
                indi.setState("g");
            });
            
        }, function(e){
            //closed
            rgyIndicators.forEach(function(indi){
                indi.setState("r");
            });
            removeAllSubscriptions();
            
        }, function(err){
            //error
            rgyIndicators.forEach(function(indi){
                indi.setState("r");
            });
            removeAllSubscriptions();
        
        }, function(){
            //connecting
            rgyIndicators.forEach(function(indi){
                indi.setState("y");
            });
        
        }, function(welcomeInfo){
            //welcome-event
            
            //subscribe
            subscribeToBroadcaster();
            subscribeToHttpEvents();
            if (Clexi.hasXtension("ble-beacon-scanner")){
                subscribeToBeaconScanner();
                //request state
                Clexi.requestBleBeaconScannerState();       //TODO: repeat from time to time or at least on error?
            }
            if (Clexi.hasXtension("runtime-commands")){
                subscribeToRuntimeCommands();
            }
            if (Clexi.hasXtension("gpio-interface")){
                subscribeToGpioInterface();
                //request registrations
                Clexi.requestRegisteredGpioObjects();       //TODO: handle refresh
            }
        });
    }
    Clexi.close = function(){
        ClexiJS.close();
        Clexi.doConnect = doConnect();
    }

    Clexi.send = function(extensionName, data, numOfRetries){
        if (numOfRetries == undefined) numOfRetries = Clexi.numOfSendRetries;
        ClexiJS.send(extensionName, data, numOfRetries);
    }

    Clexi.getXtensions = function(){
        return ClexiJS.availableXtensions;      //NOTE: the status might not be up-to-date (only refreshed at welcome)
    }
    Clexi.hasXtension = function(name){
        return !!(ClexiJS.availableXtensions && ClexiJS.availableXtensions[name]);
    }

    //CLEXI broadcaster (used e.g. for remote setup):

    Clexi.broadcastToAll = function(data){
        if (Clexi.doConnect){
            ClexiJS.send('clexi-broadcaster', data, Clexi.numOfSendRetries);
        }
    }

    function subscribeToBroadcaster(){
        //format:
        /*{
            name: "event-name",
            data: eventData
        }*/
        ClexiJS.subscribeTo('clexi-broadcaster', function(e){
            //console.log('Broadcaster event: ' + JSON.stringify(e));
            var event = new CustomEvent('clexi-broadcaster-msg', {detail: (e.broadcast || e)});
            document.dispatchEvent(event);
        }, function(e){
            //console.log('Broadcaster response: ' + e);
        }, function(e){
            console.error('Broadcaster error: ' + JSON.stringify(e));
        });
    }
    function removeBroadcasterSubscription(){
        ClexiJS.removeSubscription('clexi-broadcaster');
    }
    Clexi.addBroadcastListener = function(name, callback){
        //remove old?
        if (broadcastListenerCallbacks[name]){
            Clexi.removeBroadcastListener(name);
        }
        //add new
        var fun = function(ev){
            if (ev.detail && ev.detail.data && ev.detail.name == name){
                callback(ev.detail.data);
            }
        }
        broadcastListenerCallbacks[name] = fun;
        document.addEventListener('clexi-broadcaster-msg', fun);
    }
    Clexi.removeBroadcastListener = function(name){
        var callback = broadcastListenerCallbacks[name];
        if (callback){
            document.removeEventListener('clexi-broadcaster-msg', callback);
        }
    }
    var broadcastListenerCallbacks = {};

    //CLEXI Http-Events (used e.g. InputControls.handleClexiRemoteButton):

    function subscribeToHttpEvents(){
        //format (example):
        /*{
            name: "remote-button",
            data: {
                deviceId: "o1",
                button: "mic"       //mic, back, ao, next, prev
            }
        }*/
        ClexiJS.subscribeTo('clexi-http-events', function(e){
            //console.log('HTTP-Event: ' + JSON.stringify(e));
            var event = new CustomEvent('clexi-http-events-msg', {detail: e});
            document.dispatchEvent(event);
        }, 
        //This is actually not used by the HTTP-Events extension
        function(e){
            console.log('HTTP-Event response: ' + e);
        }, function(e){
            console.error('HTTP-Event error: ' + JSON.stringify(e));
        });
    }
    function removeHttpEventsSubscription(){
        ClexiJS.removeSubscription('clexi-http-events');
    }
    Clexi.addHttpEventsListener = function(name, callback){
        //remove old?
        if (httpEventListenerCallbacks[name]){
            Clexi.removeHttpEventsListener(name);
        }
        //add new
        var fun = function(ev){
            if (ev.detail && ev.detail.data && ev.detail.name == name){
                callback(ev.detail.data);
            }
        }
        httpEventListenerCallbacks[name] = fun;
        document.addEventListener('clexi-http-events-msg', fun);
    }
    Clexi.removeHttpEventsListener = function(name){
        var callback = httpEventListenerCallbacks[name];
        if (callback){
            document.removeEventListener('clexi-http-events-msg', callback);
        }
    }
    var httpEventListenerCallbacks = {};

    //CLEXI ble beacon scanner

    Clexi.bleBeaconScannerState = undefined;
    var expectedBleBeaconScannerState = undefined;

    Clexi.startBleBeaconScanner = function(){
        SepiaFW.debug.log("CLEXI starting BLE Beacon scanner");
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "start"
        }, Clexi.numOfSendRetries);
        expectedBleBeaconScannerState = "on";
    }
    Clexi.stopBleBeaconScanner = function(){
        SepiaFW.debug.log("CLEXI stopping BLE Beacon scanner");
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "stop"
        }, Clexi.numOfSendRetries);
        expectedBleBeaconScannerState = "off";
    }
    Clexi.requestBleBeaconScannerState = function(){
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "state"
        }, Clexi.numOfSendRetries);
    }

    Clexi.addBleBeaconEventListener = function(callback){
        document.addEventListener('clexi-event-ble-beacon-scanner', callback);
    }
    Clexi.removeBleBeaconEventListener = function(callback){
        document.removeEventListener('clexi-event-ble-beacon-scanner', callback);
    }
    Clexi.addBleBeaconErrorListener = function(callback){
        document.addEventListener('clexi-error-ble-beacon-scanner', callback);
    }
    Clexi.removeBleBeaconErrorListener = function(callback){
        document.removeEventListener('clexi-error-ble-beacon-scanner', callback);
    }
    
    function subscribeToBeaconScanner(){
        ClexiJS.subscribeTo('ble-beacon-scanner', function(e){
            //console.log('BLE Beacon event: ' + JSON.stringify(e));
            if (e.ctrl){
                if (e.ctrl == "started"){
                    Clexi.bleBeaconScannerState = "on";
                }else if (e.ctrl == "stopped"){
                    Clexi.bleBeaconScannerState = "off";
                }
            }
            var event = new CustomEvent('clexi-event-ble-beacon-scanner', {detail: e});
            document.dispatchEvent(event);

        }, function(e){
            //console.log('BLE Beacon response: ' + JSON.stringify(e));
            if (e.state){
                Clexi.bleBeaconScannerState = e.state;
                //start 
                if (Clexi.bleBeaconScannerState != expectedBleBeaconScannerState && expectedBleBeaconScannerState == "on"){
                    //auto-restart scanner
                    Clexi.startBleBeaconScanner();
                }
            }
            var event = new CustomEvent('clexi-response-ble-beacon-scanner', {detail: e});
            document.dispatchEvent(event);

        }, function(e){
            //console.log('BLE Beacon error: ' + JSON.stringify(e));
            var event = new CustomEvent('clexi-error-ble-beacon-scanner', {detail: e});
            document.dispatchEvent(event);
            //Clexi.requestBleBeaconScannerState();     //TODO: do this here?
        });
    }
    function removeBeaconScannerSubscription(){
        ClexiJS.removeSubscription('ble-beacon-scanner');
    }

    //CLEXI runtime commands (used e.g. to shutdown DIY client):

    var clexiRuntimeCommandBaseId;
    var clexiRuntimeCommandLastIdIndex = 0;
    function getNewClexiRuntimeCmdId(){
        if (!clexiRuntimeCommandBaseId){
            clexiRuntimeCommandBaseId = "SEPIA-CLIENT-" + Math.abs(sjcl.random.randomWords(1)) + "-RT-" + SepiaFW.config.getDeviceId() + "-";
        }
        return (clexiRuntimeCommandBaseId + ++clexiRuntimeCommandLastIdIndex);
    }

    Clexi.sendRuntimeCommand = function(cmd, args, maxWait, tryCallback, successCallback, errorCallback){
        if (Clexi.doConnect && Clexi.hasXtension('runtime-commands')){
            var cmdId = getNewClexiRuntimeCmdId();
            //listen for return data to this cmdId
            var maxLifetime = maxWait || 15000;
            addRuntimeCommandsListener(cmdId, maxLifetime, function(data){
                /*{
                    result: result, || msg: error,
                    code: 200, || 202 (delayed), 204 (no action), 404, 500, 501
                    cmd: cmd,
                    cmdId: cmdId
                }*/
                if (data.code == 202){
                    //runtime will try to execute command and answer later - NOTE: not guaranteed
                    if (tryCallback) tryCallback(data.result, data, args);
                }else if (data.code == 200 || data.code == 204){
                    //runtime has completed successfully or completed without action
                    if (successCallback) successCallback(data.result, data, args);
                    removeRuntimeCommandsListener(cmdId);
                }else{
                    //not found, not supported, internal error etc.
                    if (errorCallback) errorCallback(data.msg || data.result, data.code, data, args);
                    removeRuntimeCommandsListener(cmdId);
                }
            });
            //track
            var unixTime = new Date().getTime();
            var cmdData = {
                id: cmdId,
                cmd: cmd,
                args: args,
                sentAt: unixTime,
                expires: (unixTime + maxLifetime)
            };
            runtimeCommandsActive[cmdId] = cmdData;
            //send
            ClexiJS.send('runtime-commands', cmdData, Clexi.numOfSendRetries);
            return 0;       //sent
        }else{
            //Extension not available?
            if (Clexi.doConnect){
                SepiaFW.debug.info("CLEXI extension: 'runtime-commands' not available!");
                return 2;   //not supported
            }else{
                return 1;   //not connected
            }
        }
    }

    Clexi.getActiveRuntimeCommands = function(){
        return runtimeCommandsActive;
    }
    Clexi.removeActiveRuntimeCommand = function(cmdId){
        delete runtimeCommandsActive[cmdId];
    }
    var runtimeCommandsActive = {};

    function subscribeToRuntimeCommands(){
        //format: see 'sendRuntimeCommand'
        ClexiJS.subscribeTo('runtime-commands', function(e){
            //console.log('RuntimeCommands event: ' + JSON.stringify(e));
            var event = new CustomEvent('clexi-runtime-commands-msg', {detail: e});
            document.dispatchEvent(event);
        }, function(e, msgId){
            //returns: 'sent' or 'sent but invalid' for invalid format
            if (e != "sent"){
                console.error('RuntimeCommands response: ' + e);
            }
        }, function(e){
            //console.error('RuntimeCommands error: ' + JSON.stringify(e));
            //we treat this the same way as success - the listener will handle response codes
            var event = new CustomEvent('clexi-runtime-commands-msg', {detail: e});
            document.dispatchEvent(event);
        });
    }
    function removeRuntimeCommandsSubscription(){
        ClexiJS.removeSubscription('runtime-commands');
    }

    function addRuntimeCommandsListener(cmdId, maxLifetime, callback){
        //remove old?
        if (runtimeCommandsListenerCallbacks[cmdId]){
            removeRuntimeCommandsListener(cmdId);
        }
        //add new
        var fun = function(ev){
            if (ev.detail && ev.detail.cmdId && ev.detail.cmdId == cmdId){
                callback(ev.detail);
            }
        }
        runtimeCommandsListenerCallbacks[cmdId] = fun;
        document.addEventListener('clexi-runtime-commands-msg', fun);
        //automatically remove listener after maxLifetime is over
        if (maxLifetime){
            setTimeout(function(){
                removeRuntimeCommandsListener(cmdId);
            }, maxLifetime);
        }
    }
    function removeRuntimeCommandsListener(cmdId){
        var callback = runtimeCommandsListenerCallbacks[cmdId];
        if (callback){
            document.removeEventListener('clexi-runtime-commands-msg', callback);
        }
        //TODO: this should kill maxLifetime timers as well
        delete runtimeCommandsActive[cmdId];
    }
    var runtimeCommandsListenerCallbacks = {};

    //GPIO Interface (e.g. to control hardware LEDs)

    //Register items defined e.g. via settings.js
    function registerGpioItems(alreadyRegistered){
        if (SepiaFW.settings && SepiaFW.settings.headless && 
                SepiaFW.settings.headless.device.clexiGpioInterface){
            var gpio = SepiaFW.settings.headless.device.clexiGpioInterface;
            if (gpio.buttons && gpio.buttons.length){
                if (!alreadyRegistered.buttons) alreadyRegistered.buttons = [];
                gpio.buttons.forEach(function(button){
                    if (button.pin != undefined){
                        var found = alreadyRegistered.buttons.find(function(o){ return (o.pin == button.pin); });
                        if (found){
                            SepiaFW.debug.info("CLEXI found GPIO button: " + button.id);
                        }else{
                            sendGpioInterfaceRequest("register", "button", button);
                            SepiaFW.debug.log("CLEXI registered GPIO button: " + button.id);
                            registeredGpioObjects[button.id] = button; //we assume it worked and can remove later if we get an error
                        }
                        //internally supported button IDs:
                        if (button.id == "hw-mic-button"){
                            gpioMicButton = button;
                        }
                    }
                });
            }
            if (gpio.leds && gpio.leds.length){
                if (!alreadyRegistered.leds) alreadyRegistered.leds = [];
                gpio.leds.forEach(function(led){
                    if (led.pin != undefined){
                        var found = alreadyRegistered.leds.find(function(o){ return (o.pin == led.pin); });
                        if (found){
                            SepiaFW.debug.info("CLEXI found GPIO led: " + led.id);
                        }else{
                            sendGpioInterfaceRequest("register", "led", led);
                            SepiaFW.debug.log("CLEXI registered GPIO led: " + led.id);
                            registeredGpioObjects[let.id] = led; //we assume it worked and can remove later if we get an error
                        }
                        //internally supported LED IDs:
                        if (led.state && supportedGpioLedStates.indexOf(led.state) >= 0){
                            if (!gpioStateLeds) gpioStateLeds = {};
                            gpioStateLeds[led.state] = led;
                        }
                    }
                });
            }
            if (gpio.items && gpio.items.length){
                if (!alreadyRegistered.items) alreadyRegistered.items = [];
                gpio.items.forEach(function(item){
                    if (item.file){
                        var found = alreadyRegistered.items.find(function(o){ return (o.file == item.file); });
                        if (found){
                            SepiaFW.debug.info("CLEXI found GPIO item: " + item.id);
                        }else{
                            sendGpioInterfaceRequest("register", "item", item);
                            SepiaFW.debug.log("CLEXI registered GPIO item: " + item.id);
                            registeredGpioObjects[item.id] = item; //we assume it worked and can remove later if we get an error
                        }
                        //internally supported item IDs:
                        if (item.id == "led-array"){
                            primaryGpioLedArray = item;
                        }
                    }
                });
            }
        }
    }
    var registeredGpioObjects = {};
    var gpioMicButton;
    var primaryGpioLedArray;
    var supportedGpioLedStates = ["idle", "listening", "speaking", "awaitDialog", "loading", "wakeWordActive", "wakeWordInactive"];
    var gpioStateLeds;

    function handleClexiGpioEvent(ev){
        //Registration info
        if (ev.type == "getAll"){
            //register devices
            registerGpioItems(ev || {});    //NOTE: This will ALWAYS restore registration (on every event)
        }
        //Mic button
        if (gpioMicButton && ev.id && ev.pin != null && ev.id == gpioMicButton.id){
            if (ev.value == 1){
                SepiaFW.inputControls.handleClexiHardwareButton("mic");
            }
        }
        //TODO: handle 'release' events
    }

    //get array of already registered GPIO objects
    Clexi.requestRegisteredGpioObjects = function(){
        sendGpioInterfaceRequest("get", "all", {});
    }

    function sendGpioInterfaceRequest(action, type, config){
        var msgId = ClexiJS.send('gpio-interface', {
            action: action,
            type: type,
            config: config
        });
        return msgId;
    }
    function clientStateHandlerForGpio(ev){
        if (ev && ev.detail && ev.type){
            var state = ev.detail.state;
            if (ev.type = "sepia_wake_word"){
                if (state == "active"){
                    state = "wakeWordActive";
                }else if (state == "inactive"){
                    state = "wakeWordInactive";
                }
            }
            //console.log('state event: ' + state);       //DEBUG
            //Items - LED array (only supported "state" item so far)
            if (primaryGpioLedArray && primaryGpioLedArray.modes){
                var modeAction = primaryGpioLedArray.modes[state];
                if (modeAction && modeAction.length){
                    modeAction.forEach(function(data){
                        //console.error("modeAction - id: " + primaryGpioLedArray.id + " - data:", data);        //DEBUG
                        sendGpioInterfaceRequest("set", "item", {
                            id: primaryGpioLedArray.id,
                            file: primaryGpioLedArray.file,
                            data: data
                        });
                    });
                }
            }
            //LEDs
            if (gpioStateLeds){
                //we activate one and switch all other LEDs off
                Object.keys(gpioStateLeds).forEach(function(stateLabel){
                    var led = gpioStateLeds[stateLabel];
                    if (stateLabel == state){
                        sendGpioInterfaceRequest("set", "led", {id: led.id, pin: led.pin, value: 1});
                    }else{
                        sendGpioInterfaceRequest("set", "led", {id: led.id, pin: led.pin, value: 0});
                    }
                });
            }
        }
    }
    document.addEventListener("sepia_state_change", clientStateHandlerForGpio);
    document.addEventListener("sepia_wake_word", clientStateHandlerForGpio);

    function subscribeToGpioInterface(){
        ClexiJS.subscribeTo('gpio-interface', function(e){
            //console.log('GpioInterface event: ' + JSON.stringify(e));       //DEBUG
            var event = new CustomEvent('gpio-interface-event', {detail: e});
            document.dispatchEvent(event);
            if (e && e.gpio){
                handleClexiGpioEvent(e.gpio);
            }
        }, function(e, msgId){
            //returns: 'sent' if request arrived at CLEXI and was executed (does not mean success!)
            if (e != "sent"){
                SepiaFW.debug.error('GpioInterface response:', e);     //DEBUG
            }
        }, function(e){
            SepiaFW.debug.error('GpioInterface error:', e);     //DEBUG
            var event = new CustomEvent('gpio-interface-error', {detail: e});
            document.dispatchEvent(event);
            //TODO: clean up faulty items?
        });
    }
    function removeGpioInterfaceSubscription(){
        ClexiJS.removeSubscription('gpio-interface');
    }

    //CLEXI all subscriptions

    function removeAllSubscriptions(){
        removeBeaconScannerSubscription();
        removeBroadcasterSubscription();
        removeHttpEventsSubscription();
        removeRuntimeCommandsSubscription();
        removeGpioInterfaceSubscription();
    }

    return Clexi;
}