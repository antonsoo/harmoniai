import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";
import { snapshotBuild } from "./review-server.mjs";

const output = resolve(process.argv[2] ?? "/tmp/harmoniai-transfer-review");
await mkdir(output, { recursive: true });
const snapshot = await snapshotBuild();
const receipts = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  let mode = "slow";
  const jobs = [],
    requests = [];
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://localhost").pathname.slice(11) || "index.html";
    const bytes = snapshot.bodies.get(path);
    if (!bytes) return res.writeHead(404).end();
    const item = { path, mode, start: Date.now(), sent: 0, closed: null };
    requests.push(item);
    res.on("close", () => {
      item.closed = Date.now();
    });
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".jpg": "image/jpeg",
      ".woff2": "font/woff2",
    };
    res.writeHead(200, {
      "content-type": types[extname(path)] ?? "text/plain",
      "cache-control": "no-store",
    });
    if (mode === "stall" && path.endsWith("p198.jpg")) {
      res.write(bytes.subarray(0, 1024));
      item.sent = 1024;
      return;
    }
    if (mode !== "slow") {
      item.sent = bytes.length;
      res.end(bytes);
      return;
    }
    jobs.push({ res, bytes, item });
  });
  // One shared 128,000-byte/s budget across page, foreground and worker traffic.
  const tick = setInterval(() => {
    let budget = 16000;
    while (budget && jobs.length) {
      const job = jobs.shift();
      if (job.res.destroyed) continue;
      const length = Math.min(4000, budget, job.bytes.length - job.item.sent);
      job.res.write(job.bytes.subarray(job.item.sent, job.item.sent + length));
      job.item.sent += length;
      budget -= length;
      if (job.item.sent === job.bytes.length) job.res.end();
      else jobs.push(job);
    }
  }, 125);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/harmoniai/`;
  const browser = await launcher.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}compare.html`, { timeout: 90000 });
    await page.locator("#source-page").selectOption("198");
    await page.locator("#source-load").click();
    await page.waitForFunction(
      () => document.querySelector("#source-status")?.textContent.startsWith("Printed page 198"),
      null,
      { timeout: 180000 },
    );
    await page.waitForFunction(
      () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
      null,
      { timeout: 240000 },
    );
    const slow = requests.filter((r) => r.mode === "slow" && r.path.endsWith(".jpg"));
    assert(
      slow.some((r) => r.closed - r.start > 15000),
      "The audit never exercised an active transfer longer than the inactivity deadline",
    );
    mode = "normal";
    await context.close();
    const isolated = await browser.newContext({ serviceWorkers: "block" });
    const reader = await isolated.newPage();
    await reader.goto(`${base}compare.html`);
    mode = "stall";
    await reader.locator("#source-page").selectOption("198");
    await reader.locator("#source-load").click();
    const started = Date.now();
    await reader.waitForFunction(
      () =>
        /stopped making progress/.test(document.querySelector("#source-status")?.textContent ?? ""),
      null,
      { timeout: 25000 },
    );
    const stalledMs = Date.now() - started;
    assert(stalledMs >= 14000 && stalledMs < 23000);
    mode = "normal";
    await reader.locator("#source-load").click();
    await reader.waitForFunction(() =>
      document.querySelector("#source-status")?.textContent.startsWith("Printed page 198"),
    );
    mode = "stall";
    await reader.locator("#source-load").click();
    await reader.waitForTimeout(300);
    const held = requests.at(-1);
    await reader.locator("#source-page").selectOption("197");
    await reader.waitForTimeout(500);
    assert(
      held.path.endsWith("p198.jpg") && held.closed,
      "Changing the page did not cancel the held body",
    );
    assert.match(await reader.locator("#source-status").textContent(), /Press Show page/);
    mode = "stall";
    const downloads = [];
    reader.on("download", (file) => downloads.push(file.suggestedFilename()));
    const firstExportRequest = requests.length;
    await reader.locator("#save-reading").click();
    await reader.waitForTimeout(500);
    await reader.locator("#cancel-reading").click();
    await reader.waitForTimeout(500);
    const exportBodies = requests
      .slice(firstExportRequest)
      .filter((r) => r.path.endsWith("p198.jpg"));
    assert.equal(exportBodies.length, 1);
    assert(exportBodies[0].closed, "Cancelling a study left its source body open");
    assert.deepEqual(downloads, []);
    assert.equal(await reader.locator("#compare-name").inputValue(), "Dorian");
    await isolated.close();
    receipts.push({
      engine,
      slowSources: slow,
      stalledMs,
      cancelledRequest: held,
      cancelledExportBodies: exportBodies,
      cancelledExportDownloads: downloads,
      requests,
    });
    console.log(
      `${engine}: shared-bandwidth cold install, active source read, body-stall timeout, retry and cancellation passed`,
    );
  } finally {
    await browser.close();
    clearInterval(tick);
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
await writeFile(
  `${output}/review.json`,
  `${JSON.stringify({ files: snapshot.files, receipts }, null, 2)}\n`,
);
