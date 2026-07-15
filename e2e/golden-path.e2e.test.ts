import { test, expect } from "@playwright/test";

test("Golden Path: Boot -> Start Game -> View Stable -> Auto-Sim Tournament -> Verify", async ({
  page,
}) => {
  // 1. Boot: Navigate to Main Menu
  await page.goto("/");

  // Wait for the world to be generated and the menu to appear (can take a while)
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60000 });

  // 2. Start Game: Select a recommended stable and click "Begin Journey"
  // The first recommended stable is pre-selected by default in the UI logic usually,
  // but let's click one to be sure.
  const firstStable = page.locator(".space-y-6 .grid .cursor-pointer").first();
  await firstStable.click();

  const beginJourneyButton = page.getByRole("button", { name: /Inaugurate/i });
  await expect(beginJourneyButton).toBeVisible();
  await beginJourneyButton.click({ force: true });

  // 3. View Stable: Verify Dashboard loads and "My Stable" contains rikishi
  await expect(page.locator("h1").first()).not.toContainText(/Basho/i); // Should be on Dashboard

  // Navigate to "My Stable" via the sidebar
  await page.waitForTimeout(1000); // Wait for dashboard animations
  await page
    .getByRole("link", { name: /^Overview$/i })
    .first()
    .click();

  // Verify Rikishi Cards are present
  // Wait for rikishi cards to be visible in the roster
  await expect(page.locator('[role="tabpanel"]').first()).toBeVisible({ timeout: 10000 });
  const count = await page.locator('[role="tabpanel"] .cursor-pointer').count();
  expect(count).toBeGreaterThan(0);

  // 4. Auto-Sim Tournament: Navigate to "Basho" and run a simulation
  // Navigating to basho. First we have to be in Basho phase, which means we might need to advance.

  await page.getByRole("link", { name: /Current Basho/i }).click();

  // The BashoPage has a "Sim All" button instead of "watch-the-world"
  const watchTheWorldButton = page.getByRole("button", { name: /Sim All/i });

  // If "Sim All" is disabled or not present, we can just click "Advance Day" until it's there.
  let isSimAllVisible = await watchTheWorldButton.isVisible().catch(() => false);
  let limit = 0;
  while (!isSimAllVisible && limit < 15) {
    const topNavAdvance = page.getByRole("button", { name: /Advance Day|Continue/i });
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
  const nextDayBtn = page
    .locator('#advance-basho-btn, button:has-text("End Basho"), button:has-text("Next Day")')
    .first();
  await expect(nextDayBtn).toBeVisible({ timeout: 60000 });
});
