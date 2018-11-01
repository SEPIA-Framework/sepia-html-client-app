//Always on special screen mode
function sepiaFW_build_always_on(){
    var AlwaysOn = {};

    //some states
    var mainWasFullscreenOpen = false;
    var mainWasVoiceDisabled = false;

    //some settings
    AlwaysOn.autoEnableVoice = true;

    //Load always on screen
    AlwaysOn.start = function(){
        SepiaFW.frames.open({ 
            pageUrl: "always-on.html",
            onFinishSetup: AlwaysOn.onFinishSetup,
            onOpen: AlwaysOn.onOpen,
            onClose: AlwaysOn.onClose
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
        $("#sepiaFW-alwaysOn-avatar").off().on('click', function(){
            var useConfirmationSound = SepiaFW.speech.shouldPlayConfirmation();
            SepiaFW.ui.toggleMicButton(useConfirmationSound);
        });
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
        //effects
        if (openFadeTimer) clearTimeout(openFadeTimer);
        openFadeTimer = setTimeout(function(){
            $("#sepiaFW-alwaysOn-avatar").css({opacity:'0'}).show().animate({opacity:'1.0'}, {complete:function(){
                fadeOutNavbarControlsAfterDelay(5000);
                fadeAvatarToRandomPosAfterDelay(60000);
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
    }

    //Wake controls
    AlwaysOn.onWakeup = function(){
        //restore nav-bar and restart timer
        fadeOutNavbarControlsAfterDelay(5000);
        //restore avatar to wake
        wakeAvatar();
    }

    //Avatar animation controls
    function wakeAvatar(){
        $("#sepiaFW-alwaysOn-avatar").find(".avatar-eyelid").removeClass('sleep');
    }
    function makeAvatarSleepy(){
        $("#sepiaFW-alwaysOn-avatar").find(".avatar-eyelid").addClass('sleep');
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

    return AlwaysOn;
}