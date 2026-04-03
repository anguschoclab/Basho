import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**"],
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
  },
});
