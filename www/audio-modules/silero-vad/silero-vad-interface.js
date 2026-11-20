/*
 * Silero VAD v6 (16 kHz) for classic workers, in plain JavaScript.
 * https://github.com/snakers4/silero-vad - MIT, see SILERO_LICENSE.
 * The weights (silero-vad-16k-f32.bin, -f16.bin) are exported from the official
 * silero_vad.onnx by export-weights.py, which also documents the file layout.
 *
 * Per frame of 512 samples, as the 16 kHz branch of the ONNX model computes it:
 * the last 64 samples of the previous frame in front, 64 more mirrored at the end (640),
 * STFT magnitude (periodic Hann, 256 points, hop 128: 4 steps of 129 bins),
 * 4x Conv1d (kernel 3) + ReLU, one LSTM step (128), ReLU, linear, sigmoid.
 */
var SileroVad = (function(){
	var FRAME = 512, CONTEXT = 64, N_FFT = 256, HOP = 128, BINS = N_FFT/2 + 1, STEPS = 4, HIDDEN = 128;
	var INPUT = CONTEXT + FRAME + CONTEXT;

	//conv layers: [input channels, output channels, stride], input length 4 -> 4, 2, 1, 1
	var ENCODER = [[BINS, 128, 1], [128, 64, 2], [64, 64, 2], [64, 128, 1]];

	var model, info;

	//FFT tables
	var hann = new Float32Array(N_FFT), cosT = new Float64Array(N_FFT/2), sinT = new Float64Array(N_FFT/2), bitRev = new Uint16Array(N_FFT);
	(function(){
		var bits = Math.log2(N_FFT);
		for (var j = 0; j < N_FFT; j++){
			hann[j] = 0.5 - 0.5 * Math.cos(2 * Math.PI * j / N_FFT);
			var r = 0;
			for (var b = 0; b < bits; b++) r |= ((j >> b) & 1) << (bits - 1 - b);
			bitRev[j] = r;
		}
		for (var k = 0; k < N_FFT/2; k++){
			cosT[k] = Math.cos(2 * Math.PI * k / N_FFT);
			sinT[k] = Math.sin(2 * Math.PI * k / N_FFT);
		}
	})();

	//scratch buffers, shared: a frame is computed in one go
	var re = new Float64Array(N_FFT), im = new Float64Array(N_FFT);
	var layerInputs = [], layerLengths = [STEPS];		//each [channels][length + 2], the zero borders are the conv padding
	ENCODER.forEach(function(layer, i){
		layerInputs.push(new Float32Array(layer[0] * (layerLengths[i] + 2)));
		layerLengths.push(Math.floor((layerLengths[i] - 1) / layer[2]) + 1);
	});
	var encoderOutput = new Float32Array(128 * (layerLengths[ENCODER.length] + 2));
	layerInputs.push(encoderOutput);
	var lstmInput = new Float32Array(2 * HIDDEN), gates = new Float32Array(4 * HIDDEN);

	function halfToFloat(h){
		var sign = (h & 0x8000)? -1 : 1, exp = (h >> 10) & 0x1f, frac = h & 0x3ff;
		if (exp == 0) return sign * frac * 5.960464477539063e-8;		//subnormal, 2^-24
		if (exp == 31) return frac? NaN : sign * Infinity;
		return sign * (1 + frac / 1024) * Math.pow(2, exp - 15);
	}

	/**
	 * Read a weights file. Call once per worker, before building a 'Vad'.
	 * @param {ArrayBuffer|Uint8Array} buffer - silero-vad-16k-f32.bin or -f16.bin
	 * @returns {object} the file's header (release, sha256 of the ONNX source, dtype, ...)
	 */
	function load(buffer){
		var bytes = (buffer instanceof ArrayBuffer)? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		if (bytes.length < 8 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) != "SVAD"){
			throw new Error("not a Silero VAD weights file");
		}
		var headerLength = view.getUint32(4, true);
		var header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + headerLength)));
		if (header.format != 1 || header.sampleRate != 16000){
			throw new Error("unsupported weights file, format " + header.format + ", sample-rate " + header.sampleRate);
		}
		var size = {float32: 4, float16: 2}[header.dtype];
		if (!size) throw new Error("unsupported weights dtype: " + header.dtype);
		var tensors = {}, offset = 8 + headerLength;
		header.tensors.forEach(function(tensor){
			var n = tensor.shape.reduce(function(a, b){ return a * b; }, 1);
			if (offset + n * size > bytes.length) throw new Error("weights file is shorter than its header says");
			var values = new Float32Array(n);
			for (var i = 0; i < n; i++){
				values[i] = (size == 4)? view.getFloat32(offset + 4 * i, true) : halfToFloat(view.getUint16(offset + 2 * i, true));
			}
			tensors[tensor.name] = values;
			offset += n * size;
		});
		if (offset != bytes.length) throw new Error("weights file is longer than its header says");
		function get(name, length){
			var t = tensors[name];
			if (!t || t.length != length) throw new Error("weights file lacks '" + name + "' with " + length + " values");
			return t;
		}
		var encoder = ENCODER.map(function(layer, i){
			return {
				weight: get("encoder." + i + ".reparam_conv.weight", layer[1] * layer[0] * 3),
				bias: get("encoder." + i + ".reparam_conv.bias", layer[1])
			};
		});
		//one row per gate unit (i, f, g, o as in PyTorch) over [input, hidden], biases summed
		var wIh = get("decoder.rnn.weight_ih", 4 * HIDDEN * HIDDEN), wHh = get("decoder.rnn.weight_hh", 4 * HIDDEN * HIDDEN);
		var bIh = get("decoder.rnn.bias_ih", 4 * HIDDEN), bHh = get("decoder.rnn.bias_hh", 4 * HIDDEN);
		var lstmWeight = new Float32Array(4 * HIDDEN * 2 * HIDDEN), lstmBias = new Float32Array(4 * HIDDEN);
		for (var r = 0; r < 4 * HIDDEN; r++){
			lstmWeight.set(wIh.subarray(r * HIDDEN, (r + 1) * HIDDEN), r * 2 * HIDDEN);
			lstmWeight.set(wHh.subarray(r * HIDDEN, (r + 1) * HIDDEN), r * 2 * HIDDEN + HIDDEN);
			lstmBias[r] = bIh[r] + bHh[r];
		}
		model = {
			encoder: encoder,
			lstmWeight: lstmWeight,
			lstmBias: lstmBias,
			outWeight: get("decoder.decoder.2.weight", HIDDEN),
			outBias: get("decoder.decoder.2.bias", 1)[0]
		};
		info = header;
		return header;
	}

	//magnitudes of one STFT step into column 'step' (+1 for the border) of the first conv input
	function stftStep(x, start, out, step){
		for (var j = 0; j < N_FFT; j++){
			re[bitRev[j]] = x[start + j] * hann[j];
			im[bitRev[j]] = 0;
		}
		for (var size = 2; size <= N_FFT; size <<= 1){
			var half = size >> 1, tableStep = N_FFT / size;
			for (var s = 0; s < N_FFT; s += size){
				for (var k = 0; k < half; k++){
					var c = cosT[k * tableStep], sn = -sinT[k * tableStep], a = s + k, b = a + half;
					var tr = re[b] * c - im[b] * sn, ti = re[b] * sn + im[b] * c;
					re[b] = re[a] - tr; im[b] = im[a] - ti;
					re[a] += tr; im[a] += ti;
				}
			}
		}
		var rowLength = STEPS + 2;
		for (var f = 0; f < BINS; f++){
			out[f * rowLength + step + 1] = Math.sqrt(re[f] * re[f] + im[f] * im[f]);
		}
	}

	//Conv1d, kernel 3, padding 1, then ReLU; input and output rows carry a zero border on each side
	function conv(input, inLength, layer, weights, output){
		var cin = layer[0], cout = layer[1], stride = layer[2];
		var outLength = Math.floor((inLength - 1) / stride) + 1, inRow = inLength + 2, outRow = outLength + 2;
		var w = weights.weight, bias = weights.bias;
		for (var o = 0; o < cout; o++){
			for (var t = 0; t < outLength; t++){
				var sum = bias[o];
				for (var i = 0, wi = o * cin * 3, xi = t * stride; i < cin; i++, wi += 3, xi += inRow){
					sum += w[wi] * input[xi] + w[wi + 1] * input[xi + 1] + w[wi + 2] * input[xi + 2];
				}
				output[o * outRow + t + 1] = (sum > 0)? sum : 0;
			}
		}
	}

	function sigmoid(v){
		return 1 / (1 + Math.exp(-v));
	}

	/**
	 * One VAD with its own state. Needs 'load' first.
	 */
	function Vad(){
		if (!model) throw new Error("SileroVad.load has to be called first");
		this.h = new Float32Array(HIDDEN);
		this.c = new Float32Array(HIDDEN);
		this.x = new Float32Array(INPUT);		//[context, frame, mirrored end]
	}
	/**
	 * Speech probability of one frame.
	 * @param {Float32Array} frame - 512 samples, 16 kHz mono, -1..1
	 * @returns {number} 0..1
	 */
	Vad.prototype.process = function(frame){
		if (frame.length != FRAME) throw new Error("Silero VAD frames need " + FRAME + " samples, got " + frame.length);
		var x = this.x, h = this.h, c = this.c;
		x.copyWithin(0, FRAME, FRAME + CONTEXT);
		x.set(frame, CONTEXT);
		for (var k = 1; k <= CONTEXT; k++) x[CONTEXT + FRAME - 1 + k] = x[CONTEXT + FRAME - 1 - k];

		for (var step = 0; step < STEPS; step++) stftStep(x, step * HOP, layerInputs[0], step);
		for (var l = 0; l < ENCODER.length; l++){
			conv(layerInputs[l], layerLengths[l], ENCODER[l], model.encoder[l], layerInputs[l + 1]);
		}

		//the encoder ends with one step: column 1 of each row
		var outRow = layerLengths[ENCODER.length] + 2;
		for (var u = 0; u < HIDDEN; u++){
			lstmInput[u] = encoderOutput[u * outRow + 1];
			lstmInput[HIDDEN + u] = h[u];
		}
		var w = model.lstmWeight, b = model.lstmBias, cols = 2 * HIDDEN;
		for (var r = 0; r < 4 * HIDDEN; r++){
			var sum = b[r];
			for (var i = 0, wi = r * cols; i < cols; i++, wi++) sum += w[wi] * lstmInput[i];
			gates[r] = sum;
		}
		var out = model.outBias;
		for (var n = 0; n < HIDDEN; n++){
			var cell = sigmoid(gates[HIDDEN + n]) * c[n] + sigmoid(gates[n]) * Math.tanh(gates[2 * HIDDEN + n]);
			var hidden = sigmoid(gates[3 * HIDDEN + n]) * Math.tanh(cell);
			c[n] = cell;
			h[n] = hidden;
			if (hidden > 0) out += model.outWeight[n] * hidden;
		}
		return sigmoid(out);
	};
	/** Clears LSTM state and context, e.g. between recordings. */
	Vad.prototype.reset = function(){
		this.h.fill(0);
		this.c.fill(0);
		this.x.fill(0);
	};

	return {
		load: load,
		Vad: Vad,
		FRAME_SIZE: FRAME,
		info: function(){ return info; }
	};
})();
