/* global sampleRate */

const dbToGain = db => 10 ** (db / 20);
const gainToDb = g => Math.log10(g) * 20;
const randomWhite = () => Math.random() * 2 - 1;

const pinkFunction = {

  // based on "Pink Noise" by Cooper Baker
  //   http://www.cooperbaker.com/home/code/pink%20noise
  // more computationally expensive per sample:
  //   7 randoms, 49 adds/multiplies, 22 assignments, 6 tests
  // works with any sample rate
  // frequency response is well above the ideal beyond 11,000 hz -- possible
  //   error in converting the code from C++?

  createBaker: () => {
    const twoPI = Math.PI * 2;
    const coeff = [];
    let freq = (sampleRate / twoPI) - 1;

    while (freq > 1) {
      coeff.push(twoPI * freq / sampleRate);
      freq *= 0.25;
    }

    const state = [];
    const gain = [];
    let sumGain = 0;
    let db = 0;

    for (let i = coeff.length - 1; i >= 0; i--) {
      state[i] = 0;
      gain[i] = dbToGain(db);
      sumGain += gain[i];
      db -= 6;
    }

    const gainAdjust = dbToGain(-gainToDb(sumGain)) * 4.6;

    return () => {
      let pink = 0;
      const white = randomWhite();

      for (let i = 0; i < coeff.length; i++) {
        state[i] = coeff[i] * white + (1 - coeff[i]) * state[i];
        pink += state[i] * gain[i];
      }

      return pink * gainAdjust;
    };
  },

  // based on "Improved Pink Noise Generator Algorithm" by Larry Trammell
  //   http://www.ridgerat-tech.us/tech/newpink.htm
  // less computationally expensive per sample:
  //   2 randoms, 24 adds/multiples, 25 assignments, 10 tests (worst case)
  // likely requires a sample rate of 44,100, so not general purpose
  // frequency response is a bit high in the 1500 to 8000 Hz range and a bit
  //   low from there on

  createTrammell: () => {
    const ampScaling = [3.8024, 2.9694, 2.5970, 3.0870, 3.4006];
    const updateProb = [0.00198, 0.01478, 0.06378, 0.23378, 0.91578];
    const contrib = [0, 0, 0, 0, 0];
    let pink = 0;

    const gainAdjust = 1 / 140;

    return () => {
      let r = randomWhite();

      for (let i = 0; i < 5; i++) {
        if (r <= updateProb[i]) {
          r = randomWhite();
          const v = 2 * r * ampScaling[i];
          pink += v - contrib[i];
          contrib[i] = v;
          break;
        }
      }

      return pink * gainAdjust;
    };
  },

  // based on Paul Kellet's instrumentation grade filter in
  //   http://www.firstpr.com.au/dsp/pink-noise/
  // as used in "How to Generate Noise with the Web Audio API" by Zack Dennon
  //   https://noisehack.com/generate-noise-web-audio-api/
  // least computationally expensive per sample:
  //   1 random, 28 adds/multiples, 9 assignments, 0 tests
  // requires a sample rate of 44,100, so not general purpose
  // frequency response is very close to ideal

  createKellet: () => {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    const gainAdjust = 0.04;

    return () => {
      const r = randomWhite();
      b0 = 0.99886 * b0 + r * 0.0555179;
      b1 = 0.99332 * b1 + r * 0.0750759;
      b2 = 0.96900 * b2 + r * 0.1538520;
      b3 = 0.86650 * b3 + r * 0.3104856;
      b4 = 0.55000 * b4 + r * 0.5329522;
      b5 = -0.7616 * b5 - r * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + r * 0.5362;
      b6 = r * 0.115926;

      return pink * gainAdjust;
    };
  },

  // output white noise for use with an IIR filter; see note in test.js

  createIIR: () => randomWhite
};

registerProcessor('noise-processor-test', class extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.random = [];
    this.channelCount = options.outputChannelCount || 1;

    this.setFunctionType('Baker');

    this.port.onmessage = (event) => {
      if (event.data.type) {
        this.setFunctionType(event.data.type);
      }
    };

    this.port.start();
  }

  setFunctionType(type) {
    for (let c = 0; c < this.channelCount; c++) {
      this.random[c] = pinkFunction[`create${type}`]();
    }
  }

  process(inputs, outputs) {
    for (let c = 0; c < outputs[0].length; c++) {
      const random = this.random[c];

      for (let i = 0; i < outputs[0][0].length; i++) {
        const r = random();

        for (let o = 0; o < outputs.length; o++) {
          outputs[o][c][i] = r;
        }
      }
    }

    return true;
  }
});
