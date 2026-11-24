import { describe, it, expect } from "vitest";
import { KIMARITE_REGISTRY, getKimariteCount } from "@/engine/bout/kimarite/kimariteRegistry";
import { projectCohortStats } from "@/presenters/projections/kachiNokori";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { perceivedTalentSeed } from "@/engine/recruitment/perceivedTalent";
import { createPlan } from "@/engine/npc/StrategicPlanner";
import { buildSwissTorikumi } from "@/engine/matchmaking/index";
import { DynastyService } from "@/engine/legacy/DynastyService";
import { runHistoryUpdates } from "@/engine/history/history";
import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import { BloodlineService } from "@/engine/legacy/BloodlineService";
import { applyWeeklyDegeiko } from "@/engine/training/DegeikoService";
import { projectCornerAdvice } from "@/presenters/projections/cornerAdviceProjection";
import type { AIContext } from "@/engine/npc/types";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BashoState, BoutResult } from "@/engine/types/basho";
import type { CareerSnapshot } from "@/engine/types/history";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Staff } from "@/engine/types/staff";
import type { Division } from "@/engine/types/banzuke";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

/**
 * Equivalence pins for the Bolt optimization PRs (#919, #939, #944).
 * These tests characterize CURRENT behavior; after the .filter()/.sort()
 * → manual-loop conversions land, every assertion must stay green.
 * They intentionally compute expectations independently where cheap,
 * and pin exact observable outputs where not.
 */

describe("getKimariteCount (PR #939)", () => {
  it("counts registry entries excluding fusensho, hansoku, and Hiwaza category", () => {
    const expected = KIMARITE_REGISTRY.filter(
      (k) => k.id !== "fusensho" && k.id !== "hansoku" && k.jsaCategory !== "Hiwaza"
    ).length;
    expect(getKimariteCount()).toBe(expected);
    expect(getKimariteCount()).toBeGreaterThan(0);
  });
});

describe("projectCohortStats (PR #944)", () => {
  function mkRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
    return MockFactory.createRikishi(id, {
      rank: "maegashira",
      currentBashoWins: 0,
      currentBashoLosses: 0,
      ...overrides,
    });
  }

  it("counts only non-retired, ranked rikishi in total", () => {
    const cohort = [
      mkRikishi("a", { currentBashoWins: 8 }), // kachi-koshi (makuuchi threshold 8)
      mkRikishi("b", { currentBashoLosses: 8 }), // make-koshi
      mkRikishi("c"), // 0-0, neither
      mkRikishi("d", { isRetired: true, currentBashoWins: 15 }), // excluded
      mkRikishi("e", { rank: undefined as unknown as Rikishi["rank"] }), // excluded
    ];
    const stats = projectCohortStats(cohort);
    expect(stats.total).toBe(3);
    expect(stats.kachiKoshi).toBe(1);
    expect(stats.makeKoshi).toBe(1);
  });

  it("handles empty and all-retired cohorts", () => {
    const empty = { total: 0, kachiKoshi: 0, makeKoshi: 0, inContention: 0 };
    expect(projectCohortStats([])).toEqual(empty);
    const retired = [mkRikishi("x", { isRetired: true })];
    expect(projectCohortStats(retired)).toEqual(empty);
  });
});

