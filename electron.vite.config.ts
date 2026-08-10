import { fileURLToPath, URL } from "node:url";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// VitePWA intentionally excluded — service workers are not used in Electron

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: fileURLToPath(new URL("electron/main.ts", import.meta.url)),
        fileName: () => "index.js",
        formats: ["cjs"],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: fileURLToPath(new URL("electron/preload.ts", import.meta.url)),
        fileName: () => "index.js",
        formats: ["es"],
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss()],
    worker: {
      format: "es",
    },
    build: {
      rollupOptions: {
        input: fileURLToPath(new URL("index.html", import.meta.url)),
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
