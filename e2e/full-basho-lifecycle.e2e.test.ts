import { test, expect } from "@playwright/test";
import {
  advanceToBasho,
  createNewGame,
  dismissOnboardingTour,
  driveBashoToRecap,
  resolveCrisisIfPresent,
  setWorldSeed,
  waitForAutosaveWorld,
} from "./helpers";

/**
 * Full Basho Lifecycle E2E
 * ========================
 * Boots the app, pins a deterministic seed, creates a new game, runs one
 * complete 15-day basho via the worker fast path, resolves blocking
 * decision gates, ends the basho, and verifies — against the persisted
 * autosave — that:
 *   - the yusho and every award the engine produced are fully recorded
 *     (BashoResult + awardLog + real rikishi recipients),
 *   - the new banzuke was published (currentBanzuke, history.nextBanzuke,
 *     historyIndex.banzukeByBasho) and matches live rikishi rank fields,
 *   - the Banzuke Reveal shows real entries (no fabricated fallback data),
 *   - the recap finalizes back into a usable dashboard.
 *
 * Award categories jun-yusho / sansho / kinboshi are eligibility-gated:
 * they are asserted against whatever the pinned seed actually produced,
 * not assumed to fire for every seed.
 */

const WORLD_SEED = "e2e-basho-lifecycle-v1";

/* eslint-disable @typescript-eslint/no-explicit-any */

function awardLogFor(awardLog: any[] | undefined, year: number, bashoName: string): any[] {
  return (awardLog ?? []).filter((e) => e.year === year && e.bashoName === bashoName);
}

