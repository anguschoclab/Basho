import { test, expect } from "@playwright/test";
import { createNewGame, dismissOnboardingTour } from "./helpers";

/**
 * Manual-check closure for the Oyakata Career Arc plan: the Manager Career
 * card on /oyakata and the JSA career line on the dashboard StableWidget must
 * render against a real running app (not just component mocks).
 */
test.describe("Career surface (manual-check)", () => {
  test("StableWidget career line + OyakataPage Manager Career card render", async ({
    page,
  }) => {
    await page.goto("/");
    await createNewGame(page);
    await dismissOnboardingTour(page);

    // Dashboard: StableWidget career line shows JSA standing + next milestone.
    await expect(page.getByText(/JSA (Chairman|Board #\d+|Rank \d+)/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Next:|All milestones achieved/).first()).toBeVisible();

    // OyakataPage: the Manager Career card renders its tenure scorecard and
    // milestone list (empty-tenure copy is acceptable on a fresh world).
    await page.goto("/stable/oyakata");
    await expect(page.getByText("Manager Career")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Career just begun|Basho/i).first()
    ).toBeVisible();
  });
});
