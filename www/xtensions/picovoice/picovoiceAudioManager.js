let PicovoiceAudioManager = (function() {
    const inputBufferLength = 2048;

    var engine;
    var processCallback;
    var isProcessing = false;

    function logInfo(info){
        if (SepiaFW && SepiaFW.wakeWordSettings){
            SepiaFW.wakeWordSettings.debugLog(info);
        }else{
            console.log(info);
        }
    }

    var PicovoiceRecorder = function(audioSource){
        logInfo('CREATED PicovoiceRecorder');

        var audioContext = audioSource.context;

        let inputSampleRate = audioContext.sampleRate;
        logInfo('inputSampleRate: ' + inputSampleRate);

        let inputAudioBuffer = [];

        let engineNode = audioContext.createScriptProcessor(inputBufferLength, 1, 1);
        engineNode.onaudioprocess = function(ev) {
            
            if (!isProcessing) {
                return;
            }
            //console.log('+');

            //-------------------------
            let inputAudioFrame = ev.inputBuffer.getChannelData(0);
    
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
            //-------------------------
        };

        //Should we move this to start?
        audioSource.connect(engineNode);

        //Will be called at beginning of SepiaFW.audioRecorder.start();
        this.start = function() {
            inputAudioBuffer = [];
            engineNode.connect(audioContext.destination);
        }

        //Will be called at beginning of SepiaFW.audioRecorder.stop();
        this.stop = function () {
            engineNode.disconnect(0);
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
            SepiaFW.audioRecorder.start(function(activeAudioContext, audioRec){
                //Started
                logInfo('STARTED recorder');
            });
			//audioRecorder.start();		//note: uses internal global audio-recorder

		}, function(err){
            //Failed
            logInfo('ERROR: ' + err);
            if (errorCallback) errorCallback(err);
		});
    };

    //Stop recorder and processing
    this.stop = function() {
		var closeAfterStop = false;
        SepiaFW.audioRecorder.stop(closeAfterStop, function(){
            if (closeAfterStop){
                logInfo('CLOSED audio-context');
            }else{
                logInfo('SUSPENDED audio-context');
            }
            resetProcessing();
        }, function(err){
            //TODO: what if errorCallback triggers?
            resetProcessing();
        });
    };
    function resetProcessing(){
        isProcessing = false;
        engine = undefined;             //why do we set this on every start call? can't we just keep it?
        processCallback = undefined;
    }
});
