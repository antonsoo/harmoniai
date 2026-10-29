import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

async function filesIn(directory: string): Promise<string[]> {
  const files = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      files.map((f) =>
        f.isDirectory()
          ? filesIn(path.join(directory, f.name))
          : Promise.resolve([path.join(directory, f.name)]),
      ),
    )
  ).flat();
}

export async function offlineBuild(
  name: string,
  pages: string[],
): Promise<{ edition: string; plugin: Plugin }> {
  const inputs = [
    ...(await filesIn("src")),
    ...(await filesIn("public")),
    ...pages,
    "scripts/offline-build.ts",
    "vite.config.ts",
    "package.json",
    "package-lock.json",
  ].sort();
  const hash = createHash("sha256");
  for (const file of inputs) {
    hash.update(file);
    hash.update(await readFile(file));
  }
  const edition = hash.digest("hex");
  const base = `/${name}/`;
  return {
    edition,
    plugin: {
      name: "complete-offline-edition",
      apply: "build",
      async closeBundle() {
        const files = (await filesIn("dist")).filter((f) => !f.endsWith("sw.js")).sort();
        const urls = files.map((f) => base + path.relative("dist", f).split(path.sep).join("/"));
        const integrity = Object.fromEntries(
          await Promise.all(
            files.map(async (f, i) => [
              urls[i],
              `sha256-${createHash("sha256")
                .update(await readFile(f))
                .digest("base64")}`,
            ]),
          ),
        );
        await writeFile(
          "dist/sw.js",
          `/* Complete edition ${edition}; generated from the build. */
const CACHE = ${JSON.stringify(`${name}-${edition}`)};
const PREFIX = ${JSON.stringify(`${name}-`)};
const EDITION = ${JSON.stringify(edition)};
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify(urls)};
const INTEGRITY = ${JSON.stringify(integrity)};
self.addEventListener("install", event => {
  const requests = FILES.map(url => new Request(url, { cache: "reload", integrity: INTEGRITY[url] }));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data?.type !== "INSPECT_EDITION" || !event.ports[0]) return;
  event.waitUntil(caches.open(CACHE).then(cache => cache.keys()).then(keys => {
    const saved = new Set(keys.map(request => new URL(request.url).pathname));
    event.ports[0].postMessage({ edition: EDITION, complete: FILES.every(file => saved.has(file)) });
  }).catch(() => event.ports[0].postMessage({ edition: EDITION, complete: false })));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  const page = url.pathname === BASE ? BASE + "index.html" : url.pathname;
  if (!FILES.includes(page)) return;
  if (event.request.mode !== "navigate") {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(page)).then(saved => saved || fetch(event.request)));
    return;
  }
  event.respondWith((async () => {
    let timer;
    // Buffer the complete HTML, since headers can arrive before a stalled body.
    const network = fetch(event.request).then(async response => {
      const body = await response.arrayBuffer();
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    });
    const outcome = await Promise.race([
      network.then(response => ({ response }), () => ({})),
      new Promise(resolve => { timer = setTimeout(() => resolve({}), 2000); })
    ]);
    clearTimeout(timer);
    if (outcome.response && outcome.response.status < 500) return outcome.response;
    // Read the exact edition cache at fallback time. An evicted page stays absent.
    const saved = await caches.open(CACHE).then(cache => cache.match(page));
    if (saved) return saved;
    if (outcome.response) return outcome.response;
    return network.catch(() => Response.error());
  })());
});
`,
        );
      },
    },
  };
}
