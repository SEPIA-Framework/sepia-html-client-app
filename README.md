# SEPIA Cross-Platform App
Part of the [SEPIA Framework](https://sepia-framework.github.io/)  

<p align="center">
  <img src="https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/blob/master/img/teach-ui.png" alt="S.E.P.I.A. App"/>
</p>

This is a HTML-based application (SEPIA client) to communicate with SEPIA via browser, iOS and Android.  
Features of the app are:
* Input via voice (Android, iOS, browser) and text
* Native platform (Android, iOS, Chrome) and open-source ASR supported ([see STT-Server](https://github.com/SEPIA-Framework/sepia-stt-server))
* Text-to-Speech voice output via client platform and open-source SEPIA server
* WebSocket based chat with SEPIA and other users that are registered on your private or public server ([see Chat-Server](https://github.com/SEPIA-Framework/sepia-websocket-server-java))
* Customizable start-screen with user-recommendations (created by the SEPIA server)
* AlwaysOn mode with animated avatar (works best with OLED screens! ^_^)
* In-chat card results (e.g. for to-do lists), audio player (e.g. for web-radio) and in-app browser for iOS and Android
* User-account management
* Teach-interface to add your own commands/chats/actions to SEPIA ([see Teach-Server](https://github.com/SEPIA-Framework/sepia-teach-server))
* Remote terminal support via CLEXI server to work in 'headless' mode
* Customizable look (skins for the app)
* Tutorial and help screens to get started
* Remote-actions to communicate between clients and devices (e.g. for [wake-word](https://github.com/SEPIA-Framework/sepia-wakeword-tools) integration)
* Deeplinks to open the app via URLs
* Local notifications (e.g. for alarms - push-notifications under construction)
* Language support for german and english
* Completely open-source

### Quick-start

The latest release version is always **online** at: `https://sepia-framework.github.io/app/index.html` (requires server with SSL)  
When you've installed **SEPIA-Home** the default link is: `http://[sepia-home-IP]:20721/app/index.html`  
The Android app can be installed via the **Google Play Store**: [Play Store link](https://play.google.com/store/apps/details?id=de.bytemind.sepia.app.web)  
  
Note: If you don't operate your own SEPIA server you can still open the app in "demo-mode" (simply skip the log-in) and look around a bit though most of the features will not be active in this mode.  
More languages for Android and an iOS app are in beta-test phase and will be release "when they are done" :-p  
  
For experts only: Use the build-scripts in this repository to build your own version of the app (Android and iOS are available).

### URL parameters

You can modify the client configuration via several URL parameters:
* `host` - SEPIA server host, e.g. IP address or domain + path
* `lang` - Default language code for client (ISO code)
* `isApp` - 'true' will change client to behave as if it was an app (not a website), e.g. login tokens will be valid for much longer etc.
* `pwa` - 'true' will put the app in a PWA (progressive web app) compatible state by enabling the service-worker.
* `noSW` - 'true' will force disable the service-worker of the page. This might be useful to find issues related to blocked cookies etc.
* `isTiny` - 'true' will optimize the UI and controls to support small displays (e.g. Apple Watch or 240x240px screens)
* `isHeadless` or `autoSetup` - Load client settings from file (settings.js) and trigger setup mode if no user is logged in. 'isHeadless' will set some supported client features as well (e.g. don't open browser tabs etc.).
* `env` - 'environment' setting for client
* `q` - Question that will be triggered when client is connected
* `share` - Shared data e.g. via deeplinks
* `view` - Switch to specific view on start for example always-on mode (e.g.: aomode, teachui, "frame name")
* `clexi` and `clexiId` - CLEXI socket URL and access ID
* `logout` - 'true' will make sure client is logged out at start (all previous user date removed)
* `cordova` - Set Cordova framework mode if 'true'
* `isTest` - tbd

### App deeplinks

* `https://b07z.net/dl/sepia/index.html?q=[my request as text]` - e.g. `test`
* `https://b07z.net/dl/sepia/index.html?view=[app view]` - e.g. `aomode`, `teachui`
* `https://b07z.net/dl/sepia/index.html?share=[base64 encoded share data]` - use long-press on your user name of one of your chat entries inside the app to generate share links

### Version history ...

... can be found [here](https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/blob/master/app/README.md).
