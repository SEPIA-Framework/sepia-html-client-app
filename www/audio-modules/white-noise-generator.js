//Create and register the AudioWorkletProcessor
registerProcessor('white-noise-generator', class extends AudioWorkletProcessor {
	
	constructor (options) {
		super();
		//console.log(options);
		this.gain = 1.0;
		if (options.processorOptions && options.processorOptions.gain){
			this.gain = options.processorOptions.gain;
			//console.log(this.gain);
		}
	}
	
	process (inputs, outputs, parameters) {
		const output = outputs[0];
		output.forEach(channel => {
			for (let i = 0; i < channel.length; i++){
				channel[i] = (Math.random() * 2 - 1) * this.gain;
			}
		});
		return true;
	}
});
