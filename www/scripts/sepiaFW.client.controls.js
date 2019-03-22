//Interface for controls and functions to be executed from client not server.
//Note: many of the functions here depend heavily on DOM IDs!

function sepiaFW_build_client_controls(){
    var Controls = {};

    function parseAction(action){
        var req;
        if (typeof action === "string"){
            req = JSON.parse(action);
        }else{
            req = action;
        }
        return req;
    }

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
            }else if (controlData.action.match(/volume;;\d/gi).length == 1){
                //volumeSet
                var vol = parseInt(controlData.action.split(";;")[1]);       //no data, we have the shortcut here ;-)
                if (vol){
                    volumeSet(vol);       //TODO: untested and not fully implemented yet
                    return true;
                }else{
                    return false;
                }
            }else{
                SepiaFW.debug.error("Client controls - Unsupported action in 'settings': " + controlData.action);
            }
        }else{
            SepiaFW.debug.error("Client controls - Missing 'controlData'!");
        }
        return false;
    }
    function volumeUp(){
        //$("#sepiaFW-audio-ctrls-volup").trigger('click', {bm_force : true});
        SepiaFW.audio.playerSetCurrentOrTargetVolume(SepiaFW.audio.getOriginalVolume() + 1.0);
    }
    function volumeDown(){
        //$("#sepiaFW-audio-ctrls-voldown").trigger('click', {bm_force : true});
        SepiaFW.audio.playerSetCurrentOrTargetVolume(SepiaFW.audio.getOriginalVolume() - 1.0);
    }
    function volumeSet(newVol){
        SepiaFW.audio.playerSetCurrentOrTargetVolume(newVol);       //value between 0.0-10.0
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

    //CLEXI send
    Controls.clexi = function(controlData){
        if (SepiaFW.clexi && controlData.action){
            var req = parseAction(controlData.action);
            //console.log(req);
            SepiaFW.clexi.send(req.xtension, req.data);
            return true;
        }
        return false;
    }

    //Mesh-Node call
    Controls.meshNode = function(controlData){
        if (controlData.action){
            var req = parseAction(controlData.action);
            //console.log(req);
            return callMeshNode(req.url, req.pin, req.plugin, req.data);
        }
        return false;
    }
    function callMeshNode(url, accessPin, plugin, data){
        //Call Mesh-Node:
        meshNodePluginCall(url, accessPin, plugin, data, function(res){
            //success:
            SepiaFW.debug.log("Client controls: Mesh-Node call success of plugin: " + plugin);
            //console.log(res);
            //TODO:
            //- add some actions here depending on plugin
        }, function(err){
            //error:
            if (err && err.status && err.status == 401){
                SepiaFW.debug.error("Client controls: Mesh-Node call to plugin '" + plugin + "' was NOT allowed!");
            }else{
                SepiaFW.debug.error("Client controls: Mesh-Node call ERROR at plugin: " + plugin);
            }

            //Feedback (to server and user ... server just loads a chat message in this case, but one could send real data back)
            if (SepiaFW.assistant){
                SepiaFW.assistant.waitForOpportunityAndSay("<error_client_control_0a>", function(){
                    //Fallback after max-wait:
                    SepiaFW.ui.showInfo(SepiaFW.local.g('mesh_node_fail'));
                }, 2000, 30000);    //min-wait, max-wait
            }
        });
        return true;
    }
    var MESH_NODE_PLUGIN_PACKAGE = "net.b07z.sepia.server.mesh.plugins";
    var MESH_NODE_PLUGIN_STATUS_KEY = "status";

    function meshNodePluginCall(hostUrl, accessPin, pluginSimpleName, data, successCallback, errorCallback){
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
        if (accessPin) dataBody.pin = accessPin;
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
					if (errorCallback) errorCallback(response);
					return;
				}
				//--callback--
				if (successCallback) successCallback(response);
			},
			error: function(response) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback(response);
			}
		});
	}

    return Controls;
}