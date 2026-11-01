import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, firefox } from "playwright";
import { snapshotBuild } from "./review-server.mjs";

const base = process.argv[2] ?? "https://antonsoo.github.io/harmoniai/";
const output = resolve(process.argv[3] ?? "/tmp/harmoniai-public-edition");
await mkdir(output, { recursive: true });
const build = await snapshotBuild(process.argv[4] ?? "dist");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expectedEdition = build.bodies
  .get("sw.js")
  .toString()
  .match(/Complete edition ([a-f0-9]{64})/)[1];
const manifest = JSON.parse(build.bodies.get("sources/manifest.json"));
const hosted = [];
let index = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (index < build.files.length) {
      const file = build.files[index++];
      const response = await fetch(new URL(file.path, base), {
        headers: { "cache-control": "no-cache" },
      });
      assert.equal(response.status, 200, file.path);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(hash(bytes), file.sha256, `Canonical hosted file differs: ${file.path}`);
      hosted.push({ ...file, status: response.status, matches: true });
    }
  }),
);
const receipts = [];
async function download(page, selector, name) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await pending;
  assert.equal(await result.failure(), null);
  const path = `${output}/${name}`;
  await result.saveAs(path);
  const bytes = await readFile(path);
  const images = [...bytes.toString().matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)];
  assert.equal(images.length, 3);
  images.forEach((image, i) => {
    const data = Buffer.from(image[1], "base64");
    assert.equal(data.length, manifest.pages[i].bytes);
    assert.equal(hash(data), manifest.pages[i].sha256);
  });
  return { path, bytes, sha256: hash(bytes) };
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({
        viewport: { width, height: 1100 },
        colorScheme: width === 375 ? "dark" : "light",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const name = `${engine}-${width}`;
      try {
        await page.goto(`${base}?species=6&mese=330&selected=12&orientation=pitch`);
        await page.waitForFunction(
          () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
          null,
          { timeout: 90000 },
        );
        assert.equal(
          await page.locator("#offline-status").getAttribute("data-edition"),
          expectedEdition,
        );
        assert.match(
          await page.locator(".step-measure").textContent(),
          /203\.910.*90\.225.*23\.460/,
        );
        await page.locator("#tuning").selectOption("aristoxenian");
        assert.match(
          await page.locator(".step-measure").textContent(),
          /200\.000.*100\.000.*two S steps equal/i,
        );
        await page.locator("#tuning").selectOption("pythagorean");
        await page.locator('[data-note="12"]').focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);
        await page.locator("#stop").click();
        assert.match(await page.locator("#string-readout").textContent(), /521\.4815/);
        if (width === 375) {
          assert((await page.locator('[data-note="12"] .hit').boundingBox()).height >= 24);
          await page.locator("#instrument").evaluate((e) => {
            e.scrollLeft = 0;
          });
          await page.locator("#instrument").focus();
          await page.keyboard.press("ArrowRight");
          await page.waitForFunction(() => document.querySelector("#instrument").scrollLeft > 0);
          await page.locator("#instrument").evaluate((e) => {
            e.scrollLeft = 0;
          });
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const online = await download(page, "#save-octave", `${name}-online.html`);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${name}-instrument.png` });
        await context.setOffline(true);
        await page.reload();
        await page.waitForFunction(() =>
          document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
        );
        const offline = await download(page, "#save-octave", `${name}-offline.html`);
        assert.equal(offline.sha256, online.sha256);
        const reading = await context.newPage();
        const external = [];
        reading.on("request", (r) => {
          if (/^https?:/.test(r.url())) external.push(r.url());
        });
        await reading.goto(pathToFileURL(offline.path).href);
        await reading.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map((i) => i.decode()));
        });
        assert.deepEqual(external, []);
        assert.equal(await reading.locator("img").count(), 3);
        assert.equal(await reading.locator("script").count(), 0);
        assert.equal(await reading.locator("details[open]").count(), 2);
        await reading.close();
        await page.goto(`${base}compare.html`);
        await page.locator("#source-load").click();
        await page.waitForFunction(() =>
          document.querySelector("#source-status")?.textContent.startsWith("Printed page 198"),
        );
        await download(page, "#save-reading", `${name}-comparison.html`);
        await page.goto(`${base}vina.html`);
        await page.locator('[data-stage="2"]').click();
        await page.locator('[data-moving="pa"]').click();
        await page.getByRole("button", { name: "Stop", exact: true }).click();
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          width,
          edition: expectedEdition,
          actualKeyboardPluck: true,
          modelLegendChanges: true,
          phoneTargetsAtLeast24px: width === 375 ? true : null,
          nativeStudySha256: online.sha256,
          threeEmbeddedScansVerified: true,
          offlineStudyIdentical: true,
          standaloneWithoutExternalRequests: true,
          completeNoticesOpen: true,
          threeRoomsOffline: true,
          comparisonSourceAndDownloadOffline: true,
          errors,
        });
      } finally {
        await context.close();
      }
      const canonical = await fetch(base, { headers: { "cache-control": "no-cache" } });
      assert.equal(canonical.status, 200);
      assert.equal(
        hash(Buffer.from(await canonical.arrayBuffer())),
        hash(build.bodies.get("index.html")),
      );
      console.log(
        `${name}: public controls, keyboard, actual downloads, retained scans, standalone and three rooms offline; canonical entry rechecked`,
      );
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  `${output}/review.json`,
  `${JSON.stringify({ base, expectedEdition, hosted: hosted.sort((a, b) => a.path.localeCompare(b.path)), receipts }, null, 2)}\n`,
);
