import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { TARGET_ROSTER_SIZE } from "@/constants/engine/recruitmentExtended";

describe("populationTarget at worldgen", () => {
  it("captures _populationTarget equal to NPC stable capacity (TARGET_ROSTER_SIZE × NPC heyas)", () => {
    const world = generateInitialWorld("pop-target-seed");
    expect(world._populationTarget).toBeDefined();
    const npcHeyaCount = Array.from(world.heyas.values()).filter(
      (h) => h.id !== world.playerHeyaId
    ).length;
    expect(world._populationTarget).toBe(npcHeyaCount * TARGET_ROSTER_SIZE);
  });

  it("captures a non-zero target matching a second seed", () => {
    const world = generateInitialWorld("pop-target-seed-2");
    const npcHeyaCount = Array.from(world.heyas.values()).filter(
      (h) => h.id !== world.playerHeyaId
    ).length;
    expect(world._populationTarget).toBe(npcHeyaCount * TARGET_ROSTER_SIZE);
    expect(world._populationTarget!).toBeGreaterThan(0);
  });
});
