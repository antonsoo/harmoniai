declare const __OFFLINE_EDITION__: string;

/** Readiness means this page's controlling worker has the whole edition. */
export function setupOffline(): void {
  const status = document.querySelector<HTMLElement>("#offline-status");
  if (!status || !import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let generation = 0;
  const initialDeadline = setTimeout(() => {
    if (!navigator.serviceWorker.controller)
      status.textContent = "Offline saving did not finish. Reload online to try again.";
  }, 12000);
  async function inspect(): Promise<void> {
    const worker = navigator.serviceWorker.controller;
    if (!worker || !status) return;
    clearTimeout(initialDeadline);
    const request = ++generation;
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      if (request === generation)
        status.textContent = "Offline saving could not be checked. Keep this tab open.";
    }, 8000);
    channel.port1.onmessage = (event: MessageEvent<{ edition?: string; complete?: boolean }>) => {
      clearTimeout(timer);
      channel.port1.close();
      if (request !== generation || navigator.serviceWorker.controller !== worker) return;
      status.textContent =
        event.data.edition === __OFFLINE_EDITION__ && event.data.complete === true
          ? "Ready offline: pages, diagrams and fonts saved. External source links need a connection."
          : "This edition is not fully saved. Reload online to try again.";
    };
    worker.postMessage({ type: "INSPECT_EDITION" }, [channel.port2]);
  }
  status.textContent = "Saving these pages for offline reading…";
  navigator.serviceWorker.addEventListener("controllerchange", () => void inspect());
  window.addEventListener("pageshow", () => void inspect());
  void inspect();
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registration) => {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "redundant" && status && !navigator.serviceWorker.controller)
            status.textContent = "Offline saving did not finish. Reload online to try again.";
        });
      });
      void inspect();
    })
    .catch(() => {
      if (status && !navigator.serviceWorker.controller)
        status.textContent = "Offline saving is unavailable. Keep this tab open.";
    });
}
