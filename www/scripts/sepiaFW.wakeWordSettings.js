//Handle wake-word test frame
function sepiaFW_build_wake_word_settings() {
    var WakeWordSettings = {};

    WakeWordSettings.isOpen = false;
    var debugInfo = false;

    //Load frame
    WakeWordSettings.open = function(){
        SepiaFW.frames.open({ 
            pageUrl: "wake-word-settings.html",
            //theme: "dark",
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
                $('#sepiaFW-wake-word-toggle').html("LOAD");
                $('#sepiaFW-wake-word-engine-reset').hide(150);
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

    //Select keyword pop-up
    WakeWordSettings.keywordSelectPopup = function(){
        if (!SepiaFW.wakeTriggers.engineLoaded){
            SepiaFW.ui.showPopup("Please load engine first to get a list of available wake-words.");
            return;
        }
        var akw = SepiaFW.wakeTriggers.getAvailableWakeWords() || {};
        var text = document.createElement("p");
        text.textContent = "Choose your wake-word:";
        var selector = document.createElement("select");
        selector.innerHTML = '<option value=\'{"v": "", "kw": ""}\'>Default</option>';
        Object.keys(akw).forEach(function(kw, i){
            var opt = document.createElement("option");
            opt.value = JSON.stringify({v: akw[kw], kw: kw});
            opt.textContent = kw + " (v" + akw[kw] + ")";
            selector.appendChild(opt);
        });
        var config = {
            buttonOneName : SepiaFW.local.g('select'),
            buttonOneAction : function(){
                //select
                var vkw = JSON.parse(selector.value);
                $("#sepiaFW-wake-word-version").val(vkw.v);
                $("#sepiaFW-wake-word-name").val(vkw.kw);
            },
            buttonTwoName : SepiaFW.local.g('abort'),
            buttonTwoAction : function(){}
        };
        var content = document.createElement("div");
        content.appendChild(text);
        content.appendChild(selector);
        SepiaFW.ui.showPopup(content, config);
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
            },function(){
                debugInfo = false;
                $('.sepiaFW-wake-word-settings-page .debug-setting').hide(150);
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
                    $('#sepiaFW-wake-word-engine-reset').show(300);
                    startStopToggle();
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
            if (SepiaFW.wakeTriggers.engineLoaded){
                isListening = SepiaFW.wakeTriggers.isListening();
                if (isListening){
                    document.getElementById('sepiaFW-wake-word-toggle').innerHTML = "STOP";
                }else{
                    document.getElementById('sepiaFW-wake-word-toggle').innerHTML = "START";
                }
            }else{
                isListening = false;
                document.getElementById('sepiaFW-wake-word-toggle').innerHTML = "LOAD";
            }

            //Show active wake-word
            $("#sepiaFW-wake-word-version").val(SepiaFW.wakeTriggers.getWakeWordVersion());
            $("#sepiaFW-wake-word-name").val(SepiaFW.wakeTriggers.getWakeWords()[0]);
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