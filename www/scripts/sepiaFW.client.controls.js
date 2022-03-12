//Interface for controls and functions to be executed from client not server.
//Note: many of the functions here depend heavily on DOM IDs!

function sepiaFW_build_client_controls(sepiaSessionId){
    var Controls = {};

    //Handler - see exposed functions at bottom
    Controls.handle = function(fun, controlData){
        if (fun in availableControls){
            var wasCalled = availableControls[fun](controlData);
        }else{
            SepiaFW.debug.error("Client Controls - Function does not exist: " + fun);
        }
    }

    //parse string if required
    function parseAction(action){
        var req;
        if (typeof action === "string"){
            action = action.trim();
            if (action.indexOf("{") == 0 || action.indexOf("[") == 0){
                req = JSON.parse(action);       
            }
        }else{
            req = action;
        }
        return req;
    }

    //Wait for opportunity and send a message (e.g. "some text" or "<error_client_control_0a>") and optionally show info fallback.
    function sendFollowUpMessage(msgOrAnswerTag, info, deliveredCallback, fallbackCallback, sourceTag, blockIfScheduled){
        var minWait = 2000;
        var maxWait = 20000;
        if (sourceTag && blockIfScheduled){
            if (followUpsRunning[sourceTag] && (new Date().getTime() - followUpsRunning[sourceTag]) <= maxWait){
                //block
                return;
            }else{
                //prepare block
                followUpsRunning[sourceTag] = new Date().getTime();
            }
        }
        SepiaFW.assistant.waitForOpportunityAndSay(msgOrAnswerTag, function(){
            //Fallback after max-wait:
            if (info){
                SepiaFW.ui.showInfo(info);
            }
            if (fallbackCallback) fallbackCallback();
            if (sourceTag && blockIfScheduled){
                delete followUpsRunning[sourceTag];
            }
        }, minWait, maxWait, function(){
            //Done (success):
            if (deliveredCallback) deliveredCallback();
            if (sourceTag && blockIfScheduled){
                delete followUpsRunning[sourceTag];
            }
        });    
    }
    var followUpsRunning = {};

    //Media player/search error follow-up messages
    Controls.sendMediaPlayerErrorFollowUpMessage = function(errorType, deliveredCallback, fallbackCallback){
        if (errorType == "notPossible"){
            //"can't execute" - alt.: <error_client_control_0a>: "control function could not be executed"
            sendFollowUpMessage(
                SepiaFW.local.g('cant_execute'), SepiaFW.local.g('cant_execute'),
                deliveredCallback, fallbackCallback, "controls.mediaSearch.notPossible", true
            );
        }else if (errorType == "notFound"){
            //"found nothing to play"
            sendFollowUpMessage(
                "<error_media_player_0b>", SepiaFW.local.g('no_media_found'),
                deliveredCallback, fallbackCallback, "controls.mediaSearch.notFound", true
            );
        }else{
            //"media playback error"
            sendFollowUpMessage(
                "<error_media_player_0a>", SepiaFW.local.g('cant_execute'),
                deliveredCallback, fallbackCallback, "controls.mediaSearch.error", true
            );
        }
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
        SepiaFW.ui.toggleSettings();
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
        volumeAction(function(){
            SepiaFW.audio.playerSetCurrentOrTargetVolume(SepiaFW.audio.getOriginalVolume() + 1.0);
        }, function(emp){
            emp.volumeUp();
            SepiaFW.audio.setPlayerVolumeIndicator("?");    //will auto-update later?
        }, function(){
            //TODO: not supported yet
            SepiaFW.audio.setPlayerVolumeIndicator("?");
        });
    }
    function volumeDown(){
        volumeAction(function(){
            SepiaFW.audio.playerSetCurrentOrTargetVolume(SepiaFW.audio.getOriginalVolume() - 1.0);
        }, function(emp){
            emp.volumeDown();
            SepiaFW.audio.setPlayerVolumeIndicator("?");    //will auto-update later?
        }, function(){
            //TODO: not supported yet
            SepiaFW.audio.setPlayerVolumeIndicator("?");
        });
    }
    function volumeSet(newVol){
        //value between 0.0-10.0
        volumeAction(function(){
            SepiaFW.audio.playerSetCurrentOrTargetVolume(newVol);
        }, function(emp){
            emp.volumeSet(newVol);
            SepiaFW.audio.setPlayerVolumeIndicator("?");    //will auto-update later?
        }, function(){
            //TODO: not supported yet
            SepiaFW.audio.setPlayerVolumeIndicator("?");
        });
    }
    function volumeAction(streamPlayerFun, embeddedPlayerFun, androidFun){
        var lastActivePlayer = SepiaFW.audio.getLastActiveAudioSource();
        var emp = SepiaFW.ui.cards.embed.getActiveMediaPlayer();
        //find right player
        if (!lastActivePlayer || lastActivePlayer == "stream"){
            //default
            streamPlayerFun();
            return true;
        }else if (lastActivePlayer == "embedded-media-player"){
            //Embedded media player
            if (emp && emp.isReady()){
                embeddedPlayerFun(emp);
                return true;
            }
        }else if (lastActivePlayer == "android-intent" && SepiaFW.ui.isAndroid){
            //Android intent controls
            androidFun();
            return true;
        }
    }

    //Media player controls
    Controls.media = function(controlData){
        if (controlData && controlData.action){
            //TODO: this should be rewritten to work with event listeners and broadcasting - See also: Sepia.audio.registerNewFadeListener(..)
            //We should introduce 3 types: 
            //1) app player (full control including fade on STT, TTS) 
            //2) client player (outside app but with full or partial fade support)
            //3) remote player (no fade control, but start/stop etc.)
            SepiaFW.debug.info("Client controls - Media action: " + controlData.action);
            
            var emp = SepiaFW.ui.cards.embed.getActiveMediaPlayer();

            //STOP
            if (controlData.action == "stop" || controlData.action == "pause" || controlData.action == "close"){
                //Stop internal player
                var isInternalPlayerStreaming = SepiaFW.audio.isMusicPlayerStreaming() || SepiaFW.audio.isMainOnHold();
                if (isInternalPlayerStreaming){
                    SepiaFW.debug.info("Client controls - Media: stopping internal media player");
                    SepiaFW.audio.stop(SepiaFW.audio.getMusicPlayer());
                }
                //Player and platform specific additional STOP methods
                var sentAdditionalEvent = false;
                if (emp){       //&& (emp.isPlaying() || emp.isOnHold())
                    //Embedded media player
                    sentAdditionalEvent = SepiaFW.ui.cards.embed.stopAllMediaPlayers();
                    SepiaFW.debug.info("Client controls - Media: stopping embedded media player(s)");
                }
                if (SepiaFW.ui.isAndroid){
                    //we do this only if we have a recent Android media event - otherwhise it will activate all music apps
                    var requireMediaAppPackage = true;
                    SepiaFW.debug.info("Client controls - Media: trying to stop Android media player");
                    sentAdditionalEvent = SepiaFW.android.broadcastMediaButtonDownUpIntent(127, requireMediaAppPackage) || sentAdditionalEvent;
                    //127: KEYCODE_MEDIA_PAUSE
                }
                //TODO: add iOS and Windows?
                //TODO: we could use a Mesh-Node and the sendMessage API in Windows
                if (!isInternalPlayerStreaming && !sentAdditionalEvent && !controlData.skipFollowUp){
                    //The user has probably tried to stop an external app but that was not possible
                    var blockMultiple = true;
                    var source = "controls.media.stop";
                    sendFollowUpMessage(
                        SepiaFW.local.g("tried_but_not_sure"), SepiaFW.local.g('result_unclear') + " Media: STOP", //"<default_under_construction_0b>"
                        undefined, undefined, source, blockMultiple
                    );
                }

            //RESUME
            }else if (controlData.action == "resume"){
                //try to find last active player
                var lastActivePlayer = SepiaFW.audio.getLastActiveAudioSource();
                var isAnyPlayerStreaming = SepiaFW.audio.isAnyAudioSourceActive();
                var sentEvent = false;
                
                if (!isAnyPlayerStreaming){
                    //find last active player to resume
                    if (!lastActivePlayer){
                        //TODO: ?
                    
                    }else if (lastActivePlayer == "stream"){
                        //Internal stream
                        SepiaFW.debug.info("Client controls - Media: resuming internal media player");
                        sentEvent = SepiaFW.audio.resumeLastAudioStream();
                    
                    }else if (lastActivePlayer == "embedded-media-player"){
                        //Embedded media player
		                if (emp && (emp.isPaused() || emp.isReady())){
                            SepiaFW.debug.info("Client controls - Media: resuming embedded media player");
                            sentEvent = true;
                            emp.play();
                        }else{
                            //add note that media-player was killed?
                            SepiaFW.ui.showInfo("Active Media-Player widget was removed");
                            //TODO: send custom follow up?
                        }
                    
                    }else if (lastActivePlayer == "android-intent" && SepiaFW.ui.isAndroid){
                        //we do this only if we have a recent Android media event - otherwhise it will activate all music apps
                        SepiaFW.debug.info("Client controls - Media: trying to resume Android media player");
                        var requireMediaAppPackage = true;
                        sentEvent = SepiaFW.android.broadcastMediaButtonDownUpIntent(126, requireMediaAppPackage);  
                        //126: KEYCODE_MEDIA_PLAY
                    }
                }
                //TODO: add iOS and Windows?
                //TODO: we could use a Mesh-Node and the sendMessage API in Windows
                if (!isAnyPlayerStreaming && !sentEvent && !controlData.skipFollowUp){
                    //The user has probably tried to resume an external app but that was not possible
                    var blockMultiple = true;
                    var source = "controls.media.resume";
                    sendFollowUpMessage(
                        SepiaFW.local.g("tried_but_not_sure"), SepiaFW.local.g('result_unclear') + " Media: RESUME", //"<default_under_construction_0b>"
                        undefined, undefined, source, blockMultiple
                    );
                }

            //NEXT / PREVIOUS
            }else if (controlData.action == "next" || controlData.action == "previous"){
                var isNext = controlData.action == "next";

                //try to find last active player
                var lastActivePlayer = SepiaFW.audio.getLastActiveAudioSource();
                var sentEvent = false;

                //find right player
                if (!lastActivePlayer || lastActivePlayer == "stream"){
                    //NOTE: internal stream has no queue (yet?)
                
                }else if (lastActivePlayer == "embedded-media-player"){
                    //Embedded media player
                    if (emp && emp.isReady()){
                        SepiaFW.debug.info("Client controls - Media: triggering '" + (isNext? "next" : "previous") + "' via embedded media player");
                        sentEvent = true;
                        if (isNext){
                            emp.next();
                        }else{
                            emp.previous();
                        }
                    }
                
                }else if (lastActivePlayer == "android-intent" && SepiaFW.ui.isAndroid){
                    //we do this only if we have a recent Android media event - otherwhise it will activate all music apps
                    SepiaFW.debug.info("Client controls - Media: trying to trigger '" + (isNext? "next" : "previous") + "' via Android media player");
                    var requireMediaAppPackage = true;
                    var keyCode = isNext? 87 : 88;      //87: KEYCODE_MEDIA_NEXT, 88: KEYCODE_MEDIA_PREVIOUS
                    sentEvent = SepiaFW.android.broadcastMediaButtonDownUpIntent(keyCode, requireMediaAppPackage);
                }
                //TODO: add iOS and Windows?
                //TODO: we could use a Mesh-Node and the sendMessage API in Windows
                if (!sentEvent && !controlData.skipFollowUp){
                    //Out of options ... for now
                    var blockMultiple = true;
                    var source = "controls.media.next";
                    sendFollowUpMessage(
                        "<default_under_construction_0b>", SepiaFW.local.g('no_client_support') + " Media: " + (isNext? "NEXT" : "PREVIOUS"),
                        undefined, undefined, source, blockMultiple
                    );
                    SepiaFW.debug.error("Client controls - Unsupported action in 'media': " + controlData.action);
                }

            }else{
                var blockMultiple = true;
                var source = "controls.media.unsupported";
                sendFollowUpMessage(
                    "<default_under_construction_0b>", SepiaFW.local.g('no_client_support') + " Media: " + controlData.action,
                    undefined, undefined, source, blockMultiple
                );
                SepiaFW.debug.error("Client controls - Unsupported action in 'media': " + controlData.action);
            }
        }else{
            var blockMultiple = true;
            var source = "controls.media.error";
            sendFollowUpMessage(
                "<error_client_control_0a>", SepiaFW.local.g('cant_execute'),
                undefined, undefined, source, blockMultiple
            );
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
           SepiaFW.debug.info("Client controls - SearchForMusic service: " + controlData.service);

            //Stop other players - TODO: move down?
            Controls.media({
                action: "stop",
                skipFollowUp: true
            });

            //Embedded Player
            if (controlData.service && (controlData.service == "embedded" || controlData.service.indexOf("_embedded") >= 0) 
                    && SepiaFW.ui.cards.canEmbedWebPlayer(controlData.service)){
                //NOTE: this should be handled by attached cards request...
                //TODO: if we want to use this via remote-action (not supported atm) we need to build the card by hand ...
                //console.error("Controls.searchForMusic", controlData);      //DEBUG

            //Android Intent music search
            }else if (SepiaFW.ui.isAndroid && (!controlData.service || controlData.service.indexOf("_link") == -1)){
                var allowSpecificService = true;
                SepiaFW.android.startMusicSearchActivity(controlData, allowSpecificService, function(err){
                    //error callback
                    if (err.code == 1){
                        var blockMultiple = true;
                        var source = "controls.searchForMusic.error";
                        //"problem with the music player"
                        sendFollowUpMessage(
                            "<server_music_0b>", SepiaFW.local.g('cant_execute'),   //alt.: <error_client_control_0a>: "control function could not be executed"
                            undefined, undefined, source, blockMultiple
                        );
                    }else if (err.code == 2){
                        var blockMultiple = true;
                        var source = "controls.searchForMusic.notFound";
                        //"music not found"
                        sendFollowUpMessage(
                            "<music_0b>", SepiaFW.local.g('no_music_playing'),
                            undefined, undefined, source, blockMultiple
                        );
                    }
                    //NOTE: we could use 'Controls.sendMediaPlayerErrorFollowUpMessage' instead
                });

            //Supported app?
            }else if (controlData.service && !SepiaFW.config.getMusicAppCollection()[controlData.service]){
                var blockMultiple = true;
                var source = "controls.searchForMusic.notPossible";
                sendFollowUpMessage(
                    SepiaFW.local.g('cant_execute'), SepiaFW.local.g('cant_execute'),    //"<error_client_control_0a>"
                    undefined, undefined, source, blockMultiple
                );
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
                    var blockMultiple = true;
                    var source = "controls.searchForMusic.notFound";
                    //"music not found"
                    sendFollowUpMessage(
                        "<music_0b>", SepiaFW.local.g('cant_execute'),      //alt.: <error_client_control_0a>: "control function could not be executed"
                        undefined, undefined, source, blockMultiple
                    );
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
            //TODO: iosIntent, windowsIntent (more?)
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
		dataBody.KEY = SepiaFW.account.getKey(sepiaSessionId);        //TODO: use this??
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
    
    //CLEXI runtime commands
    Controls.runtimeCommands = function(controlData){
        if (SepiaFW.clexi && controlData.action){
            var cmdData = parseAction(controlData.action);
            //use shortcuts?
            if (cmdData.shortcut){
                var shortcutFun = runtimeCommandsShortcuts[cmdData.shortcut];
                if (shortcutFun){
                    cmdData = shortcutFun(cmdData);
                }else{
                    SepiaFW.debug.error("Client controls - Runtime-Commands missing shortcut for: " + cmdData.shortcut);
                    cmdData = undefined;
                }
            }
            //console.error(cmdData);               //DEBUG
            if (!cmdData || !cmdData.cmd){
                sendFollowUpMessage("<error_client_control_0b>", SepiaFW.local.g('cant_execute'));
                return false;
            }
            //send
            var resCode = SepiaFW.clexi.sendRuntimeCommand(cmdData.cmd, cmdData.args, cmdData.maxWait, 
                runtimeCommandsTryCallback, runtimeCommandsSuccessCallback, runtimeCommandsErrorCallback);
            if (resCode == 1){
                //CLEXI not connected
                sendFollowUpMessage("<error_0a>", 
                    SepiaFW.local.g('missing_clexi_connection'), function(){
                        SepiaFW.ui.showInfo(SepiaFW.local.g('missing_clexi_connection'));
                });
                return false;
            }else if (resCode == 2){
                //not supported (CLEXI Plugin missing)
                sendFollowUpMessage("<error_client_support_0a>", 
                    SepiaFW.local.g('missing_clexi_plugin') + " Plugin: runtime-commands.", function(){
                        SepiaFW.ui.showInfo(SepiaFW.local.g('missing_clexi_plugin'));
                });
                return false;
            }else{
                //Command sent - anythig else?
                if (cmdData.cmd == "removeScheduled"){
                    //remove it from active runtime commands map
                    SepiaFW.clexi.removeActiveRuntimeCommand(cmdData.args.cmdId);
                }
                return true;
            }
        }
        return false;
    }
    //try callback
    function runtimeCommandsTryCallback(result, data, args){
        var cmd = data.cmd;
        if (args && args.file){
            cmd += "-" + args.file;
        }
        SepiaFW.debug.log("Client controls - Runtime-Commands try-info: " + result + " - cmd: " + cmd);
    }
    //success callback
    function runtimeCommandsSuccessCallback(result, data, args){
        var cmd = data.cmd;
        if (args && args.file){
            cmd += "-" + args.file;
        }
        result = ((typeof result == 'object')? JSON.stringify(result) : result);
        SepiaFW.debug.log("Client controls - Runtime-Commands success-info: " + result + " - cmd: " + cmd);
        //do we have some more info about the command?
        var cmdInfo = SepiaFW.clexi.getActiveRuntimeCommands()[data.cmdId];
        var successAnswer;
        if (cmdInfo && cmdInfo.sentAt && (new Date().getTime() - cmdInfo.sentAt) < 15000){
            successAnswer = "<client_controls_runtime_command_0c>";     //The OS command was ...
        }else{
            successAnswer = "<client_controls_runtime_command_0a>";     //A scheduled OS command was ...
        }
        var info = SepiaFW.local.g('runtime_command_success') + " Cmd: " + cmd;
        sendFollowUpMessage(successAnswer, info, function(){
            SepiaFW.ui.showInfo(info, false, "runtime-command", true);
        });
    }
    //error callback
    function runtimeCommandsErrorCallback(msg, code, data, args){
        var cmd = data.cmd;
        if (args && args.file){
            cmd += "-" + args.file;
        }
        msg = ((typeof msg == 'object')? JSON.stringify(msg) : msg);
        SepiaFW.debug.error("Client controls - Runtime-Commands: " + msg + " - cmd: "+ cmd);
        sendFollowUpMessage("<error_client_control_0a>", SepiaFW.local.g('cant_execute') + " Code: " + code);
    }

    //Runtime-commands shortcuts
    function getRuntimeCommandsCustomData(customFun, inputData){
        var cmdData = {
            cmd: "callCustom",
            args: {
                delay: (inputData.delay || 6000),
                file: customFun
            }
        };
        cmdData.maxWait = cmdData.args.delay + 20000;
        return cmdData;
    }
    //Cancel scheduled runtime-commands
    function getRuntimeCommandsCancelClosestData(inputData){
        var cmdToFind = inputData.name || "callCustom";
        var cmdSubType = inputData.custom;
        //get closest runtime command to cancel
        var cmdIdToCancel;
        var closestExpires;
        var rtcs = SepiaFW.clexi.getActiveRuntimeCommands();
        Object.keys(rtcs).forEach(function(k){
            var co = rtcs[k];
            if (co.cmd == cmdToFind){
                if (!cmdSubType || (co.args && cmdSubType == co.args.file)){
                    if (!closestExpires || co.expires < closestExpires){
                        cmdIdToCancel = k;
                        closestExpires = co.expires;
                    }
                }
            }
        });
        if (cmdIdToCancel){
            return {
                cmd: "removeScheduled",
                args: {
                    cmdId: cmdIdToCancel
                }
            };
        }else{
            return;
        }
    }

    //-----------------

    //Exposed functions
    var availableControls = {
        "settings": Controls.settings,
        "alwaysOn": Controls.alwaysOn,
        "volume": Controls.volume,
        "media": Controls.media,
        "searchForMusic": Controls.searchForMusic,
        "clexi": Controls.clexi,
        "platformFunction": Controls.platformFunction,
        "meshNode": Controls.meshNode,
        "runtimeCommands": Controls.runtimeCommands
    }

    var runtimeCommandsShortcuts = {
        "cancel": getRuntimeCommandsCancelClosestData,
        "os_shutdown": function(inputData){ return getRuntimeCommandsCustomData("os_shutdown", inputData); },
        "os_reboot": function(inputData){ return getRuntimeCommandsCustomData("os_reboot", inputData); }
    }

    return Controls;
}