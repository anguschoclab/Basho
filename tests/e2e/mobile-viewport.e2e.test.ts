import { test, expect } from "@playwright/test";
import { createNewGame, dismissOnboardingTour } from "./helpers";

/**
 * T3.3 — mobile viewport pass at 390x844 (iPhone 13). Boots a real world
 * through the wizard, then verifies the Dashboard, Stable, and Basho
 * surfaces render without horizontal overflow and that navigation is
 * reachable at phone width.
 */

test.use({ viewport: { width: 390, height: 844 } });

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page, surface: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow, `horizontal overflow on ${surface} at 390px`).toBe(false);
}

test.describe("mobile viewport (T3.3)", () => {
  test("dashboard has no horizontal scroll and nav is reachable", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/");
    await createNewGame(page);
    await dismissOnboardingTour(page);

    await expectNoHorizontalOverflow(page, "dashboard");

    // Navigation: the sidebar collapses to a mobile sheet behind the
    // "Toggle Sidebar" trigger — it must open and expose nav links.
    const trigger = page.getByRole("button", { name: /Toggle Sidebar/i }).first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
    const sheetNav = page.getByRole("dialog").getByRole("link").first();
    await expect(sheetNav).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
  });

  test("stable page has no horizontal scroll", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/");
    await createNewGame(page);
    await dismissOnboardingTour(page);

    await page.goto("/stable");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectNoHorizontalOverflow(page, "stable");
  });

  test("basho page has no horizontal scroll", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/");
    await createNewGame(page);
    await dismissOnboardingTour(page);

    await page.goto("/basho");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectNoHorizontalOverflow(page, "basho");
  });
});
