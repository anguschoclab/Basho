import { describe, it, expect } from "vitest";
import {
  evaluatePendingDecisions,
  resolveLoopDecision,
  applyExpiredQueueDefaults,
  detectDueDecisions,
  applyDecisionEffect,
  autonomouslyResolveDecisions,
} from "@/engine/loop/LoopDecisionEngine";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types/rikishi";

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
    id,
    shikona,
    heyaId: "h1",
    nationality: "Mongolia",
    birthYear: 1995,
    height: 185,
    weight: 150,
    momentum: 50,
    fatigue: 30,
    injured: false,
    injuryWeeksRemaining: 0,
    isKyujo: false,
    style: "yotsu",
    division: "makushita",
    rank: rank as Rikishi["rank"],
    side: "east",
    stats: {
      power: 50,
      technique: 50,
      speed: 50,
      weight: 150,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      balance: 50,
      aggression: 50,
      experience: 50,
    },
  } as unknown as Rikishi;
}

describe("autonomous sim suppression", () => {
  it("evaluatePendingDecisions produces nothing when _autonomousSim is set", () => {
    const heya = makeHeya("h1", ["r1"]);
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 90;
    const world = makeWorld({
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      _autonomousSim: true,
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const impact = evaluatePendingDecisions(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
  });

  it("applyExpiredQueueDefaults is a no-op when _autonomousSim is set", () => {
    const world = makeWorld({
      playerHeyaId: "h1",
      week: 9,
      _autonomousSim: true,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [
        {
          id: "wt-1",
          type: "weekly_training_emphasis",
          description: "x",
          deadlineWeek: 3,
          required: false,
          options: [],
        },
      ],
    });
    const impact = applyExpiredQueueDefaults(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
  });
});

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
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    const d = decisions.find((x) => x.type === "pre_basho_readiness");
    expect(d).toBeDefined();
    expect(d!.required).toBe(true);
    expect(impact.worldFields?.pendingCrisis).toBeDefined();
  });

  it("insolvency is BLOCKING when runway is desperate", () => {
    const heya = { ...makeHeya("h1", []), runwayBand: "desperate" } as unknown as ReturnType<
      typeof makeHeya
    >;
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      week: 2,
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    expect(decisions.find((x) => x.type === "insolvency_response")?.required).toBe(true);
  });

  it("weekly training emphasis is a QUEUE decision in interim", () => {
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    const d = decisions.find((x) => x.type === "weekly_training_emphasis");
    expect(d).toBeDefined();
    expect(d!.required).toBe(false);
  });

  it("welfare diet is a QUEUE decision when welfareRisk > 60", () => {
    const heya = {
      ...makeHeya("h1", []),
      welfareState: {
        welfareRisk: 75,
        activeDiet: "maintenance",
        complianceState: "watch",
        weeksInState: 0,
      },
    } as unknown as ReturnType<typeof makeHeya>;
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      week: 3,
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
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
      pendingCrisis: {
        id: "d1",
        type: "loop_decision",
        title: "test",
        description: "test",
        options: [],
      },
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
        trainingState: new Map([
          [
            "h1",
            {
              heyaId: "h1",
              activeProfile: {
                intensity: "balanced",
                focus: "neutral",
                styleBias: "neutral",
                recovery: "normal",
              },
              focusSlots: [],
            },
          ],
        ]),
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
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
      pendingDecisions: [
        {
          id: `${type}-1`,
          type,
          description: "x",
          deadlineWeek: 2,
          required: type.includes("pre_basho") || type.includes("insolvency"),
          options: [{ id: optId, label: optId, impact: "x" }],
        },
      ],
      ...extra,
    });
  }

  it("pre_basho rest reduces fatigue for at-risk rikishi", () => {
    const r = makeRikishi("r1", "makushita", "X");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = withDecision("pre_basho_readiness", "rest", { rikishi: new Map([["r1", r]]) });
    const impact = resolveLoopDecision(world, "pre_basho_readiness-1", "rest");
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect((upd as { fatigue: number }).fatigue).toBe(60); // 80 - 20
  });

  it("insolvency austerity sets activeDiet to austerity", () => {
    const world = withDecision("insolvency_response", "austerity");
    const impact = resolveLoopDecision(world, "insolvency_response-1", "austerity");
    const upd =
      impact.entities?.heyaUpdates instanceof Map
        ? impact.entities.heyaUpdates.get("h1")
        : undefined;
    expect((upd as { welfareState: { activeDiet: string } }).welfareState.activeDiet).toBe(
      "austerity"
    );
  });

  it("weekly_training_emphasis intensive sets training intensity", () => {
    const world = withDecision("weekly_training_emphasis", "intensive", {
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
    });
    const impact = resolveLoopDecision(world, "weekly_training_emphasis-1", "intensive");
    const upd =
      impact.entities?.trainingStateUpdates instanceof Map
        ? impact.entities.trainingStateUpdates.get("h1")
        : undefined;
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
      seed: "s",
      playerHeyaId: "h1",
      week: 5,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "intensive",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
      pendingDecisions: [
        {
          id: "wt-1",
          type: "weekly_training_emphasis",
          description: "x",
          deadlineWeek: 3,
          required: false,
          options: [],
        },
      ],
    });
    const impact = applyExpiredQueueDefaults(world);
    // default intensity is "balanced"
    const upd =
      impact.entities?.trainingStateUpdates instanceof Map
        ? impact.entities.trainingStateUpdates.get("h1")
        : undefined;
    expect(JSON.stringify(upd)).toContain("balanced");
    expect(impact.worldFields?.pendingDecisions).toEqual([]);
  });

  it("does not touch a queue decision still within its deadline", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      week: 2,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [
        {
          id: "wt-1",
          type: "weekly_training_emphasis",
          description: "x",
          deadlineWeek: 3,
          required: false,
          options: [],
        },
      ],
    });
    const impact = applyExpiredQueueDefaults(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
  });
});

