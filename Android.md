# Build

- `npm install -g cordova@9.0.0`
- Adjust `config.xml` and build scripts to set your package name
- Call one of the `create-android-...` scripts
- Fix the build with the info below O_o

# Manual Build Fixes

Version 0.24.1:
- In `build.gradle` (all files) set `classpath 'com.android.tools.build:gradle:3.3.3'` ([visibility in Android 11](https://android-developers.googleblog.com/2020/07/preparing-your-build-for-package-visibility-in-android-11.html))
- Add `distributionUrl` version in `gradle-wrapper.properties` to `4.10.3-all`
- Add SEPIA icon in Android Studio again (60% scaling, background black)
- Add to manifest:
  - android:versionCode="11201" (latest 2021.11.21)
  - queries ([use-cases](https://developer.android.com/training/package-visibility/use-cases), [visibility in Android 11](https://medium.com/androiddevelopers/package-visibility-in-android-11-cc857f221cd9))
  ```
  <queries>
    <intent>
      <action android:name="android.speech.RecognitionService" />
    </intent>
    <intent>
      <action android:name="android.intent.action.TTS_SERVICE" />
    </intent>
    <intent>
      <action android:name="android.intent.action.MEDIA_BUTTON" />
    </intent>
    <intent>
      <action android:name="android.media.action.MEDIA_PLAY_FROM_SEARCH" />
    </intent>
    <intent>
      <action android:name="android.intent.action.VIEW" />
      <data android:scheme="*" />
    </intent>
  </queries>
  ```

## Cordova Plugins Used (tested: 2021.11.21)

- Cordova version: `9.0.0`
- Cordova platform version: `android@8.1.0`
- `cordova-plugin-inappbrowser`: custom version from plugin_mods folder
- `org.apache.cordova.speech.speechrecognition`: custom version from plugin_mods folder

```
"dependencies": {
	"com-darryncampbell-cordova-plugin-intent": "^2.1.0",
	"cordova-android": "^8.1.0",
	"cordova-android-support-gradle-release": "^3.0.1",
	"cordova-custom-config": "^5.1.0",
	"cordova-plugin-badge": "^0.8.8",
	"cordova-plugin-ble": "^2.0.1",
	"cordova-plugin-cache-clear": "^1.3.8",
	"cordova-plugin-compat": "^1.2.0",
	"cordova-plugin-device": "^2.0.3",
	"cordova-plugin-eddystone": "^1.3.0",
	"cordova-plugin-file": "^6.0.2",
	"cordova-plugin-geolocation": "^4.1.0",
	"cordova-plugin-inappbrowser": "^5.0.0",
	"cordova-plugin-insomnia": "git+https://github.com/tombolaltd/cordova-plugin-insomnia.git",
	"cordova-plugin-local-notification": "git+https://github.com/timkellypa/cordova-plugin-local-notifications.git",
	"cordova-plugin-nativestorage": "^2.3.2",
	"cordova-plugin-navigationbar-color": "^0.1.0",
	"cordova-plugin-screen-orientation": "^3.0.2",
	"cordova-plugin-splashscreen": "^6.0.0",
	"cordova-plugin-statusbar": "^2.4.3",
	"cordova-plugin-tts": "^0.2.3",
	"cordova-plugin-whitelist": "^1.3.5",
	"cordova-universal-links-plugin": "git+https://github.com/sepia-assistant/cordova-universal-links-plugin.git",
	"es6-promise-plugin": "^4.2.2",
	"phonegap-plugin-media-stream": "^1.2.1",
	"speechrecognition": "file:plugin_mods/speechrecognition/org.apache.cordova.speech.speechrecognition"
}
```
