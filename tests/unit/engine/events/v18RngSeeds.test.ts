import { describe, it, expect, beforeAll } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { BardEngine } from "@/engine/bard/BardEngine";
import type { WorldState } from "@/engine/types/world";
import type { NarrativeContext } from "@/engine/types/events";

import {
  medicalReportBase,
  lifecycleEvent,
  lifecycleAction,
} from "@/engine/events/domains/medical";
import {
  financialAlert,
  monthlyFinanceReport,
  financialAction,
} from "@/engine/events/domains/economy";
import {
  governanceRuling,
  welfareCompliance,
  oyakataMoodShift,
  managementDecision,
  strategyShift,
  prestigeEvent,
  facilityUpdate,
  rosterEvent,
} from "@/engine/events/domains/stable";
import {
  awardConferred,
  rivalryHeatSpike,
  bashoStatus,
  boutResolved,
} from "@/engine/events/domains/basho";
import { trainingUpdate, recruitDiscovered } from "@/engine/events/domains/development";
import { PostBashoPressService } from "@/engine/narrative/PostBashoPressService";

/**
 * V18-S5-1 failing-first regression pins — cross-seed RNG correlation.
 *
 * `createRngForEvent` (src/engine/events/helpers.ts:11) builds its seed label as
 * `${seedPrefix}-${world.year}-${world.week}` — `world.seed` never participates.
 * Several domains additionally bypass it with bare `rngFromSeed(label)` calls
 * that carry NO world context at all (no seed, no year, no week). Consequence:
 * two worlds that differ ONLY in `seed` mint byte-identical narrative text —
 * the "different universe" promise of a new game seed is void for these streams.
 *
 * Pinned call sites (all verified to draw from the rng via BardEngine.resolve /
 * rng.next — no pure-function sites pinned):
 *
 *   Via createRngForEvent (year+week but no seed):
 *   - domains/medical.ts    medicalReportBase :22, lifecycleEvent :48
 *   - domains/economy.ts    financialAlert :19, monthlyFinanceReport :44
 *   - domains/stable.ts     governanceRuling :25, welfareCompliance :51,
 *                           oyakataMoodShift :77, managementDecision :109,
 *                           strategyShift :135, prestigeEvent :221
 *   - domains/basho.ts      awardConferred :76, rivalryHeatSpike :102
 *   - domains/development.ts trainingUpdate :16, recruitDiscovered :42
 *
 *   Bare rngFromSeed — no world context whatsoever:
 *   - domains/stable.ts     facilityUpdate :167, rosterEvent :194
 *   - domains/economy.ts    financialAction :77
 *   - domains/medical.ts    lifecycleAction :79
 *   - domains/basho.ts      bashoStatus :17, boutResolved :42
 *   - narrative/PostBashoPressService.ts generatePressConference :38
 *     (`press-${bashoName}-${year}` — same basho+year identical across seeds)
 *
 * Correctly-seeded reference (NOT pinned — control evidence): event ids minted
 * by logEngineEvent via rngForWorld already differ across seeds; RNGRegistry.
 * getSystemRNG also folds world.seed in. The bug is confined to the sites above.
 *
 * Determinism note: each test emits ≥6 draws across multi-variant template
 * paths, so post-fix coincidental re-picks across the whole stream are
 * ~1e-7-likely; a RED run today is guaranteed because the seeds never differ.
 */

const CTX: NarrativeContext = {
  heyaId: "heya-1",
  rikishiId: "r1",
  heya: "Kokonoe",
  heyaname: "Kokonoe",
  shikona: "Riki",
  winner: "Riki",
  loser: "Tora",
  rival: "Tora",
  kimarite: "yorikiri",
  day: 5,
  wins: 9,
  losses: 6,
  status: "updated",
  incident: "insolvency",
  heat: 60,
  newMood: "furious",
  money: -1000000,
};

function twinWorlds(seedA: string, seedB: string): [WorldState, WorldState] {
  const build = (seed: string) => {
    const heya = MockFactory.createHeya("heya-1", { rikishiIds: ["r1", "r2"] });
    const r1 = MockFactory.createRikishi("r1", { heyaId: "heya-1" });
    const r2 = MockFactory.createRikishi("r2", { heyaId: "heya-1" });
    return MockFactory.createWorld({
      seed,
      year: 2025,
      week: 12,
      dayIndexGlobal: 90,
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      playerHeyaId: "heya-1",
    });
  };
  return [build(seedA), build(seedB)];
}

type Ev = { title: string; summary: string } | undefined;

function texts(events: Ev[]): string[] {
  return events.map((e) => `${e?.title} | ${e?.summary}`);
}

function assertSeedsDiverge(streamA: Ev[], streamB: Ev[], domain: string) {
  // Guard: the production path actually produced narrative text (not a mock
  // short-circuit or a dedupe black hole).
  const produced = texts(streamA).filter((t) => t.length > 3);
  expect(
    produced.length,
    `${domain}: expected the event stream to produce real titles/summaries`
  ).toBeGreaterThanOrEqual(streamA.length);
  // The pin: identical worlds differing only in `seed` must not mint identical text.
  expect(
    texts(streamB),
    `${domain}: identical year/week/entity but different world.seed produced an ` +
      "identical narrative stream — the event rng label omits world.seed"
  ).not.toEqual(texts(streamA));
}

beforeAll(async () => {
  await BardEngine.loadDomains();
});