// ─── detectDueDecisions ───────────────────────────────────────────────

describe("detectDueDecisions", () => {
  it("returns an empty array when there is no player heya", () => {
    const world = makeWorld({ playerHeyaId: undefined });
    expect(detectDueDecisions(world)).toEqual([]);
  });

  it("detects pre_basho_readiness when a rikishi is fatigued in pre_basho", () => {
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 75;
    const world = makeWorld({
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      seed: "s",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
    });
    const due = detectDueDecisions(world);
    expect(due.some((d) => d.type === "pre_basho_readiness")).toBe(true);
  });

  it("does not duplicate a decision type that is already pending", () => {
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 75;
    const world = makeWorld({
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      seed: "s",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
      pendingDecisions: [
        {
          id: "existing",
          type: "pre_basho_readiness",
          description: "x",
          deadlineWeek: 2,
          required: true,
          options: [],
        },
      ],
    });
    const due = detectDueDecisions(world);
    expect(due.some((d) => d.type === "pre_basho_readiness")).toBe(false);
  });

  it("returns empty when no triggers fire", () => {
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", [])]]),
    });
    expect(detectDueDecisions(world)).toEqual([]);
  });
});

// ─── applyDecisionEffect ──────────────────────────────────────────────

describe("applyDecisionEffect", () => {
  it("rests at-risk rikishi for pre_basho_readiness:rest", () => {
    const r = makeRikishi("r1", "makushita", "X");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "pre_basho_readiness", "rest");
    const impact = builder.build();
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect((upd as { fatigue: number }).fatigue).toBe(60);
  });

  it("is a no-op for pre_basho_readiness:push", () => {
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "pre_basho_readiness", "push");
    const impact = builder.build();
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });

  it("sets training intensity for weekly_training_emphasis", () => {
    const world = makeWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
    });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "weekly_training_emphasis", "intensive");
    const impact = builder.build();
    const upd =
      impact.entities?.trainingStateUpdates instanceof Map
        ? impact.entities.trainingStateUpdates.get("h1")
        : undefined;
    expect(JSON.stringify(upd)).toContain("intensive");
  });

  it("is a no-op when there is no player heya", () => {
    const world = makeWorld({ playerHeyaId: undefined });
    const builder = createImpactBuilder("test");
    applyDecisionEffect(world, builder, "pre_basho_readiness", "rest");
    const impact = builder.build();
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });
});

// ─── autonomouslyResolveDecisions ─────────────────────────────────────

