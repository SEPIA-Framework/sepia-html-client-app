var PicovoiceAudioManager = (function() {
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

    var PicovoiceRecorder = function(sourceOrConfig, audioProcessor, startFun, stopFun){
        //NOTE: 'sourceOrConfig' is 'source' for Web Audio API and 'config' for AudioInput plugin.
        //      This recorder is optimzed to fill the 'inputAudioBuffer' and then process audio buffer chunks via 'engine.process' (will downsample if required)

        logInfo('CREATED PicovoiceRecorder');

        var audioContext = sourceOrConfig.context;
        var audioSource;
        var inputSampleRate;
        var inputBufferLength;
        if (audioContext){
            //Web Audio API
            audioSource = sourceOrConfig;
            inputSampleRate = audioContext.sampleRate;
            inputBufferLength = PicovoiceRecorder.defaultBufferLength || 2048;
        }else{
            //AudioInput plugin (Cordova)
            inputSampleRate = sourceOrConfig.sampleRate;
            inputBufferLength = sourceOrConfig.bufferSize || this.defaultBufferLength;
            //NOTE: requires audioProcessor, startFun, stopFun
        }

        logInfo('inputSampleRate: ' + inputSampleRate);
        logInfo('inputBufferLength: ' + inputBufferLength);

        var inputAudioBuffer = [];      //this is kind of a ring buffer I guess

        function processAudio(inputAudioFrame){
            if (!isProcessing) {
                return;
            }
            //console.log('+');
            
            //fill inputAudioBuffer
            for (var i = 0 ; i < inputAudioFrame.length ; i++) {
                inputAudioBuffer.push((inputAudioFrame[i]) * 32767);    //0x7FFF
            }

            //downsample if necessary
            while(inputAudioBuffer.length * engine.sampleRate / inputSampleRate > engine.frameLength) {
                var result = new Int16Array(engine.frameLength);
                var bin = 0;
                var num = 0;
                var indexIn = 0;
                var indexOut = 0;
    
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
    
                var keywordIndex = engine.process(result);
                inputAudioBuffer = inputAudioBuffer.slice(indexOut);

                processCallback(keywordIndex);
            }
        };

        //Custom
        if (audioProcessor && startFun && stopFun){
            audioProcessor.onaudioprocess = function(inputAudioFrame){
                processAudio(inputAudioFrame);
            }
        //Web-Audio
        }else if (audioContext){
            var engineNode = audioContext.createScriptProcessor(inputBufferLength, 1, 1);
            engineNode.onaudioprocess = function(ev){
                var inputAudioFrame = ev.inputBuffer.getChannelData(0);
                processAudio(inputAudioFrame);
            }
            startFun = function(){
                audioSource.connect(engineNode);
                engineNode.connect(audioContext.destination);
            }
            stopFun = function(){
                audioSource.disconnect(engineNode);
                engineNode.disconnect(audioContext.destination);
                //engineNode.disconnect();
            }
        //Error
        }else{
            console.error('PicovoiceRecorder - no valid audio processor found!');
            return;
        }
        
        //Will be called at beginning of SepiaFW.audioRecorder.start();
        this.start = function() {
            inputAudioBuffer = [];
            startFun();
        }

        //Will be called at beginning of SepiaFW.audioRecorder.stop();
        this.stop = function() {
            stopFun();
        }
    }
    //some defaults
    PicovoiceRecorder.defaultBufferLength = Number.parseInt(SepiaFW.data.getPermanent("porcupine-ww-buffer-length") || 2048);
      
    //Create recorder and start processing
    this.start = function(ppKeywordIDs, ppSensitivities, picovoiceProcessCallback, errorCallback){
        //create engine - TODO: optimze here
        try{
            engine = Porcupine.create(Object.values(ppKeywordIDs), ppSensitivities);
        }catch (error){
            console.error(error);
            logInfo('ERROR: ' + error + " (Likely a problem with wake-word file or version)");
            if (errorCallback) errorCallback(error);
            return;
        }
        
        processCallback = picovoiceProcessCallback;
        isProcessing = true;

        //Get audio recorder
		SepiaFW.audioRecorder.getRecorder(PicovoiceRecorder, function(audioRecorder, streamSource){
            //Start recorder
            SepiaFW.audioRecorder.start(function(activeAudioContext, audioRec){
                //Started
                logInfo('STARTED recorder');
            }, function(err){
                //Error
                logInfo('ERROR: ' + err);
                if (errorCallback) errorCallback(err);
            });
			//audioRecorder.start();		//note: uses internal global audio-recorder

		}, function(ex){
            //Failed
            var errMsg = ex;
            if (ex && (typeof ex == "object") && (ex.error || ex.message || ex.msg)){
                errMsg = ex.error || ex.message || ex.msg;
            }
            logInfo('ERROR: ' + errMsg);
            if (errorCallback) errorCallback(ex);
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