test("Full Basho Lifecycle: seed -> wizard -> 15-day basho -> awards + banzuke publication -> recap -> dashboard", async ({
  page,
}) => {
  test.setTimeout(600_000);

  // ── 1. Boot + pin seed ────────────────────────────────────────────────
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60_000 });
  await setWorldSeed(page, WORLD_SEED);

  // ── 2. New game wizard → dashboard ────────────────────────────────────
  await createNewGame(page);
  await dismissOnboardingTour(page);

  // ── 3. Advance to the basho and run it to the recap ───────────────────
  await advanceToBasho(page);
  await driveBashoToRecap(page);
  expect(page.url()).toContain("/recap");

  // ── 4. Wait for a stable post-basho autosave ──────────────────────────
  // recordBashoHistory can write a transiently stale save mid-impact;
  // poll until the snapshot/index fields prove the publish fully landed.
  const world = await waitForAutosaveWorld(
    page,
    `(w) =>
      Array.isArray(w.history) && w.history.length >= 1 &&
      !!w.history[w.history.length - 1].nextBanzuke &&
      !!w.currentBanzuke &&
      !!w.historyIndex`
  );

  const last = world.history[world.history.length - 1];
  const rikishiById: Record<string, any> = world.rikishi ?? {};
  const bashoKey = `${last.year}-${last.bashoNumber}`;

  // ── 5. Awards: engine output is fully recorded ────────────────────────
  // Guaranteed: yusho + prize money.
  expect(last.yusho, "completed basho has a yusho winner").toBeTruthy();
  const yushoWinner = rikishiById[last.yusho];
  expect(yushoWinner, `yusho winner ${last.yusho} is a real rikishi`).toBeTruthy();
  expect(last.prizes?.yushoAmount, "yusho prize money recorded").toBeGreaterThan(0);

  const log = awardLogFor(world.awardLog, last.year, last.bashoName);
  const hasLogEntry = (type: string, winnerId: string, boutId?: string) =>
    log.some(
      (e) => e.type === type && e.winnerId === winnerId && (boutId === undefined || e.boutId === boutId)
    );

  expect(
    hasLogEntry("yusho", last.yusho),
    "awardLog records the yusho winner"
  ).toBe(true);

  // Conditional awards: whatever the pinned seed produced must be logged.
  for (const jid of last.junYusho ?? []) {
    expect(rikishiById[jid], `jun-yusho ${jid} is a real rikishi`).toBeTruthy();
    expect(hasLogEntry("junYusho", jid), `awardLog records jun-yusho ${jid}`).toBe(true);
  }
  for (const [field, type] of [
    ["ginoSho", "ginoSho"],
    ["kantosho", "kantosho"],
    ["shukunsho", "shukunsho"],
  ] as const) {
    const winnerId = last[field];
    if (winnerId) {
      expect(rikishiById[winnerId], `${type} ${winnerId} is a real rikishi`).toBeTruthy();
      expect(hasLogEntry(type, winnerId), `awardLog records ${type}`).toBe(true);
    }
  }
  if (last.boutOfTheBasho) {
    const botb = log.find((e) => e.type === "boutOfTheBasho");
    expect(botb, "awardLog records bout of the basho").toBeTruthy();
    expect(botb.winnerId && rikishiById[botb.winnerId]).toBeTruthy();
  }
  if (last.keyBouts?.length) {
    for (const kb of last.keyBouts) {
      expect(
        rikishiById[kb.eastRikishiId] && rikishiById[kb.westRikishiId],
        `key bout ${kb.label} references real rikishi`
      ).toBeTruthy();
    }
  }
  // Every award-log recipient for this basho is a real rikishi.
  for (const e of log) {
    expect(rikishiById[e.winnerId], `award recipient ${e.winnerId} (${e.type}) exists`).toBeTruthy();
  }

  // ── 6. Banzuke publication ────────────────────────────────────────────
  const current = world.currentBanzuke;
  const next = last.nextBanzuke;
  expect(current?.divisions, "world.currentBanzuke published").toBeTruthy();
  expect(next?.divisions, "history entry carries nextBanzuke").toBeTruthy();
  // currentBanzuke IS the snapshot the completed basho produced.
  expect(next).toEqual(current);

  const indexed = world.historyIndex?.banzukeByBasho?.[bashoKey];
  expect(indexed?.divisions, `historyIndex has snapshot for ${bashoKey}`).toBeTruthy();

  // Assignments correspond to actual rikishi with coherent rank fields.
  let assignmentCount = 0;
  let movedCount = 0;
  const prevKey =
    last.bashoNumber === 1 ? `${last.year - 1}-6` : `${last.year}-${last.bashoNumber - 1}`;
  const foughtOn = world.historyIndex?.banzukeByBasho?.[prevKey];
  const foughtOnPos = new Map<string, string>();
  if (foughtOn?.divisions) {
    for (const div of Object.values(foughtOn.divisions) as any[]) {
      for (const a of div.assignments ?? []) {
        foughtOnPos.set(a.rikishiId, `${a.position.rank}:${a.position.side}:${a.position.rankNumber ?? 0}`);
      }
    }
  }
  for (const [division, div] of Object.entries(current.divisions) as [string, any][]) {
    expect(div.assignments.length, `${division} has assignments`).toBeGreaterThan(0);
    for (const a of div.assignments) {
      assignmentCount++;
      const r = rikishiById[a.rikishiId];
      expect(r, `assigned rikishi ${a.rikishiId} exists`).toBeTruthy();
      // Live rank fields were updated by publishBanzukeUpdate.
      expect(r.rank).toBe(a.position.rank);
      if (a.position.rankNumber != null && r.rankNumber != null) {
        expect(r.rankNumber).toBe(a.position.rankNumber);
      }
      const prev = foughtOnPos.get(a.rikishiId);
      const cur = `${a.position.rank}:${a.position.side}:${a.position.rankNumber ?? 0}`;
      if (prev !== undefined && prev !== cur) movedCount++;
    }
  }
  expect(assignmentCount).toBeGreaterThan(100); // full banzuke, not a stub
  if (foughtOn) {
    expect(movedCount, "the new banzuke actually moved rikishi").toBeGreaterThan(0);
  }

  // ── 7. Banzuke Reveal UI shows real entries ───────────────────────────
  const shikonaSet = new Set(Object.values(rikishiById).map((r: any) => r.shikona));
  await page.getByRole("button", { name: /Banzuke Reveal/i }).click();
  const overlay = page.locator("div.fixed.inset-0").filter({ hasText: "New Banzuke Announcement" });
  await expect(overlay).toBeVisible({ timeout: 10_000 });
  // Entries stream in every ~800ms; wait for at least one to appear.
  const entryNames = overlay.locator(".font-display");
  await expect(entryNames.first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2500); // let a few entries land
  const shown = (await entryNames.allTextContents()).map((t) => t.trim()).filter(Boolean);
  expect(shown.length, "reveal displays real entries").toBeGreaterThan(0);
  for (const name of shown) {
    expect(shikonaSet.has(name), `revealed "${name}" is a real rikishi`).toBe(true);
  }
  // Overlay auto-completes after the last entry (~1s + n*800ms + 2s).
  await expect(overlay).not.toBeVisible({ timeout: 60_000 });

  // ── 8. Recap surfaces the yusho winner ────────────────────────────────
  await expect(page.getByText(yushoWinner.shikona).first()).toBeVisible({ timeout: 10_000 });

  // ── 9. Dismiss retirement ceremonies if queued, then finalize ─────────
  for (let i = 0; i < 10; i++) {
    const ackBtn = page.getByRole("button", { name: /Acknowledge Retirement/i }).first();
    if (await ackBtn.isVisible().catch(() => false)) {
      await ackBtn.click();
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }
  await resolveCrisisIfPresent(page);

  await page.getByRole("button", { name: /Finalize Basho/i }).first().click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

  // Game remains usable: interim continues, autosave reflects post-basho world.
  const finalWorld = await waitForAutosaveWorld(
    page,
    `(w) => Array.isArray(w.history) && w.history.length >= 1 && !w.currentBasho`,
    30_000
  );
  expect(finalWorld.cyclePhase).not.toBe("active_basho");
});
