//TODO: not yet supported by FF :-( (Dec 2020)
//import { SampleSizeException } from './shared/common.js';
//import { RingBuffer } from './shared/ring-buffer.min.js';
//import { FirFilterResampler } from './shared/fir-filter-resampler.min.js';
class RingBuffer{constructor(a,b,c){this._readIndex=0,this._writeIndex=0,this._framesAvailable=0,this._channelCount=b,this._length=a,this._channelData=[];for(let d=0;d<this._channelCount;++d)this._channelData[d]="Uint16"==c?new Uint16Array(a):"Int16"==c?new Int16Array(a):"Uint8"==c?new Uint8Array(a):"Int8"==c?new Int8Array(a):new Float32Array(a)}get framesAvailable(){return this._framesAvailable}push(a,b){let c=a[0].length,d=b||function(a,b,c){return a[b][c]};for(let e,f=0;f<c;++f){e=(this._writeIndex+f)%this._length;for(let b=0;b<this._channelCount;++b)this._channelData[b][e]=d(a,b,f)}this._writeIndex+=c,this._writeIndex>=this._length&&(this._writeIndex-=this._length),this._framesAvailable+=c,this._framesAvailable>this._length&&(this._framesAvailable=this._length)}pull(a,b){if(0===this._framesAvailable)return;let c=a[0].length,d=this,e=b||function(a,b,c){return a[b][c]};for(let d,f=0;f<c;++f){d=(this._readIndex+f)%this._length;for(let b=0;b<this._channelCount;++b)a[b][f]=e(this._channelData,b,d)}this._readIndex+=c,this._readIndex>=this._length&&(this._readIndex-=this._length),this._framesAvailable-=c,0>this._framesAvailable&&(this._framesAvailable=0)}};
//var FirFilterResampler=function(){function a(){this.process=function(a){var b=new Int16Array(a.length);for(let c=0;c<a.length;c++)b[c]=a[c]*(0>a[c]?32768:32767);return b}}function b(a,b,c){function d(a){if(0===a)return 1;var b=Math.PI*a;return Math.sin(b)/b}var e=new Float32Array(0),f=a/b,g=127<=c?127:c%2?c:c-1;this.filterArray=function(b,c,e){if(!e||0>e)return new Float32Array(0);if(0==e%2)throw Error("Filter length must be odd");var f=new Float32Array(e),g=0;for(let h,i=0;i<e;i++)h=d(c/b*(i-(e-1)/2)),f[i]=h,g+=h;for(let d=0;d<e;d++)f[d]/=g;return f}(a,b,g),this.process=function(a){var b=new Float32Array(e.length+a.length);b.set(e,0),b.set(a,e.length);var c=Math.ceil((b.length-this.filterArray.length)/f),d=new Int16Array(c);if(this.filterArray.length)for(let a=0;a<c;a++){let c=Math.round(f*a),e=0;for(let a=0;a<this.filterArray.length;a++)e+=b[c+a]*this.filterArray[a];d[a]=e*(0>e?32768:32767)}else for(let a=0;a<c;a++){let c=Math.round(f*a),e=b[c];d[a]=e*(0>e?32768:32767)}var g=Math.round(f*c);return e=g<b.length?b.subarray(g):new Float32Array(0),d}}return{getProcessor:function(c,d,e){if(c===d)return new a;if(c>d)return new b(c,d,e);throw{name:"NotSupportedError",message:"No processor for upsampling found!"}}}};

//TODO: add FirFilterResampler + option (see: test-resampler-static.html), add float32toInt16 option

class BufferProcessor extends AudioWorkletProcessor {
	
	get SampleSizeException() {
		return function(message){
			this.message = message;
			this.name = "SampleSizeException";
		};
	}
	  
