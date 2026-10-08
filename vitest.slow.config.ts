import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup/setup.ts"],
    include: ["src/tests/slow/**"],
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/**", "**/*.e2e.test.ts"],
    testTimeout: 300000,
    fileParallelism: false,
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
  },
});
