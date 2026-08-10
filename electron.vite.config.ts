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
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("/react/") ||
                id.includes("/react-dom/") ||
                id.includes("/react-is/") ||
                id.includes("/scheduler/")
              )
                return "vendor-react";
              if (id.includes("@tanstack/react-router")) return "vendor-router";
              if (id.includes("recharts") || id.includes("react-smooth") || id.includes("victory"))
                return "vendor-recharts";
              if (id.includes("framer-motion")) return "vendor-framer";
              if (id.includes("lucide-react")) return "vendor-lucide";
              if (id.includes("@radix-ui")) return "vendor-radix";
              return;
            }
            if (id.includes("/src/engine/tick/")) return "engine-tick";
            if (id.includes("/src/engine/systems/")) return "engine-systems";
            if (id.includes("/src/engine/bout/boutNarrative")) return "engine-bout-narrative";
            if (id.includes("/src/engine/bout/physics/")) return "engine-bout-physics";
            if (
              id.includes("/src/engine/bout/boutResolver") ||
              id.includes("/src/engine/bout/boutPhysics") ||
              id.includes("/src/engine/bout/boutPhaseLoop") ||
              id.includes("/src/engine/bout/boutSpatial") ||
              id.includes("/src/engine/bout/boutGrip") ||
              id.includes("/src/engine/bout/BoutAI") ||
              id.includes("/src/engine/bout/tacticProfiles")
            )
              return "engine-bout-core";
            if (id.includes("/src/engine/bout/") || id.includes("/src/engine/banzuke/"))
              return "engine-bout-support";
            if (id.includes("/src/engine/npcAI/") || id.includes("/src/engine/ai/"))
              return "engine-npc";
            if (id.includes("/src/engine/bard/") || id.includes("/src/engine/narrative"))
              return "engine-narrative";
            if (id.includes("/src/engine/")) return "engine-core";
            if (id.includes("/src/contexts/")) return "game-state";
            if (id.includes("/src/components/ui/") || id.includes("/src/components/avatar/"))
              return "ui-primitives";
            if (id.includes("/src/components/game/")) return "ui-game";
            if (id.includes("/src/components/dashboard/") || id.includes("/src/components/layout/"))
              return "ui-layout";
            if (id.includes("/src/components/")) return "ui-features";
            if (id.includes("/src/presenters/")) return "presenters";
            if (id.includes("/src/store/")) return "store";
            if (id.includes("/src/utils/")) return "utils";
            if (id.includes("/src/constants/")) return "constants";
            if (id.includes("/src/pages/")) {
              const match = id.match(/\/src\/pages\/([^/]+)\./);
              if (match) return `page-${match[1]}`;
            }
            return "misc";
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
