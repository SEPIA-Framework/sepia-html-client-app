#!/bin/sh
#
APP_NAME="SepiaFW-P4"
# create project
echo "#Creating '$APP_NAME' ..."
npx cordova create $APP_NAME de.bytemind.sepia.app.web $APP_NAME
#
# copy folders
echo "#Transfering code ..."
cp -r www $APP_NAME
cp -r plugin_mods $APP_NAME
cp -r resources $APP_NAME
cp -r hooks $APP_NAME
cp config.xml $APP_NAME/config.xml
cp package.app.json $APP_NAME/package.json
cd $APP_NAME

#
# add plugins
echo "#Adding plugins ..."
npm i
# NEW better one
npx cordova prepare
echo "#Updating plugins ..."
cp -f "plugin_mods/inappbrowser/android/InAppBrowser.java" "plugins/cordova-plugin-inappbrowser/src/android/"
cp -r -f "plugin_mods/inappbrowser/plugin.xml" "plugins/cordova-plugin-inappbrowser/plugin.xml"
cp -r -f "plugin_mods/inappbrowser/android/res" "plugins/cordova-plugin-inappbrowser/src/android/"
#cp -r -f "resources/icons/android/notifications/res/" "plugins/de.appplant.cordova.plugin.local-notification/src/android/res/"
#
# add android platform
# sleep 2
# overwrite icons (this will be replaced with a proper implementation)

# Fix a bug
[[ ! -d platforms/android/res/drawable ]] && cp platforms/android/res/drawable-port-hdpi platforms/android/res/drawable -recho "#Adding or overwriting resources, e.g. icons, themes, xml ..."

cp -r -f "resources/icons/android/notifications/res" "platforms/android/"
cp -r "resources/themes/android/background_splash.xml" "platforms/android/res/drawable/background_splash.xml"
cp -r "resources/themes/android/launch_screen.png" "platforms/android/res/drawable/launch_screen.png"
# NEW
cp -r "resources/themes/android/values" "platforms/android/res/"
mkdir -p "platforms/android/res/values-v21"
cp -r "resources/themes/android/values-v21" "platforms/android/res/"
cp -r "resources/config/android/xml" "platforms/android/res/"
echo "#DONE"
echo "If everything worked out fine the next step would be to build the app from the %APP_NAME% folder: cordova build android"
