import { describe, it, expect } from "vitest";
import { KIMARITE_REGISTRY, getKimariteCount } from "@/engine/kimariteRegistry";
import { projectCohortStats } from "@/presenters/kachiNokori";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { perceivedTalentSeed } from "@/engine/systems/recruitment/perceivedTalent";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import type { AIContext } from "@/engine/ai/types";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BashoState, BoutResult } from "@/engine/types/basho";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Staff } from "@/engine/types/staff";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

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
        power: 60, speed: 60, technique: 60, weight: 140, stamina: 60,
        mental: 60, adaptability: 60, balance: 60, aggression: 60, experience: 10,
      },
    });
    const west = MockFactory.createRikishi("west", {
      division: "makuuchi", rank: "maegashira", heyaId: "h2", side: "west",
      stats: east.stats,
    });
    const match: MatchSchedule = { boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" };
    const basho: BashoState = {
      id: "t", year: 2026, bashoNumber: 1, bashoName: "hatsu", day: 1,
      matches: [match],
      standings: new Map([
        ["east", { wins: 0, losses: 0 }],
        ["west", { wins: 0, losses: 0 }],
      ]),
      isActive: true,
    };
    return MockFactory.createWorld({
      rikishi: new Map([["east", east], ["west", west]]),
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
