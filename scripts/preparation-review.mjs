import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { serveSnapshot, snapshotBuild } from "./review-server.mjs";

const output = resolve(process.argv[2] ?? "/tmp/harmoniai-preparation");
await mkdir(output, { recursive: true });
const build = await snapshotBuild(process.argv[3] ?? "dist");
const server = await serveSnapshot(build);
function instrument({ rate }) {
  const Original = window.AudioContext;
  const resume = Original.prototype.resume;
  const createBuffer = Original.prototype.createBuffer;
  const start = AudioBufferSourceNode.prototype.start;
  const anchorClick = HTMLAnchorElement.prototype.click;
  window.wavePreparation = null;
  const ids = new WeakMap();
  let next = 0;
  window.preparation = null;
  window.cancelPreparationAfter = null;
  window.AudioContext = class extends Original {
    constructor(options) {
      super({ ...options, sampleRate: rate });
    }
  };
  Original.prototype.resume = function (...args) {
    return resume.apply(this, args).then(() => {
      if (window.preparation && !window.preparation.resumedAt)
        window.preparation.resumedAt = performance.now();
    });
  };
  Original.prototype.createBuffer = function (...args) {
    const buffer = createBuffer.apply(this, args);
    ids.set(buffer, ++next);
    if (window.preparation && !window.preparation.done) {
      window.preparation.createdBuffers++;
      window.preparation.channelSamples += args[0] * args[1];
    }
    return buffer;
  };
  function finish(reason) {
    const record = window.preparation;
    if (!record || record.done) return;
    record.done = true;
    record.finishedBy = reason;
    record.finishedAt = performance.now();
    record.maxHeartbeatGapMs = Math.max(
      record.maxHeartbeatGapMs,
      record.finishedAt - record.lastHeartbeat,
    );
    clearInterval(record.heartbeat);
    delete record.heartbeat;
    delete record.lastHeartbeat;
  }
  AudioBufferSourceNode.prototype.start = function (...args) {
    const record = window.preparation;
    if (record) {
      record.sourceBufferIds.push(ids.get(this.buffer));
      if (!record.firstStartAt) {
        record.firstStartAt = performance.now();
        if (record.cancelAfter === null) finish("first-source-scheduled");
      }
    }
    return start.apply(this, args);
  };
  HTMLAnchorElement.prototype.click = function (...args) {
    const record = window.wavePreparation;
    if (record && !record.done && this.download.endsWith(".wav")) {
      record.finishedAt = performance.now();
      record.maxHeartbeatGapMs = Math.max(
        record.maxHeartbeatGapMs,
        record.finishedAt - record.lastHeartbeat,
      );
      record.done = true;
      clearInterval(record.heartbeat);
      delete record.heartbeat;
      delete record.lastHeartbeat;
    }
    return anchorClick.apply(this, args);
  };
  document.addEventListener(
    "click",
    (event) => {
      const id = event.target.closest?.("button")?.id;
      if (id === "save-octave-wav") {
        const now = performance.now();
        const record = { clickAt: now, lastHeartbeat: now, maxHeartbeatGapMs: 0, done: false };
        record.heartbeat = setInterval(() => {
          const current = performance.now();
          record.maxHeartbeatGapMs = Math.max(
            record.maxHeartbeatGapMs,
            current - record.lastHeartbeat,
          );
          record.lastHeartbeat = current;
        }, 8);
        window.wavePreparation = record;
      }
      if (id === "play") {
        const now = performance.now();
        const record = {
          clickAt: now,
          resumedAt: null,
          firstStartAt: null,
          createdBuffers: 0,
          channelSamples: 0,
          sourceBufferIds: [],
          cancelAfter: window.cancelPreparationAfter,
          maxHeartbeatGapMs: 0,
          lastHeartbeat: now,
          done: false,
        };
        record.heartbeat = setInterval(() => {
          const current = performance.now();
          record.maxHeartbeatGapMs = Math.max(
            record.maxHeartbeatGapMs,
            current - record.lastHeartbeat,
          );
          record.lastHeartbeat = current;
        }, 8);
        window.preparation = record;
        if (record.cancelAfter !== null)
          setTimeout(() => document.querySelector("#stop").click(), record.cancelAfter);
      } else if (id === "stop") finish("stop-dispatched");
    },
    true,
  );
}
const browser = await chromium.launch();
const receipts = [];
try {
  for (const rate of [44100, 48000]) {
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 375, height: 1000 },
      reducedMotion: "reduce",
    });
    try {
      await context.addInitScript(instrument, { rate });
      const page = await context.newPage();
      await page.goto(`${server.base}?species=6&mese=330&selected=12`);
      await page.locator('[data-note="12"]').click();
      await page.waitForTimeout(200);
      await page.locator("#stop").click();
      const cdp = await context.newCDPSession(page);
      for (const slowdown of [1, 6]) {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: slowdown });
        for (const cancelAfter of slowdown === 6 ? [null, 30] : [null]) {
          for (let run = 0; run < 3; run++) {
            await page.evaluate((delay) => {
              window.preparation = null;
              window.cancelPreparationAfter = delay;
            }, cancelAfter);
            await page.locator("#play").click();
            await page.waitForFunction(() => window.preparation?.done);
            // Source scheduling finishes synchronously after the first start.
            const record = await page.evaluate(() => window.preparation);
            assert(record.resumedAt !== null);
            if (cancelAfter === null) assert.equal(record.sourceBufferIds.length, 15);
            receipts.push({
              kind: "live",
              rate,
              slowdown,
              run,
              ...record,
              preparationMs:
                record.firstStartAt === null ? null : record.firstStartAt - record.resumedAt,
              queuedStopDispatchMs:
                cancelAfter === null ? null : record.finishedAt - record.clickAt,
              channelSampleBytes: record.channelSamples * 4,
              uniqueSourceBuffers: new Set(record.sourceBufferIds).size,
            });
            await page.locator("#stop").click();
            await page.waitForTimeout(100);
          }
        }
      }
      for (const slowdown of [1, 6]) {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: slowdown });
        for (let run = 0; run < 3; run++) {
          const pending = page.waitForEvent("download");
          await page.locator("#save-octave-wav").click();
          const file = await pending;
          assert.equal(await file.failure(), null);
          const name = `${rate}-${slowdown}-${run}.wav`;
          await file.saveAs(`${output}/${name}`);
          const bytes = await readFile(`${output}/${name}`);
          assert.equal(bytes.readUInt32LE(24), 44100);
          const record = await page.evaluate(() => window.wavePreparation);
          assert(record.done);
          receipts.push({
            kind: "wave",
            rate: 44100,
            contextRate: rate,
            slowdown,
            run,
            ...record,
            preparationMs: record.finishedAt - record.clickAt,
            wavFile: name,
            wavBytes: bytes.length,
            wavSha256: createHash("sha256").update(bytes).digest("hex"),
          });
          await page.waitForTimeout(100);
        }
      }
    } finally {
      await context.close();
    }
  }
  await writeFile(
    `${output}/review.json`,
    `${JSON.stringify(
      {
        source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        browser: browser.version(),
        machine: {
          platform: os.platform(),
          release: os.release(),
          logicalCpus: os.cpus().length,
          totalMemoryBytes: os.totalmem(),
        },
        files: build.files,
        receipts,
        boundary:
          "Chromium DevTools CPU slowdown and application-created channel buffers. Main-thread preparation and queued-control dispatch; not physical-device latency or resident memory.",
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    receipts.map((r) => ({
      rate: r.rate,
      slowdown: r.slowdown,
      cancelAfter: r.cancelAfter,
      createdBuffers: r.createdBuffers,
      preparationMs: r.preparationMs,
      maxHeartbeatGapMs: r.maxHeartbeatGapMs,
      queuedStopDispatchMs: r.queuedStopDispatchMs,
    })),
  );
} finally {
  await browser.close();
  await server.close();
}
