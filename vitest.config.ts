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
    setupFiles: ["./src/tests/setup/setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/**", "**/*.e2e.test.ts"],
    testTimeout: 30000,
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