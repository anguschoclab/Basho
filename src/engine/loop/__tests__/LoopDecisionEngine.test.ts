import { describe, it, expect } from "vitest";
import { evaluatePendingDecisions, resolveLoopDecision, applyExpiredQueueDefaults } from "../LoopDecisionEngine";
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

describe("evaluatePendingDecisions — approved taxonomy", () => {
  it("returns empty impact when no decisions are pending", () => {
    const world = makeWorld();
    const impact = evaluatePendingDecisions(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
  });

  it("pre_basho readiness is BLOCKING when a rikishi is fatigued", () => {
    const heya = makeHeya("h1", ["r1"]);
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 75;
    const world = makeWorld({
      cyclePhase: "pre_basho", playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]), rikishi: new Map([["r1", r]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string; required: boolean }>;
    const d = decisions.find((x) => x.type === "pre_basho_readiness");
    expect(d).toBeDefined();
    expect(d!.required).toBe(true);
    expect(impact.worldFields?.pendingCrisis).toBeDefined();
  });

  it("insolvency is BLOCKING when runway is desperate", () => {
    const heya = { ...makeHeya("h1", []), runwayBand: "desperate" } as unknown as ReturnType<typeof makeHeya>;
    const world = makeWorld({
      cyclePhase: "interim", playerHeyaId: "h1", week: 2,
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string; required: boolean }>;
    expect(decisions.find((x) => x.type === "insolvency_response")?.required).toBe(true);
  });

  it("weekly training emphasis is a QUEUE decision in interim", () => {
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      cyclePhase: "interim", playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
      trainingState: new Map([["h1", { heyaId: "h1", activeProfile: { intensity: "balanced", focus: "neutral", styleBias: "neutral", recovery: "normal" }, focusSlots: [] }]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string; required: boolean }>;
    const d = decisions.find((x) => x.type === "weekly_training_emphasis");
    expect(d).toBeDefined();
    expect(d!.required).toBe(false);
  });

  it("welfare diet is a QUEUE decision when welfareRisk > 60", () => {
    const heya = { ...makeHeya("h1", []), welfareState: { welfareRisk: 75, activeDiet: "maintenance", complianceState: "watch", weeksInState: 0 } } as unknown as ReturnType<typeof makeHeya>;
    const world = makeWorld({
      cyclePhase: "interim", playerHeyaId: "h1", week: 3,
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{ type: string; required: boolean }>;
    expect(decisions.find((x) => x.type === "welfare_diet")?.required).toBe(false);
  });
});

describe("resolveLoopDecision", () => {
  it("removes the resolved decision from pendingDecisions", () => {
    const decision = {
      id: "d1",
      type: "weekly_training_emphasis",
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
      type: "pre_basho_readiness",
      description: "test",
      deadlineWeek: 10,
      options: [{ id: "rest", label: "Rest", impact: "recover" }],
      required: true,
    };
    const world = makeWorld({
      pendingDecisions: [decision],
      pendingCrisis: { id: "d1", type: "loop_decision", title: "test", description: "test", options: [] },
    } as Partial<WorldState>);

    const impact = resolveLoopDecision(world, "d1", "rest");
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
  });

  it("does nothing for unknown decision id", () => {
    const world = makeWorld();
    const impact = resolveLoopDecision(world, "unknown", "opt1");
    expect(Object.keys(impact.worldFields ?? {})).toHaveLength(0);
  });
});

describe("evaluatePendingDecisions — determinism", () => {
  it("produces identical decision IDs across two runs of the same world", () => {
    const make = () => {
      const heya = makeHeya("h1", ["r1"]);
      const rikishi = makeRikishi("r1", "makushita", "TestRikishi");
      return makeWorld({
        cyclePhase: "interim",
        playerHeyaId: "h1",
        seed: "seed-xyz",
        heyas: new Map([["h1", heya]]),
        rikishi: new Map([["r1", rikishi]]),
        trainingState: new Map([["h1", { heyaId: "h1", activeProfile: { intensity: "balanced", focus: "neutral", styleBias: "neutral", recovery: "normal" }, focusSlots: [] }]]),
      });
    };
    const a = evaluatePendingDecisions(make());
    const b = evaluatePendingDecisions(make());
    const idsA = (a.worldFields?.pendingDecisions as Array<{ id: string }>).map((d) => d.id);
    const idsB = (b.worldFields?.pendingDecisions as Array<{ id: string }>).map((d) => d.id);
    expect(idsA).toEqual(idsB);
  });
});

describe("resolveLoopDecision — approved effects", () => {
  function withDecision(type: string, optId: string, extra: Record<string, unknown> = {}) {
    return makeWorld({
      seed: "s", playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
      pendingDecisions: [{ id: `${type}-1`, type, description: "x", deadlineWeek: 2, required: type.includes("pre_basho") || type.includes("insolvency"),
        options: [{ id: optId, label: optId, impact: "x" }] }],
      ...extra,
    });
  }

  it("pre_basho rest reduces fatigue for at-risk rikishi", () => {
    const r = makeRikishi("r1", "makushita", "X");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = withDecision("pre_basho_readiness", "rest", { rikishi: new Map([["r1", r]]) });
    const impact = resolveLoopDecision(world, "pre_basho_readiness-1", "rest");
    const upd = impact.entities?.rikishiUpdates instanceof Map ? impact.entities.rikishiUpdates.get("r1") : undefined;
    expect((upd as { fatigue: number }).fatigue).toBe(60); // 80 - 20
  });

  it("insolvency austerity sets activeDiet to austerity", () => {
    const world = withDecision("insolvency_response", "austerity");
    const impact = resolveLoopDecision(world, "insolvency_response-1", "austerity");
    const upd = impact.entities?.heyaUpdates instanceof Map ? impact.entities.heyaUpdates.get("h1") : undefined;
    expect((upd as { welfareState: { activeDiet: string } }).welfareState.activeDiet).toBe("austerity");
  });

  it("weekly_training_emphasis intensive sets training intensity", () => {
    const world = withDecision("weekly_training_emphasis", "intensive", {
      trainingState: new Map([["h1", { heyaId: "h1", activeProfile: { intensity: "balanced", focus: "neutral", styleBias: "neutral", recovery: "normal" }, focusSlots: [] }]]),
    });
    const impact = resolveLoopDecision(world, "weekly_training_emphasis-1", "intensive");
    const upd = impact.entities?.trainingStateUpdates instanceof Map ? impact.entities.trainingStateUpdates.get("h1") : undefined;
    expect(JSON.stringify(upd)).toContain("intensive");
  });

  it("removes the decision after resolution", () => {
    const world = withDecision("welfare_diet", "premium");
    const impact = resolveLoopDecision(world, "welfare_diet-1", "premium");
    expect(impact.worldFields?.pendingDecisions).toEqual([]);
  });
});

describe("applyExpiredQueueDefaults", () => {
  it("applies the default and removes a queue decision past its deadline", () => {
    const world = makeWorld({
      seed: "s", playerHeyaId: "h1", week: 5,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      trainingState: new Map([["h1", { heyaId: "h1", activeProfile: { intensity: "intensive", focus: "neutral", styleBias: "neutral", recovery: "normal" }, focusSlots: [] }]]),
      pendingDecisions: [
        { id: "wt-1", type: "weekly_training_emphasis", description: "x", deadlineWeek: 3, required: false, options: [] },
      ],
    });
    const impact = applyExpiredQueueDefaults(world);
    // default intensity is "balanced"
    const upd = impact.entities?.trainingStateUpdates instanceof Map ? impact.entities.trainingStateUpdates.get("h1") : undefined;
    expect(JSON.stringify(upd)).toContain("balanced");
    expect(impact.worldFields?.pendingDecisions).toEqual([]);
  });

  it("does not touch a queue decision still within its deadline", () => {
    const world = makeWorld({
      seed: "s", playerHeyaId: "h1", week: 2,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [{ id: "wt-1", type: "weekly_training_emphasis", description: "x", deadlineWeek: 3, required: false, options: [] }],
    });
    const impact = applyExpiredQueueDefaults(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
  });
});

