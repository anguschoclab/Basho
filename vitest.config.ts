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
      "src/tests/slow/**",
    ],
    testTimeout: 30000,
    // Flag individual tests slower than this in run output — early warning
    // for tests creeping toward the slow-suite threshold (see
    // docs/test-suite-optimization-plan.md).
    slowTestThreshold: 2000,
    // Parallel files are safe in the fast suite: the only fs writers
    // (scripts/bench-pipelines, scripts/perf-gate-check) use unique tmpdir()
    // paths. The slow suite stays serial — orphan-audit writes fixtures into
    // src/ while knip/madge scan it.
    fileParallelism: true,
    // Persist transformed modules across runs (content-hash keyed) — skips
    // ~60s of CPU transform work on repeat runs. Vitest always re-executes
    // tests; this only caches transforms, so it cannot produce stale results.
    fsModuleCache: true,
    // vmThreads reuses the jsdom environment per worker (per-file isolation
    // is preserved via vm contexts) — ~5x faster suite-wide than the default
    // threads pool, which recreates jsdom for every one of ~870 files.
    // Note: globalThis.window is a non-configurable getter under vm
    // contexts — tests must not redefine the window global itself.
    pool: "vmThreads",
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
        "src/components/**/*.{ts,tsx}",
        "src/contexts/**/*.{ts,tsx}",
        "src/store/**/*.ts",
        "src/hooks/**/*.{ts,tsx}",
        "src/lib/**/*.ts",
        "src/utils/**/*.ts",
        "src/pages/**/*.tsx",
        "src/constants/**/*.ts",
      ],
      exclude: [
        "src/tests/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "e2e/**",
        ".claude/**",
        "**/*.e2e.test.ts",
      ],
      // Re-baselined 2026-10 after coverage.include was widened to .tsx +
      // constants (v10-R06). Measured on 8,700-test green run: lines 74.0,
      // branches 61.96, functions 64.84, statements 75.91. Floors are ~1pt
      // under measured — a ratchet: raise as UI coverage lands, never lower.
      thresholds: {
        lines: 73,
        branches: 61,
        functions: 64,
        statements: 75,
      },
    },
  },
});
