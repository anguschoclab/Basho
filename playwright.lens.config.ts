import { defineConfig, devices } from "@playwright/test";

/** Throwaway config to run the Lens chart spec outside the smoke/soak testMatch. */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /lens-charts\.e2e\.test\.ts/,
  timeout: 300000,
  use: { baseURL: "http://localhost:5173" },
  projects: [{ name: "lens", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
