class FrequencyVisualizer {
  constructor(options) {
    this.context = options.audioContext;
    this.analyserNode = this.context.createAnalyser();
    this.analyserNode.fftSize = options.fftSize || 2048;
    this.fftData = new Float32Array(this.analyserNode.frequencyBinCount);

    this.fftSum = new Float32Array(this.analyserNode.frequencyBinCount);
    this.fftMean = new Float32Array(this.analyserNode.frequencyBinCount);
    this.fftCount = 0;
    this.averaging = options.averaging;
    this.fftSum.fill(0);

    this.dbScale = options.dbScale || 1;
    this.dbOffset = options.dbOffset || 0;

    this.graphicWidth = parseInt(getComputedStyle(options.canvasElement).width, 10);
    this.graphicHeight = parseInt(getComputedStyle(options.canvasElement).height, 10);

    const gc = options.canvasElement.getContext('2d');
    gc.fillStyle = options.fillStyle || '#e0e0e0';
    gc.strokeStyle = options.strokeStyle || '#202020';
    this.graphicContext = gc;

    this.stopping = true;
    this.draw();
  }

  getFrequencyAt(index) {
    return index * this.context.sampleRate * 0.5 / this.fftData.length;
  }

  getIndexFor(frequency) {
    return frequency * this.fftData.length * 2 / this.context.sampleRate;
  }

  acceptConnection(connectedNode) {
    connectedNode.connect(this.analyserNode);
    this.connectedNode = connectedNode;
  }

  draw() {
    const gc = this.graphicContext;
    const gw = this.graphicWidth;
    const gh = this.graphicHeight;

    gc.fillRect(0, 0, gw, gh);

    if (this.connectedNode) {
      this.analyserNode.getFloatFrequencyData(this.fftData);
      let data = this.fftData;

      if (this.averaging) {
        this.fftCount += 1;

        for (let i = 0; i < this.fftData.length; i++) {
          if (data[i] !== Number.NEGATIVE_INFINITY) {
            this.fftSum[i] = this.fftSum[i] + data[i];
            this.fftMean[i] = this.fftSum[i] / this.fftCount;
          }
        }

        data = this.fftMean;
      }

      for (let i = 0; i < gw; i++) {
        if (data[i] !== Number.NEGATIVE_INFINITY) {
          const y = -(data[i] + this.dbOffset) * this.dbScale;

          gc.beginPath();
          gc.moveTo(i + 0.5, gh);
          gc.lineTo(i + 0.5, y);
          gc.stroke();
        }
      }
    }

    const { strokeStyle } = gc;
    gc.strokeStyle = '#FF0000';
    gc.beginPath();
    let action = 'moveTo';

    for (let i = 0; i < gw; i++) {
      const f = this.getFrequencyAt(i + 0.5);
      const db = Math.log10(1 / f) * 10 - 32;
      const y = -(db + this.dbOffset) * this.dbScale;
      gc[action](i + 0.5, y);
      action = 'lineTo';
    }

    gc.stroke();
    gc.strokeStyle = strokeStyle;

    if (this.stopping) {
      this.stopping = false;
      return;
    }

    requestAnimationFrame(() => this.draw());
  }

  releaseConnection() {
    this.connectedNode.disconnect(this.analyserNode);
    this.connectedNode = undefined;
  }

  start() {
    this.draw();
  }

  stop() {
    this.stopping = true;
    this.fftSum = new Float32Array(this.analyserNode.frequencyBinCount);
    this.fftMean = new Float32Array(this.analyserNode.frequencyBinCount);
    this.fftCount = 0;
  }
}

export default FrequencyVisualizer;
