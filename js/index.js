let context;
let noiseNode;

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

document.querySelector('#start').addEventListener('click', async () => {
  if (!context) {
    context = new AudioContext();
    await addAudioWorkletModule('./js/noise-processor.js');
  }

  if (!noiseNode) {
    noiseNode = new AudioWorkletNode(context, 'noise-processor', {
      outputChannelCount: [context.destination.channelCount]
    });
    noiseNode.port.postMessage({ type: $type.value });
    noiseNode.connect(context.destination);
  }
});

document.querySelector('#stop').addEventListener('click', () => {
  if (noiseNode) {
    noiseNode.disconnect(context.destination);
    noiseNode = undefined;
  }
});

$type.addEventListener('change', () => {
  if (noiseNode) {
    noiseNode.port.postMessage({ type: $type.value });
  }
});
