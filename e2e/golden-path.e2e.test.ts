import { test, expect } from "@playwright/test";
import {
  advanceToBasho,
  createNewGame,
  dismissOnboardingTour,
  driveBashoToRecap,
  finalizeRecap,
  readLiveWorldMeta,
} from "./helpers";

test("Golden Path: Boot -> Start Game -> View Stable -> Auto-Sim Tournament -> Verify", async ({
  page,
}) => {
  // The full golden path (wizard + interim advance + 15-day basho +
  // decision halts + recap) exceeds the 300s project timeout under dev
  // builds; give it 10 minutes.
  test.setTimeout(600000);
  // 1. Boot: Navigate to Main Menu
  await page.goto("/");

  // Wait for the world to be generated and the menu to appear (can take a while)
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60000 });

  // 2. Start Game: full wizard — stable pick, elder name, background,
  // ichimon, exhibition bout — then land on the dashboard.
  await createNewGame(page);

  // 3. View Stable: dismiss the onboarding tour if it surfaces.
  await dismissOnboardingTour(page);

  // 4. Auto-Sim Tournament: advance interim until the basho begins, then
  // drive it to the recap page. Both helpers handle the failure modes the
  // previous inline loop missed:
  //   - ticks are async on the worker; clicks issued while pendingTick is
  //     set are dropped by the store ("tick in progress"), so the loop must
  //     poll rather than fire-and-forget;
  //   - a Week fast-forward can land inside active_basho with the URL
  //     already on /basho (no Sim All on the dashboard then);
  //   - blocking decisions halt multi-day advances and need resolving;
  //   - "End Basho" is interactive — the pipeline never auto-ends a basho.
  await advanceToBasho(page);
  await driveBashoToRecap(page);

  // 5. Recap → Finalize → back to the dashboard (post_basho → interim).
  await finalizeRecap(page);

  // Verify the dashboard still has content (world didn't become null)
  const meta = await readLiveWorldMeta(page);
  expect(meta, "world still live after recap").not.toBeNull();
  const dashboardHeading = page.locator("h1").first();
  await expect(dashboardHeading).toBeVisible({ timeout: 10000 });

  // 6. AI deliverables: advisor digest and intelligence panel are surfaced on the dashboard
  await expect(page.getByText("Intelligence").first()).toBeVisible({ timeout: 5000 });
});
