/* Complete edition 1a0557fdd3b335add753109e8d6b35c07cb0db00ae636b53ec32c7a2d7b3beb8; generated from the build. */
/** The build emits this self-contained runtime with its exact output inventory.
 * @param {import('./offline-worker').EditionConfig} config
 */
function installEdition(config) {
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

installEdition({"edition":"1a0557fdd3b335add753109e8d6b35c07cb0db00ae636b53ec32c7a2d7b3beb8","base":"/harmoniai/","prefix":"harmoniai-","files":[{"path":"/harmoniai/FONT-LICENSE.txt","bytes":14204,"sha256":"21675d953c0ac998c715f200b106198ec59952b6a05d06988c72524020be1c86"},{"path":"/harmoniai/LICENSE.txt","bytes":4655,"sha256":"5cf6bbfcc5bb6d102fc82c4ee16aece1666b246847761514a49561db110f3d92"},{"path":"/harmoniai/THIRD_PARTY_NOTICES.txt","bytes":2621,"sha256":"cd5656b07c8ac8c1261890519e4e46e54f36db8e36e96f5a296530c735b2b85c"},{"path":"/harmoniai/assets/compare-BANDchVa.js","bytes":13941,"sha256":"66b43a2df2c812360ac0f6ae89dd1ba979d18a0acf4ad1ff04d115fc1553dc87"},{"path":"/harmoniai/assets/compare-DOHZ2WPn.css","bytes":3323,"sha256":"92e7b237905287fd3792c02d2d7d57b42c5bf209d9f2c6af58e3f7c63422e845"},{"path":"/harmoniai/assets/comparison-view-xywIRjIx.js","bytes":16819,"sha256":"5fbd96977e211d6847ba01dfe3e88b21190d0721b43b7bb6fd26ec374024dab7"},{"path":"/harmoniai/assets/gentium-book-plus-400-greek-CLs1HoaC.woff2","bytes":18168,"sha256":"cba273ba7a0fbe810e3531f5cc62fd4e963da7c5d32b4981c3f30fe562aea343"},{"path":"/harmoniai/assets/gentium-book-plus-400-greek-ext-DWWGNQKb.woff2","bytes":9356,"sha256":"f4cbbee8404f7275cdece60d170d787d693df853452ef43a7b504d73eca2d658"},{"path":"/harmoniai/assets/gentium-book-plus-400-latin-CN5vb1Vx.woff2","bytes":21564,"sha256":"dd5d2902dac9c11d3acc42b0e54a74b4f2db9bd4a7d6872c23338f70df29ca7e"},{"path":"/harmoniai/assets/gentium-book-plus-400-latin-ext-BiRsxpCX.woff2","bytes":57824,"sha256":"46b8923c77eceb874e1b6a28ce08d56293641382ea0382f7043139bfff8f2383"},{"path":"/harmoniai/assets/gentium-book-plus-700-greek-D13hw162.woff2","bytes":18520,"sha256":"724dc67b98be2894401d21df2b8bf578d78187ca3f90f60ec95861e7059d441a"},{"path":"/harmoniai/assets/gentium-book-plus-700-greek-ext-BE1cELiy.woff2","bytes":9376,"sha256":"d104ae417e075f91963b872de09eb31123ca0b96900f6b66e7e71344d9336d4b"},{"path":"/harmoniai/assets/gentium-book-plus-700-latin-BymqVBkR.woff2","bytes":21536,"sha256":"b151cf211e3c03b3eac0ef3a4e94c44aa67096f9e7148cabfb9e9f8a0017eb33"},{"path":"/harmoniai/assets/gentium-book-plus-700-latin-ext-D1SMMCt_.woff2","bytes":57264,"sha256":"001e63c267c9884f95d7783bf1674eae74799d269240e13139a6b4cdf9f2924d"},{"path":"/harmoniai/assets/gentium-book-plus-italic-greek-BfV1x5aq.woff2","bytes":18168,"sha256":"da8564415fbeac7e39ae174810f3fe5139373b9624b6f7008c0315737afe9614"},{"path":"/harmoniai/assets/gentium-book-plus-italic-greek-ext-cZLoWG0Y.woff2","bytes":9416,"sha256":"fd831d285c3d0da6891a7ec460d4a9b05791cda2cf91beae0d1362b9029a6c32"},{"path":"/harmoniai/assets/gentium-book-plus-italic-latin-c-m4ooFh.woff2","bytes":24588,"sha256":"daa214002d1aa0ce6fbe72c495542a2d321b51172565e2e9508a3b5e064fcf6c"},{"path":"/harmoniai/assets/gentium-book-plus-italic-latin-ext-SxHammME.woff2","bytes":65080,"sha256":"eddfadc54270eb9bee9ca8a1c879e9352748a38c1ecf46513b03bf16b377f532"},{"path":"/harmoniai/assets/gfs-neohellenic-greek-DLuqQA6u.woff2","bytes":10716,"sha256":"d489ded5ec6c74f9ec76437364fd28a50d885cbbeab68fbc6983abba2333b939"},{"path":"/harmoniai/assets/gfs-neohellenic-greek-ext-DZAcqUeX.woff2","bytes":17016,"sha256":"1708e72d62d20026235d6a0ad03154a8376e9bee0227d0a1ed1a522ced327766"},{"path":"/harmoniai/assets/gfs-neohellenic-latin-CdUOFP9L.woff2","bytes":24168,"sha256":"0900be9bc421a3c769457c0596609a49755be366cec54b8e6492e3a7a47c756f"},{"path":"/harmoniai/assets/index-HRi2EQVR.js","bytes":45100,"sha256":"8aed2bfed2c11ed97c5769d6f9e26eb7af8154229d48ed9479262e0424e6fd00"},{"path":"/harmoniai/assets/pluck-UldrU2rP.js","bytes":3168,"sha256":"88d197f9bba7932286910eb09012c729832737ed2694136862327bb5c0d1a2b7"},{"path":"/harmoniai/assets/shell-C313PPp2.css","bytes":19112,"sha256":"9a90115463eca26e085d2925ca681ac3a9c59d3d271a1218ba4d0ad2960b3076"},{"path":"/harmoniai/assets/shell-_RhfJDqM.js","bytes":14221,"sha256":"6e8e9040d9f2a40f5552f74c7104703357010043ff39ea0b3539c38c360d1d83"},{"path":"/harmoniai/assets/tiro-devanagari-sanskrit-400-devanagari-Djl2bf-7.woff2","bytes":183900,"sha256":"b1c4699168ebfeb6c92fadfcdd379ded22eb94de9537234a2ef0f93e12cd9d69"},{"path":"/harmoniai/assets/vina-4KTR-Ojh.js","bytes":33888,"sha256":"b6a0c68ec96add8fd7f54e8f94a673007c85369fd1a89f5e7f731fb87cca6efa"},{"path":"/harmoniai/compare.html","bytes":1359,"sha256":"c1f0007c291b15d71515eaddcb61e0723d2dece2d5993606a1ca443af62d15ef"},{"path":"/harmoniai/favicon.svg","bytes":327,"sha256":"677e97172eaee779a5e9780bb5616f6941e025d44ad4353426ee6c5f30c486c4"},{"path":"/harmoniai/fonts/gentium-book-plus-LICENSE.txt","bytes":4574,"sha256":"92ec730eb44ab2b0a1d16651d019cebe7107db39ab487933030fcd2fb96b409a"},{"path":"/harmoniai/index.html","bytes":1388,"sha256":"77fec8fd5b0b8e5ef8c12cf6e377e81ff84b232044b645daa5daae5b3c49fb6a"},{"path":"/harmoniai/sources/jan-1895-p197.jpg","bytes":824025,"sha256":"fa0b41c521fad3a0bacdc811bade71b3a2922cbc947e46e411656d7c3a5ece17"},{"path":"/harmoniai/sources/jan-1895-p198.jpg","bytes":845651,"sha256":"e07ac24e749ae55c35a67573e2a1e873be467ca4f27fde6ee2cb80f35e29082e"},{"path":"/harmoniai/sources/jan-1895-p199.jpg","bytes":798067,"sha256":"8660edda63de3ed5b557a95367d8ba2b7d62edb13e1868f27d24dd08c6f97724"},{"path":"/harmoniai/sources/manifest.json","bytes":1004,"sha256":"ed467724f0d9673e8abd0f7214ee9a8f02ccad0db94fc0f88017d9e06b060d6e"},{"path":"/harmoniai/vina.html","bytes":1415,"sha256":"e4d8cb2c27929c5e2595c8687a3ebf824d23ea9a12a6e60659cfa1575f5a5ba1"}]});