describe("applyBoutResult edge-crisis metrics (PR #939)", () => {
  function makeBashoWorld(): WorldState {
    const east = MockFactory.createRikishi("east", {
      division: "makuuchi",
      rank: "maegashira",
      heyaId: "h1",
      side: "east",
      stats: {
        power: 60,
        speed: 60,
        technique: 60,
        weight: 140,
        stamina: 60,
        mental: 60,
        adaptability: 60,
        balance: 60,
        aggression: 60,
        experience: 10,
      },
    });
    const west = MockFactory.createRikishi("west", {
      division: "makuuchi",
      rank: "maegashira",
      heyaId: "h2",
      side: "west",
      stats: east.stats,
    });
    const match: MatchSchedule = {
      boutId: "b1",
      day: 1,
      eastRikishiId: "east",
      westRikishiId: "west",
    };
    const basho: BashoState = {
      id: "t",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 1,
      matches: [match],
      standings: new Map([
        ["east", { wins: 0, losses: 0 }],
        ["west", { wins: 0, losses: 0 }],
      ]),
      isActive: true,
    };
    return MockFactory.createWorld({
      rikishi: new Map([
        ["east", east],
        ["west", west],
      ]),
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1")],
        ["h2", MockFactory.createHeya("h2")],
      ]),
      currentBasho: basho,
      cyclePhase: "active_basho",
      events: { version: "1.0.0", log: [], dedupe: {} },
    });
  }

  it("counts edge_crisis+escaped log entries toward edgeCrisisSurvived and comebackWins", () => {
    const world = makeBashoWorld();
    const match = world.currentBasho!.matches[0];
    const result = {
      boutId: "b1",
      winner: "east",
      winnerRikishiId: "east",
      loserRikishiId: "west",
      kimarite: "oshidashi",
      kimariteName: "Oshidashi",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 5,
      upset: false,
      isKinboshi: false,
      log: [
        { phase: "edge_crisis", data: { escaped: true } },
        { phase: "edge_crisis", data: { escaped: true } },
        { phase: "edge_crisis", data: { escaped: false } },
        { phase: "tachiai", data: {} },
      ],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    } as unknown as BoutResult;

    const impact = applyBoutResult(world, match, result);
    const next = resolveImpacts(world, [impact]);
    const metrics = next.currentBasho!.boutMetrics?.["east"];
    expect(metrics?.edgeCrisisSurvived).toBe(2);
    expect(metrics?.comebackWins).toBe(1);
  });
});

describe("perceivedTalentSeed scout count (PR #939)", () => {
  function makeCandidate(): TalentCandidate {
    return {
      candidateId: "c1",
      personId: "p1",
      name: "Test Candidate",
      birthYear: 2008,
      originRegion: "tokyo",
      nationality: "japan",
      visibilityBand: "full",
      reputationSeed: 1,
      tags: [],
      combatProfile: {} as TalentCandidate["combatProfile"],
      availabilityState: "available",
      competingSuitors: [],
      archetype: "balanced",
      style: "oshizumo",
      talentSeed: 70,
    } as unknown as TalentCandidate;
  }

  function makeWorldWithScouts(scoutCount: number): WorldState {
    const heya = MockFactory.createHeya("h1", { staffIds: [] });
    const staff = new Map<string, Staff>();
    const staffIds: string[] = [];
    for (let i = 0; i < scoutCount; i++) {
      const id = `scout-${i}`;
      staff.set(id, {
        id,
        heyaId: "h1",
        role: "scout",
        careerPhase: "active",
      } as unknown as Staff);
      staffIds.push(id);
    }
    heya.staffIds = staffIds;
    return MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      staff,
    });
  }

  it("is deterministic and within [0,100] for a fixed world", () => {
    const world = makeWorldWithScouts(2);
    const candidate = makeCandidate();
    const a = perceivedTalentSeed(world, "h1", candidate);
    const b = perceivedTalentSeed(world, "h1", candidate);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(100);
  });

  it("more scouts narrow the noise spread toward talentSeed", () => {
    const candidate = makeCandidate();
    const noScouts = perceivedTalentSeed(makeWorldWithScouts(0), "h1", candidate);
    const manyScouts = perceivedTalentSeed(makeWorldWithScouts(6), "h1", candidate);
    // With 6 scouts the spread collapses; deviation from seed must shrink.
    expect(Math.abs(manyScouts - candidate.talentSeed)).toBeLessThanOrEqual(
      Math.abs(noScouts - candidate.talentSeed) + 1e-9
    );
  });
});

