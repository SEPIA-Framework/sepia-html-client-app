function sepiaFW_build_clexi(){
    var Clexi = {};

    Clexi.isSupported = ('ClexiJS' in window);
    Clexi.socketURI = "";       //default CLEXI server: wss://raspberrypi.local:8443
    Clexi.doConnect = false;

    Clexi.numOfSendRetries = 10;

    Clexi.setSocketURI = function(newURI){
        SepiaFW.data.set('clexiSocketURI', newURI);
        Clexi.socketURI = newURI;
    }

    Clexi.initialize = function(){
        Clexi.socketURI = SepiaFW.data.get('clexiSocketURI') || "";
        
        var useClexi = SepiaFW.data.get('clexiConnect');
        if (useClexi != undefined) Clexi.doConnect = useClexi;
        SepiaFW.debug.info("CLEXI support is " + ((Clexi.isSupported && Clexi.doConnect)? "ENABLED" : "DISABLED"));
    }

    //This is called after user login inside 'Client.onActive'
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

    Clexi.connect = function(){
        ClexiJS.connect(Clexi.socketURI, function(e){
            //connected

            //subscribe
            subscribeToBeaconScanner();
            //subscribeToBroadcaster();

            //request some states
            Clexi.requestBleBeaconScannerState();       //TODO: repeat from time to time or at least on error?
            
        }, function(e){
            //closed
            removeBeaconScannerSubscription();
            //removeBroadcasterSubscription();
            
        }, function(err){
            //error
            removeBeaconScannerSubscription();
            //removeBroadcasterSubscription();
        });
    }
    Clexi.close = function(){
        ClexiJS.close();
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

    //CLEXI broadcaster:

    Clexi.broadcastToAll = function(data){
        ClexiJS.send('clexi-broadcaster', data, Clexi.numOfSendRetries);
    }

    //TODO: do something useful with this ;-)
    function subscribeToBroadcaster(){
        ClexiJS.subscribeTo('clexi-broadcaster', function(e){
            console.log('Broadcaster event: ' + JSON.stringify(e));
        }, function(e){
            console.log('Broadcaster response: ' + JSON.stringify(e));
        }, function(e){
            console.log('Broadcaster error: ' + JSON.stringify(e));
        });
    }
    function removeBroadcasterSubscription(){
        ClexiJS.removeSubscription('clexi-broadcaster');
    }

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

    return Clexi;
}