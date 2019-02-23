//Interface for controls and functions to be executed from client not server:

function sepiaFW_build_client_controls(){
    var Controls = {};

    //Open/close settings menu
    Controls.settings = function(controlData){
        if (controlData && controlData.action){
            if (controlData.action == "open"){
                //OPEN
                return true;
            }else if (controlData.action == "close"){
                //CLOSE
                return true;
            }else{
                SepiaFW.debug.error("Client controls - Unsupported action in 'settings': " + controlData.action);
            }
        }else{
            SepiaFW.debug.error("Client controls - Missing 'controlData'!");
        }
        return false;
    }

    //Music volume up/down
    Controls.volume = function(controlData){
        //TODO
        return false;
    }

    return Controls;
}