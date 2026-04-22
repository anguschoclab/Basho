import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // PWA plugin removed - not needed for Electron desktop app
    // Use electron.vite.config.ts for Electron-specific configuration
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
