import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react-swc";
// VitePWA intentionally excluded — service workers are not used in Electron

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/main.ts"),
        fileName: () => "index.js",
        formats: ["cjs"],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/preload.ts"),
        fileName: () => "index.js",
        formats: ["es"],
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  },
});
