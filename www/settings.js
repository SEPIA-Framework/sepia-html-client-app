//Settings primarily for headless mode and setup (URL parameter: 'isHeadless=true')
//Some examples: https://github.com/SEPIA-Framework/sepia-html-client-app/blob/master/Settings.md
SepiaFW.settings = {
	headless: {
		device: {
			"host-name": "localhost",
			"deviceId": "o1",
			"deviceLocalSiteData": {
				"location": "home", 
				"type": "room", 
				"name": "unassigned", 
				"index": ""
			},
			"mediaDevices": {
				"mic": {},
				"player": {},
				"tts": {},
				"fx": {}
			},
			"microphoneSettings": {
				"gain": 1.0
			},
			"deviceSounds": {
				"micConfirm": "sounds/coin.mp3",
				"alarm": "sounds/alarm.mp3"
			},
			"wakeWordNames": "Hey SEPIA",
			"wakeWordVersion": "1.4",
			"voiceEngine": "sepia",
			"voiceCustomServerURI": "",
			"en-voice": "",
			"de-voice": "",
			"asrEngine": "native",
			"asrServerURI": "http://localhost:20726/sepia/stt",
			"asrServerUser": "any",
			"asrServerToken": "test1234",
			"en-asrModel": "",
			"de-asrModel": "",
			"big-screen-mode": true,
			"clexiGpioInterface": {
				"buttons": [{
					"id": "hw-mic-button",
					"pin": null
				}],
				"leds": [{
					"id": "state-led-1",
					"pin": null,
					"state": "listening"
				}],
				"items": [{
					"id": "led-array",
					"file": null,
					"options": {
						"numOfLeds": 3
					},
					"modes": {
						"idle": [{"ledIndex": 1, "red": 0, "green": 0, "blue": 0}],
						"listening": [{"ledIndex": 1, "red": 150, "green": 0, "blue": 0}],
						"speaking": [{"ledIndex": 1, "red": 0, "green": 0, "blue": 150}],
						"awaitDialog": [{"ledIndex": 1, "red": 100, "green": 100, "blue": 0}],
						"loading": [{"ledIndex": 1, "red": 10, "green": 10, "blue": 10}],
						"wakeWordActive": [{"ledIndex": 2, "red": 10, "green": 0, "blue": 0}],
						"wakeWordInactive": [{"ledIndex": 2, "red": 0, "green": 0, "blue": 0}]
					}
				}]
			}
		},
		user: {
			"clexiSocketURI": "ws://localhost:8080",
			"clexiServerId": "clexi-123",
			"clexiConnect": true,
			"useRemoteCmdl": true,
			"useGamepads": true,
			"useBluetoothBeacons": true,
			"useBluetoothBeaconsInAoModeOnly": false,
			"knownBluetoothBeaconAddresses": [],
			"useWakeWord": false,
			"autoloadWakeWord": false,
			"allowWakeWordDuringStream": false,
			"activeSkin": "2",
			"activeAvatar": "0",
			"proactiveNotes": false,
			"autoGPS": false,
			"embeddedPlayerSettings": {
				"canEmbedYouTube": true,
				"canEmbedSpotify": false,
				"canEmbedAppleMusic": false
			}
		},
		location: {
			"latitude": "",
			"longitude": ""
		},
		broadcast: {
			"state": true,
			"login": true,
			"clientError": true,
			"accountError": true,
			"speech": true,
			"wakeWord": true,
			"audioPlayer": true,
			"alarm": true,
			"info": false
		}
	}
};
