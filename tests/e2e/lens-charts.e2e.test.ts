import { test, expect } from "@playwright/test";
import { createNewGame, dismissOnboardingTour } from "./helpers";

/**
 * Lens e2e: both new charts mount and show honest empty states on a
 * fresh world (no careerHistory / no bout logs yet).
 */
test("Lens charts: stable basho form + rikishi technique distribution", async ({ page }) => {
  test.setTimeout(300000);
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60000 });

  await createNewGame(page);
  await dismissOnboardingTour(page);

  // ── Stable → Performance tab → Basho Form empty state ────────────────
  await page.goto("/stable");
  const perfTab = page.getByRole("tab", { name: /performance/i });
  await expect(perfTab).toBeVisible({ timeout: 20000 });
  await perfTab.click();
  await expect(page.getByText("Basho Form")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/more Basho to surface stable form/i)).toBeVisible();

  // ── Global search → stable page → Members → roster card (edge click) ──
  const search = page.getByRole("combobox", { name: /Search wrestlers/i });
  await search.click();
  await search.fill("a");
  const results = page.locator("#gs-results [role='option'], #gs-results li, #gs-results button");
  await expect(results.first()).toBeVisible({ timeout: 10000 });
  await results.first().click();
  // Lands on /stable/$id (heyas sort first). Roster cards nest
  // stopPropagation controls — click the card's top-left corner.
  await page.getByRole("tab", { name: /members/i }).click();
  const rosterCard = page.locator("[aria-label^='View ']").first();
  await expect(rosterCard).toBeVisible({ timeout: 10000 });
  await rosterCard.click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(/\/rikishi\//, { timeout: 10000 });

  const combatTab = page.getByRole("tab", { name: /combat/i });
  await expect(combatTab).toBeVisible({ timeout: 10000 });
  await combatTab.click();
  await expect(page.getByText("Wins by Technique")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/more wins to surface technique profile/i)).toBeVisible();
});
