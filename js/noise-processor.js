
const randomWhite = () => Math.random() * 2 - 1;

registerProcessor('noise-processor', class extends AudioWorkletProcessor {
  process(inputs, outputs) {
    for (let c = 0; c < outputs[0].length; c++) {
      for (let i = 0; i < outputs[0][0].length; i++) {
        const r = randomWhite();

        for (let o = 0; o < outputs.length; o++) {
          outputs[o][c][i] = r;
        }
      }
    }

    return true;
  }
});
