import { describe, it, expect } from "vitest";
import type {
  AIPlan,
  AIGoal,
  AIConstraint,
  AIRecommendation,
  AIContext,
  OyakataMemory,
  OpponentTacticModel,
} from "@/engine/ai/types";

describe("AI types can be constructed", () => {
  it("AIPlan", () => {
    const plan: AIPlan = {
      heyaId: "h1",
      archetype: "traditionalist",
      planId: "test",
      goals: [],
      constraints: [],
      estimatedWeeks: 4,
      startedWeek: 1,
      reasoning: ["r"],
    };
    expect(plan.planId).toBe("test");
  });

  it("AIGoal and AIConstraint", () => {
    const goal: AIGoal = { domain: "finance", target: "save", priority: 5 };
    const constraint: AIConstraint = { domain: "finance", type: "min_reserve", value: 1000 };
    expect(goal.priority).toBe(5);
    expect(constraint.type).toBe("min_reserve");
  });

  it("AIRecommendation", () => {
    const rec: AIRecommendation = {
      id: "r1",
      category: "finance",
      priority: "high",
      title: "T",
      detail: "D",
      reasoning: ["r"],
    };
    expect(rec.priority).toBe("high");
  });

  it("OpponentTacticModel", () => {
    const model: OpponentTacticModel = {
      rikishiId: "r1",
      sampleSize: 5,
      familyCounts: { push: 1, belt: 1, trick: 1, speed: 2 },
      lastUpdated: 1,
    };
    expect(model.sampleSize).toBe(5);
  });

  it("OyakataMemory has required arrays", () => {
    const memory: OyakataMemory = {
      observations: [],
      coreDirectives: [],
      lastConsolidationTick: 0,
      planHistory: [],
      decisionHistory: [],
      opponentModels: {},
    };
    expect(memory.decisionHistory).toEqual([]);
  });

  it("AIContext accepts optional fields", () => {
    const ctx: AIContext = {
      world: {} as any,
      heyaId: "h1",
      oyakata: {
        id: "o1",
        archetype: "traditionalist",
        traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
      },
    };
    expect(ctx.heyaId).toBe("h1");
  });
});
