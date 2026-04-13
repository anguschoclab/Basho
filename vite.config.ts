import { defineConfig, configDefaults } from "vitest/config";
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
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/**", "**/*.e2e.test.ts"],
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
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
        lines: 80,
        branches: 70,
      },
    },
  },
});
