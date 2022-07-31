# Universal Links Support

Here you will find instructions to support **universal-links** aka **deep-links** or **app-links** to open the SEPIA client via URL call.  
  
You can use the included index.html to design your fallback page.  
  
Check the `<universal-links>` section in your 'config.xml' to add your domain and URL paths.

## Android

- Read [the official app links info](https://developer.android.com/training/app-links/verify-site-associations)
- Take the 'build-android/assetlinks.json' file, fill in your data and deploy it on your web-space
- You can use the 'App Links Assistant' in Android Studio to generate a new file and ...
- ... check your actual hash via terminal `adb shell pm get-app-links com.your_app_package_name`
- If you get "legacy_failure" check your manifest 'intent-filter' and split the 'data' elements

## iOS

- Read [the official associated domains info](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- Take the 'build-ios/apple-app-site-association' file, fill in your data and deploy it on your web-space
