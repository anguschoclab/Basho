import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
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
          if (id.includes("/src/engine/bout/") || id.includes("/src/engine/banzuke/"))
            return "engine-bout";
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
          return "misc";
        },
      },
    },
  },
});
