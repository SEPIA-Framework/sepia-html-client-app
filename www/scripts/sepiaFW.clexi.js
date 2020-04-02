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
            subscribeToBeaconScanner();
            subscribeToBroadcaster();
            subscribeToHttpEvents();
            if (Clexi.hasXtension("runtime-commands")){
                subscribeToRuntimeCommands();
            }

            //request some states
            Clexi.requestBleBeaconScannerState();       //TODO: repeat from time to time or at least on error?
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
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "start"
        }, Clexi.numOfSendRetries);
        expectedBleBeaconScannerState = "on";
    }
    Clexi.stopBleBeaconScanner = function(){
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
            clexiRuntimeCommandBaseId = "SEPIA-CLIENT-" + Math.abs(sjcl.random.randomWords(1));
        }
        return (clexiRuntimeCommandBaseId + "-" + SepiaFW.config.getDeviceId() + "-" + ++clexiRuntimeCommandLastIdIndex);
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

    //CLEXI all subscriptions

    function removeAllSubscriptions(){
        removeBeaconScannerSubscription();
        removeBroadcasterSubscription();
        removeHttpEventsSubscription();
        removeRuntimeCommandsSubscription();
    }

    return Clexi;
}