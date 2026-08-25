import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup/setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      ".claude/**",
      "**/*.e2e.test.ts",
      "src/tests/perf/**",
    ],
    testTimeout: 30000,
    fileParallelism: false,
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/engine/**/*.ts",
        "src/presenters/**/*.ts",
        "src/components/**/*.ts",
        "src/contexts/**/*.ts",
        "src/store/**/*.ts",
        "src/hooks/**/*.ts",
        "src/lib/**/*.ts",
        "src/utils/**/*.ts",
      ],
      exclude: [
        "src/tests/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "e2e/**",
        ".claude/**",
        "**/*.e2e.test.ts",
      ],
      thresholds: {
        lines: 70,
        branches: 75,
        functions: 65,
        statements: 70,
      },
    },
  },
});
