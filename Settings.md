# Example Settings for SEPIA Cross-Platform Client

Here you will find a number of useful setting examples for example to control LED arrays etc..  
  
NOTE: You can view your current client setup via settings page `Account -> App settings -> Export`.

## Wake-Word Settings Example

```
device: {
	...
	"wakeWordNames": ["Computer", "Jarvis"],
	"wakeWordVersion": "1.9",
	"wakeWordRemoteUrl": "<assist_server>/files/wake-words/porcupine/",
	"wakeWordAccessKeyPorcupine": "",
	"wakeWordSensitivity": ["0.5", "0.5"],
	"deviceSounds": {
		"micConfirm": "sounds/blob.mp3"
	},
	...
},
user: {
	...
	"useWakeWord": true,
	"autoloadWakeWord": true,
	"allowWakeWordDuringStream": false,
	...
}
```

## GPIO Interface - LED Controls

### Seeedstudio Respeaker 2mic Example

- Button pin is 17
- 3 LED array (APA102) controlled via SPI
- Use item file 'rpi-respeaker-mic-hat-leds' and '2mic' model option

```
"clexiGpioInterface": {
	"buttons": [{
		"id": "hw-mic-button",
		"pin": 17
	}],
	"leds": [{
		"id": "state-led-1",
		"pin": null,
		"state": "listening"
	}],
	"items": [{
		"id": "led-array",
		"file": "rpi-respeaker-mic-hat-leds",
		"options": {
			"model": "2mic"
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
```

### Seeedstudio Respeaker 4mic Array Example

- No buttons
- 12 LED array (APA102) controlled via SPI
- Use item file 'rpi-respeaker-mic-hat-leds' and '4mic' model option (will automatically enable pin 5)

```
"clexiGpioInterface": {
	"items": [{
		"id": "led-array",
		"file": "rpi-respeaker-mic-hat-leds",
		"options": {
			"model": "4mic"
		},
		"modes": {
			"idle": [
				{"ledIndex": 1, "red": 0, "green": 0, "blue": 0},
				{"ledIndex": 7, "red": 0, "green": 0, "blue": 0}
			],
			"listening": [
				{"ledIndex": 1, "red": 150, "green": 0, "blue": 0},
				{"ledIndex": 7, "red": 150, "green": 0, "blue": 0}
			],
			"speaking": [
				{"ledIndex": 1, "red": 0, "green": 0, "blue": 150},
				{"ledIndex": 7, "red": 0, "green": 0, "blue": 150}
			],
			"awaitDialog": [
				{"ledIndex": 1, "red": 100, "green": 100, "blue": 0},
				{"ledIndex": 7, "red": 100, "green": 100, "blue": 0}
			],
			"loading": [
				{"ledIndex": 1, "red": 10, "green": 10, "blue": 10},
				{"ledIndex": 7, "red": 10, "green": 10, "blue": 10}
			],
			"wakeWordActive": [
				{"ledIndex": 4, "red": 10, "green": 0, "blue": 0},
				{"ledIndex": 10, "red": 10, "green": 0, "blue": 0}
			],
			"wakeWordInactive": [
				{"ledIndex": 4, "red": 0, "green": 0, "blue": 0},
				{"ledIndex": 10, "red": 0, "green": 0, "blue": 0}
			]
		}
	}]
}
```

### Seeedstudio Respeaker 6mic Array Example

- Button pin is 26
- 12 LED array (APA102) controlled via SPI
- Use item file 'rpi-respeaker-mic-hat-leds' and '6mic' model option

```
"clexiGpioInterface": {
	"buttons": [{
			"id": "hw-mic-button",
			"pin": 26
	}],
	"leds": [{
			"id": "state-led-1",
			"pin": null,
			"state": "listening"
	}],
	"items": [{
		"id": "led-array",
		"file": "rpi-respeaker-mic-hat-leds",
		"options": {
			"model": "6mic"
		},
		"modes": {
			"idle": [
				{"ledIndex": 1, "red": 0, "green": 0, "blue": 0},
				{"ledIndex": 5, "red": 0, "green": 0, "blue": 0},
				{"ledIndex": 9, "red": 0, "green": 0, "blue": 0}
			],
			"listening": [
				{"ledIndex": 1, "red": 100, "green": 0, "blue": 0},
				{"ledIndex": 5, "red": 100, "green": 0, "blue": 0},
				{"ledIndex": 9, "red": 100, "green": 0, "blue": 0}
			],
			"speaking": [
				{"ledIndex": 1, "red": 0, "green": 0, "blue": 100},
				{"ledIndex": 5, "red": 0, "green": 0, "blue": 100},
				{"ledIndex": 9, "red": 0, "green": 0, "blue": 100}
			],
			"awaitDialog": [
				{"ledIndex": 1, "red": 100, "green": 100, "blue": 0},
				{"ledIndex": 5, "red": 100, "green": 100, "blue": 0},
				{"ledIndex": 9, "red": 100, "green": 100, "blue": 0}
			],
			"loading": [
				{"ledIndex": 1, "red": 10, "green": 10, "blue": 10},
				{"ledIndex": 5, "red": 10, "green": 10, "blue": 10},
				{"ledIndex": 9, "red": 10, "green": 10, "blue": 10}
			],
			"wakeWordActive": [
				{"ledIndex": 6, "red": 10, "green": 0, "blue": 0},
				{"ledIndex": 12, "red": 10, "green": 0, "blue": 0}
			],
			"wakeWordInactive": [
				{"ledIndex": 6, "red": 0, "green": 0, "blue": 0},
				{"ledIndex": 12, "red": 0, "green": 0, "blue": 0}
			]
		}
	}]
}
```

