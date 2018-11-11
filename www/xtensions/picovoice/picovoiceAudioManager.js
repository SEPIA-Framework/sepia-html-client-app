let PicovoiceAudioManager = (function() {
    const inputBufferLength = 2048;

    let inputSampleRate;
    let engine;
    let processCallback;
    let isProcessing = false;

    let inputAudioBuffer = [];

    let process = function(inputAudioFrame) {
        if (!isProcessing) {
            return;
        }

        for (let i = 0 ; i < inputAudioFrame.length ; i++) {
            inputAudioBuffer.push((inputAudioFrame[i]) * 32767);
        }

        while(inputAudioBuffer.length * engine.sampleRate / inputSampleRate > engine.frameLength) {
            let result = new Int16Array(engine.frameLength);
            let bin = 0;
            let num = 0;
            let indexIn = 0;
            let indexOut = 0;

            while(indexIn < engine.frameLength) {
                bin = 0;
                num = 0;
                while(indexOut < Math.min(inputAudioBuffer.length, (indexIn + 1) * inputSampleRate / engine.sampleRate)) {
                    bin += inputAudioBuffer[indexOut];
                    num += 1;
                    indexOut++;
                }
                result[indexIn] = bin / num;
                indexIn++;
            }

            processCallback(engine.process(result));

            inputAudioBuffer = inputAudioBuffer.slice(indexOut);
        }
    };

    let getUserMediaSuccessCallback = function(stream) {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)();

        let audioSource = audioContext.createMediaStreamSource(stream);

        inputSampleRate = audioSource.context.sampleRate;

        let engineNode = audioSource.context.createScriptProcessor(inputBufferLength, 1, 1);
        engineNode.onaudioprocess = function(ev) { process(ev.inputBuffer.getChannelData(0)); };
        audioSource.connect(engineNode);
        engineNode.connect(audioSource.context.destination);
    };
    function getPluginUserMediaCallback(errorCallback) {
        //Error callback
        audioInputPluginErrorCallback = errorCallback;

        //Create node
        if (audioinput.isCapturing()){
            errorCallback("Audio capture already running.");
            return;
        }
        window.audioinput.start({
            streamToWebAudio: true
        });
        var audioContext = window.audioinput.getAudioContext();

        var audioSource = audioContext.createGain();
        window.audioinput.connect(audioSource);
        
        inputSampleRate = audioSource.context.sampleRate;
        console.log('inputSampleRate: ' + inputSampleRate);

        var engineNode;
        if (!audioSource.context.createScriptProcessor) {
            engineNode = audioSource.context.createJavaScriptNode(inputBufferLength, 1, 1);
        } else {
            engineNode = audioSource.context.createScriptProcessor(inputBufferLength, 1, 1);
        }
        engineNode.onaudioprocess = function(ev) {
            //console.log('*');
            process(ev.inputBuffer.getChannelData(0));
        };
        audioSource.connect(engineNode);
        engineNode.connect(audioSource.context.destination);
    }
                             
    //some config stuff
    var audioInputPluginErrorCallback = function(e){};
    if (window.cordova && window.audioinput) {
        window.addEventListener('audioinputerror', function(e){
            audioInputPluginErrorCallback(e);
        }, false);
    }
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    this.start = function(picovoiceEngine, picovoiceProcessCallback, errorCallback) {
        engine = picovoiceEngine;
        processCallback = picovoiceProcessCallback;
        isProcessing = true;

        //Plugin        ---        TODO: highly experimental
        if (window.cordova && window.audioinput) {
            getPluginUserMediaCallback(errorCallback);

        //Web standard
        } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video : false, audio: true }).then(function(stream) {
				getUserMediaSuccessCallback(stream);
			}).catch(function(err) {
				errorCallback(err);
			});
            
        //Old
        } else if (getUserMedia) {
            navigator.getUserMedia({audio: true}, getUserMediaSuccessCallback, errorCallback);

        //No support
        } else {
            isProcessing = false;
            errorCallback("this browser does not support audio capture");
        }
    };

    this.stop = function() {
        if (window.audioinput && audioinput.isCapturing()) {
            window.audioinput.stop();
            //we release the audioContext here to be sure
            setTimeout(function(){
                //window.audioinput.getAudioContext().close();
                window.audioinput.getAudioContext().suspend();
                window.audioinput.disconnect();
                //if (successCallback) successCallback();
            },100);
        }
        
        isProcessing = false;
        inputAudioBuffer = [];
    };
});
