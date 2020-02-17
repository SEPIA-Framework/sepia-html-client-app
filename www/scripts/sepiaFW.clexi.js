function sepiaFW_build_clexi(){
    var Clexi = {};

    Clexi.isSupported = ('ClexiJS' in window);
    Clexi.socketURI = "";       //default CLEXI server: wss://raspberrypi.local:8443
    Clexi.serverId = "";
    Clexi.doConnect = false;

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
        
        var useClexi = SepiaFW.data.get('clexiConnect') || (clexiUrlParam && clexiIdUrlParam);
        if (useClexi != undefined) Clexi.doConnect = useClexi;
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
        ClexiJS.connect(Clexi.socketURI, function(e){
            //connected
            rgyIndicators.forEach(function(indi){
                indi.setState("g");
            });

            //subscribe
            subscribeToBeaconScanner();
            subscribeToBroadcaster();
            subscribeToHttpEvents();

            //request some states
            Clexi.requestBleBeaconScannerState();       //TODO: repeat from time to time or at least on error?
            
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
        });
    }
    Clexi.close = function(){
        ClexiJS.close();
        var useClexi = SepiaFW.data.get('clexiConnect');
        if (useClexi != undefined) Clexi.doConnect = useClexi;
    }

    Clexi.send = function(extensionName, data, numOfRetries){
        if (numOfRetries == undefined) numOfRetries = Clexi.numOfSendRetries;
        ClexiJS.send(extensionName, data, numOfRetries);
    }

    Clexi.getXtensions = function(){
        return ClexiJS.availableXtensions;
    }
    Clexi.hasXtension = function(name){
        return (ClexiJS.availableXtensions && ClexiJS.availableXtensions[name]);
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
            //console.log('Broadcaster response: ' + JSON.stringify(e));
        }, function(e){
            console.log('Broadcaster error: ' + JSON.stringify(e));
        });
    }
    function removeBroadcasterSubscription(){
        ClexiJS.removeSubscription('clexi-broadcaster');
    }
    Clexi.addBroadcastListener = function(name, callback){
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
            console.log('HTTP-Event response: ' + JSON.stringify(e));
        }, function(e){
            console.log('HTTP-Event error: ' + JSON.stringify(e));
        });
    }
    function removeHttpEventsSubscription(){
        ClexiJS.removeSubscription('clexi-http-events');
    }
    Clexi.addHttpEventsListener = function(name, callback){
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

    function removeAllSubscriptions(){
        removeBeaconScannerSubscription();
        removeBroadcasterSubscription();
        removeHttpEventsSubscription();
    }

    return Clexi;
}