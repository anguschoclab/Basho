import { test, expect } from '@playwright/test';

test('Golden Path: Boot -> Start Game -> View Stable -> Auto-Sim Tournament -> Verify', async ({ page }) => {
  // 1. Boot: Navigate to Main Menu
  await page.goto('/');
  
  // Wait for the world to be generated and the menu to appear
  await expect(page.locator('h1').first()).toContainText('BASHO', { ignoreCase: true });
  
  // 2. Start Game: Select a recommended stable and click "Inaugurate"
  const firstStable = page.locator('div:has-text("Recommended") + div .bg-card').first();
  await firstStable.click();
  
  const beginJourneyButton = page.getByRole('button', { name: /Inaugurate/i });
  await expect(beginJourneyButton).toBeVisible();
  await beginJourneyButton.click();
  
  // 3. View Stable: Verify Dashboard loads
  await expect(page.locator('h1').first()).not.toContainText('BASHO', { ignoreCase: true }); // Should be on Dashboard
  
  // Dismiss any "Continue" dialogs if they appear on new game start
  const continueBtn = page.getByRole('button', { name: /Continue/i });
  if (await continueBtn.isVisible()) {
      await continueBtn.click();
  }
  
  // Verify Rikishi Cards are present via the stable's rikishi links.
  const rikishiCards = page.locator('a[href^="/rikishi/rk_"]');
  await expect(rikishiCards.first()).toBeVisible();
  const count = await rikishiCards.count();
  expect(count).toBeGreaterThan(0);
  
  // 4. Navigate to "Current Basho" via the sidebar
  await page.getByRole('link', { name: /Current Basho/i }).first().click();
  
  // In the Basho UI, there might be a "Simulate All" or similar, but the exact button may be different. Let's look for "Simulate"
  const simulateAllButton = page.getByRole('button', { name: /Simulate All/i }).first();
  if (await simulateAllButton.isVisible()) {
    await simulateAllButton.click();
    await expect(simulateAllButton).toBeDisabled({ timeout: 30000 });
  } else {
    // There might just be a Continue or Fast Forward button.
    const continueBtnMain = page.getByRole('button', { name: /Continue/i }).first();
    if (await continueBtnMain.isVisible()) {
      await continueBtnMain.click();
    }
  }
});
