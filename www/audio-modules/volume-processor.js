class VolumeProcessor extends AudioWorkletProcessor {
	  
	constructor(options) {
		super();
		
		let that = this;
		this.EXPECTED_SAMPLE_SIZE = 128;
		
		//read ctxInfo and optional processor options
		this.sourceSamplerate = options.processorOptions.ctxInfo.sampleRate;
		this.channelCount = 1; //options.processorOptions.channels || 1;		//TODO: supports ONLY MONO atm
		this.gain = options.processorOptions.gain || 1.0;
		
		let fpsMax = (this.sourceSamplerate/this.EXPECTED_SAMPLE_SIZE);
		this.fps = options.processorOptions.fps || fpsMax;
		this.calculateDbVolume = !!options.processorOptions.calculateDbVolume;
		this.dbVolumeRmsCutoff = options.processorOptions.dbVolumeRmsCutoff || 0.001; //0.0001 = -80db, 0.001 = -60db
		this.sendReferenceFrame = !!options.processorOptions.sendReferenceFrame;	//e.g. for jitter measurements
		
		this._binSize = 0;
		this._rmsSum = 0;
		this._simpleSum = 0;
		this._framesRecorded = 0;
		this._samplesRecorded = 0;
		this._isClipped = false;
		this._lastProcessTime = 0;
		this._expectedProcessTime = 0;

		function init(){
			that._binSize = Math.round(fpsMax/that.fps);
			that._rmsSum = 0;
			that._simpleSum = 0;
			that._framesRecorded = 0;
			that._samplesRecorded = 0;
			that._isClipped = false;
			that._lastProcessTime = 0;
			that._hasGain = (that.gain < 1 || that.gain > 1);
			that._expectedProcessTime = (that.EXPECTED_SAMPLE_SIZE / that.sourceSamplerate) * 1000;
		}
		init();
		
		//ready
		function ready(){
			that.port.postMessage({
				moduleState: 1,		//1=ready, 2=changed, 9=read for termination
				moduleInfo: {
					sourceSamplerate: that.sourceSamplerate,
					channelCount: that.channelCount,
					gain: that.gain,
					fps: that.fps,
					frameTimeMs: that._expectedProcessTime,
					binSize: that._binSize,
					calculateDbVolume: that.calculateDbVolume,
					dbVolumeRmsCutoff: that.dbVolumeRmsCutoff,
					sendReferenceFrame: that.sendReferenceFrame
				}
			});
		}
		//start
		function start(options){
			//anything to do?
		}
		//stop
		function stop(options){
			//reset processor
			init();
			//send last data?
		}
		//reset
		function reset(options){
			//reset processor
			init();
		}
		//release (alias: close)
		function release(options){
			//clean-up processor
			//tbd
			//notify processor that we can terminate now
			that.port.postMessage({
				moduleState: 9
			});
		}
		
		//Control interface
		this.port.onmessage = function(e){
			if (e.data.ctrl){
				//console.error("Controls", e.data.ctrl);			//DEBUG
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
						console.error("VolumeProcessor - Unknown control message:", e.data);
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

	calculateRms() {
		return Math.sqrt(this._rmsSum / this._samplesRecorded);
	}
	calculateAvg() {
		return Math.sqrt(this._simpleSum / this._samplesRecorded);
	}
	calculateDbFromRms(rms) {
		if (this.calculateDbVolume){
			//RMS to Decibel (dBFS) + prevent log10(0)
			const db = 20 * Math.log10(Math.max(rms, this.dbVolumeRmsCutoff));
			return db;
		}else{
			return null;
		}
	}

	process(inputs, outputs, parameters) {
		//Use 1st input and output only - TODO: supports only mono atm
		let input = inputs[0];
		let output = outputs[0];

		if (input.length > 0){
			//apply gain and calculate sums
			let samples = input[0].length;
			for (let i = 0; i < samples; ++i){
				let sampleVal = input[0][i];	//TODO: ONLY MONO!
				if (this._hasGain) sampleVal = sampleVal * this.gain;
				if (sampleVal > 1 || sampleVal < -1){
					this._isClipped = true;		//stays true until next bin
					sampleVal = Math.max(-1, Math.min(1, sampleVal));
				}
				
				//pass through - mono
				output[0][i] = sampleVal;
				
				//rms and simple sum
				this._simpleSum += sampleVal;
				this._rmsSum += sampleVal ** 2;
			}
			this._samplesRecorded += samples;
		}
		//fps check
		this._framesRecorded++;
		if (this._framesRecorded >= this._binSize){
			let rms = this.calculateRms();
			let avg = this.calculateAvg();
			let db = this.calculateDbFromRms(rms);
			
			//Send info
			this.port.postMessage({
				rms: rms,
				avg: avg,
				db: db,
				isClipped: this._isClipped
			});
			
			this._rmsSum = 0;
			this._simpleSum = 0;
			this._framesRecorded = 0;
			this._samplesRecorded = 0;
			this._isClipped = false;
		}else{
			//reference frame?
			if (this.sendReferenceFrame){
				this.port.postMessage({
					isRef: true
				});
			}
		}
		return true;
	}
}

registerProcessor('volume-processor', VolumeProcessor);
