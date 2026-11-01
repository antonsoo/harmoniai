import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const output = resolve(process.argv[2] ?? "/tmp/harmoniai-octave-review");
await mkdir(output, { recursive: true });
const receipts = [],
  signals = [],
  downloads = [],
  faults = [];
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
async function serve() {
  const server = createServer(async (req, res) => {
    const name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (!name.startsWith("/harmoniai/") || name.includes("..")) {
      res.writeHead(404).end();
      return;
    }
    const file = `dist/${name.slice(11) || "index.html"}`;
    try {
      const bytes = await readFile(file);
      res
        .writeHead(200, {
          "content-type": types[extname(file)] ?? "application/octet-stream",
          "cache-control": "no-store",
        })
        .end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, base: `http://127.0.0.1:${server.address().port}/harmoniai/` };
}
function stop(server) {
  server.closeAllConnections();
  return new Promise((r) => server.close(r));
}
async function download(page, selector, filename) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await pending;
  assert.equal(await result.failure(), null);
  const path = `${output}/${filename}`;
  await result.saveAs(path);
  const bytes = await readFile(path);
  return {
    path,
    bytes,
    suggested: result.suggestedFilename(),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
function instrumentAudio({ rate }) {
  const Original = window.AudioContext;
  window.AudioContext = class extends Original {
    constructor(options) {
      super({ ...options, sampleRate: rate });
      window.contexts.push(this);
    }
  };
  window.contexts = [];
  window.captured = [];
  window.sources = [];
  window.holdResume = false;
  window.releaseResume = [];
  const resume = Original.prototype.resume;
  Original.prototype.resume = function () {
    if (window.rejectResume) return Promise.reject(new Error("deliberately refused"));
    if (window.holdResume)
      return new Promise((resolve) => window.releaseResume.push(() => resolve(resume.call(this))));
    return resume.call(this);
  };
  const start = AudioBufferSourceNode.prototype.start;
  const stop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.captured.push({
      rate: this.buffer.sampleRate,
      samples: this.buffer.getChannelData(0).slice(),
      start: args[0],
    });
    window.sources.push({ stopped: false, node: this });
    return start.apply(this, args);
  };
  AudioBufferSourceNode.prototype.stop = function (...args) {
    const item = window.sources.find((s) => s.node === this);
    if (item) item.stopped = true;
    return stop.apply(this, args);
  };
}
async function capture(page, filename, metadata) {
  const result = await page.evaluate(() => {
    const item = window.captured.at(-1);
    let binary = "";
    const bytes = new Uint8Array(item.samples.buffer);
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { rate: item.rate, data: btoa(binary) };
  });
  await writeFile(`${output}/${filename}`, Buffer.from(result.data, "base64"));
  signals.push({ file: filename, rate: result.rate, ...metadata });
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const rate of [44100, 48000]) {
      const { server, base } = await serve();
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        serviceWorkers: "block",
      });
      try {
        await context.addInitScript(instrumentAudio, { rate });
        const page = await context.newPage();
        await page.goto(base);
        await page.locator("#pitch-details").evaluate((e) => {
          e.open = true;
        });
        for (const mese of [110, 220, 330])
          for (const tuning of ["pythagorean", "aristoxenian"]) {
            await page.locator("#mese").selectOption(String(mese));
            await page.locator("#tuning").selectOption(tuning);
            for (let index = 0; index < 15; index++) {
              const before = await page.evaluate(() => window.captured.length);
              await page.locator(`[data-play-note="${index}"]`).click();
              await page.waitForFunction((n) => window.captured.length > n, before);
              await capture(page, `${engine}-${rate}-${mese}-${tuning}-${index}.f32`, {
                engine,
                mese,
                tuning,
                index,
              });
            }
          }
        // A queued permission must not resurrect a stopped or superseded note.
        await page.locator("#stop").click();
        await page.evaluate(() => {
          window.holdResume = true;
          window.captured = [];
        });
        await page.locator("#play").click();
        await page.locator("#stop").click();
        await page.evaluate(() => {
          window.holdResume = false;
          window.releaseResume.splice(0).forEach((f) => {
            f();
          });
        });
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => window.captured.length), 0);
        await page.evaluate(() => {
          window.holdResume = true;
        });
        await page.locator('[data-play-note="2"]').click();
        await page.locator('[data-play-note="12"]').click();
        await page.evaluate(() => {
          window.holdResume = false;
          window.releaseResume.splice(0).forEach((f) => {
            f();
          });
        });
        await page.waitForFunction(() => window.captured.length === 1);
        assert.match(await page.locator("#string-readout").textContent(), /523.8423/);
        await page.locator("#stop").click();
        assert.ok(await page.evaluate(() => window.sources.every((s) => s.stopped)));
        await page.evaluate(() => {
          window.rejectResume = true;
        });
        await page.locator("#play").click();
        await page.waitForFunction(() =>
          document.querySelector("#octave-status").textContent.includes("Sound could not start"),
        );
        receipts.push({
          engine,
          rate,
          signals: 90,
          stoppedPermission: true,
          newestPermission: true,
          refusedPermission: true,
        });
      } finally {
        await context.close();
        await stop(server);
      }
    }
    for (const width of [1440, 375]) {
      const { server, base } = await serve();
      const context = await browser.newContext({
        viewport: { width, height: 1100 },
        colorScheme: width === 375 ? "dark" : "light",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await context.addInitScript(instrumentAudio, { rate: 44100 });
        await page.goto(
          `${base}?species=6&tuning=pythagorean&mese=330&selected=12&orientation=pitch`,
        );
        await page.waitForFunction(() =>
          document.querySelector("#offline-status").textContent.startsWith("Ready offline"),
        );
        assert.equal(await page.locator("#tuning").inputValue(), "pythagorean");
        assert.equal(await page.locator("#mese").inputValue(), "330");
        assert.equal(await page.locator("#orient").isChecked(), true);
        await page.locator('[data-note="12"]').focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => window.captured.length > 0);
        assert.equal(
          await page.locator('[data-note="12"]').evaluate((e) => e === document.activeElement),
          true,
        );
        await page.locator("#compare-string").click();
        await page.waitForFunction(() => window.captured.length === 3);
        await capture(page, `${engine}-${width}-comparison-last.f32`, {
          engine,
          mese: 330,
          tuning: "aristoxenian",
          index: 12,
        });
        const csv = await download(page, "#save-pitches", `${engine}-${width}-pitches.csv`);
        const note = await download(page, "#save-note", `${engine}-${width}-string.wav`);
        const wav = await download(page, "#save-octave-wav", `${engine}-${width}-octave.wav`);
        const study = await download(page, "#save-octave", `${engine}-${width}-octave.html`);
        assert.match(study.bytes.toString(), /Hypophrygian/);
        await page.locator("#copy-octave").click();
        const link = await page.locator("#octave-link").inputValue();
        assert.match(link, /species=6.*mese=330.*selected=12/);
        await page.locator("#pitches").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `${output}/${engine}-${width}-pitches.png`,
          fullPage: false,
        });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${engine}-${width}-instrument.png` });
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(axe.violations, []);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator("#drill").check();
        assert.equal(await page.locator("#string-readout").isVisible(), false);
        assert.equal(await page.locator("#pitch-work").isVisible(), false);
        await page.locator("#drill").uncheck();
        // Load the actual saved file, with requests observed before navigation.
        const file = await context.newPage();
        const external = [];
        file.on("request", (r) => {
          if (/^https?:/.test(r.url())) external.push(r.url());
        });
        await file.goto(pathToFileURL(study.path).href);
        assert.equal(await file.locator("script").count(), 0);
        assert.equal(await file.locator("img").count(), 3);
        assert.equal(await file.locator("tbody tr").count(), 15);
        assert.equal(await file.locator(".instrument").count(), 1);
        assert.equal(await file.locator('[role="button"]').count(), 0);
        assert.ok(
          await file
            .locator("img")
            .evaluateAll((images) => images.every((i) => i.complete && i.naturalWidth > 1000)),
        );
        assert.deepEqual(external, []);
        const nested = await download(
          file,
          'a[download="harmoniai-octave.wav"]',
          `${engine}-${width}-embedded.wav`,
        );
        assert.equal(nested.sha256, wav.sha256);
        const embeddedCsv = await download(
          file,
          'a[download="harmoniai-octave.csv"]',
          `${engine}-${width}-embedded.csv`,
        );
        assert.equal(embeddedCsv.sha256, csv.sha256);
        const savedAxe = await new AxeBuilder({ page: file })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(savedAxe.violations, []);
        const identities = await file.locator("img").evaluateAll(async (images) => {
          const hash = async (bytes) =>
            Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join("");
          return Promise.all(
            images.map(async (img) => ({
              bytes: (await (await fetch(img.src)).arrayBuffer()).byteLength,
              sha256: await hash(await (await fetch(img.src)).arrayBuffer()),
            })),
          );
        });
        const manifest = JSON.parse(await readFile("public/sources/manifest.json", "utf8"));
        assert.deepEqual(
          identities,
          manifest.pages.map((p) => ({ bytes: p.bytes, sha256: p.sha256 })),
        );
        await file.evaluate(() => scrollTo(0, 0));
        await file.screenshot({ path: `${output}/${engine}-${width}-saved.png`, fullPage: false });
        if (engine === "chromium" && width === 1440) {
          await file.pdf({
            path: `${output}/octave-reading.pdf`,
            format: "A4",
            printBackground: true,
            tagged: true,
          });
          await writeFile(`${output}/octave-reading.html.gz`, gzipSync(study.bytes));
        }
        await file.close();
        // A real unavailable origin, after the matching worker installed.
        await stop(server);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator("#play").click();
        await page.locator("#stop").click();
        await page.locator('[data-note="12"]').click();
        await page.locator("#stop").click();
        const offline = await download(page, "#save-octave", `${engine}-${width}-offline.html`);
        assert.equal(offline.sha256, study.sha256);
        await page.goto(`${base}vina.html`);
        await page.locator('[data-stage="2"]').click();
        await page.locator('[data-moving="pa"]').click();
        await page.goto(`${base}compare.html`);
        assert.ok(await page.locator("h1").count());
        assert.deepEqual(errors, []);
        downloads.push({
          engine,
          width,
          mese: 330,
          tuning: "pythagorean",
          species: 6,
          index: 12,
          csv: csv.path,
          note: note.path,
          wav: wav.path,
          html: study.path,
          htmlSha256: study.sha256,
          offlineSameBytes: true,
          standaloneExternalRequests: external,
          axeViolations: axe.violations.length,
        });
      } finally {
        await context.close();
        if (server.listening) await stop(server);
      }
    }
    // Corrupt retained bytes, cancel a held export, then change settings during saving.
    const { server, base } = await serve();
    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      const page = await context.newPage();
      await page.goto(`${base}?species=5&mese=110&selected=5`);
      let mode = "corrupt",
        release;
      const held = () =>
        new Promise((r) => {
          release = r;
        });
      let gate;
      await page.route("**/sources/jan-1895-p197.jpg", async (route) => {
        if (mode === "hold") await gate;
        if (mode === "corrupt")
          await route.fulfill({
            status: 200,
            contentType: "image/jpeg",
            body: await readFile("public/sources/jan-1895-p198.jpg"),
          });
        else await route.continue().catch(() => {});
      });
      let count = 0;
      page.on("download", () => count++);
      await page.locator("#save-octave").click();
      await page.waitForFunction(() =>
        document.querySelector("#octave-status").textContent.includes("differs from"),
      );
      assert.equal(count, 0);
      mode = "hold";
      gate = held();
      await page.locator("#save-octave").click();
      await page.getByRole("button", { name: "Cancel saving", exact: true }).click();
      await page.waitForFunction(() =>
        document.querySelector("#octave-status").textContent.includes("Saving cancelled"),
      );
      assert.equal(count, 0);
      release();
      gate = held();
      const pending = page.waitForEvent("download");
      await page.locator("#save-octave").click();
      await page.locator("#mese").selectOption("330");
      await page.locator('.species-picker [data-species="7"]').click();
      release();
      const snapshot = await pending;
      await snapshot.saveAs(`${output}/${engine}-snapshot.html`);
      const html = await readFile(`${output}/${engine}-snapshot.html`, "utf8");
      assert.match(html, /Hypolydian/);
      assert.match(html, /Mesē is held at 110 Hz/);
      assert.equal(await page.locator("#mese").inputValue(), "330");
      assert.equal(
        await page.locator('.species-picker [aria-checked="true"]').getAttribute("data-species"),
        "7",
      );
      await page.goto(`${base}?species=1&mese=0`);
      assert.equal(
        await page.locator('.species-picker [aria-checked="true"]').getAttribute("data-species"),
        "4",
      );
      assert.match(await page.locator("#octave-status").textContent(), /starting octave/);
      faults.push({
        engine,
        corruptSourceRefused: true,
        cancelledExport: true,
        snapshotSurvivesEdits: true,
        invalidLinkAtomic: true,
      });
    } finally {
      await context.close();
      await stop(server);
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  `${output}/review.json`,
  JSON.stringify({ receipts, signals, downloads, faults }, null, 2),
);
console.log(
  JSON.stringify(
    { contexts: receipts.length, signals: signals.length, downloads: downloads.length, faults },
    null,
    2,
  ),
);
