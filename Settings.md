# Example Settings for SEPIA Cross-Platform Client

Here you will find a number of useful examples to be used inside the `settings.js` file of the client.  
The `settings.js` will be used in headless and pseudo-headless setup (DIY client) and can be manually activated via URL parameters `isHeadless=true` or `autoSetup=true`.  
  
NOTE: You can view your current client setup via settings page `Account -> App settings -> Export`.

## Microphone Settings

Something you can try if you want to use the wake-word and music at the same time is `echoCancellation`. It will try to filter out output audio from input.
It's not supported on every device and on mobile you might get problems with audio distortion or nasty glitches but on Raspberry Pi 4 DIY client it's worth a try ^^.
Adjust the gain as needed, but start with 1.0, leave `autoGainControl` off and try to tune it via `pulsemixer` first (DIY client setup).

`resamplerQuality` sets how well the microphone signal is converted from the device's rate (usually 48 kHz) to the 16 kHz that wake-word and speech recognition use. It can be between 1 (worst, but fast) and 10 (best, but slow). Use 7: it is the lowest quality the SEPIA wake-word engine was tested with, and speech recognition profits from it as well. Note: a value you saved before on the 'Media Devices' page or put into your own `settings.js` stays until you change it, a new default does not replace it.

`tryNativeResampling` asks the browser for 16 kHz directly, so the browser converts instead of the resampler above. This can save some CPU, but echo cancellation tends to break down at 16 kHz and the quality of the browser's converter is unknown. Leave it off unless performance is a problem. In the app you find it on the 'Media Devices' page.

```
device: {
	...
	"microphoneSettings": {
		"gain": 1.0,
		"noiseSuppression": true,
		"autoGainControl": false,
		"echoCancellation": true,
		"resamplerQuality": 7,
		"tryNativeResampling": false
	},
	...
},
user: {
	...
	"useWakeWord": true,
	"autoloadWakeWord": true,
	"allowWakeWordDuringStream": true,
	...
}
```

### Recommendations

- IQAudio Codec Zero: `"noiseSuppression": false`, `"autoGainControl": false`, `"echoCancellation": false`, `"gain": 2.0`
- Respeaker Mic Array v2.0 USB: `"noiseSuppression": false`, `"autoGainControl": false`, `"echoCancellation": false`, `"gain": 1.0`


## Wake-Word Settings

The client has two wake-word engines: Porcupine (`"wakeWordEngine": "porcupine"`, the default) and the SEPIA engine (`"wakeWordEngine": "sepia"`, beta). Both use the same keys for wake-word, version and sensitivity, but the values mean different things for each engine, so change them all when you switch. The examples after the SEPIA one are for Porcupine.

### SEPIA Wake-Word Engine (beta)

- `wakeWordVersion` is the model. Leave it empty for the default model (`wdtcn-v4-s0-uno`).
- `wakeWordNames` are the keywords, as the model's list names them: `www/audio-modules/sepia-kws/<model>.keywords.json` (e.g. `hey_sepia`, `hey_jarvis`, `computer`). Case and spaces don't matter, "Hey SEPIA" finds `hey_sepia`. Leave it empty for the list's default.
- `wakeWordSensitivity` is one level for all keywords, from 1 (harder to trigger) to 5 (easier to trigger). Leave it empty for the calibrated default, which is level 4. For Porcupine the same key holds one value between 0 and 1 per wake-word.
- Your own keyword: put the `.kwsp` file you got from enrollment into `www/audio-modules/sepia-kws/` as `<model>.<name>.kwsp` and add `<name>` to `wakeWordNames`.

```
device: {
	...
	"wakeWordEngine": "sepia",
	"wakeWordNames": "hey_sepia",
	"wakeWordVersion": "",
	"wakeWordSensitivity": 4,
	...
}
```

### Two Wake-Words Example

- If you use multiple wake-words make sure they all use the same version

