class FrequencyVisualizer {
  // an options object with audioContext and canvasElement properties is required

  constructor(options) {
    this.context = options.audioContext;
    this.analyserNode = this.context.createAnalyser();
    this.analyserNode.fftSize = options.fftSize || 2048;
    this.fftData = new Float32Array(this.analyserNode.frequencyBinCount);
    this.averaging = options.averaging || false;

    const canvas = options.canvasElement;
    this.graphicWidth = parseInt(getComputedStyle(canvas).width, 10);
    this.graphicHeight = parseInt(getComputedStyle(canvas).height, 10);

    this.minDb = options.minDb || -this.graphicHeight;
    this.maxDb = options.maxDb || 0;

    this.dbScale = this.graphicHeight / (this.maxDb - this.minDb);
    this.dbOffset = this.maxDb * this.dbScale;

    const gc = canvas.getContext('2d');
    options.canvasElement.setAttribute('width', this.graphicWidth);
    options.canvasElement.setAttribute('height', this.graphicHeight);
    gc.fillStyle = options.fillColor || '#e0e0e0';
    gc.strokeStyle = options.strokeColor || '#202020';
    this.graphicContext = gc;

    this.stopping = false;
    this.handlers = {
      predraw: [],
      postdraw: []
    };
  }

  get averaging() {
    return this.fftCount !== undefined;
  }

  set averaging(value) {
    this.analyserNode.smoothingTimeConstant = value ? 0 : 0.8;
    this.fftSum = value ? new Float32Array(this.analyserNode.frequencyBinCount) : undefined;
    this.fftMean = value ? new Float32Array(this.analyserNode.frequencyBinCount) : undefined;
    this.fftCount = value ? 0 : undefined;

    if (this.fftSum) {
      this.fftSum.fill(0);
    }
  }

  getX(frequency) {
    return frequency * this.fftData.length * 2 / this.context.sampleRate;
  }

  getY(db) {
    return this.dbOffset - db * this.dbScale;
  }

  getFrequency(x) {
    return x * this.context.sampleRate * 0.5 / this.fftData.length;
  }

  getDb(y) {
    return (y - this.dbOffset) / -this.dbScale;
  }

  acceptConnection(connectedNode) {
    connectedNode.connect(this.analyserNode);
    this.connectedNode = connectedNode;
  }

  addEventHandler(name, callback) {
    this.handlers[name].push(callback);
  }

  draw() {
    const gc = this.graphicContext;
    const gw = this.graphicWidth;
    const gh = this.graphicHeight;

    gc.fillRect(0, 0, gw, gh);
    this.fireEvent('predraw');

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

      const xMax = Math.min(gw, this.fftData.length);

      for (let x = 0; x < xMax; x++) {
        if (data[x] !== Number.NEGATIVE_INFINITY) {
          const y = this.getY(data[x]);
          gc.beginPath();
          gc.moveTo(x + 0.5, gh);
          gc.lineTo(x + 0.5, y);
          gc.stroke();
        }
      }
    }

    this.fireEvent('postdraw');

    if (this.stopping) {
      this.stopping = false;
      return;
    }

    requestAnimationFrame(() => this.draw());
  }

  fireEvent(name) {
    this.handlers[name].forEach(h => h(this));
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

    if (this.averaging) {
      this.fftSum = new Float32Array(this.analyserNode.frequencyBinCount);
      this.fftMean = new Float32Array(this.analyserNode.frequencyBinCount);
      this.fftCount = 0;
    }
  }
}

export default FrequencyVisualizer;
