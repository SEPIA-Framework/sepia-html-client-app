//Always on special screen mode
function sepiaFW_build_always_on(){
    var AlwaysOn = {};

    var AVATAR_FADE_DELAY = 120000;
    var CONTROLS_FADE_DELAY = 5000;

    //some states
    AlwaysOn.isOpen = false;
    var mainWasFullscreenOpen = false;
    var mainWasVoiceDisabled = false;
    var $activityArea = undefined;
    var $avatarEyelid = undefined;
    var $avatarMouth = undefined;
    var avatarIsWaiting = false;
    var avatarIsLoading = false;

    //some settings
    AlwaysOn.autoEnableVoice = true;
    AlwaysOn.autoLoadOnPowerPlug = true;

    //Load always-on screen
    AlwaysOn.start = function(){
        SepiaFW.frames.open({ 
            pageUrl: "always-on.html",
            onFinishSetup: AlwaysOn.onFinishSetup,
            onOpen: AlwaysOn.onOpen,
            onClose: AlwaysOn.onClose,
            theme: "dark"
        });
    }

    //On finish setup (first open)
    AlwaysOn.onFinishSetup = function(){
        //console.log('finish setup');
        //wake up on screen click
        $(".sepiaFW-alwaysOn-page, .sepiaFW-alwaysOn-navbar").off().on('click', function(){
            AlwaysOn.onWakeup();
        });
        //mic on avatar click
        var micButton = document.getElementById("sepiaFW-alwaysOn-avatar-touch-area");
        SepiaFW.ui.buildDefaultMicLogic(micButton);
        //get some elements
        $activityArea = $('#sepiaFW-alwaysOn-avatar').find('.avatar-activity');
        $avatarEyelid = $("#sepiaFW-alwaysOn-avatar").find(".avatar-eyelid");
        $avatarMouth = $("#sepiaFW-alwaysOn-avatar").find(".avatar-mouth");
    }

    //On open
    AlwaysOn.onOpen = function(){
        //console.log('open');
        //prevent screen sleep on mobile
        AlwaysOn.preventSleep();
        //make sure there are no frames
        mainWasFullscreenOpen = $('.sepiaFW-carousel-pane').hasClass('full-screen');
        $('#sepiaFW-main-window').removeClass('sepiaFW-skin-mod');
        $('.sepiaFW-carousel-pane').addClass('full-screen');
        //show avatar and stuff
        if (openFadeTimer) clearTimeout(openFadeTimer);
        openFadeTimer = setTimeout(function(){
            $("#sepiaFW-alwaysOn-avatar").css({opacity:'0'}).show().animate({opacity:'1.0'}, {complete:function(){
                fadeOutNavbarControlsAfterDelay(CONTROLS_FADE_DELAY);
                fadeAvatarToRandomPosAfterDelay(AVATAR_FADE_DELAY);
            }, duration: 1000});
        }, 1000);
        //TTS is always on?
        if (SepiaFW.speech){
            mainWasVoiceDisabled = SepiaFW.speech.skipTTS;
            if (AlwaysOn.autoEnableVoice){
                var skipStore = true;
                SepiaFW.speech.enableVoice(skipStore);
            }
        }
        AlwaysOn.isOpen = true;
        //restore some states (only support loading and waiting right now)
        if (avatarIsWaiting){
            AlwaysOn.avatarAwaitingInput();
        }else if (avatarIsLoading){
            AlwaysOn.avatarLoading();
        }
    }
    var openFadeTimer;    

    //On close
    AlwaysOn.onClose = function(){
        //console.log('close');
        //stop reposition script
        if (fadeAvatarTimer) clearTimeout(fadeAvatarTimer);
        $("#sepiaFW-alwaysOn-avatar").fadeOut(300);
        //allow sleep again
        AlwaysOn.allowSleep();
        //restore designs
        $('#sepiaFW-main-window').addClass('sepiaFW-skin-mod');
        if (!mainWasFullscreenOpen){
            $('.sepiaFW-carousel-pane').removeClass('full-screen');
        }
        //TTS is always on?
        if (SepiaFW.speech){
            var skipStore = true;
            if (mainWasVoiceDisabled) SepiaFW.speech.disableVoice(skipStore);
            else SepiaFW.speech.enableVoice(skipStore);
        }
        //go to my view on close
        //SepiaFW.ui.moc.showPane(0);

        AlwaysOn.isOpen = false;
    }

    //Animations and wake controls
    AlwaysOn.onWakeup = function(){
        //restore nav-bar and restart timer
        fadeOutNavbarControlsAfterDelay(5000);
        //restore avatar to wake
        wakeAvatar();
        //show info items for a while
        showLocalTimeAndFade();
        showNotificationsAndFade();
        showBatteryAndFade();
    }
    AlwaysOn.avatarIdle = function(){
        //reset stuff
        avatarIsWaiting = false;
        avatarIsLoading = false;
        if ($activityArea){
            //restore avatar to wake (because action will follow)
            wakeAvatar();
            $activityArea.removeClass('loading');
            $activityArea.removeClass('listening');
            $activityArea.removeClass('speaking');
            $activityArea.removeClass('waiting');
        }
    }
    AlwaysOn.avatarLoading = function(){
        AlwaysOn.avatarIdle();
        avatarIsLoading = true;
        if ($activityArea){
            $activityArea.addClass('loading');
        }
    }
    AlwaysOn.avatarSpeaking = function(){
        AlwaysOn.avatarIdle();
        if ($activityArea){
            $activityArea.addClass('speaking');
        }
    }
    AlwaysOn.avatarListening = function(){
        AlwaysOn.avatarIdle();
        if ($activityArea){
            $activityArea.addClass('listening');
        }
    }
    AlwaysOn.avatarAwaitingInput = function(){
        AlwaysOn.avatarIdle();
        avatarIsWaiting = true;
        if ($activityArea){
            $activityArea.addClass('waiting');
        }
    }
    //States
    function wakeAvatar(){
        $avatarEyelid.removeClass('sleep');
        $avatarMouth.removeClass('sleep');
    }
    function makeAvatarSleepy(){
        $avatarEyelid.addClass('sleep');
        $avatarMouth.addClass('sleep');
    }

    //Control screen sleep on mobile
    AlwaysOn.preventSleep = function(){
        if (SepiaFW.ui.isCordova){
            //check for plugins
            if (window.plugins.insomnia){
                //console.log('----------- INSOMNIA TRIGGERED -----------');
                window.plugins.insomnia.keepAwake();
            }
            if (StatusBar){
                //console.log('----------- STATUSBAR TRIGGERED -----------');
                StatusBar.hide();
            }
        }
    }
    AlwaysOn.allowSleep = function(){
        if (SepiaFW.ui.isCordova){
            //check for plugins
            if (window.plugins.insomnia){
                //console.log('----------- INSOMNIA TRIGGERED -----------');
                window.plugins.insomnia.allowSleepAgain();
            }
            if (StatusBar){
                //console.log('----------- STATUSBAR TRIGGERED -----------');
                StatusBar.show();
            }
        }
    }

    //Fade out navbar controls slowly after a certain delay
    function fadeOutNavbarControlsAfterDelay(delay){
        var $navBarEntries = $(".sepiaFW-alwaysOn-navbar-entry");
        //stop any running timers and animations and restore opacity
        if (fadeControlsTimer) clearTimeout(fadeControlsTimer);
        $navBarEntries.stop().css({opacity:'1.0'});
        fadeControlsTimer = setTimeout(function(){
            $navBarEntries.stop().animate({opacity:'0'}, {duration: 3000});
        }, delay);
    }
    var fadeControlsTimer;

    //Fade out avatar slowly after a certain delay and respawn at random pos (OLED screen protection)
    function fadeAvatarToRandomPosAfterDelay(delay){
        var $avatar = $("#sepiaFW-alwaysOn-avatar");
        //stop any running timers and animations and restore opacity
        if (fadeAvatarTimer) clearTimeout(fadeAvatarTimer);
        $avatar.stop().css({opacity:'1.0'});
        fadeAvatarTimer = setTimeout(function(){
            $avatar.stop().animate({opacity:'0'}, {complete: function(){
                //done, get new coordinates
                setNewAvatarRandomPosition();
                //fade in again
                $avatar.stop().animate({opacity:'1.0'},{complete: function(){
                    //restart timer
                    fadeAvatarToRandomPosAfterDelay(delay);
                }, duration: 500});
                //make avatar sleepy
                makeAvatarSleepy();
            }, duration: 1000});
        }, delay);
        //show info items for a while
        showLocalTimeAndFade();
        showNotificationsAndFade();
        showBatteryAndFade();
    }
    var fadeAvatarTimer;

    //Move Avatar to new random position withing view
    function setNewAvatarRandomPosition(){
        var $avatar = $("#sepiaFW-alwaysOn-avatar");
        var availableHeight = $('#sepiaFW-alwaysOn-view').height();
        var availableWidth = $('#sepiaFW-alwaysOn-view').width();
        var avatarHeigth = $avatar.height();
        var avatarWidth = $avatar.width();
        var newTop = getRandomPixel(availableHeight-avatarHeigth);
        var newLeft = getRandomPixel(availableWidth-avatarWidth);
        $avatar.css({top: newTop, left: newLeft});
    }
    AlwaysOn.moveAvatar = setNewAvatarRandomPosition;

    //Get random integer with pixel tag
    function getRandomPixel(max) {
        return (Math.floor(Math.random() * Math.floor(max))) + "px";
    }

    //Show a clock with local time for a while
    function showLocalTimeAndFade(fadeOutAfterDelay){
        var short = true;
        var timeWithIcon = 
            '<i class="material-icons md-txt">access_time</i>&nbsp;' + SepiaFW.tools.getLocalTime(short);
        $clock = $('#sepiaFW-alwaysOn-clock');
        $clock.html(timeWithIcon);
        $clock.stop().fadeIn(500, function(){
            if (fadeOutAfterDelay == undefined) fadeOutAfterDelay = 5000;
            if (fadeClockTimer) clearTimeout(fadeClockTimer);
            fadeClockTimer = setTimeout(function(){
                $clock.fadeOut(3000);
            }, fadeOutAfterDelay);
        });
    }
    var fadeClockTimer;

    //Show missed notifications for a while
    function showNotificationsAndFade(fadeOutAfterDelay){
        var missedNotesWithIcon = 
            '<i class="material-icons md-txt">notifications_none</i>&nbsp;' + SepiaFW.ui.getNumberOfMissedMessages();
        $notes = $('#sepiaFW-alwaysOn-notifications');
        $notes.html(missedNotesWithIcon);
        $notes.stop().fadeIn(500, function(){
            if (fadeOutAfterDelay == undefined) fadeOutAfterDelay = 5000;
            if (fadeNotificationsTimer) clearTimeout(fadeNotificationsTimer);
            fadeNotificationsTimer = setTimeout(function(){
                $notes.fadeOut(3000);
            }, fadeOutAfterDelay);
        });
    }
    var fadeNotificationsTimer;

    //Show battery status for a while
    function showBatteryAndFade(fadeOutAfterDelay){
        if (AlwaysOn.trackPowerStatus){
            var batteryIcon = "battery_alert";
            if (AlwaysOn.batteryPlugStatus){
                batteryIcon = "battery_charging_full";
            }else if (AlwaysOn.batteryLevel > 0.9){
                batteryIcon = "battery_std";
            }else if (AlwaysOn.batteryLevel > 0.75){
                batteryIcon = "battery_std";
            }else if (AlwaysOn.batteryLevel > 0.5){
                batteryIcon = "battery_std";
            }else if (AlwaysOn.batteryLevel > 0.25){
                batteryIcon = "battery_std";
            }
            var batteryWithIcon = 
                '<i class="material-icons md-txt">' + batteryIcon + '</i>&nbsp;' + AlwaysOn.batteryPercentage;
            $battery = $('#sepiaFW-alwaysOn-battery');
            $battery.html(batteryWithIcon);
            $battery.stop().fadeIn(500, function(){
                if (fadeOutAfterDelay == undefined) fadeOutAfterDelay = 5000;
                if (fadeBatteryTimer) clearTimeout(fadeBatteryTimer);
                fadeBatteryTimer = setTimeout(function(){
                    $battery.fadeOut(3000);
                }, fadeOutAfterDelay);
            });
        }
    }
    var fadeBatteryTimer;

    //---------- Battery status API -----------

    var battery = undefined;
    AlwaysOn.trackPowerStatus = false;       //TODO: switchable in settings

    AlwaysOn.batteryLevel = undefined;
    AlwaysOn.batteryPercentage = undefined;
    AlwaysOn.batteryPlugStatus = undefined;

    AlwaysOn.isBatteryStatusSupported = function(){
        return !!navigator.getBattery;      //Note: we only support this API (see below)
    }

    AlwaysOn.setupBatteryStatus = function(){
        if (AlwaysOn.trackPowerStatus){
            //check and if possible activate
            if (AlwaysOn.isBatteryStatusSupported()){
                SepiaFW.debug.info("BatteryStatus supported via 'navigator.getBattery'.");
                navigator.getBattery().then(readBattery);
            
            }else{
                SepiaFW.debug.err("BatteryStatus is NOT supported!");
            }
        }else{
            //reset
            batteryStatusDeactivate();
        }
    }
    function batteryStatusListen(){
        //battery.addEventListener('chargingchange', readBattery);
        //battery.addEventListener("levelchange", readBattery);
        battery.onchargingchange = function(){
            readBattery(this);
        }
        battery.onlevelchange = function(){
            readBattery(this);
        }
        SepiaFW.debug.log("BatteryStatus - listening to plug and change events.");
    }
    function batteryStatusDeactivate(){
        AlwaysOn.batteryLevel = undefined;
        AlwaysOn.batteryPercentage = undefined;
        AlwaysOn.batteryPlugStatus = undefined;
        //battery.removeEventListener('chargingchange', readBattery);
        //battery.removeEventListener("levelchange", readBattery);
        battery.onchargingchange = null;
        battery.onlevelchange = null;
        battery = undefined;
        SepiaFW.debug.log("BatteryStatus - not listening to events.");
    }

    var isFreshBatteryRead = true;
    function readBattery(batt) {
        if (battery == undefined){
            battery = batt;
            batteryStatusListen();
        }
        if (!batt.level && isFreshBatteryRead){
            //This is an iOS error. Only way to fix it seems to be a reset :-/
            isFreshBatteryRead = false;
            batteryStatusDeactivate();
            navigator.getBattery().then(readBattery);
            return;
        }
    
        var previousLevel = AlwaysOn.batteryLevel;
        AlwaysOn.batteryLevel = batt.level;
        AlwaysOn.batteryPercentage = Math.round(batt.level * 100) + '%';
        if (previousLevel != AlwaysOn.batteryLevel){
            fireLevelChangeEvent();
        }
        
        var previousPlugStatus = AlwaysOn.batteryPlugStatus;
        AlwaysOn.batteryPlugStatus = batt.charging;
        if (AlwaysOn.batteryPlugStatus === true && previousPlugStatus === false){
            firePlugInEvent();
        }
    }

    function firePlugInEvent(){
        SepiaFW.debug.info("BatteryStatus - device plugged in.");
        if (!AlwaysOn.isOpen && AlwaysOn.autoLoadOnPowerPlug){
            AlwaysOn.start();
        }
    }

    function fireLevelChangeEvent(){
        //SepiaFW.debug.info("BatteryStatus - device level changed to: " + AlwaysOn.batteryPercentage);
    }

    return AlwaysOn;
}