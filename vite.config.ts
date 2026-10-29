import { defineConfig } from "vite";

export default defineConfig({
  base: "/harmoniai/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        vina: "vina.html",
      },
    },
  },
});
