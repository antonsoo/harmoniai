import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";
import { serveSnapshot, snapshotBuild } from "./review-server.mjs";

const output = resolve(process.argv[2] ?? "/tmp/harmoniai-live-output");
await mkdir(output, { recursive: true });
const build = await snapshotBuild(process.argv[3] ?? "dist");
const origin = await serveSnapshot(build);
const receipts = [];
function installTap({ rate }) {
  const Original = window.AudioContext;
  const connect = AudioNode.prototype.connect;
  const bufferStart = AudioBufferSourceNode.prototype.start;
  const bufferStop = AudioBufferSourceNode.prototype.stop;
  const oscillatorStart = OscillatorNode.prototype.start;
  window.graphChunks = [];
  window.graphStarts = [];
  window.graphStops = [];
  AudioNode.prototype.connect = function (destination, ...args) {
    if (
      destination === this.context.destination &&
      this.context.__auditTap &&
      this !== this.context.__auditTap
    )
      return connect.call(this, this.context.__auditTap, ...args);
    return connect.call(this, destination, ...args);
  };
  const processor = `class AuditTap extends AudioWorkletProcessor {
  process(inputs,outputs){
   const out=outputs[0][0],input=inputs[0]&&inputs[0][0];
   if(input)out.set(input);else out.fill(0);
   const samples=out.slice();
   this.port.postMessage({firstFrame:currentFrame,samples:samples.buffer},[samples.buffer]);
   return true;
  }
 }
 registerProcessor('harmoniai-audit-tap',AuditTap);`;
  window.AudioContext = class extends Original {
    constructor(options) {
      super({ ...options, sampleRate: rate });
      window.graphContext = this;
      const url = URL.createObjectURL(new Blob([processor], { type: "text/javascript" }));
      this.__auditReady = this.audioWorklet.addModule(url).then(() => {
        URL.revokeObjectURL(url);
        const tap = new AudioWorkletNode(this, "harmoniai-audit-tap", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
        });
        this.__auditTap = tap;
        const queue = window.graphChunks;
        tap.port.onmessage = (e) => queue.push(e.data);
        connect.call(tap, this.destination);
      });
    }
    resume() {
      const resumed = super.resume();
      return Promise.all([resumed, this.__auditReady]).then(() => {});
    }
  };
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.graphStarts.push({
      type: "buffer",
      at: args[0] ?? this.context.currentTime,
      frames: this.buffer.length,
    });
    return bufferStart.apply(this, args);
  };
  AudioBufferSourceNode.prototype.stop = function (...args) {
    window.graphStops.push({ at: args[0] ?? this.context.currentTime });
    return bufferStop.apply(this, args);
  };
  OscillatorNode.prototype.start = function (...args) {
    window.graphStarts.push({
      type: "sine",
      at: args[0] ?? this.context.currentTime,
      hz: this.frequency.value,
    });
    return oscillatorStart.apply(this, args);
  };
}
async function clear(page) {
  await page.evaluate(() => {
    window.graphChunks.length = 0;
    window.graphStarts.length = 0;
    window.graphStops.length = 0;
  });
}
async function capture(page, name, details) {
  const result = await page.evaluate(() => {
    const chunks = window.graphChunks;
    if (!chunks.length) throw Error("No audio-thread output was captured");
    const first = chunks[0].firstFrame,
      last = chunks.at(-1);
    const samples = new Float32Array(last.firstFrame + last.samples.byteLength / 4 - first);
    const gaps = [],
      timestampCorrections = [];
    let expectedFrame = first;
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const length = chunk.samples.byteLength / 4;
      let frame = chunk.firstFrame;
      // Some Chromium runs report the previous quantum's global currentFrame
      // once, then resume the correct clock. Preserve every sample in order.
      // Only an isolated duplicate bracketed by consecutive quanta qualifies;
      // the independent oracle must still match ALL these samples. Any actual
      // missing/repeated signal therefore fails rather than being discarded.
      if (
        frame === expectedFrame - length &&
        chunks[index + 1]?.firstFrame === expectedFrame + length
      ) {
        timestampCorrections.push({ index, reportedFrame: frame, sequenceFrame: expectedFrame });
        frame = expectedFrame;
      }
      if (frame !== expectedFrame) gaps.push({ expected: expectedFrame, actual: frame });
      samples.set(new Float32Array(chunk.samples), frame - first);
      expectedFrame = frame + length;
    }
    let binary = "";
    const bytes = new Uint8Array(samples.buffer);
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return {
      firstFrame: first,
      clockGaps: gaps,
      timestampCorrections,
      rate: window.graphContext.sampleRate,
      samples: samples.length,
      data: btoa(binary),
      starts: window.graphStarts,
      stops: window.graphStops,
    };
  });
  await writeFile(`${output}/${name}.f32`, Buffer.from(result.data, "base64"));
  delete result.data;
  receipts.push({ file: `${name}.f32`, ...details, ...result });
}
async function download(page, selector, name) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  await file.saveAs(`${output}/${name}`);
  return name;
}
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    const browser = await launcher.launch();
    try {
      for (const rate of [44100, 48000]) {
        const context = await browser.newContext({
          serviceWorkers: "block",
          reducedMotion: "reduce",
        });
        await context.addInitScript(installTap, { rate });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        try {
          for (const tuning of ["pythagorean", "aristoxenian"]) {
            if (tuning !== "pythagorean") await page.evaluate(() => window.graphContext.close());
            await page.goto(`${origin.base}?species=6&tuning=${tuning}&mese=330&selected=12`);
            const wav = await download(page, "#save-octave-wav", `${engine}-${rate}-${tuning}.wav`);
            await page.locator("#play").click();
            await page.waitForFunction(() => window.graphStarts.length === 15);
            await page.waitForTimeout(8000);
            await capture(page, `${engine}-${rate}-${tuning}`, {
              engine,
              kind: "octave",
              tuning,
              mese: 330,
              species: 6,
              wav,
            });
          }
          // Actual mixed output must become silent after Stop, not just unschedule callbacks.
          await clear(page);
          await page.locator("#play").click();
          await page.waitForFunction(() => window.graphStarts.length === 15);
          await page.waitForTimeout(1100);
          await page.locator("#stop").click();
          const stop = await page.evaluate(() => window.graphContext.currentTime);
          await page.waitForTimeout(900);
          await capture(page, `${engine}-${rate}-stop`, { engine, kind: "stop", stopTime: stop });
          // Changing a model while playing must silence the old output as well.
          await clear(page);
          await page.locator("#play").click();
          await page.waitForFunction(() => window.graphStarts.length === 15);
          await page.waitForTimeout(400);
          await page.locator("#tuning").selectOption("pythagorean");
          const changed = await page.evaluate(() => window.graphContext.currentTime);
          await page.waitForTimeout(900);
          await capture(page, `${engine}-${rate}-change`, {
            engine,
            kind: "stop",
            stopTime: changed,
          });
          await page.evaluate(() => window.graphContext.close());
          await page.goto(`${origin.base}vina.html`);
          for (const [selector, kind] of [
            ["#pure-fifth", "pure-fifth"],
            ["#equal-fifth", "equal-fifth"],
          ]) {
            await clear(page);
            await page.locator(selector).click();
            await page.waitForFunction(() => window.graphStarts.length === 2);
            await page.waitForTimeout(2600);
            await capture(page, `${engine}-${rate}-${kind}`, { engine, kind });
          }
          assert.deepEqual(errors, []);
          console.log(engine, rate, "audio-thread octave, silence and fifth captures complete");
        } finally {
          await context.close();
        }
      }
      // The existing media player's actual decoded output, routed through the same tap.
      const context = await browser.newContext({ serviceWorkers: "block" });
      await context.addInitScript(installTap, { rate: 44100 });
      const page = await context.newPage();
      try {
        await page.goto(
          `${origin.base}compare.html?name=Dorian&tuning=aristoxenian&start=220&relation=name`,
        );
        await page.evaluate(async () => {
          const ctx = new AudioContext();
          await ctx.__auditReady;
          const source = ctx.createMediaElementSource(document.querySelector("audio"));
          source.connect(ctx.destination);
          document.addEventListener(
            "pointerdown",
            () => {
              void ctx.resume();
            },
            { capture: true },
          );
        });
        const wav = await download(page, "#save-wave", `${engine}-media.wav`);
        await page.locator("#compare-both").click();
        await page.waitForFunction(() => document.querySelector("audio").currentTime > 0.1);
        await page.waitForTimeout(8500);
        await capture(page, `${engine}-media`, { engine, kind: "media", wav });
        console.log(engine, "native media audio-thread capture complete");
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await origin.close();
}
await writeFile(
  `${output}/review.json`,
  `${JSON.stringify({ files: build.files, receipts, claim: "Audio-thread digital output before the physical device; not a microphone or speaker measurement." }, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    captures: receipts.length,
    bytes: (await readFile(`${output}/review.json`)).length,
  }),
);
