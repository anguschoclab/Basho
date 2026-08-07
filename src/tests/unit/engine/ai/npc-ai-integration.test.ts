import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { buildAIContext } from "@/engine/npcAI/contextBuilder";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { makeNPCWeeklyDecision } from "@/engine/npcAI";

describe("NPC AI integration", () => {
  it("runs a full weekly decision pipeline for each archetype without crashing", () => {
    const archetypes = ["traditionalist", "modernist", "strategist", "tyrant", "diplomat"] as const;
    for (const archetype of archetypes) {
      const world = makeMockWorld();
      const heya = makeMockHeya("h1", { oyakataId: "o1", runwayBand: "comfortable", rikishiIds: ["r1"] });
      world.heyas.set("h1", heya);
      world.rikishi.set("r1", mockRikishi("r1", { heyaId: "h1", rank: "maegashira", division: "makuuchi" }));
      world.activeRikishiIds.add("r1");
      world.oyakata.set("o1", {
        id: "o1",
        name: "Oya",
        archetype,
        traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
      } as any);

      const ctx = buildAIContext(world, "h1", "o1");
      const plan = createPlan(ctx);
      const decision = makeNPCWeeklyDecision(world, "h1", plan ?? undefined);

      expect(decision).toBeDefined();
      expect(["conservative", "balanced", "intensive", "punishing"]).toContain(decision.trainingIntensity);
      expect(["none", "passive", "active", "aggressive"]).toContain(decision.scoutingPriority);
    }
  });
});
