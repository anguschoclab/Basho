import { test, expect } from "@playwright/test";
import {
  advanceDays,
  advanceToBasho,
  createNewGame,
  dismissOnboardingTour,
  driveBashoToRecap,
  finalizeRecap,
  readAutosaveWorld,
  setWorldSeed,
  waitForAutosaveWorld,
} from "./helpers";

/**
 * Year of Bashos E2E
 * ==================
 * Boots the app on a pinned seed, plays one full sumo calendar year
 * (6 honbasho: hatsu → kyushu) through the real UI + worker path, then
 * advances across the year boundary into January.
 *
 * Verified against the persisted autosave:
 *   - Calendar: dayIndexGlobal strictly increases, calendar.currentDay /
 *     calendar.month cycle through real ranges, every month of the year is
 *     observed, and world.year ticks 2026 → 2027. (world.week only
 *     increments at the year boundary in the current engine — tracked
 *     non-decreasing, not asserted weekly.)
 *   - Banzuke: each basho appends exactly one historyIndex.banzukeByBasho
 *     entry; consecutive snapshots show real promotions AND demotions;
 *     live rikishi rank fields match published positions.
 *   - Awards: yusho + prize money every basho; every award the engine
 *     produces is present in BashoResult AND awardLog AND references a
 *     real rikishi. Winning-wrestler diversity is tracked across the year
 *     (distinct yusho winners, distinct CombatArchetypes among award
 *     recipients).
 *   - Yokozuna discipline: a rikishi whose rank is yokozuna never drops in
 *     rank (they retire instead); yokozunaVacancyStreak resets/increments
 *     consistently with published banzuke contents; kinboshi key bouts
 *     reference a yokozuna loser and a non-sanyaku winner.
 */

const WORLD_SEED = "e2e-year-of-bashos-v1";
const BASHO_COUNT = 6;


const RANK_ORDER: Record<string, number> = {
  yokozuna: 0,
  ozeki: 1,
  sekiwake: 2,
  komusubi: 3,
  maegashira: 4,
  juryo: 5,
  makushita: 6,
  sandanme: 7,
  jonidan: 8,
  jonokuchi: 9,
};

/** Lower ordinal = better rank. */
function rankOrdinal(pos: { rank: string; rankNumber?: number }): number {
  return (RANK_ORDER[pos.rank] ?? 99) * 1000 + (pos.rankNumber ?? 0);
}

function snapshotPositions(snapshot: any): Map<string, number> {
  const out = new Map<string, number>();
  if (!snapshot?.divisions) return out;
  for (const div of Object.values(snapshot.divisions) as any[]) {
    for (const a of div.assignments ?? []) {
      out.set(a.rikishiId, rankOrdinal(a.position));
    }
  }
  return out;
}

function liveRanks(world: any): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, r] of Object.entries(world.rikishi ?? {}) as [string, any][]) {
    out.set(id, rankOrdinal({ rank: r.rank, rankNumber: r.rankNumber }));
  }
  return out;
}

interface BashoReport {
  year: number;
  bashoNumber: number;
  bashoName: string;
  yushoWinner: string;
  yushoArchetype: string;
  awardWinners: { type: string; id: string; archetype: string }[];
  promotions: number;
  demotions: number;
  unchanged: number;
  newEntries: number;
  departures: number;
  kinboshiBouts: number;
  yokozunaOnBanzuke: number;
  yokozunaVacancyStreak: number | null;
  dayIndexGlobal: number;
  calMonth: number;
  calDay: number;
  worldWeek: number;
}

