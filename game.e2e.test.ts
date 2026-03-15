import { test, expect } from '@playwright/test';

test('game launches and start screen loads', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', error => {
    console.log(`BROWSER ERROR: ${error.message}`);
  });

  await page.goto('/');

  // Verify the page title is correct to indicate the app loaded
  await expect(page).toHaveTitle(/Sumo Management/i, { timeout: 10000 });

  // Look for the primary "Load Game" button on the start screen
  const loadGameButton = page.locator('button', { hasText: 'Load Game' }).first();
  await expect(loadGameButton).toBeVisible({ timeout: 10000 });

  // Make sure we see some of the specific sumo terminology on the start screen
  await expect(page.locator('body')).toContainText('Basho');
  await expect(page.locator('body')).toContainText('Choose your heya');
});