describe("createPlan planHistory failure penalty (PR #939)", () => {
  function makeCtx(failures: number): AIContext {
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", MockFactory.createHeya("h1", { rikishiIds: [] })]]),
      week: 10,
    });
    const planHistory = Array.from({ length: failures }, () => ({
      planId: "yokozuna_push",
      startedWeek: 1,
      outcome: "abandoned" as const,
    }));
    return {
      world,
      heyaId: "h1",
      oyakata: {
        id: "o1",
        archetype: "traditionalist",
        traits: { ambition: 0.9, risk: 0.5, tradition: 0.5, patience: 0.5, compassion: 0.5 },
      },
      perception: {
        rosterStrengthBand: "dominant",
        financesBand: "stable",
        prestigeBand: "elite",
      } as unknown as AIContext["perception"],
      leaguePerception: {
        yushoRace: { leaders: [] },
        rivalryClusters: [],
        promotionZone: { inZone: [], bubble: [] },
      } as unknown as AIContext["leaguePerception"],
      memory: {
        observations: [],
        coreDirectives: [],
        lastConsolidationTick: 0,
        planHistory,
        decisionHistory: [],
        opponentModels: {},
      },
    } as AIContext;
  }

  it("failures on the top plan reduce its score and can change the choice", () => {
    const noFail = createPlan(makeCtx(0));
    const withFails = createPlan(makeCtx(3)); // -24 score penalty on yokozuna_push
    expect(noFail).toBeDefined();
    expect(withFails).toBeDefined();
    // With zero failures the ambitious yokozuna_push should be selectable for
    // a dominant roster; with 3 abandonments its score is penalized by 24,
    // so the plan must either change or fall back to status quo.
    if (noFail!.planId === "yokozuna_push") {
      expect(withFails!.planId).not.toBe("yokozuna_push");
    }
  });
});

// ---------------------------------------------------------------------------
// Equivalence pins for the perf-audit sweep — Set/Map lookups, invariant
// hoists, sort→top-k scans, and merged filter passes. These characterize
// CURRENT behavior; every assertion must stay green after the mechanical
// optimizations land.
// ---------------------------------------------------------------------------

describe("buildSwissTorikumi hot-streak pullup (perf-audit A2)", () => {
  function mkMakuuchi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
    return MockFactory.createRikishi({ id, division: "makuuchi", ...overrides });
  }

  it("an undefeated non-sanyaku is pulled up to the top available sanyaku", () => {
    const hot = mkMakuuchi("hot-1", { rank: "maegashira", rankNumber: 8, side: "east" });
    // Sekiwake outranks komusubi on the banzuke — "san-top" is the sekiwake.
    const sanyakuTop = mkMakuuchi("san-top", { rank: "sekiwake", rankNumber: 2, side: "west" });
    const sanyakuLow = mkMakuuchi("san-low", { rank: "komusubi", rankNumber: 1, side: "east" });
    const fillers: Rikishi[] = [];
    for (let i = 0; i < 20; i++) {
      fillers.push(
        mkMakuuchi(`f-${i}`, {
          rank: "maegashira",
          rankNumber: 9 + (i % 8),
          side: i % 2 === 0 ? "east" : "west",
        })
      );
    }
    const basho = MockFactory.createBasho({ day: 10 });
    basho.standings.set("hot-1", { wins: 10, losses: 0 });
    const pool = [hot, sanyakuTop, sanyakuLow, ...fillers];
    const pairings = buildSwissTorikumi(basho, pool, {
      seed: "pin-a2",
      day: 10,
      division: "makuuchi",
    });
    const hotPair = pairings.find((p) => p.eastId === "hot-1" || p.westId === "hot-1");
    expect(hotPair).toBeDefined();
    expect(hotPair!.reasons).toContain("hot_streak_pullup");
    const partner = hotPair!.eastId === "hot-1" ? hotPair!.westId : hotPair!.eastId;
    expect(partner).toBe("san-top");
  });
});

