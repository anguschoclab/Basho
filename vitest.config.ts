import { defineConfig, configDefaults } from "vitest/config";

import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup/setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/**", "**/*.e2e.test.ts"],
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "lcov"],
      include: [
        "src/engine/**/*.ts",
        "src/presenters/**/*.ts",
        "src/components/**/*.ts",
        "src/contexts/**/*.ts",
      ],
      exclude: [
        "src/engine/**/__tests__/**",
        "src/engine/**/*.test.ts",
        "src/components/**/__tests__/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
      ],
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
        statements: 85,
      },
    },
  },
});