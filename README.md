# SEPIA Cross-Platform App
Part of the [SEPIA Framework](https://sepia-framework.github.io/)  

<p align="center">
  <img src="https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/blob/master/img/teach-ui.png" alt="S.E.P.I.A. App"/>
</p>

This is a HTML-based application (SEPIA client) to communicate with SEPIA via browser, iOS and Android.  
Features of the app are:
* Input via voice (Android, iOS, browser) and text
* Native (Android, iOS, Chrome) and open-source ASR supported ([see STT-Server](https://github.com/SEPIA-Framework/sepia-stt-server))
* Text-to-Speech voice output
* WebSocket based chat with SEPIA and other users that are registered on your private or public server ([see Chat-Server](https://github.com/SEPIA-Framework/sepia-websocket-server-java))
* Customizable start-screen with user-recommendations (created by the SEPIA server)
* AlwaysOn mode with animated avatar (works best with OLED screens! ^_^)
* In-chat card results (e.g. for to-do lists), audio player (e.g. for web-radio) and in-app browser for iOS and Android
* User-account management
* Teach-interface to add your own commands/chats/actions to SEPIA ([see Teach-Server](https://github.com/SEPIA-Framework/sepia-teach-server))
* Customizable look (skins for the app)
* Tutorial and help screens to get started
* Remote-actions to communicate between clients and devices (e.g. for [wake-word](https://github.com/SEPIA-Framework/sepia-wakeword-tools) integration)
* Deeplinks to open the app via URLs
* Local notifications (e.g. for alarms - push-notifications under construction)
* Language support for german and english
* Completely open-source

### Quick-start

The latest release version is always online at: https://sepia-framework.github.io/app/index.html (requires server with SSL)  
When you've installed SEPIA-Home the default link is: http://[sepia-home-IP]:20721/app/index.html  
The Android app can be installed via the Google Play Store: [Play Store link](https://play.google.com/store/apps/details?id=de.bytemind.sepia.app.web) (currently only German)  
  
Note: If you don't operate your own SEPIA server you can still open the app in "demo-mode" (simply skip the log-in) and look around a bit though most of the features will not be active in this mode.  
More languages for Android and an iOS app are in beta-test phase and will be release "when they are done" :-p  
  
For experts only: Use the build-scripts in this repository to build your own version of the app (Android and iOS are available).

### Version history ...

... can be found [here](https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/blob/master/app/README.md).
