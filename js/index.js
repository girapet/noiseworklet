import FrequencyVisualizer from './frequency-visualizer.js';

let context;
let noiseNode;
let iirNode;
let gainNode;
let visualizer;

// audioWorklet.addModule expects the URL will respond with a specific MIME type.  This may not
// be the case in all web serving contexts.  So instead fetch the source, create a blob with the
// necessary MIME type, and create a local URL to that blob for audioWorklet.addModule.

const addAudioWorkletModule = url => fetch(url)
  .then(response => response.text()
    .then((text) => {
      const oUrl = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      return context.audioWorklet.addModule(oUrl);
    }));

const $type = document.querySelector('#type');

const start = async () => {
  if (noiseNode) {
    return;
  }

  if (!context) {
    context = new AudioContext();
    await addAudioWorkletModule('./js/noise-processor.js');
  }

  noiseNode = new AudioWorkletNode(context, 'noise-processor', {
    outputChannelCount: [context.destination.channelCount]
  });
  noiseNode.port.postMessage({ type: $type.value });
  let outNode = noiseNode;

  // send white noise through an IIR pinking filter
  // filter coefficients found in:
  //   https://dsp.stackexchange.com/questions/322/pink-1-f-pseudo-random-noise-generation
  //   https://ccrma.stanford.edu/~jos/sasp/Example_Synthesis_1_F_Noise.html

  if ($type.value === 'IIR') {
    const b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; // numerator, feedforward
    const a = [1, -2.494956002, 2.017265875, -0.522189400]; // denominator, feedback
    iirNode = context.createIIRFilter(b, a);
    gainNode = context.createGain();
    gainNode.gain.value = 1.35;
    noiseNode.connect(iirNode);
    iirNode.connect(gainNode);
    outNode = gainNode;
  }

  outNode.connect(context.destination);

  if (!visualizer) {
    visualizer = new FrequencyVisualizer({
      audioContext: context,
      canvasElement: document.querySelector('#visualizer'),
      averaging: true,
      dbScale: 5,
      dbOffset: 30
    });
  }

  visualizer.acceptConnection(outNode);
  visualizer.start();
};

const stop = () => {
  if (!noiseNode) {
    return;
  }

  if (iirNode) {
    visualizer.releaseConnection(gainNode);
    noiseNode.disconnect(iirNode);
    iirNode.disconnect(gainNode);
    gainNode.disconnect(context.destination);
  }
  else {
    visualizer.releaseConnection(noiseNode);
    noiseNode.disconnect(context.destination);
  }

  visualizer.stop();

  noiseNode = undefined;
  iirNode = undefined;
  gainNode = undefined;
};

document.querySelector('#start').addEventListener('click', start);

document.querySelector('#stop').addEventListener('click', stop);

$type.addEventListener('change', () => {
  if (noiseNode) {
    stop();
    start();
  }
});
