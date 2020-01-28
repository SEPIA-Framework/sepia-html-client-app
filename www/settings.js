//Settings primarily for headless mode and setup (URL parameter: 'isHeadless=true')
SepiaFW.settings = {
	headless: {
		device: {
			"host-name": "http://sepia-home.local:20726/sepia",
			"deviceId": "o1"
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
			"useWakeWord": false,
			"autoloadWakeWord": false,
			"allowWakeWordDuringStream": false,
			"activeSkin": "2",
			"proactiveNotes": false
		},
		broadcast: {
			"state": true
		}
	}
};