describe("DynastyService.findEligibleSuccessors (perf-audit A5)", () => {
  function snap(division: Division): CareerSnapshot {
    return {
      id: `s-${division}`,
      bashoId: "b1",
      year: 2029,
      month: 1,
      bashoName: "hatsu",
      rank: division === "makuuchi" ? "maegashira" : "juryo",
      division,
      rankNumber: 1,
      side: "east",
      wins: 8,
      losses: 7,
      absences: 0,
    } as CareerSnapshot;
  }

  it("returns roster members and alumni meeting the inherit bar only", () => {
    const inside = MockFactory.createRikishi({
      id: "in-1",
      heyaId: "h1",
      division: "makuuchi",
      careerHistory: Array.from({ length: 12 }, () => snap("makuuchi")),
    });
    const alum = MockFactory.createRikishi({
      id: "al-1",
      heyaId: "h2",
      division: "juryo",
      careerHistory: Array.from({ length: 20 }, () => snap("juryo")),
      heyaHistory: [{ heyaId: "h1", joinWeek: 1 }],
    });
    const under = MockFactory.createRikishi({
      id: "no-1",
      heyaId: "h2",
      division: "makuuchi",
      careerHistory: Array.from({ length: 5 }, () => snap("makuuchi")),
      heyaHistory: [{ heyaId: "h1", joinWeek: 1 }],
    });
    const world = MockFactory.createWorld({
      rikishi: new Map([["in-1", inside], ["al-1", alum], ["no-1", under]]),
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1", { rikishiIds: ["in-1"] })],
        ["h2", MockFactory.createHeya("h2", { rikishiIds: ["al-1", "no-1"] })],
      ]),
    });
    const eligible = DynastyService.findEligibleSuccessors(world, "h1");
    expect([...eligible].sort()).toEqual(["al-1", "in-1"]);
  });
});

describe("runHistoryUpdates career-win milestones (perf-audit A6)", () => {
  const mkMilestone = (title: string) => ({
    id: `m-${title}`,
    type: "stats_record" as const,
    title,
    description: "",
    date: { year: 2029, month: 1 },
  });

  it("records the lowest unrecorded threshold and never re-records it", () => {
    const fresh = MockFactory.createRikishi({ id: "r-new", careerWins: 500, milestones: [] });
    const done = MockFactory.createRikishi({
      id: "r-done",
      careerWins: 500,
      milestones: [mkMilestone("100 Career Wins")],
    });
    const world = MockFactory.createWorld({
      year: 2030,
      rikishi: new Map([["r-new", fresh], ["r-done", done]]),
      history: [],
    });
    const impact = runHistoryUpdates(world);
    const updNew = impact.entities?.rikishiUpdates?.get("r-new");
    const updDone = impact.entities?.rikishiUpdates?.get("r-done");
    // Thresholds scan ascending: 500 wins fires "100 Career Wins" first.
    expect(updNew?.milestones?.some((m) => m.title === "100 Career Wins")).toBe(true);
    const doneTitles = (updDone?.milestones ?? []).map((m) => m.title);
    expect(doneTitles.filter((t) => t === "100 Career Wins")).toHaveLength(1);
    expect(doneTitles).toContain("500 Career Wins");
  });
});

describe("phase01_week_welfare welfare_standards morale (perf-audit B1)", () => {
  function worldWithPolicies(policies: string[]): WorldState {
    return MockFactory.createWorld({
      heyas: new Map([["h1", MockFactory.createHeya("h1", { rikishiIds: [] })]]),
      rikishiCouncil: { activePolicies: policies } as WorldState["rikishiCouncil"],
    });
  }

  it("the council charter lifts every heya's morale by exactly 3", () => {
    const withPolicy = phase01_week_welfare(worldWithPolicies(["welfare_standards"]));
    const without = phase01_week_welfare(worldWithPolicies([]));
    const moraleWith = withPolicy.entities?.heyaUpdates?.get("h1")?.welfareState?.morale;
    const moraleWithout = without.entities?.heyaUpdates?.get("h1")?.welfareState?.morale;
    expect(moraleWith).toBeDefined();
    expect(moraleWithout).toBeDefined();
    expect((moraleWith ?? 0) - (moraleWithout ?? 0)).toBe(3);
  });
});

