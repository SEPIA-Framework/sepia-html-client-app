//Settings for headless mode (URL parameter: 'isHeadless=true')
SepiaFW.settings = {
	device: {
		"host-name": "localhost",
		"deviceId": "o1"
	},
	setup: {
		"clexiSocketURI": "ws://raspberrypi.local:9090/clexi",
		"clexiServerId": "clexi-123",
		"clexiConnect": true,
		"speech-voice-engine": "sepia",
		"activeSkin": "2"
	}
};
