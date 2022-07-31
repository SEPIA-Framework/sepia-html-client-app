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

