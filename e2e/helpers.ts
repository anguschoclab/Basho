import { expect, type Page } from "@playwright/test";

/**
 * Shared Playwright helpers for full-stack lifecycle E2E specs.
 *
 * The canonical verification surface is the autosave in localStorage:
 * every world change serializes the whole WorldState through
 * SerializationService.serializeWorld into `basho_save_autosave`.
 * Serialized shape notes (keep in sync with SerializationService):
 *   - `world.rikishi` / `world.heyas` are plain objects (Map → Record)
 *   - `world.history` is BashoResult[] (last entry = most recent basho)
 *   - `world.awardLog` is AwardLogEntry[]
 *   - `world.currentBanzuke` / `world.historyIndex` are plain snapshots/index
 *   - `world.currentBasho` is the serialized BashoState or undefined
 */

export const AUTOSAVE_KEY = "basho_save_autosave";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type SerializedWorld = any;

/** Read the autosave's serialized world, or null if absent/unparseable. */
export async function readAutosaveWorld(page: Page): Promise<SerializedWorld | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.world ?? null;
    } catch {
      return null;
    }
  }, AUTOSAVE_KEY);
}

/**
 * Poll the autosave until `predicateSrc` (a JS expression body evaluated in
 * the page as `(world) => ...` source) returns truthy, then return the world.
 *
 * Polling is required because autosave can transiently hold a stale
 * pre-resolution world during multi-impact operations (e.g.
 * recordBashoHistory autosaves mid-construction). Reading once races.
 */
export async function waitForAutosaveWorld(
  page: Page,
  predicateSrc: string,
  timeout = 120_000
): Promise<SerializedWorld> {
  await page.waitForFunction(
    ({ key, src }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      try {
        const world = JSON.parse(raw)?.world;
        if (!world) return false;
        const pred = new Function("world", `return (${src})(world)`) as (w: unknown) => unknown;
        return !!pred(world);
      } catch {
        return false;
      }
    },
    { key: AUTOSAVE_KEY, src: predicateSrc },
    { timeout }
  );
  const world = await readAutosaveWorld(page);
  if (!world) throw new Error("Autosave world missing after predicate matched");
  return world;
}

/**
 * Main Menu → Manual Seed → enter `seed` → Sync Seed.
 *
 * createWorld() is fire-and-forget: it only sends START_WORLD to the
 * worker, and the previous world's stable cards stay rendered until the
 * worker emits WORLD_UPDATED. Waiting for "a stable card" is therefore a
 * race — the visible card may belong to the boot world (random timestamp
 * seed) and carry a heyaId that doesn't exist in the seeded world.
 * Instead, wait for the seeded world to reach UI state, proven by its
 * autosave (the GameContext effect autosaves every world update, and
 * serializeWorld stamps `seed` first).
 */
export async function setWorldSeed(page: Page, seed: string): Promise<void> {
  await page.getByRole("button", { name: /Manual Seed/i }).click();
  await page.getByPlaceholder(/Enter specific world seed/i).fill(seed);
  await page.getByRole("button", { name: /Sync Seed/i }).click();
  await waitForAutosaveWorld(page, `(w) => w.seed === ${JSON.stringify(seed)}`, 180_000);
  await expect(page.locator(".space-y-6 .grid .cursor-pointer").first()).toBeVisible({
    timeout: 60_000,
  });
}

/** Complete the New Game Wizard: stable pick → name → background → ichimon → bout preview → dashboard. */
export async function createNewGame(page: Page, elderName = "TestOyakata"): Promise<void> {
  const firstStable = page.locator(".space-y-6 .grid .cursor-pointer").first();
  await firstStable.click();

  const inaugurateBtn = page.getByRole("button", { name: /Inaugurate/i });
  await expect(inaugurateBtn).toBeVisible();
  await inaugurateBtn.click({ force: true });

  await expect(page.getByRole("heading", { name: /Begin Your Legacy/i })).toBeVisible({
    timeout: 10_000,
  });
  const nameInput = page.getByRole("textbox", { name: /Official Elder Name/i });
  await nameInput.fill(elderName);
  await page.getByRole("main").getByText("Champion Inheritor").click();
  await page.getByRole("button", { name: /Next Submission/i }).click();

  await expect(page.getByRole("heading", { name: /Choose Your Ichimon/i })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("main").getByText("Dewanoumi").click();
  await page.getByRole("button", { name: /Verify Allegiance/i }).click();

  await expect(page.getByRole("heading", { name: /Live Bout Preview/i })).toBeVisible({
    timeout: 10_000,
  });
  const dismissBtn = page.getByRole("button", { name: /^Dismiss$/i });
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
  }
  for (let i = 0; i < 80; i++) {
    const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(100);
    } else {
      break;
    }
  }
  const beginCareerBtn = page.getByRole("button", { name: /Begin My Career/i });
  await expect(beginCareerBtn).toBeVisible({ timeout: 10_000 });
  await beginCareerBtn.click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/** Dismiss the onboarding tour overlay if it is showing. */
