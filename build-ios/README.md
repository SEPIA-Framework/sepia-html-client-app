# SEPIA iOS App

The iOS app build is a bit out-dated and since the app has never been release in the Apple Store so far it hasn't been maintained well,
but the essential stuff has been fixed from time to time and should still work.

## Requirements

- Install at least **Node.js 14**
- Install **XCode**

## Build App

- Edit `config.xml` to add correct package and author name
- Adjust 'universal-links' section and `apple-app-site-association` ([associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains))
- Run the build script `bash create-ios-project.sh`
- Fix the build with the info below

## Manual Build Fixes

- Load the app in Xcode and look for errors :-/
- TBD

## Known Bugs in iOS

Last tested on: iOS 16.0.2

- The WebSocket implementation is buggy (starting from iOS 15?) and fails during STT server close request BUT only in Cordova.
- The Web Speech API is buggy and will sometimes return results although it was stopped already!
- PWAs don't support Web Speech API
- PWAs constantly ask for microphone permission
- HTML audio volume changes after speech recognition with Web Speech API (switching to other speaker?)
- Navigation bar will not adapt to theme color
- iOS overscroll effect and double-tap zoom are pretty annoying