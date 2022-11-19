#!/bin/sh
set -e
autoconfirm=
while getopts yh? opt; do
	case $opt in
		y) autoconfirm=1;;
		?|h) printf "Usage: %s [-y]\n" $0; exit 2;;
	esac
done
echo ""
echo "This script will try to build the SEPIA Client app from scratch."
if [ -n "$(command -v node)" ] && [ -n "$(command -v npm)" ]; then
	echo "Found Node.js: $(node -v), npm: $(npm -v)"
else
	#curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
	#sudo apt-get install -y nodejs
	echo "ABORT. Please install Node.js first! (e.g. 14 or 16 LTS)"
	exit 1
fi
if [ -z "$autoconfirm" ]; then
	echo ""
	echo "Before you continue please complete the following steps:"
	echo "- Edit package.json to add correct package and author name"
	echo "- Edit config.xml to add correct package and author name"
	echo "- Adjust 'universal-links' section and assetlinks.json"
	echo "- Make sure there is no 'config.xml' in any parent directory (BUG)"
	echo ""
	read -p "Enter 'ok' to continue: " okabort
	if [ -n "$okabort" ] && [ $okabort = "ok" ]; then
		echo "Ok. Good luck ;-)"
	else
		echo "Np. Maybe later :-)"
		exit
	fi
fi
#
# get Cordova
CORDOVA_VERSION="11.0.0"
CORDOVA_ANDROID="11.0.0"
echo ""
echo "Loading the right Cordova version ..."
npm install cordova@"$CORDOVA_VERSION"
#
# get Plugins
echo ""
echo "Adding plugins ..."
npx cordova plugin add cordova-custom-config
npx cordova plugin add cordova-plugin-device
npx cordova plugin add cordova-plugin-screen-orientation
npx cordova plugin add cordova-plugin-geolocation
#npx cordova plugin add cordova-plugin-inappbrowser
npx cordova plugin add https://github.com/fquirin/cordova-plugin-inappbrowser
#npx cordova plugin add cordova-plugin-whitelist
#npx cordova plugin add cordova-universal-links-plugin #alternative: cordova-plugin-universal-links
npx cordova plugin add https://github.com/sepia-assistant/cordova-universal-links-plugin.git
#npx cordova plugin add cordova-plugin-statusbar
npx cordova plugin add https://github.com/fquirin/cordova-plugin-statusbar
#npx cordova plugin add cordova-plugin-navigationbar-color
npx cordova plugin add https://github.com/fquirin/cordova-plugin-navigationbar
#npx cordova plugin add cordova-plugin-splashscreen
#cordova plugin add https://github.com/apache/cordova-plugin-splashscreen.git -- NOTE: use this in case releases are too old
npx cordova plugin add cordova-plugin-cache-clear
npx cordova plugin add cordova-plugin-tts-advanced
npx cordova plugin add plugin_mods/speechrecognition/org.apache.cordova.speech.speechrecognition
#cordova plugin add cordova-plugin-local-notification
#npx cordova plugin add https://github.com/timkellypa/cordova-plugin-local-notifications
npx cordova plugin add https://github.com/fquirin/cordova-plugin-local-notifications
npx cordova plugin add cordova-plugin-file
npx cordova plugin add cordova-plugin-nativestorage
#npx cordova plugin add cordova-android-support-gradle-release
npx cordova plugin add phonegap-plugin-media-stream
#npx cordova plugin add https://github.com/EddyVerbruggen/Insomnia-PhoneGap-Plugin.git
#npx cordova plugin add https://github.com/tombolaltd/cordova-plugin-insomnia.git
npx cordova plugin add cordova-plugin-insomnia
npx cordova plugin add cordova-plugin-eddystone
#NOTE: add before intent plugin if you use: plugin add cordova-plugin-camera
#npx cordova plugin add com-darryncampbell-cordova-plugin-intent
npx cordova plugin add https://github.com/fquirin/darryncampbell-cordova-plugin-intent
npx cordova plugin add cordova-plugin-androidx-adapter
#
# add android platform
echo ""
echo "Adding platform ..."
npx cordova platform add android@"$CORDOVA_ANDROID"
#
# prepare build
echo ""
echo "Preparing build ..."
npx cordova prepare android
#
# copy gradle wrapper
echo ""
echo "Copying Gradle wrapper ..."
cp -r gradle platforms/android/
# rename "S.E.P.I.A" in Gradle project name file
cd platforms/android
if [ -n "$(cat cdv-gradle-name.gradle | grep \"S.E.P.I.A.\")" ]; then
	echo "Fixing cdv-gradle-name.gradle ..."
	sed -i 's/S.E.P.I.A./SEPIA/g' cdv-gradle-name.gradle
fi
if [ -d "cordova-plugin-badge" ] && [ -f "cordova-plugin-badge/web-badge.gradle" ]; then
	cd cordova-plugin-badge
	if [ -n "$(cat web-badge.gradle | grep compile)" ]; then
		echo "Fixing cordova-plugin-badge/web-badge.gradle ..."
		sed -i 's/compile /implementation /g' web-badge.gradle
	fi
	cd ..
fi
#
# DONE
echo ""
echo "DONE"
echo "You can now open the project in Android Studio and finish your build. Check 'README.md' to fix build errors."
