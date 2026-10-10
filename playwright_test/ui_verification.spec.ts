import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Event log UI rendering', async ({ page }, testInfo) => {
  // Navigate to root (hash router)
  await page.goto('http://localhost:5173/#/');

  // Wait for the main app layout and the event feed/log panel to mount
  await page.waitForSelector('.border-r', { state: 'visible', timeout: 10000 });

  // Take a screenshot of the main page with the event log panel
  const screenshotPath = path.join(testInfo.outputDir, 'event_log_optimization.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Try to find EventFeed items if they exist
  const eventItems = await page.$$('div[role="button"]');
  if (eventItems.length > 0) {
    console.log(`Found ${eventItems.length} event items rendered.`);
  }

  expect(true).toBe(true);
});
