/**
 * Standalone Playwright calibration script for kimarite animation variants.
 * Run with: bunx playwright test e2e/bout-calibration.ts --headed
 *
 * Drives the app to a basho, simulates bouts of each family, and takes
 * screenshots for visual calibration of animation.ts constants.
 */
import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const OUT_DIR = path.join(process.cwd(), "e2e/calibration-screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 800 });

  // Navigate to app
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

  // Wait for main menu
  await page.waitForSelector("h1", { timeout: 30000 });
  const h1 = await page.locator("h1").first().textContent();
  console.log("Loaded:", h1);
  await page.screenshot({ path: path.join(OUT_DIR, "01-main-menu.png") });

  // Select first stable
  const firstStable = page.locator(".cursor-pointer").first();
  await firstStable.click().catch(() => {});

  // Click begin/inaugurate
  const beginBtn = page.getByRole("button", { name: /Inaugurat|Begin|Start/i });
  if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await beginBtn.click({ force: true });
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, "02-post-start.png") });

  // Navigate to Basho
  const bashoLink = page.getByRole("link", { name: /Current Basho|Basho/i }).first();
  if (await bashoLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await bashoLink.click();
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "03-basho-page.png") });

  // Advance days if needed to get into active basho
  let limit = 20;
  while (limit-- > 0) {
    const simAll = page.getByRole("button", { name: /Sim All/i });
    if (await simAll.isVisible({ timeout: 1000 }).catch(() => false)) break;
    const adv = page.getByRole("button", { name: /Advance Day|Continue/i });
    if (await adv.isVisible({ timeout: 1000 }).catch(() => false)) {
      await adv.click();
      await page.waitForTimeout(600);
    } else break;
  }
  await page.screenshot({ path: path.join(OUT_DIR, "04-active-basho.png") });

  // Sim one day to get bouts
  const simAll = page.getByRole("button", { name: /Sim All/i });
  if (await simAll.isVisible({ timeout: 3000 }).catch(() => false)) {
    await simAll.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "05-after-sim.png") });
  }

  // Find and click first bout result to open replay
  const boutRow = page
    .locator("[class*='bout'], [class*='match'], tr")
    .first();
  const clicked = await boutRow.click({ timeout: 3000 }).catch(() => false);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "06-bout-dialog.png") });

  // Find and click any "Watch Replay" or similar button
  const watchBtn = page.getByRole("button", { name: /Watch|Replay|Play/i });
  if (await watchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await watchBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "07-replay-open.png") });

    // Screenshot canvas during each phase
    const canvas = page.locator("canvas").first();
    if (await canvas.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Play
      const playBtn = page.getByRole("button", { name: /Play|▶/i });
      if (await playBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await playBtn.click();
      }
      for (const [label, delay] of [
        ["ritual", 500],
        ["tachiai", 1800],
        ["clinch", 3500],
        ["momentum", 5500],
        ["finish", 7500],
        ["ceremony", 9500],
      ]) {
        await page.waitForTimeout(delay as number);
        await canvas.screenshot({ path: path.join(OUT_DIR, `08-canvas-${label}.png`) });
      }
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, "09-final.png") });
  await browser.close();
  console.log("Screenshots saved to:", OUT_DIR);
})();
