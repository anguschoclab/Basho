/**
 * Calibration driver using system Chrome.
 * Usage: bun run e2e/run-calibration.ts
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = "e2e/calibration-screenshots";
mkdirSync(OUT, { recursive: true });

const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ["--disable-web-security", "--no-sandbox"],
});

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

console.log("Navigating to app...");
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: join(OUT, "01-boot.png"), fullPage: false });
console.log("Boot screenshot taken");

// Read the page title/h1
const title = await page.locator("h1").first().textContent().catch(() => "?");
console.log("Page h1:", title);

// Try clicking the first interactive stable card
const stableCards = page.locator(".cursor-pointer, [class*='card'], [class*='stable']");
const cardCount = await stableCards.count();
console.log("Found", cardCount, "clickable items");

if (cardCount > 0) {
  await stableCards.first().click({ force: true, timeout: 3000 }).catch((e: Error) => console.log("First click:", e.message));
  await page.waitForTimeout(1000);
}

// Try to find and click "Begin" / "Inaugurate" button
const beginBtn = page.getByRole("button", { name: /Inaugurat|Begin|Start New/i });
const beginVisible = await beginBtn.isVisible({ timeout: 3000 }).catch(() => false);
console.log("Begin button visible:", beginVisible);
if (beginVisible) {
  await beginBtn.click({ force: true });
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: join(OUT, "02-after-begin.png") });

// Look for navigation
const allLinks = await page.locator("a, [role='link']").allTextContents();
console.log("Nav links:", allLinks.slice(0, 10));

// Try basho link
const bashoLink = page.getByRole("link", { name: /Basho|Tournament/i }).first();
const bashoVisible = await bashoLink.isVisible({ timeout: 3000 }).catch(() => false);
if (bashoVisible) {
  await bashoLink.click();
  await page.waitForTimeout(2000);
  console.log("Navigated to basho");
}
await page.screenshot({ path: join(OUT, "03-basho.png") });

// Advance to active basho and sim
let attempts = 20;
while (attempts-- > 0) {
  const simBtn = page.getByRole("button", { name: /Sim All|Simulate All/i });
  if (await simBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    console.log("Found Sim All — clicking");
    await simBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(OUT, "04-after-sim.png") });
    break;
  }
  const advBtn = page.getByRole("button", { name: /Advance Day|Continue|Next/i });
  if (await advBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await advBtn.click();
    await page.waitForTimeout(700);
  } else {
    break;
  }
}

// Try to find bout results and click one
const boutRows = page.locator("[data-bout-id], [class*='bout-row'], [class*='match-row']");
const boutCount = await boutRows.count();
console.log("Bout rows found:", boutCount);

if (boutCount > 0) {
  await boutRows.first().click({ timeout: 2000 }).catch((e: Error) => console.log("Bout click:", e.message));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "05-bout-detail.png") });
}

// Try clicking any result row in standings/results tables
const anyResult = page.locator("tr.cursor-pointer, [role='row'][class*='cursor'], [class*='result-row']").first();
const anyVisible = await anyResult.isVisible({ timeout: 1000 }).catch(() => false);
if (anyVisible) {
  await anyResult.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "06-result-click.png") });
}

// Look for replay / watch button
const replayBtn = page.getByRole("button", { name: /Watch|Replay|Play/i }).first();
const replayVisible = await replayBtn.isVisible({ timeout: 3000 }).catch(() => false);
console.log("Replay button visible:", replayVisible);

if (replayVisible) {
  await replayBtn.click();
  await page.waitForTimeout(1000);

  const canvas = page.locator("canvas").first();
  const canvasVisible = await canvas.isVisible({ timeout: 5000 }).catch(() => false);
  console.log("Canvas visible:", canvasVisible);

  if (canvasVisible) {
    // Take screenshots at each animation phase
    const phases: Array<[string, number]> = [
      ["00-ritual-start", 0],
      ["01-ritual-mid", 1200],
      ["02-tachiai", 2800],
      ["03-clinch", 4200],
      ["04-momentum", 6000],
      ["05-finish-start", 7500],
      ["06-finish-arc-peak", 8300],
      ["07-ceremony", 9800],
    ];

    // Click play
    const playBtn = page.getByRole("button", { name: /^Play$|^▶/i });
    if (await playBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await playBtn.click();
    }

    let elapsed = 0;
    for (const [label, delay] of phases) {
      const wait = delay - elapsed;
      if (wait > 0) await page.waitForTimeout(wait);
      elapsed = delay;
      await canvas.screenshot({ path: join(OUT, `canvas-${label}.png`) });
      console.log("Canvas screenshot:", label);
    }
  }
}

await page.screenshot({ path: join(OUT, "99-final.png") });
await browser.close();
console.log("Done. Screenshots in:", OUT);
