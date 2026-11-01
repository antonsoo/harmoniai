import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";
import { snapshotBuild } from "./review-server.mjs";

const old = await snapshotBuild(process.argv[2]);
const current = await snapshotBuild(process.argv[3] ?? "dist");
const output = resolve(process.argv[4] ?? "/tmp/harmoniai-migration-review");
await mkdir(output, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receipts = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  let snapshot = old;
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/observer")
      return res
        .writeHead(200, { "content-type": "text/html" })
        .end("<title>Migration observer</title>");
    const path = url.pathname.slice(11) || "index.html";
    const bytes = snapshot.bodies.get(path);
    if (!bytes) return res.writeHead(404).end();
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".jpg": "image/jpeg",
      ".woff2": "font/woff2",
    };
    res
      .writeHead(200, {
        "content-type": types[extname(path)] ?? "text/plain",
        "cache-control": "no-store",
      })
      .end(bytes);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/harmoniai/`;
  const browser = await launcher.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}compare.html`);
    await page.waitForFunction(() =>
      document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
    );
    await page.locator("#compare-name").selectOption("Lydian");
    await page.locator("#compare-start").selectOption("330");
    async function save(name) {
      const pending = page.waitForEvent("download");
      await page.locator("#save-reading").click();
      const file = await pending;
      assert.equal(await file.failure(), null);
      await file.saveAs(`${output}/${engine}-${name}.html`);
      return hash(await readFile(`${output}/${engine}-${name}.html`));
    }
    const before = await save("before");
    const oldKey = await page.evaluate(async () =>
      (await caches.keys()).find((k) => k.startsWith("harmoniai-")),
    );
    snapshot = current;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(
      async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
      null,
      { timeout: 40000 },
    );
    assert.equal(await save("during"), before);
    assert(await page.evaluate(async (key) => (await caches.keys()).includes(key), oldKey));
    const mixed = await context.newPage();
    await mixed.goto(base);
    await mixed.waitForFunction(() =>
      /page and its saved edition differ/.test(
        document.querySelector("#offline-status")?.textContent ?? "",
      ),
    );
    assert(
      await mixed
        .getByRole("button", { name: "Check and repair offline copy", exact: true })
        .isDisabled(),
    );
    const observer = await context.newPage();
    await observer.goto(new URL("/observer", base).href);
    await page.close();
    await mixed.close();
    await observer.waitForFunction(async (key) => !(await caches.keys()).includes(key), oldKey, {
      timeout: 30000,
    });
    const fresh = await context.newPage();
    const response = await fresh.goto(`${base}?species=6&mese=330&selected=12`);
    assert.equal(hash(await response.body()), hash(current.bodies.get("index.html")));
    await fresh.waitForFunction(() =>
      document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
    );
    await context.setOffline(true);
    await fresh.reload();
    assert.equal(await fresh.locator("#mese").inputValue(), "330");
    receipts.push({
      engine,
      oldStudyPreserved: before,
      legacyCacheRetainedDuringUpdate: true,
      mixedDocumentRefusesReadiness: true,
      incompatibleRepairDisabled: true,
      activatedOnlyAfterOldTabsClose: true,
      newEditionOfflineReload: true,
    });
    await context.close();
    console.log(
      `${engine}: published legacy migration preserves open study, rejects mixed readiness and activates after tabs close`,
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
await writeFile(
  `${output}/review.json`,
  `${JSON.stringify({ oldFiles: old.files, currentFiles: current.files, receipts }, null, 2)}\n`,
);
