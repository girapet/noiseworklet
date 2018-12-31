## Pink Noise Worklet + Filter
Pink noise generation using a white noise audio worklet and IIR filter

### Introduction
This began as my first trial of AudioWorklet and AudioWorkletProcessor.  I thought, just generate some [white noise](https://en.wikipedia.org/wiki/White_noise) with the random number generator, what could be simpler?  But white noise is so harsh and unnatural.  Thus began my quest began for the best JavaScript [pink noise](https://en.wikipedia.org/wiki/Pink_noise) generator.

### Pages
The test page shows the various pure JavaScript algorithms I tried plus white noise pushed through an IIR pinking filter.  You can switch between those algorithms and see their frequency responses plotted against an ideal 1/f curve.  They all sound pretty much the same, though you may be able to hear subtle differences between them.  See the code for the test page and worklet for details.  

The start page presents just the preferred solution, a white noise worklet with a pinking filter.  It's frequency response is close to ideal.  Since it uses a minimum of JavaScript code it should deliver the best performance.

### Useful Bits
