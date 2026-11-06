import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 300000,
  testDir: "tests/e2e",
  testMatch: /.*\.e2e\.test\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    baseURL: "http://localhost:5173",
  },
  projects: [
    {
      name: "smoke",
      testMatch: /(golden-path|reload-restore|career-surface)\.e2e\.test\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "soak",
      testMatch: /(full-basho-lifecycle|year-of-bashos)\.e2e\.test\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /mobile-viewport\.e2e\.test\.ts/,
      // Chromium with mobile emulation — the iPhone descriptor requires
      // the WebKit binary, which this repo doesn't install.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
