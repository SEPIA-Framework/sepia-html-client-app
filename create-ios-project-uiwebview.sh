#!/bin/bash
echo "NOTE: UIWebView is no longer actively supported. Please use the WkWebView script to install the iOS app."
echo "If you require UIWebView at all cost feel free to continue ;-)"
read -rsp $'Press enter to continue or CRTL+C to exit ...\n'
#
APP_NAME="SepiaFW-P4"
# create project
echo "#Creating '$APP_NAME' ..."
cordova create $APP_NAME de.bytemind.sepia.app.web $APP_NAME
#
# copy folders
sleep 2
echo "#Transfering code ..."
cp -r www $APP_NAME
cp -r plugin_mods $APP_NAME
cp -r resources $APP_NAME
cp -r hooks $APP_NAME
cp config.xml $APP_NAME/config.xml
cd $APP_NAME
#
# add plugins
sleep 2
echo "#Adding plugins ..."
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-geolocation
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add cordova-plugin-tts
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-universal-links-plugin
cordova plugin add cordova-plugin-statusbar
cordova plugin add cordova-plugin-splashscreen
cordova plugin add cordova-plugin-cache-clear
cordova plugin add plugin_mods/speechrecognition/org.apache.cordova.speech.speechrecognition
#cordova plugin add de.appplant.cordova.plugin.local-notification
cordova plugin add plugin_mods/localnotifications/de.appplant.cordova.plugin.local-notification
cordova plugin add plugin_mods/iosbackgroundaudio/nl.kingsquare.cordova.background-audio
#
# overwrite plugin mods
sleep 2
echo "#Updating plugins ..."
cp "plugin_mods/universallinks/xcodePreferences.js" "plugins/cordova-universal-links-plugin/hooks/lib/ios/xcodePreferences.js"
cp "plugin_mods/inappbrowser/ios/CDVInAppBrowser_uiwv.m" "plugins/cordova-plugin-inappbrowser/src/ios/CDVInAppBrowser.m"
cp "plugin_mods/tts/ios/CDVTTS.m" "plugins/cordova-plugin-tts/src/ios/CDVTTS.m"
#
# install xcode node package
sleep 2
echo "#Checking node xcode package ... "
npm install xcode
#
# add ios platform
sleep 2
echo "#Adding platform ..."
cordova platform add ios@4.5.3
#
# prepare build
echo "#Preparing build ..."
cordova prepare ios
echo "#DONE"
echo "#Please open $APP_NAME/platforms/ios/$APP_NAME.xcodeproj in Xcode and set some extra stuff:"
echo "# - provisioning profile for signing"
echo "# - Build settings -> Always Embed Swift Standard Libraries = yes"
echo "# - If you are using a 'free' account for signing: Capabilities -> Associated Domains -> delete entry"
