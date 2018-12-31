import FrequencyVisualizer from './frequency-visualizer.js';

let context;
let noiseNode;
let iirNode;
let gainNode;
let visualizer;

const $averaging = document.querySelector('#averaging');

// audioWorklet.addModule expects the URL will respond with a specific MIME type.  This may not
// be the case in all web serving contexts.  So instead fetch the source, create a blob with the
// necessary MIME type, and create a local URL to that blob for audioWorklet.addModule.

const addAudioWorkletModule = url => fetch(url)
  .then(response => response.text()
    .then((text) => {
      const oUrl = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      return context.audioWorklet.addModule(oUrl);
    }));

const start = async () => {
  if (noiseNode) {
    return;
  }

  if (!context) {
    context = new AudioContext();
    await addAudioWorkletModule('./js/noise-processor.js');
  }

  // this worklet is output-only so it must be told how many channels to generate

  noiseNode = new AudioWorkletNode(context, 'noise-processor', {
    outputChannelCount: [context.destination.channelCount]
  });

  // send white noise through an IIR pinking filter
  // filter coefficients found in:
  //   https://dsp.stackexchange.com/questions/322/pink-1-f-pseudo-random-noise-generation
  //   https://ccrma.stanford.edu/~jos/sasp/Example_Synthesis_1_F_Noise.html

  const b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; // numerator, feedforward
  const a = [1, -2.494956002, 2.017265875, -0.522189400]; // denominator, feedback
  iirNode = context.createIIRFilter(b, a);
  gainNode = context.createGain();
  gainNode.gain.value = 1.33;

  noiseNode.connect(iirNode);
  iirNode.connect(gainNode);
  gainNode.connect(context.destination);

  if (!visualizer) {
    visualizer = new FrequencyVisualizer({
      audioContext: context,
      canvasElement: document.querySelector('#visualizer'),
      averaging: $averaging.checked,
      minDb: -85,
      maxDb: -35
    });
  }

  visualizer.acceptConnection(gainNode);
  visualizer.start();
};

const stop = () => {
  if (!noiseNode) {
    return;
  }

  visualizer.stop();
  visualizer.releaseConnection(gainNode);
  noiseNode.disconnect(iirNode);
  iirNode.disconnect(gainNode);
  gainNode.disconnect(context.destination);


  noiseNode = undefined;
  iirNode = undefined;
  gainNode = undefined;
};

document.querySelector('#start').addEventListener('click', start);

document.querySelector('#stop').addEventListener('click', stop);

$averaging.addEventListener('change', () => {
  if (visualizer) {
    visualizer.averaging = $averaging.checked;
  }
});