describe("cross-seed narrative divergence (V18-S5-1)", () => {
  it("domains/medical.ts — medicalReportBase / lifecycleEvent / lifecycleAction", () => {
    const [a, b] = twinWorlds("seed-alpha", "seed-beta");
    const run = (w: WorldState): Ev[] => [
      medicalReportBase(w, { ...CTX, status: "injured" }, "major"),
      medicalReportBase(w, { ...CTX, status: "recovered" }, "minor"),
      medicalReportBase(w, { ...CTX, status: "cleared" }, "notable"),
      lifecycleEvent(w, { ...CTX, status: "retirement" }),
      lifecycleEvent(w, { ...CTX, status: "debut" }),
      lifecycleAction(w, { ...CTX, status: "naturalization" }, "naturalization"),
      lifecycleAction(w, { ...CTX, rikishiId: undefined }, "merger"),
    ];
    assertSeedsDiverge(run(a), run(b), "medical.ts");
  });

  it("domains/economy.ts — financialAlert / monthlyFinanceReport / financialAction", () => {
    const [a, b] = twinWorlds("seed-alpha", "seed-beta");
    const run = (w: WorldState): Ev[] => [
      financialAlert(w, "heya-1", { ...CTX, incident: "insolvency" }),
      financialAlert(w, "heya-1", { ...CTX, incident: "deficit" }),
      financialAlert(w, "heya-1", { ...CTX, incident: "loan_default" }),
      // Seed label is name-based (`finance-tick-${data.heya}`) — vary the
      // supplied name so the two calls draw from distinct rng streams.
      monthlyFinanceReport(w, { ...CTX, heya: "Kokonoe" }),
      monthlyFinanceReport(w, { ...CTX, heya: "Isegahama" }),
      financialAction(w, "heya-1", { ...CTX }, "loan"),
      financialAction(w, "heya-1", { ...CTX }, "market"),
    ];
    assertSeedsDiverge(run(a), run(b), "economy.ts");
  });

  it("domains/stable.ts — governanceRuling / welfareCompliance / oyakataMoodShift / managementDecision / strategyShift / prestigeEvent / facilityUpdate / rosterEvent", () => {
    const [a, b] = twinWorlds("seed-alpha", "seed-beta");
    const run = (w: WorldState): Ev[] => [
      governanceRuling(w, "heya-1", { ...CTX, incident: "curfew_violation" }),
      governanceRuling(w, "heya-1", { ...CTX, incident: "assault" }),
      welfareCompliance(w, "heya-1", { ...CTX, status: "watch" }),
      welfareCompliance(w, "heya-1", { ...CTX, status: "sanctioned" }),
      oyakataMoodShift(w, "heya-1", { ...CTX }),
      managementDecision(w, "heya-1", { ...CTX, decision: "training_push" }),
      strategyShift(w, "heya-1", { ...CTX }),
      prestigeEvent(w, "heya-1", { ...CTX }),
      facilityUpdate(w, "heya-1", { ...CTX }, "UPGRADED"),
      facilityUpdate(w, "heya-1", { ...CTX }, "DEGRADED"),
      rosterEvent(w, "heya-1", { ...CTX }),
    ];
    assertSeedsDiverge(run(a), run(b), "stable.ts");
  });

  it("domains/basho.ts — awardConferred / rivalryHeatSpike / bashoStatus / boutResolved", () => {
    const [a, b] = twinWorlds("seed-alpha", "seed-beta");
    const run = (w: WorldState): Ev[] => [
      awardConferred(w, { ...CTX, status: "shukunsho" }),
      rivalryHeatSpike(w, {
        ...CTX,
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        heat: 80,
      }),
      bashoStatus(w, { ...CTX, status: "day_update", day: 5 }),
      bashoStatus(w, { ...CTX, status: "day_update", day: 9 }),
      bashoStatus(w, { ...CTX, status: "ended", day: 15 }),
      boutResolved(w, {
        ...CTX,
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        day: 5,
      }),
      boutResolved(w, {
        ...CTX,
        winnerRikishiId: "r2",
        loserRikishiId: "r1",
        day: 9,
        upset: true,
      }),
    ];
    assertSeedsDiverge(run(a), run(b), "basho.ts");
  });

  it("domains/development.ts — trainingUpdate / recruitDiscovered", () => {
    const [a, b] = twinWorlds("seed-alpha", "seed-beta");
    const run = (w: WorldState): Ev[] => [
      trainingUpdate(w, { ...CTX, rikishiId: "r1" }),
      trainingUpdate(w, { ...CTX, rikishiId: "r2" }),
      recruitDiscovered(w, { ...CTX, rikishiId: "r1" }),
      recruitDiscovered(w, { ...CTX, rikishiId: "r2" }),
    ];
    assertSeedsDiverge(run(a), run(b), "development.ts");
  });

  it("narrative/PostBashoPressService.ts — generatePressConference", () => {
    const champion = MockFactory.createRikishi("champ", {
      heyaId: "heya-1",
      shikona: "Champion A",
      rank: "ozeki",
      division: "makuuchi",
      pressPersona: "stoic",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      careerHistory: [],
    });
    const build = (seed: string) =>
      MockFactory.createWorld({
        seed,
        year: 2025,
        rikishi: new Map([["champ", champion]]),
        heyas: new Map([["heya-1", MockFactory.createHeya("heya-1")]]),
      });
    const ctx = { yushoId: "champ", junYushoIds: [], bashoName: "hatsu", year: 2025 };

    const linesA = PostBashoPressService.generatePressConference(build("seed-alpha"), ctx);
    const linesB = PostBashoPressService.generatePressConference(build("seed-beta"), ctx);

    expect(linesA.length, "press lines must be produced").toBeGreaterThan(0);
    expect(
      linesB.map((l) => l.text),
      "post-basho press stream is seeded by basho+year only — two different " +
        "world seeds mint identical conferences"
    ).not.toEqual(linesA.map((l) => l.text));
  });
});
