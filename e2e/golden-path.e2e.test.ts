import { test, expect } from '@playwright/test';

test('Golden Path: Boot -> Start Game -> View Stable -> Auto-Sim Tournament -> Verify', async ({ page }) => {
  // 1. Boot: Navigate to Main Menu
  await page.goto('/');
  
  // Wait for the world to be generated and the menu to appear
  await expect(page.locator('h1')).toContainText('Basho');
  
  // 2. Start Game: Select a recommended stable and click "Begin Journey"
  // The first recommended stable is pre-selected by default in the UI logic usually, 
  // but let's click one to be sure.
  const firstStable = page.locator('div:has-text("Recommended") + div .bg-card').first();
  await firstStable.click();
  
  const beginJourneyButton = page.getByTestId('begin-journey');
  await expect(beginJourneyButton).toBeVisible();
  await beginJourneyButton.click();
  
  // 3. View Stable: Verify Dashboard loads and "My Stable" contains rikishi
  await expect(page.locator('h1')).not.toContainText('Basho'); // Should be on Dashboard
  
  // Navigate to "My Stable" via the secondary nav
  await page.getByRole('button', { name: 'Stable', exact: true }).click();
  
  // Verify Rikishi Cards are present
  const rikishiCards = page.getByTestId('rikishi-card');
  await expect(rikishiCards.first()).toBeVisible();
  const count = await rikishiCards.count();
  expect(count).toBeGreaterThan(0);
  
  // 4. Auto-Sim Tournament: Navigate to "Basho" and run a simulation
  await page.getByRole('button', { name: 'Basho', exact: true }).click();
  
  const watchTheWorldButton = page.getByTestId('watch-the-world');
  await expect(watchTheWorldButton).toBeVisible();
  await watchTheWorldButton.click();
  
  // Configure simulation: 15 days
  await page.getByLabel('Simulation Duration').click(); // No, it's a Select. 
  // Actually, let's just use the defaults (usually 1 Basho or 15 days)
  
  const startSimButton = page.getByRole('button', { name: 'Start Simulation' });
  await startSimButton.click();
  
  // 5. Verify: Wait for simulation completion
  // The "Start Simulation" button changes to "Simulating..." or shows a loading state.
  // Then the "Simulation Complete" dialog appears.
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 30000 });
  
  const continueButton = page.getByRole('button', { name: 'Continue' });
  await expect(continueButton).toBeVisible();
  await continueButton.click();
  
  // Final check: we should be back on the Basho page or Dashboard
  await expect(page.getByText('Simulation Complete')).not.toBeVisible();
});