describe("BloodlineService.applyHeritageBonus (perf-audit B2)", () => {
  function worldWithBloodline(power: number): WorldState {
    const r = MockFactory.createRikishi({ id: "r1", stats: { power } as Rikishi["stats"] });
    r.lineage = { bloodlineTraitId: "strong" };
    return MockFactory.createWorld({
      rikishi: new Map([["r1", r]]),
      bloodlineRegistry: {
        traits: {
          strong: {
            traitId: "strong",
            label: "Powerful Ancestor",
            description: "Inherited strength",
            statFloorBonus: { power: 80 },
            ceilingBonus: 0,
            ancestorShikona: "Tetsuyama",
            registeredYear: 1990,
          },
        },
      },
    });
  }

  it("nudges stats toward the floor by 1 and respects the floor", () => {
    const below = BloodlineService.applyHeritageBonus(worldWithBloodline(40));
    expect(below.entities?.rikishiUpdates?.get("r1")?.stats?.power).toBe(41);
    const atFloor = BloodlineService.applyHeritageBonus(worldWithBloodline(80));
    expect(atFloor.entities?.rikishiUpdates?.get("r1")).toBeUndefined();
  });
});

describe("applyWeeklyDegeiko host selection (perf-audit B3)", () => {
  it("a retired rikishi still on the host roster is never chosen as host", () => {
    const guest = MockFactory.createRikishi({ id: "guest-a", heyaId: "heya-g" });
    const hostA = MockFactory.createRikishi({ id: "host-a", heyaId: "heya-h" });
    const hostRet = MockFactory.createRikishi({ id: "host-ret", heyaId: "heya-h", isRetired: true });
    const world = MockFactory.createWorld({
      heyas: new Map([
        ["heya-g", MockFactory.createHeya("heya-g", { rikishiIds: ["guest-a"] })],
        ["heya-h", MockFactory.createHeya("heya-h", { rikishiIds: ["host-a", "host-ret"] })],
      ]),
      rikishi: new Map([["guest-a", guest], ["host-a", hostA], ["host-ret", hostRet]]),
      trainingState: new Map([
        [
          "heya-g",
          {
            heyaId: "heya-g",
            activeProfile: {} as never,
            focusSlots: [],
            pendingDegeiko: { targetHeyaId: "heya-h", week: 1, rikishiIds: ["guest-a"] },
          },
        ],
      ]),
    });
    const impact = applyWeeklyDegeiko(world);
    expect(impact.entities?.rikishiUpdates?.get("host-ret")).toBeUndefined();
    const guestUpd = impact.entities?.rikishiUpdates?.get("guest-a");
    expect(guestUpd?.practicePartners ?? []).not.toContain("host-ret");
  });
});

describe("projectCornerAdvice match selection (perf-audit B4)", () => {
  it("finds today's unplayed player bout and rejects non-participants", () => {
    const p1 = MockFactory.createRikishi({ id: "p1", heyaId: "h1" });
    const o1 = MockFactory.createRikishi({ id: "o1", heyaId: "h2" });
    const other = MockFactory.createRikishi({ id: "other", heyaId: "h2" });
    const basho = MockFactory.createBasho({ day: 5 });
    basho.matches = [
      { boutId: "m1", day: 5, eastRikishiId: "p1", westRikishiId: "o1" } as MatchSchedule,
      { boutId: "m2", day: 6, eastRikishiId: "other", westRikishiId: "o1" } as MatchSchedule,
    ];
    const world = MockFactory.createWorld({
      rikishi: new Map([["p1", p1], ["o1", o1], ["other", other]]),
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1", { rikishiIds: ["p1"] })],
        ["h2", MockFactory.createHeya("h2", { rikishiIds: ["o1", "other"] })],
      ]),
      currentBasho: basho,
      cyclePhase: "active_basho",
    });
    const proj = projectCornerAdvice(world, ["p1"]);
    expect(proj?.playerRikishi.id).toBe("p1");
    expect(proj?.opponent.id).toBe("o1");
    expect(projectCornerAdvice(world, ["other"])).toBeNull();
  });
});
