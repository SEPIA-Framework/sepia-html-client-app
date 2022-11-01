//Interface for Android-Only functions

function sepiaFW_build_android(){
    var Android = {};

    Android.lastRequestMediaAppPackage = "";
    Android.lastRequestMediaAppTS = 0;
    Android.lastReceivedMediaAppPackage = "";
    Android.lastReceivedMediaAppTS = 0;
    Android.lastReceivedMediaData;

    //Collection of apps and their packages
    Android.musicApps = {
        "system": {name: "System", package: ""},
        "select": {name: "Select", package: ""},
        "embedded": {name: "Embedded Player", package: ""},
        "youtube": {name: "YouTube App", package: "com.google.android.youtube"},
        "youtube_link": {name: "YouTube Web", package: "com.google.android.youtube"},
        "youtube_embedded": {name: "YouTube Widget", package: "com.google.android.youtube"},
        "spotify": {name: "Spotify App", package: "com.spotify.music"},
        "spotify_link": {name: "Spotify Web", package: "com.spotify.music"},
        "spotify_embedded": {name: "Spotify Widget", package: "com.spotify.music"},
        "apple_music": {name: "Apple Music App", package: "com.apple.android.music"},
        "apple_music_link": {name: "Apple Music Web", package: "com.apple.android.music"},
        "apple_music_embedded": {name: "Apple Music Widget", package: "com.apple.android.music"},
        //"amazon_music": {name: "Amazon Music", package: "com.amazon.mp3"},
        //"soundcloud": {name: "SoundCloud", package: "com.soundcloud.android"},
        //"deezer": {name: "Deezer", package: "deezer.android.app"},
        "vlc_media_player": {name: "VLC", package: "org.videolan.vlc"}
    }
    Android.musicAppsThatBehaveByPackage = {
        "org.videolan.vlc": {name: "VLC"}
    }

    Android.getDefaultMusicAppPackage = function(){
        var app = Android.musicApps[SepiaFW.config.getDefaultMusicApp()];
        if (app){
            return app.package;
        }else{
            return "";
        }
    }

    //Set the last requested media app via app-tag (service)
    Android.setLastRequestedMediaApp = function(service){
        if (service){
            var app = Android.musicApps[service];
            if (app && app.package){
                Android.lastRequestMediaAppPackage = app.package;
            }
        }
    }
    
    //Broadcast a MEDIA_BUTTON event
    Android.broadcastMediaButtonIntent = function(action, code, requireMediaAppPackage){
        //Android intent broadcast to stop all media
        var intent = {
            action: "android.intent.action.MEDIA_BUTTON",
            extras: {
                "android.intent.extra.KEY_EVENT": JSON.stringify({
                    "action": action, 
                    "code": code
                })
            }
        };
        /*
        Action:
        0: KeyEvent.ACTION_DOWN
        1: KeyEvent.ACTION_UP
        Code:
        85: KEYCODE_MEDIA_PLAY_PAUSE
        87: KEYCODE_MEDIA_NEXT
        88: KEYCODE_MEDIA_PREVIOUS
        127: KEYCODE_MEDIA_PAUSE
        126: KEYCODE_MEDIA_PLAY
        */
        if (Android.lastRequestMediaAppPackage){
            intent.package = Android.lastRequestMediaAppPackage;
        }
        var tried;
        if (requireMediaAppPackage && intent.package){
            Android.intentBroadcast(intent);
            tried = true;    //sent
        }else if (!requireMediaAppPackage){
            Android.intentBroadcast(intent);
            tried = true;    //sent
        }else{
            tried = false;   //not sent
        }
        if (tried){
            if (code == 127){
                SepiaFW.audio.broadcastAudioEvent("android-intent", "stop", undefined);
            }else if (code == 126 || code == 87 || code == 88){
                SepiaFW.audio.broadcastAudioEvent("android-intent", "start", undefined);
            }
        }
        return tried;
    }
    //Simulate donw-up key event (some apps won't accept only one event)
    Android.broadcastMediaButtonDownUpIntent = function(code, requireMediaAppPackage){
        var sent = Android.broadcastMediaButtonIntent(0, code, requireMediaAppPackage);
        setTimeout(function(){
            Android.broadcastMediaButtonIntent(1, code, requireMediaAppPackage);
        }, 250);
        return sent;    //if the first one was sent the 2nd will too
    }

    //Receive a meta-data change BROADCAST from a music app
    Android.receiveMusicMetadataBroadcast = function(intent){
        /*{ -- e.g. VLC Media Player --
            "extras": {
                "duration ": 278539,
                "artist ": "Eric Clapton",
                "package ": "org.videolan.vlc",
                "playing ": false,
                "album ": "Unplugged",
                "track ": "Layla"
            },
            "action ": "com.android.music.metachanged",
            "flags ": 16
        }*/
        if (intent.extras){
            Android.lastReceivedMediaAppPackage = intent.extras.package;
            Android.lastReceivedMediaAppTS = new Date().getTime();
            Android.lastReceivedMediaData = {
                duration: intent.extras.duration,
                artist: intent.extras.artist,
                album: intent.extras.album,
                track: intent.extras.track,
                playing: intent.extras.playing
            }
            if (intent.extras.playing){
                if (intent.extras.artist && intent.extras.track){
                    SepiaFW.audio.setPlayerTitle(intent.extras.artist + " - " + intent.extras.track, 'android-intent');
                }else if (intent.extras.track){
                    SepiaFW.audio.setPlayerTitle(intent.extras.track, 'android-intent');
                }
            }else{
                SepiaFW.audio.setPlayerTitle('', '');
            }
            //TODO: add real "player active" state? ... it is not really the same ...
        }
    }

    //Music search via Android Intent
    Android.startMusicSearchActivity = function(controlData, allowSpecificService, errorCallback){
        //Android Intent music search
        if (SepiaFW.ui.isAndroid && controlData){
            var intentAction = "android.media.action.MEDIA_PLAY_FROM_SEARCH";
            var extraKeyFocus = "android.intent.extra.focus";
            var extraFocusValArtist = "vnd.android.cursor.item/artist";     //MediaStore.Audio.Artists.ENTRY_CONTENT_TYPE
            var extraFocusValGenre = "vnd.android.cursor.item/genre";       //MediaStore.Audio.Genres.ENTRY_CONTENT_TYPE
            var extraFocusValTitle = "vnd.android.cursor.item/audio";       //title
            var extraFocusValPlaylist = "vnd.android.cursor.item/playlist"; //MediaStore.Audio.Playlists.ENTRY_CONTENT_TYPE
            var extraFocusValAlbum = "vnd.android.cursor.item/album";       //MediaStore.Audio.Albums.ENTRY_CONTENT_TYPE
            var extraFocusValUnstructured = "vnd.android.cursor.item/*";    //unstructured
            var extraFocusValAny = "vnd.android.cursor.item/*";             //any
            var extraKeyArtist = "android.intent.extra.artist";
            var extraKeyGenre = "android.intent.extra.genre";
            var extraKeyAlbum = "android.intent.extra.album";
            var extraKeyTitle = "android.intent.extra.title";
            var extraKeyPlaylist = "android.intent.extra.playlist";
            var extraKeyQuery = "query";                                    //SearchManager.QUERY
            //Common
            var data = {
                action: intentAction,
                extras: {}
            };
            //Focus: Playlist
            if (controlData.playlist){
                data.extras[extraKeyFocus] = extraFocusValPlaylist;
                data.extras[extraKeyPlaylist] = controlData.playlist;
                data.extras[extraKeyQuery] = controlData.playlist;
                if (controlData.artist) data.extras[extraKeyArtist] = controlData.artist;
                if (controlData.album)  data.extras[extraKeyAlbum] = controlData.album;
                if (controlData.song)   data.extras[extraKeyTitle] = controlData.song;
                if (controlData.genre)  data.extras[extraKeyGenre] = controlData.genre;
            //Focus: Song (with Album)
            }else if (controlData.song && controlData.album){
                data.extras[extraKeyFocus] = extraFocusValTitle;
                data.extras[extraKeyTitle] = controlData.song;
                data.extras[extraKeyAlbum] = controlData.album;
                data.extras[extraKeyQuery] = controlData.album + " " + controlData.song;
                if (controlData.artist) data.extras[extraKeyArtist] = controlData.artist;
                if (controlData.genre)  data.extras[extraKeyGenre] = controlData.genre;
            //Focus: Song (with Artist)
            }else if (controlData.song && controlData.artist){
                data.extras[extraKeyFocus] = extraFocusValTitle;
                data.extras[extraKeyTitle] = controlData.song;
                data.extras[extraKeyArtist] = controlData.artist;
                data.extras[extraKeyQuery] = controlData.artist + " " + controlData.song;
                if (controlData.genre)  data.extras[extraKeyGenre] = controlData.genre;
            //Focus: Album
            }else if (controlData.album){
                data.extras[extraKeyFocus] = extraFocusValAlbum;
                data.extras[extraKeyAlbum] = controlData.album;
                if (controlData.artist){
                    data.extras[extraKeyArtist] = controlData.artist;
                    data.extras[extraKeyQuery] = controlData.artist + " " + controlData.album;
                }else{
                    data.extras[extraKeyQuery] = controlData.album;
                }
            //Focus: Artist
            }else if (controlData.artist){
                data.extras[extraKeyFocus] = extraFocusValArtist;
                data.extras[extraKeyArtist] = controlData.artist;
                data.extras[extraKeyQuery] = controlData.artist;
                if (controlData.genre)  data.extras[extraKeyGenre] = controlData.genre;
            //Focus: Genre
            }else if (controlData.genre){
                data.extras[extraKeyFocus] = extraFocusValGenre;
                data.extras[extraKeyGenre] = controlData.genre;
                data.extras[extraKeyQuery] = controlData.genre;
            //Focus: unstructured search (this also applies if we have only a song given)
            }else if (controlData.search){
                data.extras[extraKeyFocus] = extraFocusValUnstructured;
                data.extras[extraKeyQuery] = controlData.search;
            //Focus: play anything
            }else{
                data.extras[extraKeyFocus] = extraFocusValAny;
                data.extras[extraKeyQuery] = "";
            }

            //Add a specific service via package?
            if (allowSpecificService && controlData.service){
                var app = Android.musicApps[controlData.service];
                if (app && app.package){
                    data.package = app.package;
                }
            }else{
                var defaultApp = SepiaFW.config.getDefaultMusicApp();
                if (defaultApp && defaultApp == "select"){
                    data.chooser = "Select App";
                }else if (defaultApp && defaultApp != "system"){
                    var app = Android.musicApps[defaultApp];
                    if (app && app.package){
                        data.package = app.package;
                    }
                }
            }
            Android.lastRequestMediaAppPackage = data.package;
            Android.lastRequestMediaAppTS = new Date().getTime();

            //Call activity
            Android.intentActivity(data, function(){}, function(){
                //error calling intent
                if (errorCallback) errorCallback({
                    error: "Failed to call Android Intent.",
                    code: 1
                });
            });

            //Try to wait for meta-data or player-state broadcast 
            clearTimeout(musicSearchResultTimer);
            var waitTime = 4000;
            musicSearchResultTimer = setTimeout(function(){
                var now = new Date().getTime();
                if (Android.lastReceivedMediaAppTS && (now - Android.lastReceivedMediaAppTS) <=  waitTime){
                    //there was an event
                    if (!Android.lastReceivedMediaData.playing){
                        //no media playing
                        if (errorCallback) errorCallback({
                            error: "Media player is not playing.",
                            code: 2
                        });
                    }
                }else{
                    //no new event, ... but maybe the app just does not send any broadcast :-(
                    if (data.package && Android.musicAppsThatBehaveByPackage[data.package]){
                        //This app is known to sent broadcasts reliably
                        if (errorCallback) errorCallback({
                            error: "Media player is not playing.",
                            code: 2
                        });
                    }else{
                        //we skip the errorCallback because we are not sure
                    }
                }
            }, waitTime);

        }else{
            SepiaFW.debug.error("Android music search - Missing support or data!");
        }
    }
    var musicSearchResultTimer = undefined;

    //Android Intent access
    Android.intentActivity = function(data, successCallback, errorCallback){
        if (data.action && ("plugins" in window) && window.plugins.intentShim){
            //TODO: what about safety here? Should we do a whitelist?
            var dataObj = {
                action: data.action
            }
            if (data.extras) dataObj.extras = data.extras;
            if (data.url) dataObj.url = data.url;
            if (data.package) dataObj.package = data.package;
            if (data.chooser) dataObj.chooser = data.chooser;       //chooser: "Select application to share"
            if (data.component) dataObj.component = data.component; //{"package": ..., "class": ...}
            if (data.flags) dataObj.flags = data.flags;             //JSON array
            window.plugins.intentShim.startActivity(dataObj, function(intent){
                SepiaFW.debug.log("Sent Android Activity-Intent '" + data.action);
                if (successCallback) successCallback(intent);
            }, function(info){
                androidIntentFail(data, info, errorCallback)
            });
        }
    }
    Android.intentBroadcast = function(data, successCallback, errorCallback){
        if (data.action && ("plugins" in window) && window.plugins.intentShim){
            //TODO: what about safety here? Should we do a whitelist?
            var dataObj = {
                action: data.action
            }
            if (data.extras) dataObj.extras = data.extras;
            if (data.url) dataObj.url = data.url;
            if (data.package) dataObj.package = data.package;
            if (data.chooser) dataObj.chooser = data.chooser;       //chooser: "Select application to share"
            if (data.component) dataObj.component = data.component; //{"package": ..., "class": ...}
            if (data.flags) dataObj.flags = data.flags;             //JSON array
            window.plugins.intentShim.sendBroadcast(dataObj, function(intent){
                SepiaFW.debug.log("Sent Android Broadcast-Intent '" + data.action);
                if (successCallback) successCallback(intent);
            }, function(info){
                androidIntentFail(data, info, errorCallback)
            });
        }
    }
    function androidIntentFail(data, info, errorCallback){
        var infoString = "undefined";
        if (info && typeof info == "object"){
            infoString = JSON.stringify(info);
        }else if (info && typeof info == "string"){
            infoString = info;
        }
        var msg = "Tried to call Android Intent '" + data.action + "' and failed";
        SepiaFW.debug.error("Android Intent Error - " + msg, info);
        SepiaFW.ui.showInfo(msg + " with msg: " + infoString);
        if (errorCallback) errorCallback(info);
    }

    return Android;
}