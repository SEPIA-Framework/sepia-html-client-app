# SEPIA Android App

## Requirements

- Install at least **Node.js 14**
- Install **Android Studio and SDK**
- Make sure `ANDROID_HOME` is defined in your OS (or scope)
- Use Debian **Linux** or a compatible system. In Windows you can use WSL2 for example. Mac OS should work as well.

## Build App

- Edit `package.json` to add correct package and author name
- Edit `config.xml` to add correct package and author name
- Adjust 'universal-links' section and `assetlinks.json` ([universal links](https://developer.android.com/training/app-links/verify-site-associations))
- Run the build script `bash build.sh`
- Fix the build with the info below O_o

## Manual Build Fixes

There are currently a number of issues with the Cordova 11.0.0 build that need to be fixed manually :-/:

- Open `[build-folder]/platforms/android` in Android Studio
- Open `cdv-gradle-name.gradle` and "fix" name
- Open `app/src/main/AndroidManifest.xml` and:
  - Check that minSdk is 22 (Android 5.1)
  - Adjust `android:versionCode`, latest release was: 11401 (2022.07.28)
  - Remove permission `REQUEST_INSTALL_PACKAGES` (from intent plugin) and `WRITE_EXTERNAL_STORAGE`
  - Check `queries` if you need to add stuff ([use-cases](https://developer.android.com/training/package-visibility/use-cases))
- Install Gradle wrapper. Tested with: 7.4.2
- Fix errors in 'Problems' tab, e.g. replace 'GradleException' with 'RuntimeException'?
- Fix `cordova-plugin-badge/web-badge.gradle` by replacing `compile` with `implementation` (until plugin is officially fixed)
- If `app/src/main/res` resources folder got messed up restore from root folder
- If plugin is not fixed yet apply changes from `https://github.com/fquirin/cordova-plugin-statusbar`
- Run app and test on device/emulator

## Cordova Plugins Used (tested: 2022.07.28)

- Cordova version: `11.0.0`
- Cordova platform version: `android@11.0.0`
- `org.apache.cordova.speech.speechrecognition`: custom version from plugin_mods folder

```
"dependencies": {
    "com-darryncampbell-cordova-plugin-intent": "^2.2.0",
    "cordova-android": "^11.0.0",
    "cordova-custom-config": "^5.1.1",
    "cordova-plugin-androidx-adapter": "^1.1.3",
    "cordova-plugin-ble": "^2.0.1",
    "cordova-plugin-cache-clear": "^1.3.8",
    "cordova-plugin-compat": "^1.2.0",
    "cordova-plugin-device": "^2.1.0",
    "cordova-plugin-eddystone": "^1.3.0",
    "cordova-plugin-badge": "^0.8.8",
    "cordova-plugin-file": "^6.0.2",
    "cordova-plugin-geolocation": "^4.1.0",
    "cordova-plugin-inappbrowser": "git+https://github.com/fquirin/cordova-plugin-inappbrowser.git",
    "cordova-plugin-insomnia": "^4.3.0",
    "cordova-plugin-local-notification": "git+https://github.com/fquirin/cordova-plugin-local-notifications.git",
    "cordova-plugin-nativestorage": "^2.3.2",
    "cordova-plugin-navigationbar-color": "^0.1.0",
    "cordova-plugin-screen-orientation": "^3.0.2",
    "cordova-plugin-statusbar": "^3.0.0",
    "cordova-plugin-tts-advanced": "^0.5.2",
    "cordova-plugin-whitelist": "^1.3.5",
    "cordova-universal-links-plugin": "git+https://github.com/sepia-assistant/cordova-universal-links-plugin.git",
    "es6-promise-plugin": "^4.2.2",
    "phonegap-plugin-media-stream": "^1.2.1",
    "speechrecognition": "file:plugin_mods/speechrecognition/org.apache.cordova.speech.speechrecognition"
}
```