	constructor(options) {
		super();
		
		let that = this;
		this.moduleId = "buffer-switch-" + Math.round(Math.random() * 1000000) + "-" + Date.now();
		this.isReadyForProcessing = false;
		this.EXPECTED_SAMPLE_SIZE = 128;	//currently 128, but might change in future ... and even become variable! (I hope not)

		this.sourceSamplerate = options.processorOptions.ctxInfo.sampleRate;	//INFO: should be same as global scope 'sampleRate'
		
		this.emitterBufferSize = options.processorOptions.bufferSize || 512;
		this.channelCount = 1; //options.processorOptions.channels || 1;		//TODO: supports ONLY MONO atm
		
		this.passThroughMode = (options.processorOptions.passThroughMode != undefined)? options.processorOptions.passThroughMode : 1;	//0: nothing, 1: original
		
		//this._test = []; 		//DEBUG
		
		function init(){
			//RingBuffers
			//that._outputRingBuffer = new RingBuffer(that.emitterBufferSize + that.EXPECTED_SAMPLE_SIZE, that.channelCount, "Float32");	//TODO: creates glitches and I dont know why??
			that._outputRingBuffer = new RingBuffer(that.emitterBufferSize, that.channelCount, "Float32");
			that._newOutputBuffer = [new Float32Array(that.emitterBufferSize)];
			
			that._isFirstValidProcess = true;
			//that._lastEmit = 0;
		}
		init();
		
		function ready(){
			that.isReadyForProcessing = true;
			that.port.postMessage({
				moduleState: 1,
				moduleInfo: {
					moduleId: that.moduleId,
					sourceSampleRate: that.sourceSamplerate,
					emitterBufferSize: that.emitterBufferSize,
					channelCount: that.channelCount,
					inputPassThrough: that.inputPassThrough
				}
			});
		}
		//start
		function start(options){
			//TODO: anything?
			//NOTE: timing of this signal is not very well defined
			
			//that._test = [];		//DEBUG
		}
		//stop
		function stop(options){
			//send out the remaining buffer data here
			if (that._outputRingBuffer.framesAvailable){
				//pull last samples
				var lastSamples = [new Float32Array(that._outputRingBuffer.framesAvailable)];
				that._outputRingBuffer.pull(lastSamples);

				//Send info
				that.port.postMessage({
					samples: lastSamples,
					sampleRate: that.sourceSamplerate,
					channels: that.channelCount,
					type: lastSamples[0].constructor.name,
					isLast: true
				});
			}
			//NOTE: timing of this signal is not very well defined
			
			/* DEBUG
			console.error(that._test);
			that.port.postMessage({
				test: that._test,
				sampleRate: that.sourceSamplerate,
				channels: that.channelCount
			}); */
		}
		function reset(options){
			//TODO: implement
			init();
		}
		function release(options){
			that._outputRingBuffer = null;
			that._newOutputBuffer = null;
			//notify processor that we can terminate now
			that.port.postMessage({
				moduleState: 9
			});
		}
		
		//Control messages
		this.port.onmessage = function(e){
			if (e.data.ctrl){
				console.error("Controls", e.data.ctrl);			//DEBUG
				switch (e.data.ctrl.action) {
					//common interface
					case "start":
						start(e.data.ctrl.options);
						break;
					case "stop":
						stop(e.data.ctrl.options);
						break;
					case "reset":
						reset(e.data.ctrl.options);
						break;
					case "release":
					case "close":
						release(e.data.ctrl.options);
						break;
					case "process":
						//customProcess(e.data.ctrl.data);
						break;
					case "handle":
						//handleEvent(e.data.ctrl.data);
						break;
					default:
						console.error("Unknown control message:", e.data);
						break;
				}
			}
        }
		
		//prepare
		ready();
	}

	process(inputs, outputs, parameters) {
		if (!this.isReadyForProcessing){
			console.error("Buffer module wasn't ready for processing! Input was ignored!", "-", this.moduleId);
			return;
		}

		//Use 1st input and output only
		let input = inputs[0];
		let output = outputs[0];

		//NOTE: AudioWorkletProcessor always gets input[0].length frames (typically 128, might change in future)
		if (input.length > 0){
			let inputSampleSize = input[0].length;
			
			if (this._isFirstValidProcess){
				this._isFirstValidProcess = false;
				//check inputSampleSize
				if (inputSampleSize != this.EXPECTED_SAMPLE_SIZE){
					let msg = "Sample size is: " + inputSampleSize + ", expected: " + this.EXPECTED_SAMPLE_SIZE + ". Need code adjustments!";
					console.error("AudioWorkletProcessor sample size exception - Msg.: " + msg);
					throw new this.SampleSizeException(msg);
				}
			}
			
			//pass through
			if (this.passThroughMode == 1){
				for (let i = 0; i < inputSampleSize; ++i){
					output[0][i] = input[0][i];
				}
			}
			this._outputRingBuffer.push([input[0]]);	//TODO: is MONO - should we convert to Int16?
						
			//Process if we have enough frames for the kernel.
			if (this._outputRingBuffer.framesAvailable >= this.emitterBufferSize) {
				//pull samples
				this._outputRingBuffer.pull(this._newOutputBuffer);
				//this._test.push(...this._newOutputBuffer[0]);		//DEBUG

				//Send info
				this.port.postMessage({
					samples: this._newOutputBuffer,
					sampleRate: this.sourceSamplerate,
					channels: this.channelCount,
					type: this._newOutputBuffer[0].constructor.name
				});
			}
		}
		return true;
	}
}

registerProcessor('buffer-switch', BufferProcessor);
