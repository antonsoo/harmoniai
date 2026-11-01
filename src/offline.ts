declare const __OFFLINE_EDITION__: string;

interface EditionReport {
  edition: string;
  complete: boolean;
  repairing?: boolean;
  missing?: number;
  damaged?: number;
  done?: number;
  total?: number;
  reason?: string;
}

/** A saved edition is a verified collection, not a collection of filenames. */
export function setupOffline(): void {
  const status = document.querySelector<HTMLElement>("#offline-status");
  if (!status || !import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const host = status.parentElement;
  if (!host) return;
  const actions = document.createElement("div");
  actions.className = "offline-actions";
  const repair = document.createElement("button");
  repair.type = "button";
  repair.disabled = true;
  repair.textContent = "Check and repair offline copy";
  const update = document.createElement("p");
  update.id = "offline-update";
  update.className = "muted";
  update.hidden = true;
  actions.append(repair, update);
  host.append(actions);
  let generation = 0;
  let checking = false;
  let registration: ServiceWorkerRegistration | null = null;
  let repairing = false;
  let installedFailure = false;
  let compatible = true;
  let progressSeen = false;
  status.dataset.edition = __OFFLINE_EDITION__;

  function noticeUpdate(): void {
    if (!registration) return;
    update.hidden = !registration.waiting;
    if (registration.waiting)
      update.textContent =
        "An updated edition is ready. Save your work, close all Harmoniai tabs, then reopen. This tab keeps its current edition.";
  }
  function render(report: EditionReport): void {
    if (!status) return;
    compatible = report.edition === __OFFLINE_EDITION__;
    repair.disabled =
      !compatible ||
      repairing ||
      !!report.repairing ||
      (!navigator.serviceWorker.controller && !!registration?.installing);
    if (!compatible) {
      status.textContent =
        "This page and its saved edition differ. Keep your downloads or copy your settings link, close all Harmoniai tabs, then reopen online.";
    } else if (report.repairing) {
      progressSeen = true;
      status.textContent = report.total
        ? `Saving a verified offline copy: ${report.done ?? 0} of ${report.total} files checked. Keep this tab open.`
        : "Saving a verified offline copy. Keep this tab open.";
    } else if (report.complete && !navigator.serviceWorker.controller) {
      repair.disabled = true;
      status.textContent = "Files verified. Waiting for this edition to take control…";
    } else if (report.complete) {
      status.textContent =
        "Ready offline: pages, diagrams, sources and fonts verified. External source links need a connection.";
    } else {
      status.textContent =
        "The offline copy is incomplete or damaged. Reconnect and choose Check and repair offline copy. Your open work is still here.";
    }
    noticeUpdate();
  }
  function request(worker: ServiceWorker, type: string, timeout: number): Promise<EditionReport> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("The saved edition did not answer. Keep your files, then retry online."));
      }, timeout);
      channel.port1.onmessage = (event: MessageEvent<EditionReport>) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      try {
        worker.postMessage({ type, edition: __OFFLINE_EDITION__ }, [channel.port2]);
      } catch (error) {
        clearTimeout(timer);
        channel.port1.close();
        reject(error);
      }
    });
  }
  async function inspect(): Promise<void> {
    const worker = navigator.serviceWorker.controller;
    if (!worker || checking || repairing) return;
    checking = true;
    const ticket = ++generation;
    try {
      const result = await request(worker, "INSPECT_EDITION", 12000);
      if (ticket === generation && worker === navigator.serviceWorker.controller) render(result);
    } catch {
      if (ticket === generation && status)
        status.textContent =
          "The offline copy could not be verified. Keep your files, then check it again online.";
    } finally {
      checking = false;
    }
  }
  repair.addEventListener("click", async () => {
    if (!compatible) return;
    const worker = navigator.serviceWorker.controller;
    const ticket = ++generation;
    repair.disabled = true;
    repairing = true;
    status.textContent = "Checking and repairing the saved edition…";
    try {
      if (worker) {
        void registration?.update().catch(() => {});
        const result = await request(worker, "REPAIR_EDITION", 250000);
        if (ticket === generation && worker === navigator.serviceWorker.controller) render(result);
      } else if (registration) {
        installedFailure = false;
        await registerEdition();
        status.textContent = "Saving the edition. Keep this tab open until every file is verified.";
      } else {
        status.textContent = "Offline saving is unavailable. Keep your files, then reload online.";
      }
    } catch (error) {
      if (ticket === generation)
        status.textContent =
          error instanceof Error
            ? error.message
            : "The offline copy could not be repaired. Retry online.";
    } finally {
      repairing = false;
      repair.disabled =
        !compatible || (!navigator.serviceWorker.controller && !!registration?.installing);
      noticeUpdate();
    }
  });
  navigator.serviceWorker.addEventListener(
    "message",
    (event: MessageEvent<EditionReport & { type?: string }>) => {
      const controller = navigator.serviceWorker.controller;
      const firstInstall = !controller && event.source === registration?.installing;
      if ((!firstInstall && event.source !== controller) || event.data.type !== "OFFLINE_CHANGED")
        return;
      // Progress and damage must invalidate a previously ready claim immediately.
      if (event.data.edition === __OFFLINE_EDITION__) {
        generation++;
        render(event.data);
      } else void inspect();
    },
  );
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    generation++;
    status.textContent = "Checking the saved edition…";
    void inspect();
  });
  window.addEventListener("pageshow", () => void inspect());
  window.addEventListener("focus", () => void inspect());
  window.addEventListener("online", () => void inspect());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void inspect();
  });
  setInterval(() => {
    if (!document.hidden) void inspect();
  }, 20000);
  status.textContent = "Saving these pages for offline reading…";
  // Slow progress is not an installation failure. The worker reports real failure.
  setTimeout(() => {
    if (!navigator.serviceWorker.controller && !installedFailure && !progressSeen)
      status.textContent =
        "The offline download is still running. Keep this tab open while its files are verified.";
  }, 12000);
  const watchedWorkers = new WeakSet<ServiceWorker>();
  const watchedRegistrations = new WeakSet<ServiceWorkerRegistration>();
  function watch(worker: ServiceWorker | null): void {
    if (!worker || watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    worker.addEventListener("statechange", () => {
      if (!status) return;
      noticeUpdate();
      if (worker.state === "redundant") {
        installedFailure = true;
        if (!navigator.serviceWorker.controller) {
          repair.disabled = false;
          status.textContent =
            "The offline download did not finish. Reconnect and choose Check and repair offline copy.";
        }
      }
      if (worker.state === "activated") void inspect();
    });
  }
  async function registerEdition(): Promise<void> {
    // A failed first install can remove its registration. update() on that old
    // object cannot retry it; register again and observe the new worker instead.
    const value = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      updateViaCache: "none",
    });
    registration = value;
    watch(value.installing);
    if (!watchedRegistrations.has(value)) {
      watchedRegistrations.add(value);
      value.addEventListener("updatefound", () => watch(value.installing));
    }
    repair.disabled =
      !compatible || repairing || (!navigator.serviceWorker.controller && !!value.installing);
    noticeUpdate();
    void inspect();
  }
  void registerEdition().catch(() => {
    repair.disabled = false;
    if (!navigator.serviceWorker.controller)
      status.textContent = "Offline saving is unavailable. Keep your files, then reload online.";
  });
  void inspect();
}
