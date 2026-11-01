import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

/** Freeze the build before browser work: later rebuilds cannot mix two editions. */
export async function snapshotBuild(directory = "dist") {
  const root = resolve(directory);
  const bodies = new Map();
  async function visit(relative = "") {
    for (const item of await readdir(join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${item.name}` : item.name;
      if (item.isDirectory()) await visit(name);
      else bodies.set(name, await readFile(join(root, name)));
    }
  }
  await visit();
  const files = [...bodies]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, bytes]) => ({
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    }));
  return { bodies, files };
}

export async function serveSnapshot(snapshot) {
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".json": "application/json",
    ".txt": "text/plain",
  };
  const server = createServer((req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const relative = path.startsWith("/harmoniai/") ? path.slice(11) || "index.html" : "";
      const bytes = snapshot.bodies.get(relative);
      if (!bytes) {
        res.writeHead(404).end("Unknown file");
        return;
      }
      res
        .writeHead(200, {
          "content-type": types[extname(relative)] ?? "application/octet-stream",
          "cache-control": "no-store",
        })
        .end(bytes);
    } catch {
      res.writeHead(400).end("Invalid path");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/harmoniai/`;
  return {
    server,
    base,
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
