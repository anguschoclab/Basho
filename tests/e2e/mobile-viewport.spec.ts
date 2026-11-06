import { test, expect } from "@playwright/test";

/**
 * T3.3 — mobile viewport smoke pass. Verifies the dashboard is usable
 * at phone width: no horizontal overflow, nav reachable.
 */

test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile viewport (T3.3)", () => {
  test("dashboard has no horizontal scroll at 390px", async ({ page }) => {
    await page.goto("/dashboard");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test("main nav is reachable at phone width", async ({ page }) => {
    await page.goto("/dashboard");
    // Look for any nav landmark or the mobile menu trigger.
    const nav = page.locator("nav, [role='navigation'], [data-testid='mobile-menu']").first();
    await expect(nav).toBeVisible({ timeout: 15_000 });
  });
});
