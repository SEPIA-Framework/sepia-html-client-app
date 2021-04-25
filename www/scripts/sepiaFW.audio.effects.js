//AUDIO EFFECTS
function sepiaFW_build_audio_effects(){
	var AudioEffects = {};
	
	//Effects and node connection
	AudioEffects.addEffectAndReturnOutputNode = function(nodeOrEffect, effect){
		if (!effect.inputNode || !effect.outputNode){
			SepiaFW.debug.error("AudioEffects - Effect is not valid (missing inputNode/outputNode");
			return;
		}
		if (nodeOrEffect.outputNode) nodeOrEffect.outputNode.connect(effect.inputNode);
		else nodeOrEffect.connect(effect.inputNode);
		return effect.outputNode;
	};
	
	//Common functions
	AudioEffects.Util = {
		isInRange: function(arg, min, max) {
			if (typeof arg != "number" || typeof min != "number" || typeof max != "number") return false;
			return arg >= min && arg <= max;
		},
		normalize: function(num, floor, ceil) {
			if (typeof num != "number" || typeof floor != "number" || typeof ceil != "number") return;
			return ((ceil - floor) * num) / 1 + floor;
		},
		getDryLevel: function(mix) {
			if (typeof mix != "number" || mix > 1 || mix < 0)
				return 0;
			if (mix <= 0.5)
				return 1;
			return 1 - ((mix - 0.5) * 2);
		},
		getWetLevel: function(mix) {
			if (typeof mix != "number" || mix > 1 || mix < 0)
				return 0;
			if (mix >= 0.5)
				return 1;
			return 1 - ((0.5 - mix) * 2);
		}
	};

	var voiceEffects = {
		"robo_1": {
			options: [
				{key: "modSpeed", name: "Modulation Speed", default: 200, range: [0, 1000], step: 10},
				{key: "modIntensity", name: "Mod. Intensity", default: 1.0, range: [0, 10], step: 0.1},
				{key: "preGain", name: "Pre-Gain", default: 0.66, range: [0.1, 1.0], step: 0.1},
				{key: "gain", name: "Volume", default: 1.0, range: [0.1, 5.0], step: 0.1}
			],
			applyEffect: function(audioCtx, masterGainNode, options, doneCallback){
				if (!options) options = {};
				var modulationSpeed = options.modSpeed || 200;
				var modulationIntensity = 0.033;
				if (options.modIntensity != undefined) modulationIntensity = modulationIntensity * options.modIntensity;
				var speakerRingModulator = new AudioEffects.RingModulator(audioCtx, {
					speed: modulationSpeed, 
					distortion: 0.0, 
					mix: modulationIntensity
				});
				var speakerFlanger = new AudioEffects.Flanger(audioCtx, {
					time: 0.5, 
					speed: 0.5, 
					depth: 0.5, 
					feedback: 0.5, 
					mix: 1.0
				});
				//adjust volume
				var preGain = options.preGain || 0.66;
				masterGainNode.gain.value = preGain;
				var postGainNode;
				if (options.gain && options.gain != 1){
					postGainNode = audioCtx.createGain();
					postGainNode.gain.value = options.gain;
				}
				//add effects
				var ringOutNode = AudioEffects.addEffectAndReturnOutputNode(masterGainNode, speakerRingModulator);
				var flangerOutNode = AudioEffects.addEffectAndReturnOutputNode(ringOutNode, speakerFlanger);
				if (postGainNode){
					flangerOutNode.connect(postGainNode);
					postGainNode.connect(audioCtx.destination);
				}else{
					flangerOutNode.connect(audioCtx.destination);
				}
				doneCallback(true);
			}
		}, 
		"highpass_1": {
			options: [
				{key: "frequency", name: "Frequency", default: 340, range: [50, 1000], step: 10},
				{key: "gain", name: "Volume", default: 1.33, range: [0.1, 5.0], step: 0.1}
			],
			applyEffect: function(audioCtx, masterGainNode, options, doneCallback){
				if (!options) options = {};
				var highPassFilter = new AudioEffects.HighPassFilter(audioCtx, {
					frequency: options.frequency || 340,
					peak: 0.30
				});
				//adjust volume (post)
				masterGainNode.gain.value = 1.0;
				var postGainNode = audioCtx.createGain();
				postGainNode.gain.value = options.gain || 1.33;
				//add effects
				var highOutNode = AudioEffects.addEffectAndReturnOutputNode(masterGainNode, highPassFilter);
				highOutNode.connect(postGainNode);
				postGainNode.connect(audioCtx.destination);
				doneCallback(true);
			}
		}
	};
	AudioEffects.getVoiceEffectOptions = function(effectId){
		var effect = voiceEffects[effectId];
		if (effect){
			return effect.options || [];
		}else{
			return [];
		}
	}
	AudioEffects.applyVoiceEffect = function(effectId, audioCtx, masterGainNode, options, doneCallback){
		var effect = voiceEffects[effectId];
		if (!effect){
			if (doneCallback) doneCallback(false);
		}else{
			effect.applyEffect(audioCtx, masterGainNode, options, doneCallback);
		}
	};
	
	//RingModulator
	(function(){
		/**
		 * Original: Pizzicato.js - RingModulator - License: MIT - https://github.com/alemangui/pizzicato
		 * Info: See http://webaudio.prototyping.bbc.co.uk/ring-modulator/
		 */
		AudioEffects.RingModulator = function(audioContext, options){

			this.options = {};
			options = options || this.options;

			var defaults = {
				speed: 30,
				distortion: 1,
				mix: 0.5
			};

			this.inputNode = audioContext.createGain();
			this.outputNode = audioContext.createGain();
			this.dryGainNode = audioContext.createGain();
			this.wetGainNode = audioContext.createGain();
			
			//DiodeNode private class
			var DiodeNode = function(context_) {
				this.context = context_;
				this.node = this.context.createWaveShaper();
				this.vb = 0.2;
				this.vl = 0.4;
				this.h = 1;
				this.setCurve();
			};
			DiodeNode.prototype.setDistortion = function(distortion) {
				this.h = distortion;
				return this.setCurve();
			};
			DiodeNode.prototype.setCurve = function() {
				var i, samples, v, value, wsCurve, _i, _ref, retVal;
				samples = 1024;
				wsCurve = new Float32Array(samples);
				for (i = _i = 0, _ref = wsCurve.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
					v = (i - samples / 2) / (samples / 2);
					v = Math.abs(v);
					if (v <= this.vb){
						value = 0;
					}else if ((this.vb < v) && (v <= this.vl)){
						value = this.h * ((Math.pow(v - this.vb, 2)) / (2 * this.vl - 2 * this.vb));
					}else{
						value = this.h * v - this.h * this.vl + (this.h * ((Math.pow(this.vl - this.vb, 2)) / (2 * this.vl - 2 * this.vb)));
					}
					wsCurve[i] = value;
				}
				retVal = this.node.curve = wsCurve;
				return retVal;
			};
			DiodeNode.prototype.connect = function(destination) {
				return this.node.connect(destination);
			};

			/**
			 * 'vIn' is the modulation oscillator input 
			 * 'vc' is the audio input.
			 */
			this.vIn = audioContext.createOscillator();
			this.vIn.start(0);
			this.vInGain = audioContext.createGain();
			this.vInGain.gain.value = 0.5;
			this.vInInverter1 = audioContext.createGain();
			this.vInInverter1.gain.value = -1;
			this.vInInverter2 = audioContext.createGain();
			this.vInInverter2.gain.value = -1;
			this.vInDiode1 = new DiodeNode(audioContext);
			this.vInDiode2 = new DiodeNode(audioContext);
			this.vInInverter3 = audioContext.createGain();
			this.vInInverter3.gain.value = -1;
			this.vcInverter1 = audioContext.createGain();
			this.vcInverter1.gain.value = -1;
			this.vcDiode3 = new DiodeNode(audioContext);
			this.vcDiode4 = new DiodeNode(audioContext);

			this.outGain = audioContext.createGain();
			this.outGain.gain.value = 3;

			this.compressor = audioContext.createDynamicsCompressor();
			this.compressor.threshold.value = -24;
			this.compressor.ratio.value = 16;

			// dry mix
			this.inputNode.connect(this.dryGainNode);
			this.dryGainNode.connect(this.outputNode);

			// wet mix	
			this.inputNode.connect(this.vcInverter1);
			this.inputNode.connect(this.vcDiode4.node);
			this.vcInverter1.connect(this.vcDiode3.node);
			this.vIn.connect(this.vInGain);
			this.vInGain.connect(this.vInInverter1);
			this.vInGain.connect(this.vcInverter1);
			this.vInGain.connect(this.vcDiode4.node);
			this.vInInverter1.connect(this.vInInverter2);
			this.vInInverter1.connect(this.vInDiode2.node);
			this.vInInverter2.connect(this.vInDiode1.node);
			this.vInDiode1.connect(this.vInInverter3);
			this.vInDiode2.connect(this.vInInverter3);
			this.vInInverter3.connect(this.compressor);
			this.vcDiode3.connect(this.compressor);
			this.vcDiode4.connect(this.compressor);
			this.compressor.connect(this.outGain);
			this.outGain.connect(this.wetGainNode);
			
			// line out
			this.wetGainNode.connect(this.outputNode);
			
			for (var key in defaults) {
				this[key] = options[key];
				this[key] = (this[key] === undefined || this[key] === null) ? defaults[key] : this[key];
			}
		};
		
		AudioEffects.RingModulator.prototype = Object.create(null, {
			/**
			 * Gets and sets the dry/wet mix.
			 */
			mix: {
				enumerable: true,
				get: function() {
					return this.options.mix	;	
				},
				set: function(mix) {
					if (!AudioEffects.Util.isInRange(mix, 0, 1)) return;
					this.options.mix = mix;
					this.dryGainNode.gain.value = AudioEffects.Util.getDryLevel(this.mix);
					this.wetGainNode.gain.value = AudioEffects.Util.getWetLevel(this.mix);
				}
			},
			/**
			 * Speed on the input oscillator
			 */
			speed: {
				enumerable: true,
				get: function() {
					return this.options.speed;	
				},
				set: function(speed) {
					if (!AudioEffects.Util.isInRange(speed, 0, 2000)) return;
					this.options.speed = speed;
					this.vIn.frequency.value = speed;
				}
			},
			/**
			 * Level of distortion
			 */
			distortion: {
				enumerable: true,
				get: function() {
					return this.options.distortion;	
				},
				set: function(distortion) {
					if (!AudioEffects.Util.isInRange(distortion, 0.2, 50)) return;
					this.options.distortion = parseFloat(distortion, 10);
					var diodeNodes = [this.vInDiode1, this.vInDiode2, this.vcDiode3, this.vcDiode4];
					for (var i=0, l=diodeNodes.length; i<l; i++) {
						diodeNodes[i].setDistortion(distortion);
					}
				}
			}
		});
	})();
	
	//Flanger
	(function(){
		/**
		 * Original: Pizzicato.js - Flanger - License: MIT - https://github.com/alemangui/pizzicato
		 */
		AudioEffects.Flanger = function(audioContext, options) {

			this.options = {};
			options = options || this.options;

			var defaults = {
				time: 0.45,
				speed: 0.2,
				depth: 0.1,
				feedback: 0.1,
				mix: 0.5
			};

			this.inputNode = audioContext.createGain();
			this.outputNode = audioContext.createGain();
			this.inputFeedbackNode = audioContext.createGain();
			this.wetGainNode = audioContext.createGain();
			this.dryGainNode = audioContext.createGain();
			this.delayNode = audioContext.createDelay();
			this.oscillatorNode = audioContext.createOscillator();
			this.gainNode = audioContext.createGain();
			this.feedbackNode = audioContext.createGain();
			this.oscillatorNode.type = 'sine';

			this.inputNode.connect(this.inputFeedbackNode);
			this.inputNode.connect(this.dryGainNode);

			this.inputFeedbackNode.connect(this.delayNode);
			this.inputFeedbackNode.connect(this.wetGainNode);

			this.delayNode.connect(this.wetGainNode);
			this.delayNode.connect(this.feedbackNode);

			this.feedbackNode.connect(this.inputFeedbackNode);

			this.oscillatorNode.connect(this.gainNode);
			this.gainNode.connect(this.delayNode.delayTime);

			this.dryGainNode.connect(this.outputNode);
			this.wetGainNode.connect(this.outputNode);

			this.oscillatorNode.start(0);

			for (var key in defaults) {
				this[key] = options[key];
				this[key] = (this[key] === undefined || this[key] === null) ? defaults[key] : this[key];
			}
		};
			
		AudioEffects.Flanger.prototype = Object.create(null, {
			time: {
				enumberable: true,
				get: function() {
					return this.options.time;
				},
				set: function(time) {
					if (!AudioEffects.Util.isInRange(time, 0, 1)) return;
					this.options.time = time;
					this.delayNode.delayTime.value = AudioEffects.Util.normalize(time, 0.001, 0.02);
				}
			},
			speed: {
				enumberable: true,
				get: function() {
					return this.options.speed;
				},
				set: function(speed) {
					if (!AudioEffects.Util.isInRange(speed, 0, 1)) return;
					this.options.speed = speed;
					this.oscillatorNode.frequency.value = AudioEffects.Util.normalize(speed, 0.5, 5);
				}
			},
			depth: {
				enumberable: true,			
				get: function() {
					return this.options.depth;
				},
				set: function(depth) {
					if (!AudioEffects.Util.isInRange(depth, 0, 1)) return;
					this.options.depth = depth;
					this.gainNode.gain.value = AudioEffects.Util.normalize(depth, 0.0005, 0.005);
				}
			},
			feedback: {
				enumberable: true,
				get: function() {
					return this.options.feedback;
				},
				set: function(feedback) {
					if (!AudioEffects.Util.isInRange(feedback, 0, 1)) return;
					this.options.feedback = feedback;
					this.feedbackNode.gain.value = AudioEffects.Util.normalize(feedback, 0, 0.8);
				}
			},
			mix: {
				enumberable: true,
				get: function() {
					return this.options.mix;
				},
				set: function(mix) {
					if (!AudioEffects.Util.isInRange(mix, 0, 1)) return;
					this.options.mix = mix;
					this.dryGainNode.gain.value = AudioEffects.Util.getDryLevel(this.mix);
					this.wetGainNode.gain.value = AudioEffects.Util.getWetLevel(this.mix);
				}
			}
		});
	})();

	//LowPassFilter / HighPassFilter
	(function(){
		/**
		 * Original: Pizzicato.js - LowPassFilter/HighPassFilter - License: MIT - https://github.com/alemangui/pizzicato
		 */
		AudioEffects.LowPassFilter = function(audioContext, options) {
			Filter.call(this, audioContext, options, 'lowpass');
		};
		AudioEffects.HighPassFilter = function(audioContext, options) {
			Filter.call(this, audioContext, options, 'highpass');
		};

		//biquad filters
		function Filter(audioContext, options, type) {
			this.options = {};
			options = options || this.options;

			var defaults = {
				frequency: 350,
				peak: 1
			};
			this.frequencyMax = Math.floor(audioContext.sampleRate/2);
			
			this.filterNode = audioContext.createBiquadFilter();
			this.filterNode.type = type;
			this.inputNode = this.filterNode
			this.outputNode = audioContext.createGain();
			this.filterNode.connect(this.outputNode);
			
			for (var key in defaults) {
				this[key] = options[key];
				this[key] = (this[key] === undefined || this[key] === null) ? defaults[key] : this[key];
			}
		}

		var filterPrototype = Object.create(null, {
			/**
			 * The cutoff frequency of the filter.
			 * MIN: 10
			 * MAX: half the sampling rate of the current context
			 */
			frequency: {
				enumerable: true,
				get: function() {
					return this.filterNode.frequency.value;
				},
				set: function(value){
					if (AudioEffects.Util.isInRange(value, 10, this.frequencyMax))
						this.filterNode.frequency.value = value;
				}
			},
			/**
			 * Indicates how "peaked" the frequency is around the cutoff.
			 * MIN: 0.0001
			 * MAX: 1000
			 */
			peak: {
				enumerable: true,
				get: function() {
					return this.filterNode.Q.value;
				},
				set: function(value) {
					if (AudioEffects.Util.isInRange(value, 0.0001, 1000))
						this.filterNode.Q.value = value;
				}
			}
		});

		AudioEffects.LowPassFilter.prototype = filterPrototype;
		AudioEffects.HighPassFilter.prototype = filterPrototype;
	})();
	
	return AudioEffects;
}
