//Interface for controls and functions to be executed from client not server.
//Note: many of the functions here depend heavily on DOM IDs!

function sepiaFW_build_client_controls(){
    var Controls = {};

    //Open/close settings menu
    Controls.settings = function(controlData){
        if (controlData && controlData.action){
            if (controlData.action == "open"){
                //OPEN
                if (!isSettingsOpen()){
                    switchSettings();
                }
                return true;
            }else if (controlData.action == "close"){
                //CLOSE
                if (isSettingsOpen()){
                    switchSettings();
                }
                return true;
            }else{
                SepiaFW.debug.error("Client controls - Unsupported action in 'settings': " + controlData.action);
            }
        }else{
            SepiaFW.debug.error("Client controls - Missing 'controlData'!");
        }
        return false;
    }
    function isSettingsOpen(){
        var menu = $("#sepiaFW-chat-menu");
        if (menu.css('display') == 'none'){
            return false;
        }else{
            return true;
        }
    }
    function switchSettings(){
        $("#sepiaFW-nav-menu-btn").trigger('click', {bm_force : true});
    }

    //Music volume up/down
    Controls.volume = function(controlData){
        if (controlData && controlData.action){
            if (controlData.action == "up"){
                //volumeUp
                volumeUp();
                return true;
            }else if (controlData.action == "down"){
                //volumeDown
                volumeDown();
                return true;
            }else{
                SepiaFW.debug.error("Client controls - Unsupported action in 'settings': " + controlData.action);
            }
        }else{
            SepiaFW.debug.error("Client controls - Missing 'controlData'!");
        }
        return false;
    }
    function volumeUp(){
        $("#sepiaFW-audio-ctrls-volup").trigger('click', {bm_force : true});
    }
    function volumeDown(){
        $("#sepiaFW-audio-ctrls-voldown").trigger('click', {bm_force : true});
    }

    //AlwaysOn mode
    Controls.alwaysOn = function(controlData){
        //we ignore the control-data for now and just toggle
        if (SepiaFW.alwaysOn){
            //open
            if (!SepiaFW.alwaysOn.isOpen){
                SepiaFW.ui.closeAllMenus();
                SepiaFW.alwaysOn.start();
            //close
            }else{
                SepiaFW.alwaysOn.stop();
            }
        }
    }

    //Mesh-Node call
    Controls.meshNode = function(controlData){
        //TODO
        if (controlData.action){
            var req;
            if (typeof controlData.action === "string"){
                req = JSON.parse(controlData.action);
            }else{
                req = controlData.action;
            }
            console.log(req);
            //req.url
            //req.plugin
            //req.data
            return callMeshNode(req.url, req.plugin, req.data);
        }
        return false;
    }
    function callMeshNode(url, plugin, data){
        //Call Mesh-Node:
        meshNodePluginCall(url, plugin, data, function(res){
            //success:
            console.log("Success:");
            console.log(res);
        }, function(err){
            //error:
            console.log("Error:");
            console.log(err);
            SepiaFW.client.queueIdleTimeEvent(function(){ 
                console.log('IDLE EVENT: Could not execute control.');
            }, 2000, 30000);
        });
        return true;
    }
    var MESH_NODE_PLUGIN_PACKAGE = "net.b07z.sepia.server.mesh.plugins";
    var MESH_NODE_PLUGIN_STATUS_KEY = "status";

    function meshNodePluginCall(hostUrl, pluginSimpleName, data, successCallback, errorCallback){
        //prep. plugin name
        var pluginName;
        if (pluginSimpleName.indexOf(".") < 0){
            pluginName = MESH_NODE_PLUGIN_PACKAGE + "." + pluginSimpleName;
        }else{
            pluginName = pluginSimpleName;
        }
        //prep. data
        var clientAndDeviceId = SepiaFW.config.getClientDeviceInfo();
        var dataBody = new Object();
		dataBody.KEY = SepiaFW.account.getKey();        //TODO: use this??
        dataBody.client = clientAndDeviceId;
        dataBody.canonicalName = pluginName;
        var defaultData = {
            language: SepiaFW.config.appLanguage,
            client: clientAndDeviceId,
            environment: SepiaFW.config.environment
        };
        if (data){
            dataBody.data = $.extend({}, defaultData, data);
        }else{
            dataBody.data = defaultData;
        }
        //call
		SepiaFW.ui.showLoader();
		var apiUrl = hostUrl + "/execute-plugin";
		$.ajax({
			url: apiUrl,
			timeout: 15000,
			type: "POST",
			data: JSON.stringify(dataBody),
			headers: {
				"content-type": "application/json",
				"cache-control": "no-cache"
			},
			success: function(response) {
				SepiaFW.ui.hideLoader();
				if (!response.data || response.data[MESH_NODE_PLUGIN_STATUS_KEY] !== "success"){
					if (errorCallback) errorCallback('Sorry, but the Mesh-Node call failed! Msg: ' + JSON.stringify(response));
					return;
				}
				//--callback--
				if (successCallback) successCallback(response);
			},
			error: function(response) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback('Sorry, but the Mesh-Node call failed! Msg: ' + JSON.stringify(response));
			}
		});
	}

    return Controls;
}