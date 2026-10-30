import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4484/harmoniai/";
const output = resolve(process.argv[3] ?? "docs/review/name-audit/local");
await mkdir(output, { recursive: true });
const temporary = await import("node:os").then((os) => `${os.tmpdir()}/harmoniai-name-review`);
await mkdir(temporary, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile("public/sources/manifest.json", "utf8"));
const fonts = await Promise.all(
  ["latin", "latin-ext", "greek", "greek-ext"].map(async (part) =>
    hash(await readFile(`src/fonts/gentium-book-plus-400-${part}.woff2`)),
  ),
);
const expected = { Dorian: [2, 6], Phrygian: [2, 6], Lydian: [4], Mixolydian: [2, 3, 5, 6] };
const receipts = [];
const faults = [];
async function download(page, selector, name) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await pending;
  assert.equal(await result.failure(), null);
  const path = `${temporary}/${name}`;
  await result.saveAs(path);
  return { bytes: await readFile(path), path, name: result.suggestedFilename() };
}
async function decodedWav(page, bytes) {
  // Measure the actual native download after decoding it in the browser.
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (s) => s.charCodeAt(0));
    const context = new AudioContext({ sampleRate: 44100 });
    const buffer = await context.decodeAudioData(bytes.buffer);
    const signal = buffer.getChannelData(0);
    const measured = [];
    for (let lane = 0; lane < 2; lane++)
      for (let degree = 0; degree < 8; degree++) {
        const start = lane * 4.33 + degree * 0.46;
        const crossings = [];
        for (
          let i = Math.round((start + 0.06) * buffer.sampleRate);
          i < Math.round((start + 0.3) * buffer.sampleRate);
          i++
        ) {
          if (signal[i] <= 0 && signal[i + 1] > 0)
            crossings.push(i - signal[i] / (signal[i + 1] - signal[i]));
        }
        measured.push(
          ((crossings.length - 1) * buffer.sampleRate) / (crossings.at(-1) - crossings[0]),
        );
      }
    const duration = buffer.duration;
    await context.close();
    return { measured, duration };
  }, bytes.toString("base64"));
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375])
      for (const colorScheme of ["light", "dark"]) {
        const id = `${engine}-${width}-${colorScheme}`;
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          colorScheme,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base);
        await page.locator('.species-picker [data-species="4"]').focus();
        await page.keyboard.press("ArrowRight");
        assert.equal(
          await page.locator('.species-picker [data-species="5"]').getAttribute("aria-checked"),
          "true",
        );
        await page.locator("#drill").check();
        assert.equal(await page.locator("#play").isDisabled(), true);
        assert.match(
          await page.locator('[data-note="0"]').getAttribute("aria-label"),
          /lowest pitch/,
        );
        await page.locator('[data-note="0"]').focus();
        await page.keyboard.press("Enter");
        const firstAnswer = await page.locator("#card").textContent();
        await page.locator('[data-note="1"]').click();
        assert.equal(await page.locator("#card").textContent(), firstAnswer);
        await page.locator("#next").click();
        assert.match(await page.locator("#card").textContent(), /[01] of 1 right/);
        assert.equal(
          await page.locator('[data-note="0"]').evaluate((e) => e === document.activeElement),
          true,
        );
        await page.locator('nav a[href="./compare.html"]').focus();
        await page.keyboard.press("Enter");
        await page.locator("#compare-name").waitFor();
        for (const [name, degrees] of Object.entries(expected)) {
          await page.locator("#compare-name").selectOption(name);
          assert.deepEqual(
            await page.locator(".degree-table .changed th").allTextContents(),
            degrees.map(String),
          );
          await page.locator("#compare-relation").selectOption("pattern");
          assert.equal(await page.locator(".degree-table .changed").count(), 0);
          await page.locator("#compare-relation").selectOption("name");
        }
        await page.locator("#compare-name").selectOption("Dorian");
        await page.locator("#compare-tuning").selectOption("pythagorean");
        assert.match(
          await page.locator(".degree-table .changed").first().textContent(),
          /113\.685/,
        );
        await page.locator("#compare-start").selectOption("330");
        const copiedUrl = await page.locator("#comparison-link").inputValue();
        await page.locator("#copy-comparison").click();
        await page.waitForFunction(
          () => document.querySelector("#save-status").textContent.length > 0,
        );
        assert.match(
          await page.locator("#save-status").textContent(),
          /copied|copy the comparison link/,
        );
        const reopened = await context.newPage();
        await reopened.goto(copiedUrl);
        assert.equal(await reopened.locator("#compare-start").inputValue(), "330");
        assert.equal(await reopened.locator("#compare-tuning").inputValue(), "pythagorean");
        await reopened.close();
        await page.locator("#compare-tuning").selectOption("aristoxenian");
        await page.locator("#compare-start").selectOption("220");
        await page.locator("#compare-both").focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.querySelector("audio").currentTime > 0.12);
        const played = await page
          .locator("audio")
          .evaluate((a) => ({ time: a.currentTime, duration: a.duration, paused: a.paused }));
        assert.equal(played.paused, false);
        const playerBytes = await page
          .locator("audio")
          .evaluate(async (a) =>
            Array.from(new Uint8Array(await (await fetch(a.src)).arrayBuffer())),
          );
        await page.locator("#compare-stop").click();
        assert.equal(
          await page.locator("audio").evaluate((a) => a.paused && a.currentTime === 0),
          true,
        );
        await page.locator('[data-degree="1"]').click();
        await page.waitForFunction(() => document.querySelector("audio").currentTime > 0.1);
        await page.locator("#compare-name").selectOption("Lydian");
        assert.equal(await page.locator("audio").evaluate((a) => a.paused), true);
        await page.locator("#compare-name").selectOption("Dorian");
        const wav = await download(page, "#save-wave", `${id}.wav`);
        assert.equal(hash(wav.bytes), hash(Buffer.from(playerBytes)));
        const decoded = await decodedWav(page, wav.bytes);
        const semitones = [
          [0, 1, 3, 5, 7, 8, 10, 12],
          [0, 2, 3, 5, 7, 9, 10, 12],
        ].flat();
        const centsErrors = decoded.measured.map((f, i) =>
          Math.abs(1200 * Math.log2(f / (220 * 2 ** (semitones[i] / 12)))),
        );
        assert.ok(Math.max(...centsErrors) < 0.01);
        const csv = await download(page, "#save-csv", `${id}.csv`);
        assert.equal(csv.bytes.toString().trim().split("\n").length, 9);
        const csvRows = csv.bytes
          .toString()
          .trim()
          .split("\n")
          .slice(1)
          .map((line) =>
            [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replaceAll('""', '"')),
          );
        csvRows.forEach((row, i) => {
          assert.equal(Number(row[0]), i + 1);
          assert.ok(Math.abs(Number(row[5]) - 220 * 2 ** (semitones[i] / 12)) < 1e-9);
          assert.ok(Math.abs(Number(row[6]) - 220 * 2 ** (semitones[i + 8] / 12)) < 1e-9);
        });
        const plateHashes = [];
        for (const plate of manifest.pages) {
          await page.locator("#source-page").selectOption(String(plate.page));
          await page.locator("#source-load").click();
          await page.waitForFunction(
            (p) =>
              document.querySelector("#source-status").textContent.startsWith(`Printed page ${p}.`),
            plate.page,
          );
          await page.locator("#source-image").evaluate((img) => img.decode());
          const bytes = await page
            .locator("#source-image")
            .evaluate(async (img) =>
              Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())),
            );
          assert.equal(hash(Buffer.from(bytes)), plate.sha256);
          plateHashes.push(plate.sha256);
          await page.locator("#source-zoom").click();
          await page.locator("#source-viewport").focus();
          await page.keyboard.press("ArrowRight");
          await page.locator("#source-zoom").click();
        }
        await page.locator("#source-page").selectOption("198");
        await page.locator("#source-load").click();
        await page.waitForFunction(() =>
          document.querySelector("#source-status").textContent.startsWith("Printed page 198."),
        );
        const html = await download(page, "#save-reading", `${id}.html`);
        const text = html.bytes.toString();
        const images = [...text.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)].map((m) =>
          hash(Buffer.from(m[1], "base64")),
        );
        assert.deepEqual(
          images,
          manifest.pages.map((p) => p.sha256),
        );
        const includedFonts = [...text.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)].map(
          (m) => hash(Buffer.from(m[1], "base64")),
        );
        assert.deepEqual(includedFonts, fonts);
        const includedAudio = text.match(/data:audio\/wav;base64,([A-Za-z0-9+/=]+)/);
        assert.equal(hash(Buffer.from(includedAudio[1], "base64")), hash(wav.bytes));
        const file = await context.newPage();
        const requests = [];
        file.on("request", (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        await file.goto(pathToFileURL(html.path).href);
        await file
          .locator("img")
          .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
        assert.equal(await file.locator("script").count(), 0);
        assert.equal(await file.locator("img").count(), 3);
        assert.deepEqual(requests, []);
        if (id === "chromium-1440-light") {
          await writeFile(`${output}/dorian-reading.html.gz`, gzipSync(html.bytes));
          await writeFile(`${output}/dorian-comparison.wav`, wav.bytes);
          await writeFile(`${output}/dorian-pitches.csv`, csv.bytes);
          await file.pdf({
            path: `${output}/dorian-reading.pdf`,
            format: "A4",
            printBackground: true,
            tagged: true,
          });
        }
        await file.close();
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}-compare.png` });
        await page.locator("#reading").evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: `${output}/${id}-reading.png` });
        await page.waitForFunction(
          () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
          null,
          { timeout: 30000 },
        );
        await context.setOffline(true);
        await page.reload();
        await page.locator("#compare-name").selectOption("Dorian");
        await page.locator("#source-load").click();
        await page.waitForFunction(() =>
          document.querySelector("#source-status").textContent.startsWith("Printed page 198."),
        );
        const offline = await download(page, "#save-reading", `${id}-offline.html`);
        assert.equal(hash(offline.bytes), hash(html.bytes));
        await page.locator("#compare-both").click();
        await page.waitForFunction(() => document.querySelector("audio").currentTime > 0.1);
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          version: browser.version(),
          width,
          colorScheme,
          practiceAnswers: 1,
          comparisons: 8,
          played,
          decodedPitchErrorCents: Math.max(...centsErrors),
          wav: { bytes: wav.bytes.length, sha256: hash(wav.bytes) },
          html: { bytes: html.bytes.length, sha256: hash(html.bytes) },
          sourcePages: plateHashes,
          embeddedFonts: includedFonts,
          offlineIdentical: true,
          physicalAudio: "Not measured; decoded signal and native playback were verified.",
          errors,
        });
        await context.close();
        console.log(
          id,
          "practice, listening, source pages, actual exports, offline and accessibility verified",
        );
        await writeFile(
          `${output}/review.json`,
          `${JSON.stringify({ base, receipts, faults }, null, 2)}\n`,
        );
      }
    // Failure handling uses isolated online contexts so the service worker cannot
    // hide the deliberately delayed or substituted network response.
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    let release;
    await page.route("**/sources/jan-1895-p198.jpg", async (route) => {
      await new Promise((r) => {
        release = r;
      });
      await route.continue();
    });
    await page.goto(new URL("compare.html", base).href);
    await page.locator("#source-load").click();
    await page.waitForTimeout(150);
    await page.locator("#source-page").selectOption("197");
    await page.locator("#source-load").click();
    await page.waitForFunction(() =>
      document.querySelector("#source-status").textContent.startsWith("Printed page 197."),
    );
    release();
    await page.waitForTimeout(400);
    assert.match(await page.locator("#source-image").getAttribute("alt"), /page 197/);
    await page.unroute("**/sources/jan-1895-p198.jpg");
    await page.route("**/sources/jan-1895-p198.jpg", async (route) => {
      const response = await route.fetch();
      const bytes = await response.body();
      bytes[500] ^= 1;
      await route.fulfill({ response, body: bytes });
    });
    await page.locator("#source-page").selectOption("198");
    await page.locator("#source-load").click();
    await page.waitForFunction(() =>
      document.querySelector("#source-status").textContent.includes("differs"),
    );
    assert.equal(await page.locator("#source-image").isHidden(), true);
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.locator("#save-reading").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("differs"),
    );
    assert.equal(downloads, 0);
    await page.unroute("**/sources/jan-1895-p198.jpg");
    release = undefined;
    await page.route("**/sources/jan-1895-p198.jpg", async (route) => {
      await new Promise((r) => {
        release = r;
      });
      await route.continue();
    });
    const saved = download(page, "#save-reading", `${engine}-frozen.html`);
    while (!release) await page.waitForTimeout(20);
    await page.locator("#compare-name").selectOption("Lydian");
    release();
    const frozen = await saved;
    assert.match(frozen.bytes.toString(), /<h1>Which Dorian\?<\/h1>/);
    assert.match(await page.locator("#save-status").textContent(), /Saved the Dorian/);
    release = undefined;
    await page.locator("#save-reading").click();
    while (!release) await page.waitForTimeout(20);
    const before = downloads;
    await page.locator("#cancel-reading").click();
    release();
    await page.waitForTimeout(400);
    assert.equal(downloads, before);
    faults.push({
      engine,
      lateSourceIgnored: true,
      corruptSourceAndExportRefused: true,
      exportSelectionFrozen: true,
      cancelledExportProducesNoDownload: true,
    });
    await context.close();
    await writeFile(
      `${output}/review.json`,
      `${JSON.stringify({ base, receipts, faults }, null, 2)}\n`,
    );
  } finally {
    await browser.close();
  }
}
