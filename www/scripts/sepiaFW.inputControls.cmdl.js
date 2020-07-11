//Remote commandline interface
function sepiaFW_build_input_controls_cmdl() {
    var Cmdl = {};

    //---- Initializers ----

    Cmdl.initialize = function(){
        
        var isAllowed = SepiaFW.data.get('useRemoteCmdl');
        Cmdl.isAllowed = (isAllowed == undefined)? true : isAllowed;
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

    Cmdl.setup = function(){
        //console.log('Remote commandline interface setup');
        if (Cmdl.isAllowed && SepiaFW.clexi){
            //add CLEXI listeners
            SepiaFW.clexi.addBroadcastListener("sepia-client", handleClientBroadcastEvents);
            //SepiaFW.clexi.addHttpEventsListener("sepia-client", handleClientHttpEvents);

            //Broadcasters
            if (Cmdl.broadcasters.state){
                document.addEventListener('sepia_state_change', stateBroadcaster);
            }else{
                document.removeEventListener('sepia_state_change', stateBroadcaster);
            }
            if (Cmdl.broadcasters.login){
                document.addEventListener('sepia_login_event', loginBroadcaster);
            }else{
                document.removeEventListener('sepia_login_event', loginBroadcaster);
            }
            if (Cmdl.broadcasters.clientError){
                document.addEventListener('sepia_client_error', clientErrorBroadcaster);
            }else{
                document.removeEventListener('sepia_client_error', clientErrorBroadcaster);
            }
            if (Cmdl.broadcasters.accountError){
                document.addEventListener('sepia_account_error', accountErrorBroadcaster);
            }else{
                document.removeEventListener('sepia_account_error', accountErrorBroadcaster);
            }
            if (Cmdl.broadcasters.speech){
                document.addEventListener('sepia_speech_event', speechBroadcaster);
            }else{
                document.removeEventListener('sepia_speech_event', speechBroadcaster);
            }
            if (Cmdl.broadcasters.wakeWord){
                document.addEventListener('sepia_wake_word', wakeWordBroadcaster);
            }else{
                document.removeEventListener('sepia_wake_word', wakeWordBroadcaster);
            }
            if (Cmdl.broadcasters.audioPlayer){
                document.addEventListener('sepia_audio_player_event', audioPlayerBroadcaster);
            }else{
                document.removeEventListener('sepia_audio_player_event', audioPlayerBroadcaster);
            }
            if (Cmdl.broadcasters.alarm){
                document.addEventListener('sepia_alarm_event', alarmBroadcaster);
            }else{
                document.removeEventListener('sepia_alarm_event', alarmBroadcaster);
            }

            //say hello
            broadcastEvent("event", {
                state: (SepiaFW.client.isActive()? "active" : "transient"),
                user: getActiveUserOrDemoRole()
            });

        }else if (SepiaFW.clexi){
            //clean-up
            SepiaFW.clexi.removeBroadcastListener("sepia-client");
            document.removeEventListener('sepia_state_change', stateBroadcaster);
            document.removeEventListener('sepia_login_event', loginBroadcaster);
            document.removeEventListener('sepia_client_error', clientErrorBroadcaster);
            document.removeEventListener('sepia_account_error', accountErrorBroadcaster);
            document.removeEventListener('sepia_speech_event', speechBroadcaster);
            document.removeEventListener('sepia_wake_word', wakeWordBroadcaster);
            document.removeEventListener('sepia_audio_player_event', audioPlayerBroadcaster);
            document.removeEventListener('sepia_alarm_event', alarmBroadcaster);
        }
    }

    //Broadcasters to use, usually overwritten by headless/auto-setup settings
    Cmdl.broadcasters = {
        state: true,
        login: false,
        clientError: true,
        accountError: true,
        speech: true,
        wakeWord: true,
        audioPlayer: true,
        alarm: true
    };
    function stateBroadcaster(ev){
        if (Cmdl.broadcasters.state && ev.detail && (ev.detail.state || ev.detail.connection)){
            broadcastEvent("sepia-state", ev.detail);
        }
    }
    function loginBroadcaster(ev){
        if (Cmdl.broadcasters.login && ev.detail && ev.detail.note){
            broadcastEvent("sepia-login", {
                note: ev.detail.note
            });
        }
    }
    function clientErrorBroadcaster(ev){
        if (Cmdl.broadcasters.clientError && ev.detail){
            broadcastEvent("sepia-client-error", ev.detail);
        }
    }
    function accountErrorBroadcaster(ev){
        if (Cmdl.broadcasters.accountError && ev.detail){
            broadcastEvent("sepia-account-error", ev.detail);
        }
    }
    function speechBroadcaster(ev){
        if (Cmdl.broadcasters.speech && ev.detail && ev.detail.type){
            broadcastEvent("sepia-speech", {
                type: ev.detail.type,
                msg: ev.detail.msg
            });
        }
    }
    function wakeWordBroadcaster(ev){
        if (Cmdl.broadcasters.wakeWord && ev.detail && ev.detail.state){
            var d = {
                state: ev.detail.state
            }
            if (ev.detail.keyword){
                d.word = ev.detail.keyword;
            }
            if (ev.detail.msg){
                d.msg = ev.detail.msg;
            }
            broadcastEvent("sepia-wake-word", d);
        }
    }
    function audioPlayerBroadcaster(ev){
        if (Cmdl.broadcasters.audioPlayer && ev.detail){
            //we ignore 'effects' and 'tts' player ... for now if its not an error
            if (ev.detail.action == "error" || (ev.detail.source != "effects" && ev.detail.source != "tts-player")){
                broadcastEvent("sepia-audio-player-event", ev.detail);
            }
        }
    }
    function alarmBroadcaster(ev){
        if (Cmdl.broadcasters.alarm && ev.detail && ev.detail.action){
            var d = {
                action: ev.detail.action
            }
            if (ev.detail.info){
                d.info = ev.detail.info;
            }
            broadcastEvent("sepia-alarm-event", d);
        }
    }

    function handleClientBroadcastEvents(ev){
        //console.log(ev);            //DEBUG
        if (!ev.deviceId || ev.deviceId != SepiaFW.config.getDeviceId()){
            if (ev.ping && (ev.ping == "all" || ev.ping == SepiaFW.config.getDeviceId())){
                broadcastEvent("msg", "Hello World");
            }
            return;
        }
        if (ev.set){
            //SET
            var fun = Cmdl.set[ev.set];
            if (fun){
                fun(ev);
            }
        }else if (ev.get){
            //GET
            var fun = Cmdl.get[ev.get];
            if (fun){
                fun(ev);
            }
        }else if (ev.call){
            //CALLS
            var fun = Cmdl.functions[ev.call];
            if (fun){
                fun(ev);
            }
        }
    }
    function handleClientHttpEvents(ev){
        console.log(ev);
    }

    function broadcastEvent(type, msg){
        if (SepiaFW.clexi && SepiaFW.clexi.doConnect){
            var d = {
                client: SepiaFW.config.getClientDeviceInfo(),
                deviceId: SepiaFW.config.getDeviceId()
            };
            d[type] = msg;
            SepiaFW.clexi.broadcastToAll(d);
        }
    }

    function getActiveUserOrDemoRole(){
        var u = "none";
        if (SepiaFW.client.isDemoMode()){
            var roles = SepiaFW.account.getUserRoles();
            if (roles && roles.length > 0){
                u = roles[0];
            }
        }else{
            u = SepiaFW.account.getUserId();
        }
        return u;
    }

    //---------- SET ------------

    Cmdl.set = {};

    Cmdl.set.wakeword = function(ev){
        if (ev.state){
            if (ev.state == "on" || ev.state == "active" || ev.state == "activate"){
                SepiaFW.wakeTriggers.useWakeWord = true;
                if (!SepiaFW.wakeTriggers.engineLoaded){
                    SepiaFW.wakeTriggers.setupWakeWords();      //will auto-start after setup
                }else if (!SepiaFW.wakeTriggers.isListening()){
                    SepiaFW.wakeTriggers.listenToWakeWords();
                }
            }else if (ev.state == "off" || ev.state == "inactive" || ev.state == "deactivate"){
                if (SepiaFW.wakeTriggers.engineLoaded && SepiaFW.wakeTriggers.isListening()){
                    SepiaFW.wakeTriggers.stopListeningToWakeWords();
                }
            }
        }
    }

    Cmdl.set.connections = function(ev){
        if (ev.client){
            if (ev.client == "off" || ev.client == "close" || ev.client == "disconnect" || ev.client == "disable" || ev.client == "deactivate"){
                SepiaFW.client.closeClient();
            }else if (ev.client == "on" || ev.client == "open" || ev.client == "connect" || ev.client == "enable" || ev.client == "activate"){
                SepiaFW.client.resumeClient();
            }
        }else if (ev.clexi){
            if (ev.clexi == "off" || ev.clexi == "close" || ev.clexi == "disconnect" || ev.clexi == "disable" || ev.clexi == "deactivate"){
                SepiaFW.clexi.close();
            }
        }
    }

    //---------- GET ------------

    Cmdl.get = {};

    Cmdl.get.help = function(){
        broadcastEvent("msg", "Use the 'set', 'get' and 'call' commands to communicate with this client. Examples are given inside the SEPIA Control HUB.");
    }

    Cmdl.get.user = function(){
        broadcastEvent("msg", {
            user: getActiveUserOrDemoRole(), 
            active: SepiaFW.client.isActive()
        });
    }

    Cmdl.get.wakeword = function(){
        broadcastEvent("sepia-wake-word", {
            state: (SepiaFW.wakeTriggers.isListening()? "active" : "inactive"),
            keywords: SepiaFW.wakeTriggers.getWakeWords()
        });
    }

    //---------- CALL ------------

    Cmdl.functions = {};

    Cmdl.functions.reload = function(){
        broadcastEvent("msg", "Reloading client.");
        setTimeout(function(){
            window.location.reload();
        }, 1000);
    }

    Cmdl.functions.logout = function(){
        broadcastEvent("msg", "Logout in 3s.");
        SepiaFW.account.afterLogout = function(){
            setTimeout(function(){
                window.location.reload();
            }, 3000);
        }
        SepiaFW.account.logoutAction();
    }

    Cmdl.functions.login = function(ev){
        var user = ev.u || ev.user || ev.userId || ev.username || ev.userName;
        var pwd = ev.p || ev.password || ev.pwd || ev.passwd || ev.token;
        if (user && pwd){
            broadcastEvent("msg", "Logging in with new user: " + user + ". Plz wait.");
            SepiaFW.account.afterLogout = function(){
                SepiaFW.account.afterLogin = function(){
                    setTimeout(function(){
                        window.location.reload();
                    }, 3000);
                }
                if (!SepiaFW.account.loginViaForm(user, pwd)){
                    broadcastEvent("msg", "Login failed.");
                }
            }
            SepiaFW.account.logoutAction();
        }
    }

    Cmdl.functions.ping = function(ev){
        var adr = SepiaFW.config.webSocketAPI + "ping";
        if (ev && ev.adr){
            adr = ev.adr;
        }
        $.ajax({
			url: adr,
			timeout: 5000,
			dataType: "jsonp",
			success: function(data) {
				broadcastEvent("ping-result", {
                    adr: adr,
                    status: 200,
                    data: data
                });
			},
			error: function(err) {
				broadcastEvent("ping-result", {
                    adr: adr,
                    status: err.status,
                    statusText: err.statusText
                });
			}
		});
    }

    Cmdl.functions.test = function(ev){
        broadcastEvent("test-result", {
            isActive: SepiaFW.client.isActive(),
            user: SepiaFW.account.getUserId(),
            next: "sending test message now ..."
        });
        SepiaFW.client.sendInputText("test");
    }

    return Cmdl;
}