# Porcupine Wake-Word Engine by Picovoice

This is the client extension for Porcupine wake-word detection by [Picovoice](https://github.com/Picovoice/porcupine).
All wake-words found here are taken from their official GitHub account and are under Apache 2.0 license except "Hey SEPIA" that was generously created for this project.

## Switching the Wake-Word

Since SEPIA client v0.24.0 you can select the wake-word via the "Hey SEPIA" settings page (expert settings). If you cannot access the UI because you're using the headless client then you should edit the `settings.js` file in your base folder. Look for:
```
"wakeWordNames": "Hey SEPIA",
"wakeWordVersion": "1.4",
```

There are a few more examples inside the [Settings.md](../../../Settings.md).  
  
If you are not using 'headless' mode but still want to edit the default settings open `wakeWords.js` and change the entries for `SepiaFW.wakeTriggers.porcupineWakeWords` and `SepiaFW.wakeTriggers.porcupineVersion` (if required). To switch the wake-word to "Raspberry" for example enter the following:
```
SepiaFW.wakeTriggers.porcupineVersion = "1.5";
SepiaFW.wakeTriggers.porcupineWakeWords = ["Raspberry"];
```

This will automaticall load the file: `audio-modules/picovoice/porcupine-keywords/raspberry_wasm_15.js`.  
Since SEPIA client v0.24.0 the Porcupine integration is handled by the [SEPIA Web Audio Processor](https://github.com/SEPIA-Framework/sepia-web-audio) (see folder: 'audio-modules').  
  
The library for Porcupine engine v1.4 is included in the client by default since this is the version "Hey SEPIA" was created for. v1.5, v1.6, v1.9, v2+ are available via the SEPIA server or SEPIA's GitHub repository.
You can use the `download_wasm.sh` or `download_wasm.bat` file to download them directly to your folder, by default they will be loaded to browser cache at first start of the Porcupine engine.  
After you've downloaded the files set `SepiaFW.wakeTriggers.porcupineVersionsDownloaded = true;` in your `wakeWords.js`.

### Adding a custom wake-word

#### Create

First you need to create your custom wake-word. To do so please follow the instructions on: https://sepia-framework.github.io/files/porcupine/convert.html

#### Import

After you've create and downloaded your file follow these steps:

- Put your own wake-word file inside the following SEPIA-Home server folder: `SEPIA\sepia-assist-server\Xtensions\WebContent\files\wake-words\porcupine\2.1_en\keywords` (change '2.1_en' as required).
- Use the tag 'Server: ...' as wake-word name to tell the client it has to be loaded from server. The naming convention is `Server: [Key Word]` -> `...\[key_word]_wasm_[version_code]_[language_code].js`.
- Example: `"Server: Hello World"` for v2.1_en will reference `hello_world_wasm_21_en.js` inside the folder given above.
- Note: Replace all spaces of the name with '_' for the file and convert everything to lower-case ("Hello World" -> "hello_world"), the version code is version without '.', add language code only for v2.0 (and newer).
- Please supply an [access key](https://console.picovoice.ai/access_key) for Porcupine if you want to use v2.0 (or newer) with custom wake-words.

### Currently available wake-words

These are the wake-words available in SEPIA Client **v0.24.1**. In general higher versions should have better accuracy, but it can vary from word to word.

#### v1.4

Hey SEPIA  
Ok Lamp  

#### v1.5

Raspberry  
Christina  
Dragonfly  
Francesca  

#### v1.6

Hey Pico  
Blueberry  
Terminator  
Sandy Brown  
Hot Pink  
Magenta  
Midnight Blue  

#### v1.9

Computer  
Jarvis  
Hey Edison  
Alexa  
Hey Siri  
Ok Google  
Picovoice  
Porcupine  
Bumblebee  
Grasshopper  

#### v2+ (requires Porcupine access key)

Hey SEPIA  
...custom wake-words  

#### More

There are a few more open-source wake-words available for the older engines (1.4-1.6), but they are not included because they are either to short to work well ("white") or built for specific demos and don't really fit in ("lavender blush").
If you would like to use them check the [collection](https://github.com/SEPIA-Framework/SEPIA-Framework.github.io/tree/master/files/porcupine) and feel free post a request in the issues section.

## Using multiple Wake-Words at the same time

It is possible to load more than one wake-word at the same time by adding more names to the wake-word array, e.g.:
```
SepiaFW.wakeTriggers.porcupineVersion = "1.9";
SepiaFW.wakeTriggers.porcupineWakeWords = ["Computer", "Jarvis"];
SepiaFW.wakeTriggers.porcupineSensitivities = [0.5, 0.75];
```
  
When using the client settings UI you can enter the keyword names separated by a comma, e.g.: `Computer, Jarvis`.  
  
NOTE: You **CANNOT mix** wake-words for different versions!  
NOTE2: In versions older than 0.24.0 you could use a different format to add the wake-word data directly to 'SepiaFW.wakeTriggers.porcupineWakeWords'. This is **currently not supported** anymore.