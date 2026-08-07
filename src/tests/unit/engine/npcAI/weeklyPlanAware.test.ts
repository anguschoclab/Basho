import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { makeNPCWeeklyDecision } from "@/engine/npcAI";
import type { AIPlan } from "@/engine/ai/types";

describe("makeNPCWeeklyDecision plan-aware", () => {
  function setupWorld(archetype: string) {
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
    return world;
  }

  it("respects a max_intensity constraint from a strategic plan", () => {
    const world = setupWorld("traditionalist");
    const plan: AIPlan = {
      heyaId: "h1",
      archetype: "traditionalist",
      planId: "rebuild",
      goals: [],
      constraints: [{ domain: "training", type: "max_intensity", value: "balanced" }],
      estimatedWeeks: 4,
      startedWeek: 1,
      reasoning: [],
    };
    const decision = makeNPCWeeklyDecision(world, "h1", plan);
    expect(decision.trainingIntensity).not.toBe("punishing");
  });

  it("uses plan goals to raise scouting priority for recruitment blitz", () => {
    const world = setupWorld("strategist");
    const plan: AIPlan = {
      heyaId: "h1",
      archetype: "strategist",
      planId: "recruitment_blitz",
      goals: [{ domain: "recruitment", target: "sign_2_sekitori", priority: 9 }],
      constraints: [],
      estimatedWeeks: 4,
      startedWeek: 1,
      reasoning: [],
    };
    const decision = makeNPCWeeklyDecision(world, "h1", plan);
    expect(["active", "aggressive"]).toContain(decision.scoutingPriority);
  });
});
