// ------------------- RECORDER JS modified for SEPIA ----------------------

/*License (MIT)

Copyright Â© 2013 Matt Diamond

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and 
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
DEALINGS IN THE SOFTWARE.
*/

(function (window) {

    var Recorder = function(sourceOrConfig, audioProcessor, startFun, stopFun) {
        //NOTE: 'sourceOrConfig' is 'source' for Web Audio API and 'config' for AudioInput plugin (I know its a bad workaround ... :-p).
        //      This recorder is optimzed to stream audio buffer chunks with a sample rate of 16000 (will downsample if required)

        var websocket;
        var audioContext = sourceOrConfig.context;
        var source;
        var inputSampleRate;
        var outputSampleRate = 16000;
        var bufferLen;
        if (audioContext){
            //Web Audio API
            source = sourceOrConfig;
            inputSampleRate = audioContext.sampleRate;
            bufferLen = Recorder.defaultBufferLength || 2048;
        }else{
            //AudioInput plugin (Cordova)
            inputSampleRate = sourceOrConfig.sampleRate;
            bufferLen = sourceOrConfig.bufferSize || this.defaultBufferLength;
            //NOTE: requires audioProcessor, startFun, stopFun
        }

        var recording = false;

        function processAudio(inputAudioFrame){
            if (!recording) return;

            //downsample
            var result = downsampleFloat32(inputAudioFrame, inputSampleRate, outputSampleRate);

            var offset = 0;
            var buffer = new ArrayBuffer(result.length * 2);
            var view = new DataView(buffer);
            floatTo16BitPCM(view, offset, result);

            //console.log('Recorder onaudioprocess - view: ' + view); 		//DEBUG
            if (websocket){
                websocket.send(view);
            }
        }

        //Custom
        if (audioProcessor && startFun && stopFun){
            audioProcessor.onaudioprocess = function(inputAudioFrame){
                processAudio(inputAudioFrame);
            }
        //Web-Audio
        }else if (audioContext && source){
            var processNode;
            if ('createScriptProcessor' in audioContext){
                processNode = audioContext.createScriptProcessor(bufferLen, 1, 1);
            }else if ('createJavaScriptNode' in audioContext){
                processNode = audioContext.createJavaScriptNode(bufferLen, 1, 1);
            }else{
                console.error("Recorder - cannot create an audio processor!");
                return;
            }
            processNode.onaudioprocess = function(e) {
                var inputAudioFrame = e.inputBuffer.getChannelData(0);
                processAudio(inputAudioFrame);
            }
            startFun = function(){
                source.connect(processNode);
                processNode.connect(audioContext.destination);      //if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
            }
            stopFun = function(){
                source.disconnect(processNode);
                processNode.disconnect(audioContext.destination);
                //processNode.disconnect();
            }
        //Error
        }else{
            console.error('Recorder - no valid audio processor found!');
            return;
        }

        //Will be called at beginning of SepiaFW.audioRecorder.start();
        this.start = function(){
            recording = true;
            startFun();
        }

        //Will be called at beginning of SepiaFW.audioRecorder.stop();
        this.stop = function(){
            recording = false;
            stopFun();
        }

        this.connect = function(ws){
            websocket = ws;
			//console.log('Recorder record - ws: ' + ws); 		//DEBUG
			//console.log(processNode);							//DEBUG
        }

        this.sendHeader = function(ws){
            var sampleLength = 1000000;         //TODO: where does this come from? Does it matter?
            var mono = true;
            var buffer = new ArrayBuffer(44);
            var view = new DataView(buffer);

            //RIFF identifier
            writeString(view, 0, 'RIFF');
            //file length
            view.setUint32(4, 32 + sampleLength * 2, true);
            //RIFF type
            writeString(view, 8, 'WAVE');
            //format chunk identifier
            writeString(view, 12, 'fmt ');
            //format chunk length
            view.setUint32(16, 16, true);
            //sample format (raw)
            view.setUint16(20, 1, true);
            //channel count
            view.setUint16(22, mono ? 1 : 2, true);
            //sample rate
            view.setUint32(24, outputSampleRate, true);
            //byte rate (sample rate * block align)
            view.setUint32(28, outputSampleRate * 2, true);
            //block align (channel count * bytes per sample)
            view.setUint16(32, 2, true);
            //bits per sample
            view.setUint16(34, 16, true);
            //data chunk identifier
            writeString(view, 36, 'data');
            //data chunk length
            view.setUint32(40, sampleLength * 2, true);

			//console.log('Recorder sendHeader - view: ' + view); 		//DEBUG
            ws.send(view);
        }
        
        //--- conversion methods ---

        function writeString(view, offset, string){
			for (var i = 0; i < string.length; i++){
				view.setUint8(offset + i, string.charCodeAt(i));
			}
        }

        function floatTo16BitPCM(output, offset, input){
            for (var i = 0; i < input.length; i++, offset += 2){
                var s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        }

        function downsampleAndConvertToInt16(buffer, sampleRate, outSampleRate){
            if (outSampleRate == sampleRate){
                return buffer;
            }
            if (outSampleRate > sampleRate){
                console.error("Recorder - Downsampling to " + outSampleRate + " failed! Input sampling rate was too low: " + sampleRate);
                return buffer;
            }
            var sampleRateRatio = sampleRate / outSampleRate;
            var newLength = Math.round(buffer.length / sampleRateRatio);
            var result = new Int16Array(newLength);
            var offsetResult = 0;
            var offsetBuffer = 0;
            while (offsetResult < result.length){
                var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
                var accum = 0, count = 0;
                for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++){
                    accum += buffer[i];
                    count++;
                }
                result[offsetResult] = Math.min(1, accum / count)*0x7FFF;
                offsetResult++;
                offsetBuffer = nextOffsetBuffer;
            }
            return result.buffer;
        }
        function downsampleFloat32(array, sampleRate, outSampleRate){
            if (outSampleRate == sampleRate){
                var result = new Float32Array(array.length);
                for (var i = 0 ; i < array.length ; i++){
                    result[i] = array[i];
                }
                return array;
            }
            if (outSampleRate > sampleRate){
                console.error("Recorder - Downsampling to " + outSampleRate + " failed! Input sampling rate was too low: " + sampleRate);
                return downsampleFloat32(array, sampleRate, sampleRate);
            }
            var sampleRateRatio = sampleRate / outSampleRate;
            var newLength = Math.round(array.length / sampleRateRatio);
            var result = new Float32Array(newLength);
            var offsetResult = 0;
            var offsetBuffer = 0;
            while (offsetResult < result.length){
                var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
                var accum = 0, count = 0;
                for (var i = offsetBuffer; i < nextOffsetBuffer && i < array.length; i++){
                    accum += array[i];
                    count++;
                }
                result[offsetResult] = accum / count;
                offsetResult++;
                offsetBuffer = nextOffsetBuffer;
            }
            return result;
        }
    };
    //some defaults
    Recorder.defaultBufferLength = Number.parseInt(SepiaFW.data.getPermanent("sepia-asr-buffer-length") || 2048);

    window.RecorderJS = Recorder;

})(window);