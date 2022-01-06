//Handle wake-word test frame
function sepiaFW_build_wake_word_settings() {
    var WakeWordSettings = {};

    WakeWordSettings.isOpen = false;
    var debugInfo = false;

    //Load frame
    WakeWordSettings.open = function(){
        SepiaFW.frames.open({ 
            pageUrl: "wake-word-settings.html",
            //theme: "light",
            onFinishSetup: onSetupFinish,
            onOpen: onFrameOpen,
            onClose: onFrameClose
        });
    }

    //Store sensitivity
    WakeWordSettings.storeWakeWordSensitivity = function(){
        var sensitivityEle = document.getElementById('sepiaFW-wake-word-sensitivity');
        if (sensitivityEle.value != undefined){
            SepiaFW.wakeTriggers.setWakeWordSensitivities([sensitivityEle.value]);
        }
        SepiaFW.ui.showPopup("Make sure to reset the engine to load a new wake-word sensitivity!");
    }
    //Store remote download URL
    WakeWordSettings.storeWakeWordRemoteDownloadUrl = function(){
        var ele = document.getElementById('sepiaFW-wake-word-remote-url');
        if (ele.value != undefined){
            SepiaFW.wakeTriggers.setWakeWordRemoteDownloadUrl(ele.value);
            SepiaFW.animate.flashObj(ele);
        }
    }

    //Change file and version used for wake-word
    WakeWordSettings.updateWakeWordFile = function(){
        var version = $("#sepiaFW-wake-word-version").val();
        var name = $("#sepiaFW-wake-word-name").val();
        //if (version != SepiaFW.wakeTriggers.getWakeWordVersion()){...}
        SepiaFW.ui.showPopup("Make sure to reset the engine to load a new wake-word!");
        SepiaFW.wakeTriggers.setWakeWord(name, version);
    }
    //Set access key
    WakeWordSettings.updateWakeWordAccessKey = function(){
        var key = $("#sepiaFW-wake-word-access-key").val();
        SepiaFW.ui.showPopup("Make sure to reset the engine to load a new access key!");
        SepiaFW.wakeTriggers.setWakeWordAccessKey(key);
    }
    //Change mic confirmation sound
    WakeWordSettings.setMicConfirmationSound = function(){
        var path = $("#sepiaFW-wake-word-confirm-sound-path").val();
        SepiaFW.audio.setCustomSound("micConfirm", path);
    }
    WakeWordSettings.testMicConfirmationSound = function(){
        SepiaFW.audio.playURL($("#sepiaFW-wake-word-confirm-sound-path").val(), '2');
    }
    //Change default buffer length
    WakeWordSettings.setBufferLength = function(){
        var buffLen = Number.parseInt($("#sepiaFW-wake-word-buffer-length").val());
        SepiaFW.wakeTriggers.setWakeWordBufferSize(buffLen);
        SepiaFW.ui.showPopup("This feature is read-only and has currently no effect. Please use audio-recorder buffer-size settings for now.");     //TODO: update
    }
    //Release engine (to start new)
    WakeWordSettings.releaseEngine = function(){
        $('#sepiaFW-wake-word-toggle').html("Releasing...");
        SepiaFW.wakeTriggers.stopListeningToWakeWords(function(){
            WakeWordSettings.debugLog("Stopped listening to wake-words.");
            isListening = false;
            SepiaFW.wakeTriggers.unloadEngine(function(){
                //unloaded
                onEngineUnloaded();
            }, function(err){
                WakeWordSettings.debugLog("ERROR: " + (err? err.message : "unknown"));
                $('#sepiaFW-wake-word-toggle').html("LOAD");
            });
        }, function(err){
            isListening = false;
            WakeWordSettings.debugLog("ERROR: " + (err? err.message : "unknown"));
            $('#sepiaFW-wake-word-toggle').html("LOAD");
        });
    }
    function onEngineUnloaded(){
        $('#sepiaFW-wake-word-toggle').html("LOAD");
        $('#sepiaFW-wake-word-engine-reset').hide(150);
    }

    //this can be triggered by "sepia_web_audio_recorder" events (via wakeTriggers listener)
    WakeWordSettings.onBackgroundEvent = function(eventName){
        if (eventName == "initError"){
            $('#sepiaFW-wake-word-toggle').html("ERROR");
            $('#sepiaFW-wake-word-engine-reset').show(300);
            //more?
        }else if (eventName == "ready"){
            $('#sepiaFW-wake-word-engine-reset').show(300);
        }else if (eventName == "release"){
            onEngineUnloaded();
		}else if (eventName == "audioend"){
            //anything?
        }
        setTimeout(function(){ checkButtonState(); }, 1000);
    }

    WakeWordSettings.debugLog = function(info, isError){
        if (debugInfo || isError){
            if (isError){
                $('#sepiaFW-wake-word-audio-info').append("<span style='color: #ff0000;'>" + SepiaFW.tools.sanitizeHtml(info) + "</span><br>");
            }else{
                $('#sepiaFW-wake-word-audio-info').append(SepiaFW.tools.sanitizeHtml(info) + "<br>");
            }
            console.log(info);
        }
    }

    //Select engine file URL
    WakeWordSettings.engineFileUrlPopup = function(){
        var suggestedEngineFolder = (SepiaFW.wakeTriggers.engine || "porcupine").toLowerCase();
        var currentVal = $("#sepiaFW-wake-word-remote-url").val();
        var selectOptions = [
            {text: "SEPIA Server (self-hosted)", value: "<assist_server>/files/wake-words/" + suggestedEngineFolder + "/"},
            {text: "Device (local app folder or filesystem)", value: "<custom_data>/" + suggestedEngineFolder + "/"},
            {text: "SEPIA Website (public URL)", value: "<sepia_website>/files/" + suggestedEngineFolder + "/"},
            {text: "Any Website with SSL (public URL)", value: "https://..."}
        ];
        selectOptions.forEach(function(o){ if (o.value == currentVal){ o.selected = true; }});
        SepiaFW.ui.showSelectPopup(
            "Suggestions for engine file URLs. Adapt as required. Note: <...> parts are special tags that the client will convert automatically.", 
            selectOptions, 
            function(val, tex){
                $("#sepiaFW-wake-word-remote-url").val(val);
            }, 
            function(){}
        );
    }

    //Select keyword pop-up
    WakeWordSettings.keywordSelectPopup = function(){
        if (!SepiaFW.wakeTriggers.engineLoaded){
            SepiaFW.ui.showPopup("Please load engine first to get a list of available wake-words.");
            return;
        }
        var currentVal = $("#sepiaFW-wake-word-name").val();
        var currentVers = $("#sepiaFW-wake-word-version").val();
        var selectOptions = [
            {text: "Default", value: ""}
        ];
        var akw = SepiaFW.wakeTriggers.getAvailableWakeWords() || {};
        Object.keys(akw).forEach(function(kw){
            var kwClean = kw.replace(/\(.*?\)/, "").trim();
            var version = akw[kw];
            selectOptions.push({
                text: (kwClean + " (v" + version + ")"), 
                value: JSON.stringify({v: version, kw: kwClean}),
                selected: (currentVal == kwClean && currentVers == version)
            });
        });
        SepiaFW.ui.showSelectPopup(
            "Choose your wake-word:", 
            selectOptions, 
            function(val, tex){
                var vkw = val? JSON.parse(val) : {v: "", kw: ""};
                $("#sepiaFW-wake-word-version").val(vkw.v);
                $("#sepiaFW-wake-word-name").val(vkw.kw);
            }, 
            function(){}
        );
    }

    //Test-function for wake-word
    var isWhite = true;
    var isListening = false;
    function wakeWordTest(e){
        if (e.detail && e.detail.keyword){
            WakeWordSettings.debugLog("Detected: " + e.detail.keyword);
            if (isWhite){
                isWhite = false;
                document.querySelector("#sepiaFW-wake-word-indicator").setAttribute("src", "img/icon-512.png");
            }else{
                isWhite = true;
                document.querySelector("#sepiaFW-wake-word-indicator").setAttribute("src", "img/icon-512-w.png");
            }
        }
    }

    //ON SETUP
    function onSetupFinish(){
        
        var toggleButton = document.getElementById('sepiaFW-wake-word-toggle');
        //toggleButton.innerHTML = "Loading...";
        
        var sensitivityEle = document.getElementById('sepiaFW-wake-word-sensitivity');
        sensitivityEle.value = Math.round(SepiaFW.wakeTriggers.getWakeWordSensitivities()[0] *10)/10;
        sensitivityEle.title = SepiaFW.wakeTriggers.getWakeWordSensitivities();

        //build toggles
        var wakeWordAllow = document.getElementById('sepiaFW-wake-word-allow-box');
        wakeWordAllow.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-menu-toggle-wake-word', 
            function(){
                SepiaFW.wakeTriggers.useWakeWord = true;
                SepiaFW.data.set('useWakeWord', true);
                SepiaFW.debug.info("Wake-word 'Hey SEPIA' is allowed.");
            },function(){
                SepiaFW.wakeTriggers.useWakeWord = false;
                SepiaFW.data.set('useWakeWord', false);
                SepiaFW.debug.info("Wake-word 'Hey SEPIA' is NOT allowed.");
            }, SepiaFW.wakeTriggers.useWakeWord)
        );
        var wakeWordLoad = document.getElementById('sepiaFW-wake-word-autoload-box');
        wakeWordLoad.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-menu-toggle-wake-word-autoload', 
            function(){
                SepiaFW.wakeTriggers.autoLoadWakeWord = true;
                SepiaFW.data.set('autoloadWakeWord', true);
                SepiaFW.debug.info("Wake-word 'Hey SEPIA' will be loaded on start.");
            },function(){
                SepiaFW.wakeTriggers.autoLoadWakeWord = false;
                SepiaFW.data.set('autoloadWakeWord', false);
                SepiaFW.debug.info("Wake-word 'Hey SEPIA' will NOT be loaded on start.");
            }, SepiaFW.wakeTriggers.autoLoadWakeWord)
        );
        var wakeWordDuringStream = document.getElementById('sepiaFW-wake-word-during-stream-box');
        wakeWordDuringStream.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-menu-toggle-wake-word-during-stream', 
            function(){
                var question = "Please note: On some system (especially mobile) this can lead to sound artifacts or problems with the output channel. Continue?";
                SepiaFW.ui.askForConfirmation(question, function(){
                    //ok
                    SepiaFW.wakeTriggers.allowWakeWordDuringStream = true;
                    SepiaFW.data.set('allowWakeWordDuringStream', true);
                    SepiaFW.debug.info("Wake-word 'Hey SEPIA' will be allowed during audio streaming.");
                }, function(){
                    //no - reset button
                    SepiaFW.ui.build.toggleButtonSetState('sepiaFW-menu-toggle-wake-word-during-stream', "off");
                });
            },function(){
                SepiaFW.wakeTriggers.allowWakeWordDuringStream = false;
                SepiaFW.data.set('allowWakeWordDuringStream', false);
                SepiaFW.debug.info("Wake-word 'Hey SEPIA' will NOT be allowed during audio stream.");
            }, SepiaFW.wakeTriggers.allowWakeWordDuringStream)
        );
        var wakeWordExpert = document.getElementById('sepiaFW-wake-word-expert-box');
        wakeWordExpert.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-menu-toggle-wake-word-expert', 
            function(){
                $('.sepiaFW-wake-word-settings-page .expert-setting').show(300);    //ww expert settings
            },function(){
                $('.sepiaFW-wake-word-settings-page .expert-setting').hide(150);
                $('.sepiaFW-wake-word-settings-page .hidden-expert-setting').hide(150);
            }, debugInfo)
        );
        //ww hidden expert settings 
        var wwExpertLabel = $(wakeWordExpert).closest('.group').find("label")[0];
        SepiaFW.ui.longPressShortPressDoubleTap(wwExpertLabel, function(){
            $('.sepiaFW-wake-word-settings-page .hidden-expert-setting').show(300);
        });
        var wakeWordDebug = document.getElementById('sepiaFW-wake-word-debug-box');
        wakeWordDebug.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-menu-toggle-wake-word-debug', 
            function(){
                debugInfo = true;
                $('.sepiaFW-wake-word-settings-page .debug-setting').show(300);    //ww debug settings
                checkButtonState();
            },function(){
                debugInfo = false;
                $('.sepiaFW-wake-word-settings-page .debug-setting').hide(150);
                checkButtonState();
            }, debugInfo)
        );

        if (!SepiaFW.wakeTriggers.engineLoaded){
            isListening = false;
            toggleButton.innerHTML = "LOAD";
            $('#sepiaFW-wake-word-engine-reset').hide();
        }else if (SepiaFW.wakeTriggers.isListening()){
            isListening = true;
            toggleButton.innerHTML = "STOP";
            $('#sepiaFW-wake-word-engine-reset').show();
        }else{
            isListening = false;
            toggleButton.innerHTML = "START";
            $('#sepiaFW-wake-word-engine-reset').show();
        }
        function startStopToggle(){
            if (!isListening){
                toggleButton.innerHTML = "Loading...";
                SepiaFW.wakeTriggers.listenToWakeWords(function(){
                    isListening = true;
                    toggleButton.innerHTML = "STOP";
                    WakeWordSettings.debugLog("Listening to wake-words...");
                }, function(err){
                    var msg = (err && err.message)? err.message : "Unknown ERROR in 'listenToWakeWords'";
                    WakeWordSettings.debugLog(msg, true);
                });
            }else{
                toggleButton.innerHTML = "Loading...";
                SepiaFW.wakeTriggers.stopListeningToWakeWords(function(){
                    isListening = false;
                    toggleButton.innerHTML = "START";
                    WakeWordSettings.debugLog("Stopped listening to wake-words.");
                });
            }
        }
        $(toggleButton).off().on('click', function(){
            if (!SepiaFW.wakeTriggers.engineLoaded){
                toggleButton.innerHTML = "Loading...";
                var skipAutostart = true;       //we start manually
                SepiaFW.wakeTriggers.setupWakeWords(function(){
                    startStopToggle();
                    $('#sepiaFW-wake-word-engine-reset').show(300);
                }, skipAutostart);
            }else{
                startStopToggle();
            }    
        });

        if (!SepiaFW.ui.isSecureContext){
            WakeWordSettings.debugLog(
                "Please note: The browser thinks your page origin is NOT secure! Speech recognition might not work properly." 
                + " - <a href='https://github.com/SEPIA-Framework/sepia-docs/wiki/SSL-for-your-Server' target=_blank style='color: inherit;'>"
                + SepiaFW.local.g('help') + "!</a>", 
            true);
        }
    }

    //ON-OPEN
    function onFrameOpen(){
        WakeWordSettings.isOpen = true;
        debugInfo = document.getElementById("sepiaFW-menu-toggle-wake-word-debug").getValue();

        //stop running audio?
        if (SepiaFW.audio.isAnyAudioSourceActive() && !SepiaFW.wakeTriggers.allowWakeWordDuringStream){
            SepiaFW.audio.stop();
        }
        
        //Wake-word listener for testing
        document.addEventListener("sepia_wake_word", wakeWordTest);

        WakeWordSettings.refreshUi("UI");
    }
    WakeWordSettings.refreshUi = function(info){
        if (WakeWordSettings.isOpen){
            //Update stuff
            var sensitivityEle = document.getElementById('sepiaFW-wake-word-sensitivity');
            sensitivityEle.value = Math.round(SepiaFW.wakeTriggers.getWakeWordSensitivities()[0] *10)/10;
            sensitivityEle.title = SepiaFW.wakeTriggers.getWakeWordSensitivities();

            //check button states
            checkButtonState();

            //Show active wake-word
            $("#sepiaFW-wake-word-version").val(SepiaFW.wakeTriggers.getWakeWordVersion());
            $("#sepiaFW-wake-word-name").val(SepiaFW.wakeTriggers.getWakeWords()[0]);
            //Show access key
            $("#sepiaFW-wake-word-access-key").val(SepiaFW.wakeTriggers.getWakeWordAccessKey());
            //Show confirmation sound
            $('#sepiaFW-wake-word-confirm-sound-path').val(SepiaFW.audio.micConfirmSound);
            //Show Porcupine remote URL
            $('#sepiaFW-wake-word-remote-url').val(SepiaFW.wakeTriggers.getWakeWordRemoteDownloadUrl());
            //Show Porcupine buffer length
            var engineInfo = SepiaFW.wakeTriggers.getEngineInfo();
            if (engineInfo){
                //TODO: fix and clean-up (when bufferSize is actually variable for WW module)
                $('#sepiaFW-wake-word-buffer-length').val(engineInfo.settings.options.setup.inputSampleSize);
                //var customBuffLen = SepiaFW.data.getPermanent("porcupine-ww-buffer-length");
                //if (customBuffLen) $('#sepiaFW-wake-word-buffer-length').val(customBuffLen);
            }

            WakeWordSettings.debugLog("UPDATED " + info);
        }
    }
    function checkButtonState(){
        if (SepiaFW.wakeTriggers.engineLoaded){
            isListening = SepiaFW.wakeTriggers.isListening();
            if (isListening){
                document.getElementById('sepiaFW-wake-word-toggle').innerHTML = "STOP";
            }else{
                document.getElementById('sepiaFW-wake-word-toggle').innerHTML = "START";
            }
            $('#sepiaFW-wake-word-engine-reset').show();
        }else{
            isListening = false;
            document.getElementById('sepiaFW-wake-word-toggle').innerHTML = "LOAD";
        }
    }

    //ON-CLOSE
    function onFrameClose(){
        //Remove wake-word listener for testing
        document.removeEventListener("sepia_wake_word", wakeWordTest);

        //reset some "stateless" stuff
        debugInfo = false;

        WakeWordSettings.isOpen = false;
    }
    
    return WakeWordSettings;
}