```
device: {
	...
	"wakeWordNames": ["Computer", "Jarvis"],
	"wakeWordVersion": "1.9",
	"wakeWordRemoteUrl": "<assist_server>/files/wake-words/porcupine/",
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

### One Custom Wake-Word

- Put your own wake-word file inside the following SEPIA-Home server folder: `SEPIA\sepia-assist-server\Xtensions\WebContent\files\wake-words\porcupine\2.0_en\keywords` (change '2.0_en' as required).
- Use the tag 'Server: ...' as wake-word name to tell the client it has to be loaded from server, e.g. `Server: Hello World` will reference `hello_world_20_en.js` inside the folder given above.
- Check the wake-words [Readme.md](www/xtensions/picovoice/README.md) for more details.
- Please supply an [access key](https://console.picovoice.ai/access_key) for Porcupine if you want to use v2.0 (or newer) with custom wake-words.

```
...
"wakeWordNames": ["Server: Hello World"],
"wakeWordVersion": "2.0_en",
"wakeWordAccessKeyPorcupine": "...",
"wakeWordSensitivity": ["0.5"],
...
```

## GPIO Interface - LED Controls

Before you start: Make sure CLEXI (Node.js) can actually **access the device**!  
For SPI controlled devices (e.g. HATs) add your user to the 'spi' group:
```
sudo usermod -a -G spi $USER
```

For USB devices check the individual comments on how to set vendor/product specific permissions for the user.

### SEPIA custom Proto Voice HAT

- 1 ws281x RGB LED via SPI bus

```
"clexiGpioInterface": {
	"buttons": [{}],
	"leds": [{}],
	"items": [{
			"id": "led-array",
			"file": "rpi-spi-rgb-leds",
			"options": {
					"numOfLeds": 1,
					"ledType": "ws281x"
			},
			"modes": {
					"idle": [{"ledIndex": 1, "red": 0, "green": 0, "blue": 0}],
					"listening": [{"ledIndex": 1, "red": 80, "green": 0, "blue": 0}],
					"speaking": [{"ledIndex": 1, "red": 0, "green": 0, "blue": 80}],
					"awaitDialog": [{"ledIndex": 1, "red": 60, "green": 60, "blue": 0}],
					"loading": [{"ledIndex": 1, "red": 10, "green": 10, "blue": 10}],
					"wakeWordActive": [{"ledIndex": 1, "red": 10, "green": 0, "blue": 0}],
					"wakeWordInactive": [{"ledIndex": 1, "red": 0, "green": 0, "blue": 0}],
					"eventEffectsOn": [],
					"eventEffectsOff": []
			}
	}]
}
```

### IQAudio Codec Zero

- Button pin is 27
- Green LED is pin 23
- Red LED is pin 24
- Power LED is ?

```
"clexiGpioInterface": {
	"buttons": [{
		"id": "hw-mic-button",
		"pin": 27
	}],
	"leds": [{
		"id": "state-led-1",
		"pin": 23,
		"state": "wakeWordActive"
	},{
		"id": "state-led-2",
		"pin": 24,
		"state": "listening"
	}],
	"items": [{}]
}
```

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
			"wakeWordActive": [{"ledIndex": 2, "red": 5, "green": 0, "blue": 5}],
			"wakeWordInactive": [{"ledIndex": 2, "red": 0, "green": 0, "blue": 0}],
			"eventEffectsOn": [{"ledIndex": 3, "red": 80, "green": 100, "blue": 20}],
			"eventEffectsOff": [{"ledIndex": 3, "red": 0, "green": 0, "blue": 0}]
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
			],
			"eventEffectsOn": [],
			"eventEffectsOff": []
		}
	}]
}
```

### Seeedstudio Respeaker 4mic Array Example

- No button
- 1 LED powered by pin 5

```
"clexiGpioInterface": {
	"buttons": [{}],
	"leds": [{
			"id": "state-led-1",
			"pin": 5,
			"state": "listening"
	}],
	"items": [{}]
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
			],
			"eventEffectsOn": [],
			"eventEffectsOff": []
		}
	}]
}
```

### Seeedstudio Respeaker Mic Array v2.0 USB

- 12 LED array controlled via USB
- Use item file 'respeaker-usb-array-v2'
- Allow Node.js (CLEXI) access to USB device (adjust group name as it suits you best):
```
sudo su -c "echo 'SUBSYSTEMS==\"usb\", ATTRS{idVendor}==\"2886\", ATTRS{idProduct}==\"0018\", GROUP=\"gpio\", MODE=\"0666\"' > /etc/udev/rules.d/99-ReSpeakerUSB.rules"
sudo usermod -a -G gpio $USER
```

Settings:
```
"clexiGpioInterface": {
	"items": [{
		"id": "led-array",
		"file": "respeaker-usb-array-v2",
		"options": {
			"mode": "seeed"
		},
		"modes": {
			"idle": [{"state": "idle"}],
			"listening": [{"state": "listening"}],
			"speaking": [{"state": "speaking"}],
			"awaitDialog": [{"state": "awaitDialog"}],
			"loading": [{"state": "loading"}],
			"wakeWordActive": [{"state": "wakeWordActive"}],
			"wakeWordInactive": [{"state": "wakeWordInactive"}],
			"eventEffectsOn": [],
			"eventEffectsOff": []
		}
	}]
}
```

### Raspiaudio Mic+

- Button pin is 23
- LED is pin 25

```
"clexiGpioInterface": {
	"buttons": [{
		"id": "hw-mic-button",
		"pin": 23
	}],
	"leds": [{
		"id": "state-led-1",
		"pin": 25,
		"state": "listening"
	}],
	"items": [{}]
}
```