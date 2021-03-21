class VolumeProcessor extends AudioWorkletProcessor {
	  
	constructor(options) {
		super();
		
		let that = this;
		this.EXPECTED_SAMPLE_SIZE = 128;
		
		//read ctxInfo and optional processor options
		this.sourceSamplerate = options.processorOptions.ctxInfo.sampleRate;
		this.gain = options.processorOptions.gain || 1.0;
		
		let fpsMax = (this.sourceSamplerate/this.EXPECTED_SAMPLE_SIZE);
		this.fps = options.processorOptions.fps || fpsMax;
		
		this._binSize = Math.round(fpsMax/this.fps);
		this._rmsSum = 0;
		this._simpleSum = 0;
		this._framesRecorded = 0;
		this._isClipped = false;
		
		//ready
		function ready(){
			that.port.postMessage({
				moduleState: 1,		//1=ready, 2=changed
				moduleInfo: {
					sourceSamplerate: that.sourceSamplerate,
					fps: that.fps,
					gain: that.gain,
					binSize: that._binSize
				}
			});
		}
		//start
		function start(options){
			//anything to do?
		}
		//stop
		function stop(options){
			that._rmsSum = 0;
			that._simpleSum = 0;
			that._framesRecorded = 0;
			that._isClipped = false;
		}
		//reset
		function reset(options){
			//reset processor
			that._binSize = Math.round(fpsMax/that.fps);
			that._rmsSum = 0;
			that._simpleSum = 0;
			that._framesRecorded = 0;
			that._isClipped = false;
		}
		//release (alias: close)
		function release(options){
			//clean-up processor
		}
		
		//Control interface
		this.port.onmessage = function(e){
			if (e.data.ctrl){
				console.error("Controls", e.data.ctrl);			//DEBUG
				switch (e.data.ctrl.action) {
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
			//custom interface
			if (e.data.gain){
				if (e.data.gain.set != undefined){
					that.gain = e.data.gain.set;
					reset();
					that.port.postMessage({
						moduleState: 2,		//2=changed
						moduleInfo: {
							gain: that.gain
						}
					});
				}
			}
			if (e.data.fps){
				if (e.data.fps.set != undefined){
					that.fps = e.data.fps.set;
					reset();
					that.port.postMessage({
						moduleState: 2,		//2=changed
						moduleInfo: {
							fps: that.fps,
							binSize: that._binSize
						}
					});
				}
			}
        }
		
		//do something with a callback or call ready right away
		ready();
	}

	process(inputs, outputs, parameters) {
		//Use 1st input and output only - TODO: supports only mono atm
		let input = inputs[0];
		let output = outputs[0];

		if (input.length > 0){
			//apply gain and calculate sums
			for (let i = 0; i < input[0].length; ++i){
				let sampleVal = this.gain * input[0][i];	//TODO: ONLY MONO!
				if (sampleVal > 1 || sampleVal < -1){
					this._isClipped = true;		//stays true until next bin
					sampleVal = Math.max(-1, Math.min(1, sampleVal));
				}
				
				//pass through
				output[0][i] = sampleVal;
				
				//rms and simple sum
				this._simpleSum += sampleVal;
				this._rmsSum += sampleVal ** 2;
			}
		}
		//fps check
		this._framesRecorded++;
		if (this._framesRecorded >= this._binSize){
			let rms = Math.sqrt(this._rmsSum / this._framesRecorded);
			let avg = Math.sqrt(this._simpleSum / this._framesRecorded);
			
			//Send info
			this.port.postMessage({
				rms: rms,
				avg: avg,
				isClipped: this._isClipped
			});
			
			this._rmsSum = 0;
			this._simpleSum = 0;
			this._framesRecorded = 0;
			this._isClipped = false;
		}
		return true;
	}
}

registerProcessor('volume-processor', VolumeProcessor);
