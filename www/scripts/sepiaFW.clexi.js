function sepiaFW_build_clexi(){
    var Clexi = {};

    Clexi.isSupported = ('ClexiJS' in window);
    Clexi.socketURI = "";       //default CLEXI server: wss://raspberrypi.local:8443
    Clexi.doConnect = false;

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
            subscribeToBroadcaster();

            //request some states
            Clexi.requestBleBeaconScannerState();
            
        }, function(e){
            //closed
            removeBroadcasterSubscription();
            removeBeaconScannerSubscription();
            
        }, function(err){
            //error
            removeBroadcasterSubscription();
            removeBeaconScannerSubscription();
        });
    }
    Clexi.close = function(){
        ClexiJS.close();
    }

    Clexi.send = ClexiJS.send;

    Clexi.getXtensions = function(){
        return ClexiJS.availableXtensions;
    }
    Clexi.hasXtension = function(name){
        return (ClexiJS.availableXtensions && ClexiJS.availableXtensions[name]);
    }

    //CLEXI broadcaster:

    Clexi.broadcastToAll = function(data){
        ClexiJS.send('clexi-broadcaster', data);
    }

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

    Clexi.startBleBeaconScanner = function(){
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "start"
        });
    }
    Clexi.stopBleBeaconScanner = function(){
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "stop"
        });
    }
    Clexi.requestBleBeaconScannerState = function(){
        ClexiJS.send('ble-beacon-scanner', {
            ctrl: "state"
        });
    }
    
    function subscribeToBeaconScanner(){
        ClexiJS.subscribeTo('ble-beacon-scanner', function(e){
            console.log('BLE Beacon event: ' + JSON.stringify(e));
            if (e.ctrl){
                if (e.ctrl == "started"){
                    Clexi.bleBeaconScannerState = "on";
                }else if (e.ctrl == "stopped"){
                    Clexi.bleBeaconScannerState = "off";
                }
            }
        }, function(e){
            console.log('BLE Beacon response: ' + JSON.stringify(e));
            if (e.state){
                Clexi.bleBeaconScannerState = e.state;
            }
        }, function(e){
            console.log('BLE Beacon error: ' + JSON.stringify(e));
        });
    }
    function removeBeaconScannerSubscription(){
        ClexiJS.removeSubscription('ble-beacon-scanner');
    }

    return Clexi;
}