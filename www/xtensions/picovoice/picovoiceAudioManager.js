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

    function setSampleRate(sr){
        inputSampleRate = sr;
        console.log('inputSampleRate: ' + inputSampleRate);
    }

    var PicovoiceRecorder = function(audioSource){
        var bufferLen = inputBufferLength;      //2048
        var audioContext = audioSource.context;

        setSampleRate(audioContext.sampleRate);

        let engineNode = audioContext.createScriptProcessor(bufferLen, 1, 1);
        engineNode.onaudioprocess = function(ev) {
            console.log('+');
            process(ev.inputBuffer.getChannelData(0));
        };
        audioSource.connect(engineNode);
        engineNode.connect(audioContext.destination);

        this.start = function(){
            console.log('audioContext.state: ' + audioContext.state);
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(function() {
                    console.log('RESUMED audio-context');
                });  
            }
        }
    }
      
    //Create recorder and start processing
    this.start = function(picovoiceEngine, picovoiceProcessCallback, errorCallback) {
        engine = picovoiceEngine;
        processCallback = picovoiceProcessCallback;
        isProcessing = true;

        //Get audio recorder
		SepiaFW.audioRecorder.getRecorder(PicovoiceRecorder, function(audioRecorder){
            //Start recorder
            SepiaFW.audioRecorder.start(function(){
                console.log('STARTED recorder');
            });
			//audioRecorder.start();		//note: uses internal global audio-recorder

		}, function(err){
            //Failed
            console.log('ERROR: ' + err);
            if (errorCallback) errorCallback(err);
		});
    };

    //Stop recorder and processing
    this.stop = function() {
		var closeAfterStop = false;
        SepiaFW.audioRecorder.stop(closeAfterStop, function(){
            if (closeAfterStop){
                console.log('CLOSED audio-context');
            }else{
                console.log('SUSPENDED audio-context');
            }
            resetProcessing();
        }, function(err){
            //TODO: what if errorCallback triggers?
            resetProcessing();
        });
    };
    function resetProcessing(){
        isProcessing = false;
        inputAudioBuffer = [];
    }
});
