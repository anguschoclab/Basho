import { test, expect } from "@playwright/test";
import { createNewGame, dismissOnboardingTour, readLiveWorldMeta } from "./helpers";

/**
 * Regression: a full reload (or deep link) on a world-gated route must
 * restore the autosave in place — previously pages rendered a permanently
 * blank screen because they returned `null` for `!world` with no guard,
 * and only /dashboard knew how to restore.
 */
test("reload on a world-gated route restores the autosave", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/");
  await createNewGame(page);
  await dismissOnboardingTour(page);

  await page.waitForFunction(
    () => (window as unknown as { __BASHO_WORLD__?: unknown }).__BASHO_WORLD__ != null
  );
  // Let the autosave's async IndexedDB write commit before reloading.
  await page.waitForTimeout(2500);

  const before = await readLiveWorldMeta(page);
  expect(before?.seed).toBeTruthy();

  // Sanity: the autosave actually landed in IDB (post-hydration saves do
  // not mirror to localStorage).
  const hasSave = await page.evaluate(
    () =>
      new Promise<boolean>((res) => {
        const req = indexedDB.open("basho-saves", 1);
        req.onsuccess = () => {
          try {
            const g = req.result
              .transaction("kv", "readonly")
              .objectStore("kv")
              .get("basho_save_autosave");
            g.onsuccess = () => res(!!g.result);
            g.onerror = () => res(false);
          } catch {
            res(false);
          }
        };
        req.onerror = () => res(false);
      })
  );
  expect(hasSave).toBe(true);

  // Full reload straight at a world-gated deep link.
  await page.goto("/basho");

  // The world must come back (restored from autosave) — same seed proves
  // it is the same world, not a fresh one.
  await page.waitForFunction(
    () => (window as unknown as { __BASHO_WORLD__?: unknown }).__BASHO_WORLD__ != null,
    { timeout: 30_000 }
  );
  const after = await readLiveWorldMeta(page);
  expect(after?.seed).toBe(before!.seed);
  expect(after?.dayIndexGlobal).toBe(before!.dayIndexGlobal);

  // And the route must render real content — not the guard's blank null.
  await expect(page.locator("#root")).not.toBeEmpty();
  const bodyText = (await page.locator("body").textContent()) ?? "";
  expect(bodyText.trim().length).toBeGreaterThan(0);
});

test("world-gated route with no save redirects to the main menu", async ({ page }) => {
  await page.goto("/basho");
  await page.waitForURL(/\/main-menu/, { timeout: 30_000 });
});
