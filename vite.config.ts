import { defineConfig } from "vite";
import { offlineBuild } from "./scripts/offline-build";

export default defineConfig(async () => {
  const offline = await offlineBuild("harmoniai", ["index.html", "vina.html"]);
  return {
    base: "/harmoniai/",
    define: { __OFFLINE_EDITION__: JSON.stringify(offline.edition) },
    plugins: [offline.plugin],
    build: { rollupOptions: { input: ["index.html", "vina.html"] } },
  };
});