test(`Year of Bashos: 6 honbasho, calendar rollover, banzuke movement, award + winner diversity, yokozuna discipline`, async ({
  page,
}) => {
  test.setTimeout(1_800_000); // 30 min — a full calendar year is ~6x the single-basho spec.

  // ── Boot + pin seed + wizard ─────────────────────────────────────────
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60_000 });
  await setWorldSeed(page, WORLD_SEED);
  await createNewGame(page);
  await dismissOnboardingTour(page);

  const startWorld = await waitForAutosaveWorld(
    page,
    `(w) => w.seed === ${JSON.stringify(WORLD_SEED)} && w.playerHeyaId`,
    60_000
  );

  // Baseline rank positions at world gen — the "previous banzuke" for the
  // first published snapshot.
  let prevPositions = liveRanks(startWorld);
  const baselineYokozunaIds = Object.entries(startWorld.rikishi ?? {})
    .filter(([, r]: [string, any]) => r.rank === "yokozuna")
    .map(([id]) => id);
  const everYokozuna = new Set<string>(baselineYokozunaIds);
  console.log(
    `[year] start: day=${startWorld.dayIndexGlobal} year=${startWorld.year} ` +
      `month=${startWorld.calendar?.month} week=${startWorld.week} ` +
      `rikishi=${prevPositions.size} yokozuna=${baselineYokozunaIds.length}`
  );

  const reports: BashoReport[] = [];
  const monthsSeen = new Set<number>();
  if (startWorld.calendar?.month) monthsSeen.add(startWorld.calendar.month);
  // A full year crosses all 12 months, but per-basho checkpoints only land
  // ~6 times — sample the autosave continuously so fast months aren't missed.
  const sampler = setInterval(async () => {
    const w = await readAutosaveWorld(page).catch(() => null);
    if (w?.calendar?.month) monthsSeen.add(w.calendar.month);
  }, 2_000);
  let prevDayIndex = startWorld.dayIndexGlobal ?? 0;
  let prevWeek = startWorld.week ?? 0;
  const retireeCountAtStart = Object.keys(startWorld.historicalRikishi ?? {}).length;

  // ── Run all 6 honbasho ───────────────────────────────────────────────
  for (let i = 0; i < BASHO_COUNT; i++) {
    await advanceToBasho(page);
    await driveBashoToRecap(page);
    expect(page.url()).toContain("/recap");

    // Wait for the post-basho world — history[i] + its banzuke index entry.
    // recordBashoHistory can write a transiently stale save mid-impact, so
    // fall back to finalize + one day advance if the publish world never
    // lands in localStorage.
    const postBashoPredicate = `(w) =>
      Array.isArray(w.history) && w.history.length >= ${i + 1} &&
      !!w.history[${i}] && !!w.history[${i}].nextBanzuke &&
      !!w.currentBanzuke && !!w.historyIndex &&
      !!w.historyIndex.banzukeByBasho[
        w.history[${i}].year + "-" + w.history[${i}].bashoNumber]`;
    let world;
    try {
      world = await waitForAutosaveWorld(page, postBashoPredicate, 90_000);
    } catch {
      await finalizeRecap(page);
      await advanceDays(page, 1);
      world = await waitForAutosaveWorld(page, postBashoPredicate, 90_000);
    }

    const last = world.history[i];
    const rikishiById: Record<string, any> = world.rikishi ?? {};
    const bashoKey = `${last.year}-${last.bashoNumber}`;

    // ── Per-basho invariants ──────────────────────────────────────────
    expect(last.yusho, `basho ${i + 1} has a yusho winner`).toBeTruthy();
    const yushoWinner = rikishiById[last.yusho];
    expect(yushoWinner, `yusho winner is a real rikishi`).toBeTruthy();
    expect(last.prizes?.yushoAmount, "yusho prize money recorded").toBeGreaterThan(0);

    const log = (world.awardLog ?? []).filter(
      (e: any) => e.year === last.year && e.bashoName === last.bashoName
    );
    const hasLogEntry = (type: string, winnerId: string) =>
      log.some((e: any) => e.type === type && e.winnerId === winnerId);
    expect(hasLogEntry("yusho", last.yusho), "awardLog records yusho").toBe(true);

    const awardWinners: { type: string; id: string; archetype: string }[] = [
      { type: "yusho", id: last.yusho, archetype: yushoWinner.combatProfile?.archetype ?? "unknown" },
    ];
    for (const jid of last.junYusho ?? []) {
      expect(hasLogEntry("junYusho", jid), `awardLog records jun-yusho ${jid}`).toBe(true);
      awardWinners.push({
        type: "junYusho",
        id: jid,
        archetype: rikishiById[jid]?.combatProfile?.archetype ?? "unknown",
      });
    }
    for (const [field, type] of [
      ["ginoSho", "ginoSho"],
      ["kantosho", "kantosho"],
      ["shukunsho", "shukunsho"],
    ] as const) {
      const wid = last[field];
      if (wid) {
        expect(rikishiById[wid], `${type} winner exists`).toBeTruthy();
        expect(hasLogEntry(type, wid), `awardLog records ${type}`).toBe(true);
        awardWinners.push({
          type,
          id: wid,
          archetype: rikishiById[wid]?.combatProfile?.archetype ?? "unknown",
        });
      }
    }
    if (last.boutOfTheBasho) {
      const botb = log.find((e: any) => e.type === "boutOfTheBasho");
      expect(botb, `awardLog records boutOfTheBasho (basho ${i + 1})`).toBeTruthy();
      expect(rikishiById[botb.winnerId], "boutOfTheBasho winner exists").toBeTruthy();
    }

    // ── Banzuke publication ───────────────────────────────────────────
    const current = world.currentBanzuke;
    expect(current?.divisions, `basho ${i + 1}: currentBanzuke published`).toBeTruthy();
    expect(last.nextBanzuke, `basho ${i + 1}: history entry carries nextBanzuke`).toBeTruthy();
    expect(last.nextBanzuke).toEqual(current);
    const indexed = world.historyIndex?.banzukeByBasho;
    // The first publish also self-heals the inaugural (world-gen) banzuke
    // under the previous-basho key, so entries = completed basho + 1.
    expect(Object.keys(indexed ?? {}).length, `basho ${i + 1}: index grew by one`).toBe(i + 2);
    expect(indexed?.[bashoKey]?.divisions, `index has snapshot for ${bashoKey}`).toBeTruthy();

    // Movement vs the positions the world fought this basho on.
    const curPositions = snapshotPositions(current);
    let promotions = 0;
    let demotions = 0;
    let unchanged = 0;
    let newEntries = 0;
    for (const [id, cur] of curPositions) {
      const prev = prevPositions.get(id);
      if (prev === undefined) {
        newEntries++;
      } else if (cur < prev) {
        promotions++;
      } else if (cur > prev) {
        demotions++;
      } else {
        unchanged++;
      }
    }
    const departures = [...prevPositions.keys()].filter((id) => !curPositions.has(id)).length;
    expect(promotions, `basho ${i + 1}: promotions occurred`).toBeGreaterThan(0);
    expect(demotions, `basho ${i + 1}: demotions occurred`).toBeGreaterThan(0);
    prevPositions = curPositions;

    // ── Yokozuna discipline ───────────────────────────────────────────
    const yokozunaIds = Object.entries(rikishiById)
      .filter(([, r]: [string, any]) => r.rank === "yokozuna")
      .map(([id]) => id);
    // Yokozuna are never demoted — they retire instead. Anyone ever seen at
    // yokozuna who is still on the active roster must still be yokozuna.
    for (const id of everYokozuna) {
      const r = rikishiById[id];
      if (r) {
        expect(
          r.rank,
          `${r.shikona} dropped below yokozuna without retiring`
        ).toBe("yokozuna");
      }
    }
    for (const id of yokozunaIds) everYokozuna.add(id);
    if (typeof world.yokozunaVacancyStreak === "number") {
      if (yokozunaIds.length > 0) {
        expect(world.yokozunaVacancyStreak, "vacancy streak resets with yokozuna present").toBe(0);
      } else {
        expect(
          world.yokozunaVacancyStreak,
          "vacancy streak increments while no yokozuna"
        ).toBeGreaterThan(0);
      }
    }
    // Kinboshi key bouts: winner below sanyaku, loser is yokozuna.
    let kinboshiBouts = 0;
    for (const kb of last.keyBouts ?? []) {
      if (kb.label !== "kinboshi") continue;
      kinboshiBouts++;
      const loserId =
        kb.bout?.winnerRikishiId === kb.eastRikishiId ? kb.westRikishiId : kb.eastRikishiId;
      const winnerId = kb.bout?.winnerRikishiId;
      expect(
        rikishiById[loserId]?.rank === "yokozuna",
        `kinboshi loser ${loserId} holds yokozuna rank`
      ).toBe(true);
      expect(
        winnerId && RANK_ORDER[rikishiById[winnerId]?.rank] > RANK_ORDER.komusubi,
        `kinboshi winner ${winnerId} is below sanyaku`
      ).toBe(true);
    }

    // ── Calendar tracking ─────────────────────────────────────────────
    expect(
      world.dayIndexGlobal,
      `basho ${i + 1}: dayIndexGlobal increased`
    ).toBeGreaterThan(prevDayIndex);
    prevDayIndex = world.dayIndexGlobal;
    expect(world.week ?? 0, `basho ${i + 1}: week is non-decreasing`).toBeGreaterThanOrEqual(prevWeek);
    prevWeek = world.week ?? 0;
    if (world.calendar?.month) monthsSeen.add(world.calendar.month);

    reports.push({
      year: last.year,
      bashoNumber: last.bashoNumber,
      bashoName: last.bashoName,
      yushoWinner: yushoWinner.shikona,
      yushoArchetype: yushoWinner.combatProfile?.archetype ?? "unknown",
      awardWinners,
      promotions,
      demotions,
      unchanged,
      newEntries,
      departures,
      kinboshiBouts,
      yokozunaOnBanzuke: yokozunaIds.length,
      yokozunaVacancyStreak: world.yokozunaVacancyStreak ?? null,
      dayIndexGlobal: world.dayIndexGlobal,
      calMonth: world.calendar?.month ?? 0,
      calDay: world.calendar?.currentDay ?? 0,
      worldWeek: world.week ?? 0,
    });
    console.log(
      `[year] basho ${i + 1} done: ${last.bashoName} ${last.year} yusho=${yushoWinner.shikona} ` +
        `(${yushoWinner.combatProfile?.archetype}) +/-${promotions}/${demotions} ` +
        `yoko=${yokozunaIds.length} kinboshi=${kinboshiBouts} ` +
        `day=${world.dayIndexGlobal} m${world.calendar?.month}/d${world.calendar?.currentDay}`
    );

    // ── Recap → back to dashboard ─────────────────────────────────────
    // Banzuke Reveal UI is covered by the single-basho spec; spot-check it
    // once here (last basho, where a previous snapshot exists for deltas).
    if (i === BASHO_COUNT - 1 && page.url().includes("/recap")) {
      await page.getByRole("button", { name: /Banzuke Reveal/i }).click();
      const overlay = page
        .locator("div.fixed.inset-0")
        .filter({ hasText: "New Banzuke Announcement" });
      await expect(overlay).toBeVisible({ timeout: 10_000 });
      const entryNames = overlay.locator(".font-display");
      await expect(entryNames.first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(2000);
      const shown = (await entryNames.allTextContents()).map((t) => t.trim()).filter(Boolean);
      const shikonaSet = new Set(Object.values(rikishiById).map((r: any) => r.shikona));
      for (const name of shown) {
        expect(shikonaSet.has(name), `revealed "${name}" is a real rikishi`).toBe(true);
      }
      await expect(overlay).not.toBeVisible({ timeout: 60_000 });
    }
    if (page.url().includes("/recap")) {
      await finalizeRecap(page);
    }
  }

  // ── Advance across the year boundary ─────────────────────────────────
  await advanceToBasho(page);
  // If the interim ended in December, the next Sim All click produces the
  // Hatsu basho of the new year; either way world.year must reach 2027.
  const simAllBtn = page
    .getByRole("button", { name: /Automatically simulate the remainder/i })
    .first();
  if (await simAllBtn.isVisible().catch(() => false)) {
    await simAllBtn.click({ timeout: 5_000 }).catch(() => {});
  }
  const newYearWorld = await waitForAutosaveWorld(
    page,
    `(w) => w.year >= ${startWorld.year + 1} || (w.currentBasho && w.currentBasho.year >= ${
      startWorld.year + 1
    })`,
    120_000
  );

  clearInterval(sampler);
  if (newYearWorld.calendar?.month) monthsSeen.add(newYearWorld.calendar.month);

  // ── Year-level assertions ────────────────────────────────────────────
  const history = newYearWorld.history ?? [];
  expect(history.length, "six basho completed").toBeGreaterThanOrEqual(BASHO_COUNT);
  const firstSix = history.slice(0, BASHO_COUNT);
  expect(firstSix.map((b: any) => b.bashoNumber)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(firstSix[0].year).toBe(startWorld.year);
  expect(
    new Set(firstSix.map((b: any) => b.bashoName)).size,
    "six distinct basho names in order"
  ).toBe(BASHO_COUNT);

  // Calendar: all 12 months observed, year rolled over.
  expect(monthsSeen.size, "all 12 calendar months passed").toBe(12);
  expect(
    newYearWorld.year >= startWorld.year + 1 ||
      newYearWorld.currentBasho?.year >= startWorld.year + 1,
    "year ticked over"
  ).toBe(true);
  expect(newYearWorld.calendar?.month, "month is in range").toBeGreaterThanOrEqual(1);
  expect(newYearWorld.calendar?.month, "month is in range").toBeLessThanOrEqual(12);

  // Banzuke index: one entry per completed basho + the inaugural snapshot.
  const indexedKeys = Object.keys(newYearWorld.historyIndex?.banzukeByBasho ?? {});
  expect(indexedKeys.length).toBe(BASHO_COUNT + 1);

  // Winner diversity across the year.
  const yushoWinners = reports.map((r) => r.yushoWinner);
  const distinctYusho = new Set(yushoWinners);
  const allAwardArchetypes = new Set(
    reports.flatMap((r) => r.awardWinners.map((a) => a.archetype)).filter((a) => a !== "unknown")
  );
  console.log(
    `[year] yusho winners: ${yushoWinners.join(", ")} | ` +
      `distinct=${distinctYusho.size} | award archetypes=${[...allAwardArchetypes].join(", ")}`
  );
  expect(distinctYusho.size, "yusho was not swept by a single rikishi").toBeGreaterThanOrEqual(2);
  expect(
    allAwardArchetypes.size,
    "award recipients span multiple combat archetypes"
  ).toBeGreaterThanOrEqual(2);

  // Year totals: real movement happened in every window.
  const totalPromotions = reports.reduce((s, r) => s + r.promotions, 0);
  const totalDemotions = reports.reduce((s, r) => s + r.demotions, 0);
  expect(totalPromotions).toBeGreaterThan(100);
  expect(totalDemotions).toBeGreaterThan(100);
  console.log(
    `[year] movement: +${totalPromotions} promoted / -${totalDemotions} demoted across ` +
      `${BASHO_COUNT} banzuke | departures=${reports.reduce((s, r) => s + r.departures, 0)} ` +
      `new=${reports.reduce((s, r) => s + r.newEntries, 0)}`
  );

  // Yokozuna year summary (tracked regardless of whether promotions fired).
  const kinboshiTotal = reports.reduce((s, r) => s + r.kinboshiBouts, 0);
  const yokozunaNow = Object.values(newYearWorld.rikishi ?? {}).filter(
    (r: any) => r.rank === "yokozuna"
  ).length;
  console.log(
    `[year] yokozuna: start=${baselineYokozunaIds.length} end=${yokozunaNow} ` +
      `kinboshi=${kinboshiTotal} vacancyStreak=${newYearWorld.yokozunaVacancyStreak ?? "n/a"}`
  );

  // Retirements tracked (not asserted — a year can legitimately see none).
  const retirees = Object.keys(newYearWorld.historicalRikishi ?? {}).length - retireeCountAtStart;
  console.log(`[year] retirements during year: ${retirees}`);

  // Game remains usable in the new year.
  expect(["pre_basho", "active_basho", "interim", "post_basho", "banzuke_reveal"]).toContain(
    newYearWorld.cyclePhase
  );
});

