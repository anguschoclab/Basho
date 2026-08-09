import { describe, it, expect } from "vitest";
import type { Oyakata } from "@/engine/types/oyakata";
import type { AIPlan, OpponentTacticModel } from "@/engine/ai/types";
import {
  emptyOyakataMemory,
  getMemory,
  addObservation,
  setActivePlan,
  archiveActivePlan,
  recordDecision,
  recordOpponentModel,
  getOpponentModel,
} from "@/engine/npcAI/MemoryStore";

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "oy1",
    name: "Takanohana",
    archetype: "traditionalist",
    traits: { ambition: 50, risk: 50, loyalty: 50, tradition: 50, charisma: 50 },
    ...overrides,
  } as Oyakata;
}

const basePlan: AIPlan = {
  heyaId: "h1",
  archetype: "traditionalist",
  planId: "rebuild",
  goals: [],
  constraints: [],
  estimatedWeeks: 10,
  startedWeek: 1,
  reasoning: ["test"],
};

describe("MemoryStore", () => {
  it("emptyOyakataMemory returns a fully shaped memory object", () => {
    const oyakata = makeOyakata();
    const mem = emptyOyakataMemory(oyakata, 5);
    expect(mem.observations).toEqual([]);
    expect(mem.decisionHistory).toEqual([]);
    expect(mem.planHistory).toEqual([]);
    expect(mem.opponentModels).toEqual({});
    expect(mem.lastConsolidationTick).toBe(5);
    expect(mem.coreDirectives).toContain("Prioritize traditionalist values");
  });

  it("getMemory initializes missing memory and normalizes partial legacy memory", () => {
    const oyakata = makeOyakata();
    const mem = getMemory(oyakata, 0);
    expect(mem.decisionHistory).toEqual([]);

    const partial = makeOyakata({
      memory: {
        observations: [{ tick: 1, type: "perception", summary: "x", importance: 5 }],
      } as any,
    });
    const normalized = getMemory(partial, 0);
    expect(normalized.observations.length).toBe(1);
    expect(normalized.decisionHistory).toEqual([]);
    expect(normalized.planHistory).toEqual([]);
    expect(normalized.opponentModels).toEqual({});
  });

  it("addObservation appends and keeps top-10 by importance", () => {
    let mem = emptyOyakataMemory(makeOyakata(), 0);
    for (let i = 0; i < 12; i++) {
      mem = addObservation(mem, { type: "perception", summary: `o${i}`, importance: i }, i);
    }
    expect(mem.observations.length).toBe(10);
    expect(mem.observations[0].summary).toBe("o11");
  });

  it("setActivePlan stores the active plan", () => {
    let mem = emptyOyakataMemory(makeOyakata(), 0);
    mem = setActivePlan(mem, basePlan, 2);
    expect(mem.activePlan?.planId).toBe("rebuild");
    expect(mem.planHistory).toEqual([]);
  });

  it("setActivePlan archives a replaced plan", () => {
    let mem = emptyOyakataMemory(makeOyakata(), 0);
    mem = setActivePlan(mem, { ...basePlan, planId: "old" }, 1);
    mem = setActivePlan(mem, { ...basePlan, planId: "new" }, 3);
    expect(mem.activePlan?.planId).toBe("new");
    expect(mem.planHistory.length).toBe(1);
    expect(mem.planHistory[0].outcome).toBe("abandoned");
    expect(mem.planHistory[0].endedWeek).toBe(3);
  });

  it("archiveActivePlan moves active plan to history", () => {
    let mem = emptyOyakataMemory(makeOyakata(), 0);
    mem = setActivePlan(mem, basePlan, 1);
    mem = archiveActivePlan(mem, "success", "Completed", 5);
    expect(mem.activePlan).toBeUndefined();
    expect(mem.planHistory[0].outcome).toBe("success");
    expect(mem.planHistory[0].summary).toBe("Completed");
  });

  it("recordDecision appends to decision history capped at 52 entries", () => {
    let mem = emptyOyakataMemory(makeOyakata(), 0);
    for (let i = 0; i < 55; i++) {
      mem = recordDecision(mem, 2025, i, `decision ${i}`);
    }
    expect(mem.decisionHistory.length).toBe(52);
    expect(mem.decisionHistory[0].summary).toBe("decision 3");
    expect(mem.decisionHistory[51].summary).toBe("decision 54");
  });

  it("recordOpponentModel stores and retrieves models", () => {
    let mem = emptyOyakataMemory(makeOyakata(), 0);
    const model: OpponentTacticModel = {
      rikishiId: "r1",
      sampleSize: 10,
      familyCounts: { belt: 8, push: 2, trick: 0, speed: 0 },
      lastUpdated: 1,
    };
    mem = recordOpponentModel(mem, model);
    expect(getOpponentModel(mem, "r1")).toEqual(model);
    expect(getOpponentModel(mem, "r2")).toBeUndefined();
  });
});
