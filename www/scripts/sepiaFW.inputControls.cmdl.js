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
        if (SepiaFW.clexi){
            //add CLEXI listeners
            SepiaFW.clexi.addBroadcastListener("sepia-client", handleClientBroadcastEvents);
            //SepiaFW.clexi.addHttpEventsListener("sepia-client", handleClientHttpEvents);

            //say hello
            broadcastEvent("event", {
                state: "active",
                user: getActiveUserOrDemoRole()
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
        return (SepiaFW.client.isDemoMode()? SepiaFW.account.getUserRoles()[0] : SepiaFW.account.getUserId());
    }

    //---------- SET ------------

    Cmdl.set = {};

    //---------- GET ------------

    Cmdl.get = {};

    Cmdl.get.help = function(){
        broadcastEvent("msg", "Login via: 'call login user [ID] password [PWD]'");
    }

    Cmdl.get.user = function(){
        broadcastEvent("msg", "User is: " + getActiveUserOrDemoRole());
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
        SepiaFW.account.logoutAction();
        setTimeout(function(){
            window.location.reload();
        }, 3000);
    }

    Cmdl.functions.login = function(ev){
        var user = ev.user || ev.userId || ev.username || ev.userName;
        var pwd = ev.password || ev.pwd || ev.passwd || ev.token;
        if (user && pwd){
            broadcastEvent("msg", "Logging in with new user: " + user + ". Plz wait.");
            SepiaFW.account.afterLogout = function(){
                if (SepiaFW.account.loginViaForm(user, pwd)){
                    setTimeout(function(){
                        window.location.reload();
                    }, 3000);
                }else{
                    broadcastEvent("msg", "Login failed.");
                }
            }
            SepiaFW.account.logoutAction();
        }
    }

    return Cmdl;
}