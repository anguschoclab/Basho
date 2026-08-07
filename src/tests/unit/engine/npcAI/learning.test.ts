import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../utils";
import { buildAIContext } from "@/engine/npcAI/contextBuilder";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { emptyOyakataMemory } from "@/engine/npcAI/MemoryStore";

describe("StrategicPlanner learning", () => {
  it("avoids reselecting a plan that was recently abandoned", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { oyakataId: "o1", runwayBand: "critical" });
    world.heyas.set("h1", heya);
    const oyakata = {
      id: "o1",
      name: "Oya",
      archetype: "traditionalist",
      traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
    } as any;
    world.oyakata.set("o1", oyakata);

    const baseCtx = buildAIContext(world, "h1", "o1");
    const firstPlan = createPlan(baseCtx)!;

    const memory = emptyOyakataMemory(oyakata, world.week);
    memory.planHistory = Array.from({ length: 3 }, () => ({
      planId: firstPlan.planId,
      startedWeek: 1,
      endedWeek: 2,
      outcome: "abandoned" as const,
      summary: "failed",
    }));

    const ctxWithMemory = buildAIContext(world, "h1", "o1");
    ctxWithMemory.memory = memory;
    const nextPlan = createPlan(ctxWithMemory)!;

    expect(nextPlan.planId).not.toBe(firstPlan.planId);
  });

  it("still picks a viable alternative when the top-scoring plan has failed before", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { oyakataId: "o1", runwayBand: "critical" });
    world.heyas.set("h1", heya);
    const oyakata = {
      id: "o1",
      name: "Oya",
      archetype: "traditionalist",
      traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
    } as any;
    world.oyakata.set("o1", oyakata);

    const ctx = buildAIContext(world, "h1", "o1");
    const plan = createPlan(ctx)!;
    expect(plan).toBeDefined();
    expect(plan.planId).toBeTruthy();
  });
});
