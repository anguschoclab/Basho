import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { buildAIContext } from "@/engine/npcAI/contextBuilder";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { chooseTactic } from "@/engine/bout/BoutAI";
import { SeededRNG } from "@/engine/rng";

describe("AI memory and decision determinism", () => {
  it("StrategicPlanner.createPlan returns the same plan for identical contexts", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { runwayBand: "critical", oyakataId: "o1" });
    world.heyas.set("h1", heya);
    world.oyakata.set("o1", {
      id: "o1",
      name: "Oya",
      archetype: "traditionalist",
      traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
    } as any);
    const ctx = buildAIContext(world, "h1", "o1");
    const a = createPlan(ctx);
    const b = createPlan(ctx);
    expect(a).toEqual(b);
  });

  it("BoutAI.chooseTactic is deterministic for identical inputs", () => {
    const cpu = mockRikishi("cpu", { style: "yotsu", stats: { technique: 70, speed: 60 } as any });
    const opponent = mockRikishi("opp", { style: "oshi", stats: { technique: 50, speed: 50 } as any });
    const rng = new SeededRNG("seed");
    const a = chooseTactic(cpu, opponent, { rng, bashoDay: 8, cpuRecord: { wins: 5, losses: 3 }, rivalryHeat: 0 });
    const rng2 = new SeededRNG("seed");
    const b = chooseTactic(cpu, opponent, { rng: rng2, bashoDay: 8, cpuRecord: { wins: 5, losses: 3 }, rivalryHeat: 0 });
    expect(a).toBe(b);
  });
});
