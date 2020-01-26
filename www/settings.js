//Settings primarily for headless mode and setup (URL parameter: 'isHeadless=true')
SepiaFW.settings = {
	headless: {
		device: {
			"host-name": "localhost",
			"deviceId": "o1"
		},
		user: {
			"clexiSocketURI": "ws://raspberrypi.local:9090/clexi",
			"clexiServerId": "clexi-123",
			"clexiConnect": true,
			"speech-voice-engine": "sepia",
			"activeSkin": "2",
			"useGamepads": true
		}
	}
};
