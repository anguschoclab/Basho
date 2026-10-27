import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/setup.ts"],
    include: ["tests/perf/**"],
    exclude: [...configDefaults.exclude, "tests/e2e/**", ".claude/**", "**/*.e2e.test.ts"],
    testTimeout: 300000,
    pool: "vmThreads",
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
  },
});
