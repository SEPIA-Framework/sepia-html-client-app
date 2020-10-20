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
    }

    //Change file and version used for wake-word
    WakeWordSettings.updateWakeWordFile = function(){
        var version = $("#sepiaFW-wake-word-version").val();
        var name = $("#sepiaFW-wake-word-name").val();
        if (version != SepiaFW.wakeTriggers.porcupineVersion){
            SepiaFW.ui.showPopup("To use a wake-word with a different version please reload the client first!");
        }
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
        if (buffLen){
            SepiaFW.data.setPermanent("porcupine-ww-buffer-length", buffLen);
            SepiaFW.ui.showPopup("Please reload the client to activate new buffer length setting.");
        }else{
            SepiaFW.data.delPermanent("porcupine-ww-buffer-length");
        }
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
        toggleButton.innerHTML = "Loading...";
        
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
        var wakeWordDebug = document.getElementById('sepiaFW-wake-word-debug-box');
        wakeWordDebug.appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-menu-toggle-wake-word-debug', 
            function(){
                debugInfo = true;
            },function(){
                debugInfo = false;
            }, debugInfo)
        );
        //ww expert settings
        var wwDebugLabel = $(wakeWordDebug).closest('.group').find("label")[0];
        SepiaFW.ui.longPressShortPressDoubleTap(wwDebugLabel, function(){
            $('.sepiaFW-wake-word-settings-page .expert-setting').show(300);
        });

        SepiaFW.wakeTriggers.setupWakeWords(function(){
            toggleButton.innerHTML = "START";
            if (SepiaFW.wakeTriggers.isListening()){
                isListening = true;
                toggleButton.innerHTML = "STOP";
            }else{
                isListening = false;
                toggleButton.innerHTML = "START";
            }
            $(toggleButton).off().on('click', function(){
                if (!isListening){
                    isListening = true;
                    toggleButton.innerHTML = "STOP";
                    SepiaFW.wakeTriggers.listenToWakeWords();
                }else{
                    SepiaFW.wakeTriggers.stopListeningToWakeWords();
                    isListening = false;
                    toggleButton.innerHTML = "START";
                }
            });
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
            }

            //Show active wake-word
            $("#sepiaFW-wake-word-version").val(SepiaFW.wakeTriggers.getWakeWordVersion());
            $("#sepiaFW-wake-word-name").val(SepiaFW.wakeTriggers.getWakeWords()[0]);
            //Show confirmation sound
            $('#sepiaFW-wake-word-confirm-sound-path').val(SepiaFW.audio.micConfirmSound);
            //Show Porcupine buffer length
            var customBuffLen = SepiaFW.data.getPermanent("porcupine-ww-buffer-length");
            if (customBuffLen) $('#sepiaFW-wake-word-buffer-length').val(customBuffLen);

            WakeWordSettings.debugLog("UPDATED " + info);
        }
    }

    //ON-CLOSE
    function onFrameClose(){
        //Remove wake-word listener for testing
        document.removeEventListener("sepia_wake_word", wakeWordTest);

        WakeWordSettings.isOpen = false;
    }
    
    return WakeWordSettings;
}