describe("autonomouslyResolveDecisions", () => {
  function worldWithFatiguedRikishi(): WorldState {
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 80;
    return makeWorld({
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      seed: "auto",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
    });
  }

  it("returns an empty impact when no decisions are due", () => {
    const world = makeWorld({ playerHeyaId: "h1", heyas: new Map([["h1", makeHeya("h1", [])]]) });
    const impact = autonomouslyResolveDecisions(world, "balanced");
    expect(impact.events ?? []).toHaveLength(0);
  });

  it("auto-resolves with the conservative policy (rest for pre_basho)", () => {
    const world = worldWithFatiguedRikishi();
    const impact = autonomouslyResolveDecisions(world, "conservative");
    // conservative → rest → fatigue reduced
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect((upd as { fatigue: number })?.fatigue).toBe(60);
    // should log a DECISION_AUTO_RESOLVED event
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_AUTO_RESOLVED");
    expect(ev).toBeDefined();
  });

  it("auto-resolves with the aggressive policy (push for pre_basho — no fatigue change)", () => {
    const world = worldWithFatiguedRikishi();
    const impact = autonomouslyResolveDecisions(world, "aggressive");
    // aggressive → push → no fatigue reduction
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect(upd).toBeUndefined();
    // still logs an event
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_AUTO_RESOLVED");
    expect(ev).toBeDefined();
  });

  it("logs a DECISION_AUTO_RESOLVED event with title and summary", () => {
    const world = worldWithFatiguedRikishi();
    const impact = autonomouslyResolveDecisions(world, "balanced");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_AUTO_RESOLVED");
    expect(ev).toBeDefined();
    const data = (ev as { data?: { title?: string; summary?: string } }).data;
    expect(data?.title).toBe("Auto-Decided");
    expect(data?.summary).toContain("→");
  });

  it("is deterministic: same world + policy → same events", () => {
    const a = autonomouslyResolveDecisions(worldWithFatiguedRikishi(), "balanced");
    const b = autonomouslyResolveDecisions(worldWithFatiguedRikishi(), "balanced");
    const aEvents = (a.events ?? []).map(
      (e) => (e as { data?: { summary?: string } }).data?.summary
    );
    const bEvents = (b.events ?? []).map(
      (e) => (e as { data?: { summary?: string } }).data?.summary
    );
    expect(aEvents).toEqual(bEvents);
  });

  it("falls back to balanced when an unknown policy is given", () => {
    const world = worldWithFatiguedRikishi();
    const impact = autonomouslyResolveDecisions(world, "unknown" as "balanced");
    // balanced → rest → fatigue reduced (same as balanced)
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect((upd as { fatigue: number })?.fatigue).toBe(60);
  });
});

// ─── resolveLoopDecision — DECISION_RESOLVED event ────────────────────

describe("resolveLoopDecision — DECISION_RESOLVED event", () => {
  it("logs a DECISION_RESOLVED event with a non-empty summary", () => {
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
      pendingDecisions: [
        {
          id: "pbr-1",
          type: "pre_basho_readiness",
          description: "x",
          deadlineWeek: 2,
          required: true,
          options: [{ id: "rest", label: "Rest", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "pbr-1", "rest");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    expect(ev).toBeDefined();
    const data = (ev as { data?: { title?: string; summary?: string } }).data;
    expect(data?.title).toBe("Decision Resolved");
    expect(String(data?.summary ?? "")).not.toEqual("");
  });

  it("summary for pre_basho rest includes at-risk count", () => {
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
      pendingDecisions: [
        {
          id: "pbr-1",
          type: "pre_basho_readiness",
          description: "x",
          deadlineWeek: 2,
          required: true,
          options: [{ id: "rest", label: "Rest", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "pbr-1", "rest");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    const summary = (ev as { data?: { summary?: string } }).data?.summary ?? "";
    expect(summary).toContain("1 at-risk wrestler");
  });

  it("summary for push says injury risk accepted", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
      pendingDecisions: [
        {
          id: "pbr-1",
          type: "pre_basho_readiness",
          description: "x",
          deadlineWeek: 2,
          required: true,
          options: [{ id: "push", label: "Push", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "pbr-1", "push");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    const summary = (ev as { data?: { summary?: string } }).data?.summary ?? "";
    expect(summary).toContain("injury risk accepted");
  });

  it("summary for insolvency loan says emergency loan secured", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [
        {
          id: "ins-1",
          type: "insolvency_response",
          description: "x",
          deadlineWeek: 2,
          required: true,
          options: [{ id: "loan", label: "Loan", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "ins-1", "loan");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    const summary = (ev as { data?: { summary?: string } }).data?.summary ?? "";
    expect(summary).toContain("Emergency loan secured");
  });

  it("summary for training emphasis includes the option id", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
      pendingDecisions: [
        {
          id: "wt-1",
          type: "weekly_training_emphasis",
          description: "x",
          deadlineWeek: 2,
          required: false,
          options: [{ id: "intensive", label: "Intensive", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "wt-1", "intensive");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    const summary = (ev as { data?: { summary?: string } }).data?.summary ?? "";
    expect(summary).toContain("intensive");
  });

  it("summary for welfare diet premium says welfare risk eases", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [
        {
          id: "wd-1",
          type: "welfare_diet",
          description: "x",
          deadlineWeek: 2,
          required: false,
          options: [{ id: "premium", label: "Premium", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "wd-1", "premium");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    const summary = (ev as { data?: { summary?: string } }).data?.summary ?? "";
    expect(summary).toContain("eases");
  });

  it("sets importance to notable on the event", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [
        {
          id: "wd-1",
          type: "welfare_diet",
          description: "x",
          deadlineWeek: 2,
          required: false,
          options: [{ id: "maintenance", label: "Maintenance", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "wd-1", "maintenance");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    expect((ev as { importance?: string }).importance).toBe("notable");
  });
});
