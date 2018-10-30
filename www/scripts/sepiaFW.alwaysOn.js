//Always on special screen mode
function sepiaFW_build_always_on(){
    var AlwaysOn = {};

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
        $(".sepiaFW-alwaysOn-page, .sepiaFW-alwaysOn-navbar").on('click', function(){
            AlwaysOn.onWakeup();
        });
    }

    //On open
    AlwaysOn.onOpen = function(){
        //console.log('open');
        fadeOutNavbarControlsAfterDelay(5000);
        fadeAvatarToRandomPosAfterDelay(60000);
    }

    //On close
    AlwaysOn.onClose = function(){
        //console.log('close');
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

    //Fade out navbar controls slowly after a certain delay
    function fadeOutNavbarControlsAfterDelay(delay){
        var $navBarEntries = $(".sepiaFW-alwaysOn-navbar-entry");
        //stop any running timers and animations and restore opacity
        if (fadeControlsTimer) clearTimeout(fadeControlsTimer);
        $navBarEntries.stop().css({opacity:'100'});
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
        $avatar.stop().css({opacity:'100'});
        fadeAvatarTimer = setTimeout(function(){
            $avatar.stop().animate({opacity:'0'},{complete: function(){
                //done, get new coordinates
                setNewAvatarRandomPosition();
                //fade in again
                $avatar.stop().animate({opacity:'1000'},{duration: 1000});
                //make avatar sleepy
                makeAvatarSleepy();
                //restart timer
                fadeAvatarToRandomPosAfterDelay(delay);
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