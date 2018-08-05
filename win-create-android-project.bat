@echo off
SET APP_NAME=SepiaFW-P4
REM create project
sleep 2
echo "#Creating '%APP_NAME%' ..."
cordova create %APP_NAME% de.bytemind.sepia.app.web %APP_NAME% |more
REM
REM copy folders
sleep 2
echo "#Transfering code ..."
xcopy www %APP_NAME%\www /e /h /y |more
xcopy plugin_mods %APP_NAME%\plugin_mods /e /h /i |more
xcopy resources %APP_NAME%\resources /e /h /i |more
xcopy hooks %APP_NAME%\hooks /e /h /y |more
xcopy config.xml %APP_NAME% /y |more
cd %APP_NAME%
REM
REM add plugins
sleep 2
echo "#Adding plugins ..."
cordova plugin add cordova-plugin-device |more
cordova plugin add cordova-plugin-geolocation |more
cordova plugin add cordova-plugin-inappbrowser |more
cordova plugin add cordova-plugin-tts |more
cordova plugin add cordova-plugin-whitelist |more
cordova plugin add cordova-universal-links-plugin |more
cordova plugin add cordova-plugin-statusbar |more
cordova plugin add cordova-plugin-splashscreen |more
cordova plugin add cordova-plugin-cache-clear |more
cordova plugin add cordova-custom-config |more
cordova plugin add plugin_mods/speechrecognition/org.apache.cordova.speech.speechrecognition |more
REM cordova plugin add de.appplant.cordova.plugin.local-notification |more
REM cordova plugin add plugin_mods/localnotifications/de.appplant.cordova.plugin.local-notification |more
cordova plugin add cordova-plugin-local-notification |more
cordova plugin add cordova-plugin-file |more
cordova plugin add cordova-plugin-nativestorage |more
cordova plugin add cordova-android-support-gradle-release |more
cordova plugin add phonegap-plugin-media-stream |more
REM
REM overwrite plugin mods
sleep 2
echo "#Updating plugins ..."
xcopy "plugin_mods\inappbrowser\android\InAppBrowser.java" "plugins\cordova-plugin-inappbrowser\src\android" /y |more
xcopy "plugin_mods\inappbrowser\plugin.xml" "plugins\cordova-plugin-inappbrowser" /y |more
xcopy "plugin_mods\inappbrowser\android\res" "plugins\cordova-plugin-inappbrowser\src\android\res" /e /h /y |more
REM cp -r -f "resources/icons/android/notifications/res/" "plugins/de.appplant.cordova.plugin.local-notification/src/android/res/"
REM
REM add android platform
sleep 2
echo "#Adding platform ..."
cordova platform add android@6.4.0 |more
REM
REM prepare build
echo "#Preparing build ..."
cordova prepare android |more
REM overwrite icons (this will be replaced with a proper implementation)
sleep 2
echo "#Replacing icons ..."
xcopy "resources\icons\android\notifications\res" "platforms\android\res" /e /h /y |more
xcopy "resources\themes\android\background_splash.xml" "platforms\android\res\drawable" |more
xcopy "resources\themes\android\launch_screen.png" "platforms\android\res\drawable" |more
xcopy "resources\themes\android\styles.xml" "platforms\android\res\values" |more
echo "#DONE"
echo "If everything worked out fine the next step would be to build the app from the %APP_NAME% folder: cordova build android"
pause