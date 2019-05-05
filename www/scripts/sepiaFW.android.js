//Interface for Android-Only functions

function sepiaFW_build_android(){
    var Android = {};
    
    //Broadcast a MEDIA_BUTTON event
    Android.broadcastMediaButtonIntent = function(action, code){
        //Android intent broadcast to stop all media
        Android.intentBroadcast({
            action: "android.intent.action.MEDIA_BUTTON",
            extras: {
                "android.intent.extra.KEY_EVENT": JSON.stringify({
                    "action": action, 
                    "code": code
                })
            }
        });
        /*
        0: KeyEvent.ACTION_DOWN
        1: KeyEvent.ACTION_UP
        85: KEYCODE_MEDIA_PLAY_PAUSE
        */
    }

    //Music search via Android Intent
    Android.startMusicSearchActivity = function(controlData, allowSpecificService){
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
                if (controlData.service == "spotify"){
                    data.package = "com.spotify.music";
                }else if (controlData.service == "youtube"){
                    data.package = "com.google.android.youtube";
                }else if (controlData.service == "apple_music"){
                    data.package = "com.apple.android.music";
                }else if (controlData.service == "amazon_music"){
                    data.package = "com.amazon.mp3";
                }else if (controlData.service == "soundcloud"){
                    data.package = "com.soundcloud.android";
                }else if (controlData.service == "deezer"){
                    data.package = "deezer.android.app";
                }else if (controlData.service == "vlc_media_player"){
                    data.package = "org.videolan.vlc";
                }
            }

            //Call activity
            Android.intentActivity(data);

        }else{
            SepiaFW.debug.error("Android music search - Missing support or data!");
        }
    }

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
        var msg = "Tried to call Android Intent '" + data.action + "' and failed with msg: " + infoString;
        SepiaFW.debug.error(msg);
        SepiaFW.ui.showInfo(msg);
        if (errorCallback) errorCallback(info);
    }

    return Android;
}