export async function dismissOnboardingTour(page: Page): Promise<void> {
  await page.waitForTimeout(1000);
  const skipTourBtn = page.getByRole("button", { name: /Skip Tour/i }).first();
  if (await skipTourBtn.isVisible().catch(() => false)) {
    await skipTourBtn.click();
    await page.waitForTimeout(500);
  }
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

/**
 * From the interim dashboard, advance days until the basho begins
 * ("Sim All" becomes visible). Uses the Week fast-forward when available.
 */
export async function advanceToBasho(page: Page): Promise<void> {
  const simAllBtn = page
    .getByRole("button", { name: /Automatically simulate the remainder/i })
    .first();
  const weekBtn = page
    .getByRole("button", { name: /Progress simulation by one full week/i })
    .first();
  const continueBtn = page.getByRole("button", { name: /Continue|Start Basho/i }).first();
  const dayBtn = page
    .getByRole("button", { name: /Advance the simulation by one day/i })
    .first();

  // Wait for the dashboard's advance controls to mount — the dashboard
  // lazy-renders after the wizard navigation and an early poll sees none
  // of them, which would break the loop on its first iteration.
  await expect(
    simAllBtn.or(weekBtn).or(continueBtn).or(dayBtn).first()
  ).toBeVisible({ timeout: 30_000 });

  for (let i = 0; i < 120; i++) {
    if (await simAllBtn.isVisible().catch(() => false)) return;

    // A blocking decision can halt the interim advance — resolve it so
    // the next tick can proceed.
    if (await resolveCrisisIfPresent(page)) continue;

    if (await weekBtn.isVisible().catch(() => false)) {
      await weekBtn.click();
      await page.waitForTimeout(700);
    } else if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(700);
    } else if (await dayBtn.isVisible().catch(() => false)) {
      await dayBtn.click();
      await page.waitForTimeout(700);
    } else {
      // Controls briefly unmount during world sync — keep polling.
      await page.waitForTimeout(1000);
    }
  }
  await expect(simAllBtn).toBeVisible({ timeout: 10_000 });
}

/** Dismiss queued retirement ceremonies (IntaiCeremony dialog) if present. */
export async function dismissRetirementCeremonies(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const ackBtn = page.getByRole("button", { name: /Acknowledge Retirement/i }).first();
    if (await ackBtn.isVisible().catch(() => false)) {
      await ackBtn.click();
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }
}

/**
 * From the Recap page: clear ceremony overlays, click "Finalize Basho",
 * and wait for the dashboard.
 */
export async function finalizeRecap(page: Page): Promise<void> {
  await dismissRetirementCeremonies(page);
  await resolveCrisisIfPresent(page);
  await page.getByRole("button", { name: /Finalize Basho/i }).first().click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/** Advance the interim simulation by `days` via the calendar Day button. */
export async function advanceDays(page: Page, days: number): Promise<void> {
  const dayBtn = page
    .getByRole("button", { name: /Advance the simulation by one day/i })
    .first();
  const continueBtn = page.getByRole("button", { name: /Continue|Start Basho/i }).first();
  for (let i = 0; i < days; i++) {
    if (await dayBtn.isVisible().catch(() => false)) {
      await dayBtn.click();
    } else if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForTimeout(800);
  }
}

/** Resolve a blocking crisis/decision modal if one is currently displayed. Returns true if one was handled. */
export async function resolveCrisisIfPresent(page: Page): Promise<boolean> {
  if (!(await page.getByText(/Emergency Protocol/i).isVisible().catch(() => false))) {
    return false;
  }
  const optionBtn = page.locator('[role="dialog"]').getByRole("button").first();
  if (await optionBtn.isVisible().catch(() => false)) {
    await optionBtn.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Drive the active basho to the post-basho Recap page.
 *
 * Assumes the dashboard shows "Sim All". Clicks it, then loops:
 *   - resolves blocking crisis modals (they halt TICK_MULTIPLE_DAYS),
 *   - clicks "End Basho" once Day 15 resolves (the pipeline never
 *     auto-ends a basho),
 *   - resumes the fast path via dashboard Sim All if halted.
 * Returns once the Recap's "Finalize Basho" button is visible — the caller
 * is responsible for finalizing after verifying recap state.
 */
export async function driveBashoToRecap(page: Page): Promise<void> {
  const simAllBtn = page
    .getByRole("button", { name: /Automatically simulate the remainder/i })
    .first();
  await expect(simAllBtn).toBeVisible({ timeout: 10_000 });
  await simAllBtn.click();
  await page.waitForURL("**/basho", { timeout: 10_000 });

  const endBashoBtn = page.getByRole("button", { name: /^End Basho$/i }).first();
  const finalizeBtn = page.getByRole("button", { name: /Finalize Basho/i }).first();

  for (let i = 0; i < 30; i++) {
    if (
      (await page.getByText(/No Active Tournament/i).isVisible().catch(() => false)) ||
      (await finalizeBtn.isVisible().catch(() => false))
    ) {
      break;
    }

    if (await resolveCrisisIfPresent(page)) continue;

    if (await endBashoBtn.isVisible().catch(() => false)) {
      await endBashoBtn.click();
      await page.waitForTimeout(2000);
      continue;
    }

    if (!page.url().includes("/dashboard")) {
      const backBtn = page.getByRole("button", { name: /Dashboard/i }).first();
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    const dashSimAll = page
      .getByRole("button", { name: /Automatically simulate the remainder/i })
      .first();
    if (await dashSimAll.isVisible().catch(() => false)) {
      await dashSimAll.click();
      await page.waitForURL("**/basho", { timeout: 10_000 }).catch(() => {});
    }
    await page.waitForTimeout(6000);
  }

  await expect(finalizeBtn).toBeVisible({ timeout: 120_000 });
}
