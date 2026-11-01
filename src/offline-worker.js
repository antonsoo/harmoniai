/** The build emits this self-contained runtime with its exact output inventory.
 * @param {import('./offline-worker').EditionConfig} config
 */
export function installEdition(config) {
  const scope = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
  const cacheName = `${config.prefix}${config.edition}`;
  const files = new Map(config.files.map((file) => [file.path, file]));
  /** @type {Map<string, Promise<Response>>} */
  const transfers = new Map();
  let repairing = false;
  /** @type {Promise<ReturnType<typeof report>> | null} */
  let repairFlight = null;
  /** @type {Promise<ReturnType<typeof report>> | null} */
  let inspection = null;

  function report(missing = 0, damaged = 0) {
    return {
      edition: config.edition,
      complete: !missing && !damaged && !repairing,
      missing,
      damaged,
      repairing,
    };
  }
  /** @param {Record<string, unknown>} message */
  async function broadcast(message) {
    const clients = await scope.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).pathname.startsWith(config.base))
        client.postMessage({ type: "OFFLINE_CHANGED", ...message, edition: config.edition });
    }
  }
  /** @param {ArrayBuffer} bytes @param {import('./offline-worker').EditionFile} file */
  async function matches(bytes, file) {
    if (bytes.byteLength !== file.bytes) return false;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("") === file.sha256;
  }
  /** Readiness checks contents, not merely the presence of a URL.
   * @param {import('./offline-worker').EditionFile} file
   */
  async function cached(file) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(file.path);
    if (!response) return { response: null, damaged: false };
    try {
      if (response.ok && (await matches(await response.clone().arrayBuffer(), file)))
        return { response, damaged: false };
    } catch {
      /* An unreadable body is not a usable offline copy. */
    }
    await cache.delete(file.path);
    return { response: null, damaged: true };
  }
  async function scan() {
    let missing = 0,
      damaged = 0;
    for (const file of config.files) {
      const item = await cached(file);
      if (item.damaged) damaged++;
      else if (!item.response) missing++;
    }
    return report(missing, damaged);
  }
  function inspect() {
    inspection ??= scan()
      .then(async (result) => {
        if (!result.complete) await broadcast(result);
        return result;
      })
      .finally(() => {
        inspection = null;
      });
    return inspection;
  }
  /** Permit active slow transfers; bound both an inactive body and the whole job.
   * @param {import('./offline-worker').EditionFile} file @param {AbortSignal} job
   */
  async function fetchChecked(file, job) {
    const controller = new AbortController();
    const signal = AbortSignal.any([job, controller.signal]);
    const timeout = setTimeout(() => controller.abort(), 180000);
    let idle = setTimeout(() => controller.abort(), 15000);
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => controller.abort(), 15000);
    };
    try {
      const response = await fetch(file.path, { cache: "no-store", signal });
      if (!response.ok || !response.body) throw new Error("The edition file is unavailable.");
      touch();
      const reader = response.body.getReader();
      /** @type {Uint8Array<ArrayBufferLike>[]} */
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        touch();
        size += value.byteLength;
        if (size > file.bytes) {
          controller.abort();
          throw new Error("Unexpected edition file length.");
        }
        chunks.push(value);
      }
      signal.throwIfAborted();
      const bytes = new Uint8Array(size);
      let at = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, at);
        at += chunk.length;
      }
      if (!(await matches(bytes.buffer, file)))
        throw new Error("The file differs from this edition.");
      const headers = new Headers(response.headers);
      // Fetch already decoded the body; cached Response headers must describe it.
      for (const key of ["content-encoding", "content-length", "transfer-encoding"])
        headers.delete(key);
      const verified = new Response(bytes, { status: 200, headers });
      await (await caches.open(cacheName)).put(file.path, verified.clone());
      return verified;
    } finally {
      clearTimeout(timeout);
      clearTimeout(idle);
    }
  }
  /** Foreground readers and the offline installer share one transfer per file.
   * @param {import('./offline-worker').EditionFile} file @param {AbortSignal} signal
   */
  function retrieve(file, signal) {
    let transfer = transfers.get(file.path);
    if (!transfer) {
      transfer = fetchChecked(file, signal).finally(() => {
        transfers.delete(file.path);
      });
      transfers.set(file.path, transfer);
    }
    return transfer.then((response) => response.clone());
  }
  function saveAll() {
    if (repairFlight) return repairFlight;
    repairing = true;
    repairFlight = (async () => {
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 240000);
      let next = 0,
        done = 0;
      await broadcast({ complete: false, repairing: true, done, total: config.files.length });
      try {
        const runners = Array.from({ length: 3 }, async () => {
          while (next < config.files.length && !controller.signal.aborted) {
            const file = config.files[next++];
            if (!file) break;
            const saved = await cached(file);
            if (!saved.response) {
              try {
                await retrieve(file, controller.signal);
              } catch {
                /* Keep verified files; a retry only needs the failed ones. */
              }
            }
            done++;
            if (done % 4 === 0)
              await broadcast({
                complete: false,
                repairing: true,
                done,
                total: config.files.length,
              });
          }
        });
        await Promise.all(runners);
      } finally {
        clearTimeout(deadline);
        repairing = false;
      }
      // A scan started during repair cannot be the final readiness receipt.
      if (inspection) await inspection;
      const result = await scan();
      await broadcast(result);
      return result;
    })().finally(() => {
      repairFlight = null;
    });
    return repairFlight;
  }

  scope.addEventListener("install", (event) => {
    event.waitUntil(
      saveAll().then((result) => {
        if (!result.complete) throw new Error("This edition is not completely saved.");
        // No skipWaiting: an update must not evict the edition open learners use.
      }),
    );
  });
  scope.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        // Natural activation happens once the previous edition has no clients.
        for (const key of await caches.keys())
          if (key.startsWith(config.prefix) && key !== cacheName) await caches.delete(key);
        await scope.clients.claim();
        await broadcast(await inspect());
      })(),
    );
  });
  scope.addEventListener("message", (event) => {
    const port = event.ports[0];
    if (!port || !["INSPECT_EDITION", "REPAIR_EDITION"].includes(event.data?.type)) return;
    event.waitUntil(
      (async () => {
        if (event.data.edition && event.data.edition !== config.edition) {
          port.postMessage({ ...report(1), reason: "edition" });
          return;
        }
        const result = event.data.type === "REPAIR_EDITION" ? await saveAll() : await inspect();
        port.postMessage(result);
      })().catch(() => port.postMessage({ ...report(1), reason: "unavailable" })),
    );
  });
  /** @param {Request} request @param {import('./offline-worker').EditionFile} file */
  async function serve(request, file) {
    const item = await cached(file);
    if (item.response) return item.response;
    await broadcast({
      complete: false,
      missing: 1,
      damaged: Number(item.damaged),
      repairing: false,
    });
    try {
      const response = await retrieve(file, AbortSignal.timeout(180000));
      // Also restore any files the browser evicted beside this one.
      void saveAll().catch(() => {});
      return response;
    } catch {
      const message =
        request.mode === "navigate"
          ? "This saved edition is incomplete. Reconnect and reload. If an update is waiting, close all Harmoniai tabs and reopen."
          : "This file is not available in the saved edition.";
      return new Response(message, {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }
  scope.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== "GET" || url.origin !== scope.location.origin) return;
    const path = url.pathname === config.base ? `${config.base}index.html` : url.pathname;
    const file = files.get(path);
    if (!file) return;
    // Keep a coherent edition in all open tabs, even when the origin has newer HTML.
    const response = serve(event.request, file);
    event.respondWith(response);
    event.waitUntil(
      response
        .then(() => repairFlight)
        .then(() => {})
        .catch(() => {}),
    );
  });
}
