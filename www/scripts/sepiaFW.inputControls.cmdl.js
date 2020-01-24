//Remote commandline interface
function sepiaFW_build_input_controls_cmdl() {
    var Cmdl = {};

    //---- Initializers ----

    Cmdl.initialize = function(){
        
        Cmdl.isAllowed = SepiaFW.data.get('useRemoteCmdl') || true;
        SepiaFW.debug.info("Remote commandline is " + ((Cmdl.isAllowed)? "SUPPORTED" : "NOT SUPPORTED"));
        
        //Add onActive action:
        SepiaFW.client.addOnActiveOneTimeAction(function(){
            //wait a bit
            setTimeout(function(){
                Cmdl.setup();
            }, 1000);
        });
    }
    
    //----------------------

    Cmdl.setup = function () {
        //console.log('Remote commandline interface setup');
        //InputControls.listenToClexiButtons();
    }

    return Cmdl;
}