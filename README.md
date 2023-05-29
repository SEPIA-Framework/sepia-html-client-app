# SEPIA Cross-Platform App
Part of the [SEPIA Framework](https://sepia-framework.github.io/).  

<p align="center">
  <img src="https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/blob/master/img/teach-ui.png" alt="S.E.P.I.A. App"/>
</p>
  
More screenshots can be found [here](screenshots).  
  
This is the primary SEPIA client used to communicate with SEPIA assistant. It is written in Javascript/HTML and runs cross-platform on any modern browser (desktop PC, Android, iOS),
as web and mobile app or even as [smart-speaker (headless) and smart-display](https://github.com/SEPIA-Framework/sepia-installation-and-setup/tree/master/sepia-client-installation) on SBCs like the Raspberry Pi.  
  
Features of the app are:
* Controllable via voice, touch and text input on Android, iOS and basically any modern browser
* Speech recognition via native platform APIs (Android, Chrome, Safari, Microsoft Edge) and custom open-source [STT-Server](https://github.com/SEPIA-Framework/sepia-stt-server)
* Text-to-Speech voice output via native client APIs, custon SEPIA server and other open-source tools like Mary-TTS or Larynx
* Built-in wake-word support for phrases like "Hey SEPIA", "Computer", "Jarvis", "Alexa" (:-p) and many more thanks to [SEPIA Web-Audio library](https://github.com/SEPIA-Framework/sepia-web-audio)
* Chat with SEPIA and other users that are registered on your server via private WebSocket connection ([see Chat-Server](https://github.com/SEPIA-Framework/sepia-websocket-server-java))
* Customizable start-screen with user-recommendations (created by the SEPIA server) and user-defined shortcut buttons
* AlwaysOn mode with [animated avatar](screenshots/avatar-classic.png) (works great with OLED screens! ^_^)
* In-chat card results (e.g. for to-do lists), audio player (e.g. for web-radio) and in-app browser for iOS and Android
* [Customizable look](screenshots/README.md) (skins for app and multiple avatars)
* Support for [custom voice widgets](https://github.com/SEPIA-Framework/sepia-docs/wiki/Creating-HTML-voice-widgets-for-the-SEPIA-client) written in HTML/Javascript 
* Support for [custom media-player widgets](https://github.com/SEPIA-Framework/sepia-docs/wiki/Embedded-Media-Player), e.g. to add your own music player
* Teach-interface to add your own commands/chats/actions to SEPIA ([see Teach-Server](https://github.com/SEPIA-Framework/sepia-teach-server))
* Remote-actions to communicate between clients and devices, e.g. to start music on another device or broadcast a message
* User-account management
* Remote terminal support via CLEXI server to work in 'headless' mode
* Tutorial and help screens to get started
* Deeplinks to open the app via URLs
* Local notifications (e.g. for alarms - push-notifications under construction)
* Language support for german and english
* Completely open-source

### Quick-start

The latest release version is **online** at: https://sepia-framework.github.io/app/index.html  
When you've installed **SEPIA-Home** the default link is: `http://[sepia-home-IP]:20721/app/index.html` or `http[s]://[sepia-home-IP]:20726/sepia/assist/app/index.html` (if you use Nginx or Docker).  
The **Android** app can be installed via the **Google Play Store**: [Play Store link](https://play.google.com/store/apps/details?id=de.bytemind.sepia.app.web) or directly using the [APK](https://github.com/SEPIA-Framework/sepia-installation-and-setup/releases).  
On **iOS** please use Safari to visit the default link (see above) and put the app on your home screen as **PWA** (progressive web-app). The native app development is currently on ice due to time constraints.  
  
Note: If you don't operate your own SEPIA server you can still open the public app in **demo-mode** (simply skip the log-in) and look around a bit, though many of the features will not be available in this mode.  
  
For experts only: Use the build-scripts in this repository to build your own version of the app (Android and an iOS BETA are available).

### URL parameters

You can modify the client configuration via several URL parameters:
* `host` - SEPIA server host, e.g. IP address or domain + path
* `lang` - Default language code for client (ISO code)
* `rc` - Default region code for client (BCP47 language-REGION code)
* `isApp` - 'true' will change client to behave as if it was an app (not a website), e.g. login tokens will be valid for much longer etc.
* `pwa` - 'true' will put the app in a PWA (progressive web app) compatible state by enabling the service-worker.
* `noSW` - 'true' will force disable the service-worker of the page. This might be useful to find issues related to blocked cookies etc.
* `isTiny` - 'true' will optimize the UI and controls to support small displays (e.g. Apple Watch or 240x240px screens)
* `zoomFactor` - Factor (usually > 1.0) to increase size of UI. If bigger than max. possible zoom it will be set to max.
* `isHeadless` or `autoSetup` - Load client settings from file (settings.js) and trigger setup mode if no user is logged in. 'isHeadless' will set some supported client features as well (e.g. don't open browser tabs etc.).
* `hasTouch` - 'true' will set touch-screen mode (tweaked UI hover effects etc.) if screen itself is "emulating" touch and client does not properly detect mode.
* `virtualKeyboard` - 'true' will enable an experimental, virtual keyboard that can be used for example for DIY client "kiosk"-mode apps with touch-screen.
* `skinId` - Number (ID) of skin to use at start. Will overwrite user preference.
* `env` - 'environment' setting for client (e.g.: default, speaker, smart_display)
* `q` - Question that will be triggered when client is connected
* `share` - Shared data e.g. via deeplinks
* `view` - Switch to specific view on start for example always-on mode (e.g.: aomode, teachui, <custom_data>/views/demo-view, <assist_server>/views/demo-view)
* `clexi` and `clexiId` - CLEXI socket URL and access ID
* `logout` - 'true' will make sure client is logged out at start (all previous user date removed)
* `cordova` - Set Cordova framework mode if 'true'
* `isTest` - tbd

### Chat 'hacks'

The chat input field has some direct commands that will influence the way the input is handled:
* `i18n:[lang_code]` - This will tell the assistant to handle the input in a certain langauge, e.g.: `i18n:de Guten Tag` (assuming you are in English mode)
* `linkshare [URL]` - This will generate a link card for the given URL, e.g.: `linkshare https://example.com`
* `[URL]` - Direct input of URLs will open the URL in a new tab or in-app browser. Some URLs might be handled via widgets like YouTube.
* `saythis [text]` - Let the assistant speak this text, e.g.: `saythis You are cool.`
* `@[user]` - Send private message to specific user (if in same channel). The same can be triggered via tap on the user name.

### App deeplinks

* `https://b07z.net/dl/sepia/index.html?q=[my request as text]` - e.g. `test`
* `https://b07z.net/dl/sepia/index.html?view=[app view]` - e.g. `aomode`, `teachui`
* `https://b07z.net/dl/sepia/index.html?share=[base64 encoded share data]` - use long-press on your user name of one of your chat entries inside the app to generate share links

### Version history ...

... can be found [here](https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/blob/master/app/README.md).
