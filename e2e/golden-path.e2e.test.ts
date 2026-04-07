import { test, expect } from '@playwright/test';

test('Golden Path: Boot -> Start Game -> View Stable -> Auto-Sim Tournament -> Verify', async ({ page }) => {
  // 1. Boot: Navigate to Main Menu
  await page.goto('/');
  
  // Wait for the world to be generated and the menu to appear
  // Setting a longer timeout (15s) as initial generation can be heavy.
  await expect(page.locator('h1').first()).toContainText(/Basho/i, { timeout: 15000 });
  
  // 2. Start Game: Select a recommended stable and click "Begin Journey"
  // The first recommended stable is pre-selected by default in the UI logic usually, 
  // but let's click one to be sure.
  const firstStable = page.locator('.space-y-6 .grid .cursor-pointer').first();
  await firstStable.click();
  
  const beginJourneyButton = page.getByRole('button', { name: /Inaugurate/i });
  await expect(beginJourneyButton).toBeVisible();
  await beginJourneyButton.click();
  
  // 3. View Stable: Verify Dashboard loads and "My Stable" contains rikishi
  await expect(page.locator('h1').first()).not.toContainText(/Basho/i); // Should be on Dashboard
  
  // Navigate to "My Stable" via the secondary nav
  await page.getByRole('link', { name: /Stable Overview/i }).click();
  
  // Verify Rikishi Cards are present
  // Wait for Active Rikishi to be visible
  await expect(page.getByText(/Active Rikishi/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  const count = await page.locator('.paper.hover\\:border-primary.cursor-pointer').count();
  expect(count).toBeGreaterThan(0);
  
  // 4. Auto-Sim Tournament: Navigate to "Basho" and run a simulation
  // Navigating to basho. First we have to be in Basho phase, which means we might need to advance.
  
  await page.getByRole('link', { name: /Current Basho/i }).click();
  
  // The BashoPage has a "Sim All" button instead of "watch-the-world"
  const watchTheWorldButton = page.getByRole('button', { name: /Sim All/i });
  
  // If "Sim All" is disabled or not present, we can just click "Advance Day" until it's there.
  let isSimAllVisible = await watchTheWorldButton.isVisible().catch(() => false);
  let limit = 0;
  while (!isSimAllVisible && limit < 15) {
      const topNavAdvance = page.getByRole('button', { name: /Advance Day|Continue/i });
      if (await topNavAdvance.isVisible()) {
          await topNavAdvance.click();
          await page.waitForTimeout(500); // Wait for the transition
      } else {
          break;
      }
      isSimAllVisible = await watchTheWorldButton.isVisible().catch(() => false);
      limit++;
  }
  
  await expect(watchTheWorldButton).toBeVisible();
  await watchTheWorldButton.click();
  
  // 5. Verify: Wait for simulation completion
  // wait for End Basho or Next Day
  // The state transition might mean the "Next Day" button is right there on the top nav now, or the page reloads.
  const nextDayBtn = page.getByRole('button', { name: /End Basho|Next Day|Advance Day/i }).first();
  await expect(nextDayBtn).toBeVisible({ timeout: 15000 });
  
});
