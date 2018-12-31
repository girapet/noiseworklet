import FrequencyVisualizer from './frequency-visualizer.js';

let context;
let noiseNode;
let iirNode;
let gainNode;
let visualizer;

const $type = document.querySelector('#type');
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

// draw the ideal 1/f frequency response curve and 1000 Hz ticks

const drawIdeal = (vis) => {
  const gc = vis.graphicContext;
  const gw = vis.graphicWidth;
  const gh = vis.graphicHeight;

  gc.save();
  gc.strokeStyle = '#FF0000';
  gc.lineWidth = 2;
  gc.beginPath();
  let action = 'moveTo';
  const xMax = Math.min(gw, vis.fftData.length);

  for (let x = 0; x <= xMax; x += 4) {
    const f = vis.getFrequency(x + 0.5);
    const db = Math.log10(1 / f) * 10 - 33.3;
    const y = vis.getY(db);
    gc[action](x + 0.5, y);
    action = 'lineTo';
  }

  gc.stroke();
  gc.strokeStyle = '#FFFFFF';
  const maxFrequency = context.sampleRate * 0.5;

  for (let f = 1000; f <= maxFrequency; f += 1000) {
    const x = vis.getX(f);
    gc.beginPath();
    gc.moveTo(x, gh);
    gc.lineTo(x, gh - 10);
    gc.stroke();
  }

  gc.restore();
};

const start = async () => {
  if (noiseNode) {
    return;
  }

  if (!context) {
    context = new AudioContext();
    await addAudioWorkletModule('./js/noise-processor-test.js');
  }

  // this worklet is output-only so it must be told how many channels to generate

  noiseNode = new AudioWorkletNode(context, 'noise-processor-test', {
    outputChannelCount: [context.destination.channelCount]
  });
  noiseNode.port.postMessage({ type: $type.value });
  let outNode = noiseNode;

  // send white noise through an IIR pinking filter
  // filter coefficients found in:
  //   https://dsp.stackexchange.com/questions/322/pink-1-f-pseudo-random-noise-generation
  //   https://ccrma.stanford.edu/~jos/sasp/Example_Synthesis_1_F_Noise.html
  // works at any sample rate
  // frequency response is close to ideal, with slight deviations around 4000 Hz
  //   and above 17,000 Hz

  if ($type.value === 'IIR') {
    const b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; // numerator, feedforward
    const a = [1, -2.494956002, 2.017265875, -0.522189400]; // denominator, feedback
    iirNode = context.createIIRFilter(b, a);
    gainNode = context.createGain();
    gainNode.gain.value = 1.33;
    noiseNode.connect(iirNode);
    iirNode.connect(gainNode);
    outNode = gainNode;
  }

  outNode.connect(context.destination);

  if (!visualizer) {
    visualizer = new FrequencyVisualizer({
      audioContext: context,
      canvasElement: document.querySelector('#visualizer'),
      averaging: $averaging.checked,
      minDb: -85,
      maxDb: -35
    });
    visualizer.addEventHandler('postdraw', drawIdeal);
  }

  visualizer.acceptConnection(outNode);
  visualizer.start();
};

const stop = () => {
  if (!noiseNode) {
    return;
  }

  visualizer.stop();

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

$averaging.addEventListener('change', () => {
  if (visualizer) {
    visualizer.averaging = $averaging.checked;
  }
});
