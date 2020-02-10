//Remote commandline interface
function sepiaFW_build_input_controls_cmdl() {
    var Cmdl = {};

    //---- Initializers ----

    Cmdl.initialize = function(){
        
        Cmdl.isAllowed = SepiaFW.data.get('useRemoteCmdl') || true;     //TODO: make settings button? (is only in headless settings so far)
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

            //say hello
            broadcastEvent("event", {
                state: "active",
                user: getActiveUserOrDemoRole()
            });
        }
    }

    //Broadcasters to use, usually set via headless settings
    Cmdl.broadcasters = {
        state: false
    };
    function stateBroadcaster(ev){
        if (Cmdl.broadcasters.state && ev.detail && ev.detail.state){
            broadcastEvent("sepia-state", {
                state: ev.detail.state
            });
        }
    }
    function loginBroadcaster(ev){
        if (Cmdl.broadcasters.login && ev.detail && ev.detail.note){
            broadcastEvent("sepia-login", {
                note: ev.detail.note
            });
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

    //---------- GET ------------

    Cmdl.get = {};

    Cmdl.get.help = function(){
        broadcastEvent("msg", "Use the 'set', 'get' and 'call' commands to communicate with this client. Examples are given inside the SEPIA Control HUB.");
    }

    Cmdl.get.user = function(){
        broadcastEvent("msg", "User is: " + getActiveUserOrDemoRole());
    }

    Cmdl.get.wakeword = function(){
        broadcastEvent("sepia-wake-word", {
            state: (SepiaFW.wakeTriggers.isListening()? "active" : "inactive")
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