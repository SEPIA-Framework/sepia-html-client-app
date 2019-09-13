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

    var Recorder = function(source, audioProcessor, startFun, stopFun) {
        var bufferLen = 4096;
        var websocket;
        var audioContext = source.context;

        var recording = false;

        function processAudio(inputAudioFrame){
            if (!recording) return;

            var length = Math.floor(inputAudioFrame.length / 3);
            var result = new Float32Array(length);

            var index = 0;
            var inputIndex = 0;

            while (index < length) {
                result[index++] = inputAudioFrame[inputIndex];
                inputIndex += 3;
            }

            var offset = 0;
            var buffer = new ArrayBuffer(length * 2);
            var view = new DataView(buffer);
            for (var i = 0; i < result.length; i++, offset += 2) {
                var s = Math.max(-1, Math.min(1, result[i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }

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
        }else if (audioContext){
            let processNode;
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
            var sampleLength = 1000000;
            var mono = true;
            var sampleRate = 16000;                 //TODO: this might not be true! We cannot guarantee that!
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
            view.setUint32(24, sampleRate, true);
            //byte rate (sample rate * block align)
            view.setUint32(28, sampleRate * 2, true);
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
		function writeString(view, offset, string){
			for (var i = 0; i < string.length; i++){
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		}
    };

    window.RecorderJS = Recorder;

})(window);