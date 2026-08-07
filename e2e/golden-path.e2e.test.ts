import { test, expect } from "@playwright/test";

test("Golden Path: Boot -> Start Game -> View Stable -> Auto-Sim Tournament -> Verify", async ({
  page,
}) => {
  // 1. Boot: Navigate to Main Menu
  await page.goto("/");

  // Wait for the world to be generated and the menu to appear (can take a while)
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60000 });

  // 2. Start Game: Select a recommended stable and click "Inaugurate"
  const firstStable = page.locator(".space-y-6 .grid .cursor-pointer").first();
  await firstStable.click();

  const inaugurateBtn = page.getByRole("button", { name: /Inaugurate/i });
  await expect(inaugurateBtn).toBeVisible();
  await inaugurateBtn.click({ force: true });

  // 2b. New Game Wizard: Enter elder name
  await expect(page.getByRole("heading", { name: /Begin Your Legacy/i })).toBeVisible({ timeout: 10000 });
  const nameInput = page.getByRole("textbox", { name: /Official Elder Name/i });
  await expect(nameInput).toBeVisible();
  await nameInput.fill("TestOyakata");

  // Select first background (Champion Inheritor) — target the card by label text
  await page.getByText("Champion Inheritor").click();
  await page.getByRole("button", { name: /Next Submission/i }).click();

  // 2c. Select ichimon (faction) — target the card by name text
  await expect(page.getByRole("heading", { name: /Choose Your Ichimon/i })).toBeVisible({ timeout: 10000 });
  await page.getByText("Dewanoumi").click();
  await page.getByRole("button", { name: /Verify Allegiance/i }).click();

  // 2d. Exhibition bout preview — skip through all actions
  await expect(page.getByRole("heading", { name: /Live Bout Preview/i })).toBeVisible({ timeout: 10000 });
  // Dismiss tutorial coach if present
  const dismissBtn = page.getByRole("button", { name: /^Dismiss$/i });
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
  }
  // Click Next repeatedly to advance through bout actions
  for (let i = 0; i < 80; i++) {
    const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(100);
    } else {
      break;
    }
  }
  // Click "Begin My Career" to enter the game
  const beginCareerBtn = page.getByRole("button", { name: /Begin My Career/i });
  await expect(beginCareerBtn).toBeVisible({ timeout: 10000 });
  await beginCareerBtn.click();

  // 3. View Stable: Verify Dashboard loads
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Dismiss onboarding tour dialog if present
  const skipTourBtn = page.getByRole("button", { name: /Skip Tour/i }).first();
  if (await skipTourBtn.isVisible().catch(() => false)) {
    await skipTourBtn.click();
    await page.waitForTimeout(500);
  }
  // Also try the "Begin Your Legacy" / "Next Guide" buttons in the tour
  const tourNextBtn = page.getByRole("button", { name: /Next Guide|Begin Your Legacy/i }).first();
  if (await tourNextBtn.isVisible().catch(() => false)) {
    // Click through all tour steps
    for (let i = 0; i < 5; i++) {
      const btn = page.getByRole("button", { name: /Next Guide|Begin Your Legacy/i }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(200);
      } else {
        break;
      }
    }
  }

  // 4. Auto-Sim Tournament: Advance time until basho phase, then simulate
  // The top nav has a "Continue" button that advances one day in interim phase.
  // When in basho phase, it changes to "Day N" and navigates to /basho.
  await page.waitForTimeout(500);

  // Advance time until we enter basho phase (Continue button changes to "Day N")
  const simAllBtn = page.getByRole("button", { name: /Automatically simulate the remainder/i }).first();
  let limit = 0;
  while (limit < 60) {
    // Check if Sim All is visible (basho phase on dashboard)
    const isSimAllVisible = await simAllBtn.isVisible().catch(() => false);
    if (isSimAllVisible) break;
    
    // Use Week button to advance 7 days at once (faster), fall back to Continue
    const weekBtn = page.getByRole("button", { name: /Progress simulation by one full week/i }).first();
    const continueBtn = page.getByRole("button", { name: /Continue|Start Basho/i }).first();
    
    if (await weekBtn.isVisible().catch(() => false)) {
      await weekBtn.click();
      await page.waitForTimeout(500);
    } else if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Try the Day button from CalendarWidget as fallback
      const dayBtn = page.getByRole("button", { name: /Advance the simulation by one day/i }).first();
      if (await dayBtn.isVisible().catch(() => false)) {
        await dayBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }
    limit++;
  }

  // Click Sim All on the dashboard to simulate the full basho
  await expect(simAllBtn).toBeVisible({ timeout: 10000 });
  await simAllBtn.click();

  // 5. Verify: Wait for simulation to complete.
  // The worker processes TICK_MULTIPLE_DAYS for the remaining basho days.
  // When complete, the dashboard will update — Sim All button disappears.
  await expect(simAllBtn).not.toBeVisible({ timeout: 120000 });
  
  // Verify the dashboard still has content (world didn't become null)
  const dashboardHeading = page.locator("h1").first();
  await expect(dashboardHeading).toBeVisible({ timeout: 10000 });

  // 6. AI deliverables: advisor digest and intelligence panel are surfaced on the dashboard
  await expect(page.getByText("Intelligence").first()).toBeVisible({ timeout: 5000 });
});
