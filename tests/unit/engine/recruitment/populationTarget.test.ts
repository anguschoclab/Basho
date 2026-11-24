import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { getHeyaRosterTarget } from "@/engine/generation/RecruitmentController";

// The worldgen demographic seed is the sum of per-heya roster targets
// (JSA-2026 per-stable sizes — ~590 total) for all NPC heyas; the player's
// stable is excluded since the controller never backfills it.
describe("populationTarget at worldgen", () => {
  it("captures _populationTarget as the Σ of NPC per-heya roster targets", () => {
    const world = generateInitialWorld("pop-target-seed");
    expect(world._populationTarget).toBeDefined();
    const expected = Array.from(world.heyas.values())
      .filter((h) => h.id !== world.playerHeyaId)
      .reduce((sum, h) => sum + getHeyaRosterTarget(h), 0);
    expect(world._populationTarget).toBe(expected);
  });

  it("lands near the real ~590 scale on a second seed", () => {
    const world = generateInitialWorld("pop-target-seed-2");
    // NPC total = 45-stable Σ minus the player's own target (~550–590).
    expect(world._populationTarget!).toBeGreaterThan(500);
    expect(world._populationTarget!).toBeLessThan(610);
  });
});
