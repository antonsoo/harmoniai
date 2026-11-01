import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";
import { snapshotBuild } from "./review-server.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const name = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")).name;
const output = resolve(process.argv[2] ?? `docs/review/offline.json`);
const destination = name === "embater" ? "world.html" : "vina.html";
const entry = name === "embater" ? "compare.html" : "index.html";
const snapshot = await snapshotBuild(resolve(root, "dist"));
let mode = "normal";
const assets = await readdir(resolve(root, "dist/assets"));
const nonEntry = assets.find(
  (f) => f.startsWith(name === "embater" ? "world-" : "vina-") && f.endsWith(".js"),
);
assert.ok(nonEntry);
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = decodeURIComponent(url.pathname).replace(`/${name}/`, "");
  if (!file) file = "index.html";
  if (file.includes("..")) {
    res.writeHead(400).end();
    return;
  }
  if (file === destination && ["503", "404"].includes(mode)) {
    res.writeHead(Number(mode), { "Content-Type": "text/html" }).end(`<h1>HTTP ${mode}</h1>`);
    return;
  }
  try {
    const bytes = snapshot.bodies.get(file);
    if (!bytes) throw new Error("Missing");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    if (mode === "corrupt" && file === `assets/${nonEntry}`) {
      res.end("/* wrong edition */");
      return;
    }
    if (mode === "body-stall" && file === destination) {
      res.write(bytes.subarray(0, 30));
      setTimeout(() => res.end(bytes.subarray(30)), 4000);
      return;
    }
    res.end(bytes);
  } catch {
    res.writeHead(404).end("Missing");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/${name}/`;
const receipts = [];
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    const browser = await launcher.launch();
    try {
      mode = "normal";
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(base + entry);
      await page.waitForFunction(
        () => document.getElementById("offline-status")?.textContent.startsWith("Ready offline"),
        null,
        { timeout: 25000 },
      );
      mode = "503";
      let response = await page.goto(base + destination);
      assert.equal(response.status(), 200);
      await page.locator("main h1").waitFor();
      mode = "404";
      response = await page.goto(base + destination);
      assert.equal(response.status(), 200);
      await page.locator("main h1").waitFor();
      response = await page.goto(base + "not-in-this-edition.html");
      assert.equal(response.status(), 404);
      assert.equal(await page.locator("body").textContent(), "Missing");
      mode = "normal";
      await page.goto(base + entry);
      mode = "body-stall";
      const t = Date.now();
      response = await page.goto(base + destination);
      const elapsed = Date.now() - t;
      assert.equal(response.status(), 200);
      assert.ok(elapsed < 3500, `stalled body took ${elapsed}ms`);
      await page.locator("main h1").waitFor();
      mode = "normal";
      await page.goto(base + entry);
      const removed = await page.evaluate(
        async ({ name, destination }) => {
          const key = (await caches.keys()).find((k) => k.startsWith(`${name}-`));
          return (await caches.open(key)).delete(`/${name}/${destination}`);
        },
        { name, destination },
      );
      assert.equal(removed, true);
      mode = "503";
      response = await page.goto(base + destination);
      assert.equal(response.status(), 503);
      assert.match(await page.locator("body").textContent(), /saved edition is incomplete/);
      mode = "normal";
      await page.goto(base + entry);
      await page.waitForFunction(() =>
        document.getElementById("offline-status")?.textContent.includes("incomplete or damaged"),
      );
      await page
        .getByRole("button", { name: "Check and repair offline copy", exact: true })
        .click();
      await page.waitForFunction(() =>
        document.getElementById("offline-status")?.textContent.startsWith("Ready offline"),
      );
      await context.close();
      mode = "corrupt";
      const broken = await browser.newContext();
      const bp = await broken.newPage();
      await bp.goto(base + entry);
      await bp.waitForFunction(
        () =>
          /did not finish|unavailable/.test(
            document.getElementById("offline-status")?.textContent ?? "",
          ),
        null,
        { timeout: 16000 },
      );
      assert.equal(await bp.evaluate(() => !!navigator.serviceWorker.controller), false);
      const badStatus = await bp.locator("#offline-status").textContent();
      await broken.close();
      receipts.push({
        engine,
        cached503: true,
        knownPageRemainsCoherentDespiteOrigin404: true,
        unlisted404Preserved: true,
        partialBodyFallbackMs: elapsed,
        evictedPage503ThenExplicitlyRepaired: true,
        missingFileReadiness: false,
        corruptInstallActivated: false,
        badStatus,
      });
      console.log(engine, "503, 404, stalled body, eviction and corrupt-install cases verified");
    } finally {
      await browser.close();
    }
  }
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify({ project: name, receipts }, null, 2)}\n`);
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
