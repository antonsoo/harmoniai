import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const current = resolve(process.argv[2] ?? "dist");
const next = resolve(process.argv[3] ?? "/tmp/harmoniai-next-edition/dist");
const output = resolve(process.argv[4] ?? "/tmp/harmoniai-edition-review");
await mkdir(output, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receipts = [];
async function serve() {
  let directory = current,
    mode = "normal";
  const requests = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/observer") {
      res.writeHead(200, { "content-type": "text/html" }).end("<title>Edition observer</title>");
      return;
    }
    if (!url.pathname.startsWith("/harmoniai/")) {
      res.writeHead(404).end("Unknown route");
      return;
    }
    const path = url.pathname.slice(11) || "index.html";
    if (path.includes("..")) {
      res.writeHead(400).end();
      return;
    }
    requests.push({ path, mode, at: Date.now() });
    try {
      let bytes = await readFile(`${directory}/${path}`);
      if (mode === "corrupt-notice" && path === "fonts/gentium-book-plus-LICENSE.txt")
        bytes = Buffer.alloc(bytes.length, 120);
      res.writeHead(200, {
        "content-type": types[extname(path)] ?? "text/plain",
        "cache-control": "no-store",
      });
      res.end(bytes);
    } catch {
      res.writeHead(404).end("Missing file");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  return {
    server,
    base: `http://127.0.0.1:${port}/harmoniai/`,
    requests,
    setMode: (value) => {
      mode = value;
    },
    setDirectory: (value) => {
      directory = value;
    },
    stop: async () => {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    },
    restart: () => new Promise((r) => server.listen(port, "127.0.0.1", r)),
  };
}
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
    null,
    { timeout: 40000 },
  );
}
async function incomplete(page) {
  await page.waitForFunction(() =>
    /incomplete or damaged/.test(document.querySelector("#offline-status")?.textContent ?? ""),
  );
}
async function repair(page) {
  await page.getByRole("button", { name: "Check and repair offline copy", exact: true }).click();
}
async function download(page, selector, name) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await pending;
  assert.equal(await result.failure(), null);
  const path = `${output}/${name}`;
  await result.saveAs(path);
  return { sha256: hash(await readFile(path)), path };
}
async function damage(page) {
  const wrong = (await readFile(`${current}/sources/jan-1895-p198.jpg`)).toString("base64");
  await page.evaluate(async (wrong) => {
    const key = (await caches.keys()).find((k) => k.startsWith("harmoniai-"));
    const cache = await caches.open(key);
    await cache.put(
      "/harmoniai/sources/jan-1895-p197.jpg",
      new Response(
        Uint8Array.from(atob(wrong), (c) => c.charCodeAt(0)),
        { headers: { "content-type": "image/jpeg" } },
      ),
    );
    await cache.delete("/harmoniai/LICENSE.txt");
    window.dispatchEvent(new Event("pageshow"));
  }, wrong);
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    // Both open tabs must invalidate readiness, survive failed repair and recover.
    const origin = await serve();
    let context = await browser.newContext({ viewport: { width: 375, height: 1000 } });
    try {
      const page = await context.newPage();
      await page.goto(`${origin.base}?species=6&mese=330&selected=12`);
      await ready(page);
      const other = await context.newPage();
      await other.goto(origin.base);
      await ready(other);
      await damage(page);
      await incomplete(page);
      await incomplete(other);
      await origin.stop();
      await repair(page);
      await incomplete(page);
      await page.waitForFunction(() => !document.querySelector(".offline-actions button").disabled);
      assert.equal(await page.locator("#mese").inputValue(), "330");
      await origin.restart();
      await repair(page);
      await ready(page);
      await ready(other);
      assert.equal(await page.locator("#mese").inputValue(), "330");
      assert.equal(
        await page.locator('.species-picker [aria-checked="true"]').getAttribute("data-species"),
        "6",
      );
      const reading = await download(page, "#save-octave", `${engine}-repaired.html`);
      await page.locator(".offline-actions").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${engine}-repaired-phone.png` });
      receipts.push({
        engine,
        test: "damage-and-repair",
        twoTabsInvalidated: true,
        closedOriginRefused: true,
        onlineRepair: true,
        controlsPreserved: true,
        readingSha256: reading.sha256,
      });
    } finally {
      await context.close();
      if (origin.server.listening) await origin.stop();
    }
    console.log(engine, "damaged bytes, two tabs, actual origin shutdown and repair passed");

    // A failed first install has no controller; its Retry must register a new worker.
    const failed = await serve();
    context = await browser.newContext();
    try {
      failed.setMode("corrupt-notice");
      const page = await context.newPage();
      await page.goto(failed.base);
      await page.waitForFunction(
        () => /did not finish/.test(document.querySelector("#offline-status")?.textContent ?? ""),
        null,
        { timeout: 30000 },
      );
      assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), false);
      failed.setMode("normal");
      await repair(page);
      await ready(page);
      receipts.push({
        engine,
        test: "failed-first-install",
        noFalseReady: true,
        retryWithoutReload: true,
      });
    } finally {
      await context.close();
      await failed.stop();
    }
    console.log(engine, "failed first install and explicit retry passed");

    // A genuine next build changes the license identity. The old cache must survive.
    const update = await serve();
    context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`${update.base}?species=6&mese=330&selected=12`);
      await ready(page);
      const oldCache = await page.evaluate(async () =>
        (await caches.keys()).find((k) => k.startsWith("harmoniai-")),
      );
      const before = await download(page, "#save-octave", `${engine}-before-update.html`);
      const other = await context.newPage();
      await other.goto(`${update.base}compare.html`);
      await ready(other);
      await other.locator("#compare-name").selectOption("Lydian");
      await other.locator("#compare-start").selectOption("330");
      const comparisonBefore = await download(
        other,
        "#save-reading",
        `${engine}-comparison-before-update.html`,
      );
      update.setDirectory(next);
      await page.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration()).update();
      });
      await page.waitForFunction(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
        null,
        { timeout: 40000 },
      );
      await page.waitForFunction(() => !document.querySelector("#offline-update").hidden);
      assert.ok(await page.evaluate(async (key) => (await caches.keys()).includes(key), oldCache));
      const during = await download(page, "#save-octave", `${engine}-during-update.html`);
      assert.equal(during.sha256, before.sha256);
      const comparisonDuring = await download(
        other,
        "#save-reading",
        `${engine}-comparison-during-update.html`,
      );
      assert.equal(comparisonDuring.sha256, comparisonBefore.sha256);
      const another = await context.newPage();
      const response = await another.goto(update.base);
      assert.equal(hash(await response.body()), hash(await readFile(`${current}/index.html`)));
      await page.locator("#offline-update").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${engine}-waiting-update.png` });
      const observer = await context.newPage();
      await observer.goto(new URL("/observer", update.base).href);
      await page.close();
      await other.close();
      await another.close();
      await observer.waitForFunction(
        async (key) => !(await caches.keys()).includes(key),
        oldCache,
        { timeout: 30000 },
      );
      const fresh = await context.newPage();
      const freshResponse = await fresh.goto(`${update.base}?species=6&mese=330&selected=12`);
      assert.equal(hash(await freshResponse.body()), hash(await readFile(`${next}/index.html`)));
      await ready(fresh);
      const after = await download(fresh, "#save-octave", `${engine}-after-update.html`);
      assert.notEqual(after.sha256, before.sha256);
      assert.equal(await fresh.locator("#mese").inputValue(), "330");
      receipts.push({
        engine,
        test: "waiting-update",
        oldCacheRetained: true,
        twoOldStudiesIdentical: true,
        newTabsStayCoherent: true,
        activationAfterClosingTabs: true,
        newReadingSha256: after.sha256,
      });
    } finally {
      await context.close();
      await update.stop();
    }
    console.log(engine, "waiting update, old studies, coherent new tabs and activation passed");
    await writeFile(
      `${output}/review.json`,
      `${JSON.stringify({ current, next, receipts }, null, 2)}\n`,
    );
  } finally {
    await browser.close();
  }
}
