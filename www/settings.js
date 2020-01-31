//Settings primarily for headless mode and setup (URL parameter: 'isHeadless=true')
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
			"en-voice": "",
			"de-voice": ""
		},
		user: {
			"clexiSocketURI": "ws://localhost:8080",
			"clexiServerId": "clexi-123",
			"clexiConnect": true,
			"useRemoteCmdl": true,
			"speech-voice-engine": "sepia",
			"speech-asr-engine": "native",
			"speech-websocket-uri": "ws://localhost:20741/stt/socket",
			"useGamepads": true,
			"useBluetoothBeacons": true,
			"useBluetoothBeaconsInAoModeOnly": false,
			"useWakeWord": false,
			"autoloadWakeWord": false,
			"allowWakeWordDuringStream": false,
			"activeSkin": "2",
			"proactiveNotes": false,
			"autoGPS": false
		},
		location: {
			"latitude": "",
			"longitude": ""
		},
		broadcast: {
			"state": true,
			"login": true
		}
	}
};
