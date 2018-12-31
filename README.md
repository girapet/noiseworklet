## Pink Noise Worklet + Filter
Pink noise generation using a white noise audio worklet and IIR filter

### Introduction
This began as my first trial of AudioWorklet and AudioWorkletProcessor.  I thought, just generate some [white noise](https://en.wikipedia.org/wiki/White_noise) with a random number generator, what could be simpler?  But white noise is so harsh and unnatural.  Thus began my quest began for the best JavaScript [pink noise](https://en.wikipedia.org/wiki/Pink_noise) generator.

### Pages
The [test page](https://girapet.github.io/noiseworklet/test.html) shows the various pure JavaScript algorithms I tried plus white noise pushed through an IIR pinking filter.  You can switch between those algorithms and see their frequency responses plotted against an ideal 1/f curve.  They all sound pretty much the same, though you may be able to hear subtle differences between them.  See the code for the test page and worklet for details.  

The [start page](https://girapet.github.io/noiseworklet) presents just the preferred solution, a white noise worklet with a pinking filter.  It's frequency response is close to ideal.  Since it employs a minimum of JavaScript code it should deliver the best performance.

### Useful Bits
* The _addAudioWorkletModule_ function in [index.js](https://github.com/girapet/noiseworklet/blob/master/js/index.js) which lets you load an AudioWorkletProcessor module from a URL that does not return the necessary text/javascript MIME type.

* The [noise-processor.js](https://github.com/girapet/noiseworklet/blob/master/js/noise-processor.js) script, a simple AudioWorkletProcessor that delivers white noise.

* The code in the _start_ function of [index.js](https://github.com/girapet/noiseworklet/blob/master/js/index.js) with the coefficients needed to make an IIRFilter perform an approximate 1/f (pink) filtering of the input.

* The _FrequencyVisualizer_ class in [frequency-visualizer.js](https://github.com/girapet/noiseworklet/blob/master/js/frequency-visualizer.js) which converts a canvas element into a live frequency display.  It can show either real time or averaged frequency response.  The code provides methods for converting canvas coordinates to and from frequency (X) and power in decibels (Y).
