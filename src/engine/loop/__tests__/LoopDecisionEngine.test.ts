import { describe, it, expect } from "vitest";
import { evaluatePendingDecisions, resolveLoopDecision } from "../LoopDecisionEngine";
import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import type { Rikishi } from "../../types/rikishi";

function makeWorld(overrides: Record<string, unknown> = {}): WorldState {
  return {
    seed: "test",
    year: 1,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    events: { log: [], headlines: [] } as unknown as WorldState["events"],
    activeRikishiIds: new Set(),
    historicalRikishi: new Map(),
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
    ...overrides,
  } as unknown as WorldState;
}

function makeHeya(id: string, rikishiIds: string[] = []): Heya {
  return { id, name: "Test Heya", oyakataId: "oy1", rikishiIds, funds: 100000 } as unknown as Heya;
}

function makeRikishi(id: string, rank: string, shikona: string): Rikishi {
  return {
    id, shikona, heyaId: "h1", nationality: "Mongolia", birthYear: 1995,
    height: 185, weight: 150, momentum: 50, fatigue: 30,
    injured: false, injuryWeeksRemaining: 0, isKyujo: false,
    style: "yotsu", division: "makushita", rank: rank as Rikishi["rank"],
    side: "east", stats: { power: 50, technique: 50, speed: 50, weight: 150, stamina: 50, mental: 50, adaptability: 50, balance: 50, aggression: 50, experience: 50 },
  } as unknown as Rikishi;
}

describe("evaluatePendingDecisions", () => {
  it("returns empty impact when no decisions are pending", () => {
    const world = makeWorld();
    const impact = evaluatePendingDecisions(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
  });

  it("creates recruit_or_develop decision when stable has no sekitori in interim", () => {
    const heya = makeHeya("h1", ["r1"]);
    const rikishi = makeRikishi("r1", "makushita", "TestRikishi");
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
    });

    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string }>;
    expect(decisions).toBeDefined();
    expect(decisions.length).toBe(1);
    expect(decisions[0].type).toBe("recruit_or_develop");
  });

  it("does not create recruit_or_develop when sekitori exist", () => {
    const heya = makeHeya("h1", ["r1"]);
    const rikishi = makeRikishi("r1", "maegashira", "TestRikishi");
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
    });

    const impact = evaluatePendingDecisions(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
  });

  it("does not duplicate existing decisions", () => {
    const heya = makeHeya("h1", ["r1"]);
    const rikishi = makeRikishi("r1", "makushita", "TestRikishi");
    const existingDecision = {
      id: "d1",
      type: "recruit_or_develop",
      description: "test",
      deadlineWeek: 10,
      options: [],
      required: false,
    };
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      pendingDecisions: [existingDecision],
    } as Partial<WorldState>);

    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string }>;
    expect(decisions).toBeUndefined();
  });

  it("creates training_regime decision in pre_basho at week multiple of 12", () => {
    const world = makeWorld({
      cyclePhase: "pre_basho",
      week: 12,
    });

    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string }>;
    expect(decisions).toBeDefined();
    expect(decisions.length).toBe(1);
    expect(decisions[0].type).toBe("training_regime");
  });

  it("sets pendingCrisis for blocking (required) decisions", () => {
    const heya = makeHeya("h1", ["r1"]);
    const rikishi = { ...makeRikishi("r1", "sekiwake", "TestRikishi"), currentBashoWins: 12 };
    const world = makeWorld({
      cyclePhase: "post_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      transientContext: {
        bashoHistory: [{ r1: { wins: 12, losses: 3 } }, { r1: { wins: 12, losses: 3 } }, { r1: { wins: 12, losses: 3 } }],
      } as unknown as WorldState["transientContext"],
    } as Partial<WorldState>);

    const impact = evaluatePendingDecisions(world);
    const crisis = impact.worldFields?.pendingCrisis as { type: string } | undefined;
    expect(crisis).toBeDefined();
    expect(crisis?.type).toBe("loop_decision");
  });
});

describe("resolveLoopDecision", () => {
  it("removes the resolved decision from pendingDecisions", () => {
    const decision = {
      id: "d1",
      type: "recruit_or_develop",
      description: "test",
      deadlineWeek: 10,
      options: [{ id: "opt1", label: "Option 1", impact: "none" }],
      required: false,
    };
    const world = makeWorld({ pendingDecisions: [decision] });

    const impact = resolveLoopDecision(world, "d1", "opt1");
    const remaining = impact.worldFields?.pendingDecisions as Array<{ id: string }>;
    expect(remaining).toEqual([]);
  });

  it("clears pendingCrisis when the blocking decision is resolved", () => {
    const decision = {
      id: "d1",
      type: "ozeki_promotion",
      description: "test",
      deadlineWeek: 10,
      options: [{ id: "petition", label: "Petition", impact: "promote" }],
      required: true,
    };
    const world = makeWorld({
      pendingDecisions: [decision],
      pendingCrisis: { id: "d1", type: "loop_decision", title: "test", description: "test", options: [] },
    } as Partial<WorldState>);

    const impact = resolveLoopDecision(world, "d1", "petition");
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
  });

  it("applies training growth buff for train_current option", () => {
    const decision = {
      id: "d1",
      type: "recruit_or_develop",
      description: "test",
      deadlineWeek: 10,
      options: [{ id: "train_current", label: "Train", impact: "+5%" }],
      required: false,
    };
    const world = makeWorld({ pendingDecisions: [decision] });

    const impact = resolveLoopDecision(world, "d1", "train_current");
    expect(impact.worldFields?.transientContext).toBeDefined();
  });

  it("does nothing for unknown decision id", () => {
    const world = makeWorld();
    const impact = resolveLoopDecision(world, "unknown", "opt1");
    expect(Object.keys(impact.worldFields ?? {})).toHaveLength(0);
  });
});
