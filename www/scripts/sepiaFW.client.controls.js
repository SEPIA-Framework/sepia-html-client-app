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

    //Wait for opportunity and send a message (e.g. "some text" or "<error_client_control_0a>") and optionally show info fallback.
    function sendFollowUpMessage(msgOrAnswerTag, info){
        SepiaFW.assistant.waitForOpportunityAndSay(msgOrAnswerTag, function(){
            //Fallback after max-wait:
            if (info){
                SepiaFW.ui.showInfo(info);
            }
        }, 2000, 30000);    //min-wait, max-wait
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
            SepiaFW.debug.error("Client controls - Missing 'controlData' for 'settings'!");
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
            SepiaFW.debug.error("Client controls - Missing 'controlData' for 'volume'!");
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

    //Media player controls
    Controls.media = function(controlData){
        if (controlData && controlData.action){
            //STOP
            if (controlData.action == "stop" || controlData.action == "pause" || controlData.action == "close"){
                //Stop internal player
                var isInternalPlayerStreaming = SepiaFW.audio.isMusicPlayerStreaming() || SepiaFW.audio.isMainOnHold();
                if (isInternalPlayerStreaming){
                    SepiaFW.audio.stop(SepiaFW.audio.getMusicPlayer());    
                }
                //Player and platform specific additional STOP methods
                var sentAdditionalEvent = false;
                if (SepiaFW.ui.cards.youTubePlayerGetState() == 1){
                    //YouTube embedded player
                    sentAdditionalEvent = (SepiaFW.ui.cards.youTubePlayerControls("stop") > 0);
                }else if (SepiaFW.ui.isAndroid){
                    //we do this only if we have a recent Android media event - otherwhise it will activate all music apps
                    var requireMediaAppPackage = true;
                    sentAdditionalEvent = SepiaFW.android.broadcastMediaButtonDownUpIntent(127, requireMediaAppPackage);  
                    //127: KEYCODE_MEDIA_PAUSE
                }
                //TODO: add iOS and Windows?
                //TODO: we could use a Mesh-Node and the sendMessage API in Windows
                if (!isInternalPlayerStreaming && !sentAdditionalEvent && !controlData.skipFollowUp){
                    //The user has probably tried to stop an external app but that was not possible
                    sendFollowUpMessage(SepiaFW.local.g("tried_but_not_sure"), SepiaFW.local.g('result_unclear') + "Media: STOP");     //"<default_under_construction_0b>"
                }

            //NEXT
            }else if (controlData.action == "next"){
                SepiaFW.audio.startNextMusicStreamOfQueue(function(){}, function(err){
                    //Failed to execute NEXT on internal player:
                    
                    //Player or platform specific additional NEXT methods
                    if (SepiaFW.ui.cards.youTubePlayerGetState() > 0){
                        //YouTube embedded player
                        SepiaFW.ui.cards.youTubePlayerControls("next");

                    }else if (SepiaFW.ui.isAndroid){
                        //Stop internal player
                        if (SepiaFW.audio.isMusicPlayerStreaming()){
                            SepiaFW.audio.stop(SepiaFW.audio.getMusicPlayer());    
                        }
                        //we do this only if we have a recent Android media event - otherwhise it will activate all music apps
                        var requireMediaAppPackage = true;
                        SepiaFW.android.broadcastMediaButtonDownUpIntent(87, requireMediaAppPackage);   //87: KEYCODE_MEDIA_NEXT
                    
                    //Out of options ... for now
                    }else if (!controlData.skipFollowUp){
                        sendFollowUpMessage("<default_under_construction_0b>", SepiaFW.local.g('no_client_support'));
                        SepiaFW.debug.error("Client controls - Unsupported action in 'media': " + controlData.action);
                    }
                    //TODO: add iOS and Windows?
                    //TODO: we could use a Mesh-Node and the sendMessage API in Windows
                });

            }else{
                sendFollowUpMessage("<default_under_construction_0b>", SepiaFW.local.g('no_client_support'));
                SepiaFW.debug.error("Client controls - Unsupported action in 'media': " + controlData.action);
            }
        }else{
            sendFollowUpMessage("<error_client_control_0a>", SepiaFW.local.g('cant_execute'));
            SepiaFW.debug.error("Client controls - Missing 'controlData' for 'media'!");
        }
    }

    //Search system for media
    Controls.searchForMusic = function(controlData){
        if (controlData){
            // DEBUG
            /*
            console.log('Search: ' + controlData.search);
            console.log('Artist: ' + controlData.artist);
            console.log('Song: ' + controlData.song);
            console.log('Album: ' + controlData.album);
            console.log('Genre: ' + controlData.genre);
            console.log('Playlist: ' + controlData.playlist);
            console.log('Service: ' + controlData.service);
            console.log('URI: ' + controlData.uri);
            */

            //Stop other players
            Controls.media({
                action: "stop",
                skipFollowUp: true
            });

            //Embedded Player - TODO: check if service has web-player support
            if (controlData.uri && (SepiaFW.ui.cards.canEmbedWebPlayer(controlData.service) || controlData.service.indexOf("_embedded") > 0)){
                //just skip, cards will do the rest...
                //YouTube
                //if (controlData.service.indexOf("youtube") == 0){}

            //Android Intent music search
            }else if (SepiaFW.ui.isAndroid && (!controlData.service || controlData.service.indexOf("_link") == -1)){
                var allowSpecificService = true;
                SepiaFW.android.startMusicSearchActivity(controlData, allowSpecificService, function(err){
                    //error callback
                    if (err.code == 1){
                        sendFollowUpMessage("<error_client_control_0a>", SepiaFW.local.g('cant_execute'));
                    }else if (err.code == 2){
                        sendFollowUpMessage("<music_0b>", SepiaFW.local.g('no_music_playing'));
                    }
                });

            //Supported app?
            }else if (controlData.service && !SepiaFW.config.getMusicAppCollection()[controlData.service]){
                sendFollowUpMessage(SepiaFW.local.g('cant_execute'), SepiaFW.local.g('cant_execute'));      //"<error_client_control_0a>"
                SepiaFW.debug.error("Client controls - 'searchForMusic' is trying to use an app that is not supported by this client!");

            //Common URI fallback or fail
            }else{
                //For now we can only fallback to URI
                if (controlData.uri){
                    if (SepiaFW.ui.isAndroid){
                        SepiaFW.android.setLastRequestedMediaApp(controlData.service);
                    }
                    SepiaFW.ui.actions.openUrlAutoTarget(controlData.uri);
                }else{
                    //Feedback (to server and user)
                    sendFollowUpMessage("<music_0b>", SepiaFW.local.g('cant_execute'));        //<error_client_control_0a>
                    SepiaFW.debug.error("Client controls - 'searchForMusic' is missing URI data and has no other options to search for music!");
                }
            }
        }else{
            SepiaFW.debug.error("Client controls - Missing 'controlData' for 'searchForMusic'!");
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

    //Platform specific function like Android Intents
    Controls.platformFunction = function(controlData){
        if (controlData && controlData.platform){
            var req = parseAction(controlData.data);
            /* DEBUG
            console.log('Platform: ' + controlData.platform);
            console.log('Request type: ' + req.type);
            console.log('Request data: ' + JSON.stringify(req.data));
            */
            if (!req || !req.type || !req.data){
                SepiaFW.debug.error("Missing 'platformFunction' type or data for: " + controlData.data);
                return;
            }
            //Android
            if (SepiaFW.ui.isAndroid && controlData.platform == "android" && req.type.indexOf("android") == 0){
                if (req.type == "androidActivity"){
                    SepiaFW.android.intentActivity(req.data);
                }else if (req.type == "androidBroadcast"){
                    SepiaFW.android.intentBroadcast(req.data);
                }else{
                    SepiaFW.debug.error("Missing 'platformFunction' support for type: " + req.type);
                }
            //Common
            }else if (req.type == "url" || req.type == "browserIntent"){
                if (req.data.url){
                    SepiaFW.ui.actions.openUrlAutoTarget(req.data.url);
                }else{
                    SepiaFW.debug.error("Missing 'platformFunction' support for type: " + req.type);
                }
            //TODO: iosIntent, windowsIntent, browserIntent (more?)
            }else{
                SepiaFW.debug.error("Missing 'platformFunction' support or data for: " + req.type);
            }
        }
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
            sendFollowUpMessage("<error_client_control_0a>", SepiaFW.local.g('mesh_node_fail'));
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