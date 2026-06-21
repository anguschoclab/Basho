import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("populationTarget at worldgen", () => {
  it("captures _populationTarget equal to the active rikishi count at generation", () => {
    const world = generateInitialWorld("pop-target-seed");
    expect(world._populationTarget).toBeDefined();
    expect(world._populationTarget).toBe(world.activeRikishiIds.size);
  });

  it("captures a non-zero target matching a second seed", () => {
    const world = generateInitialWorld("pop-target-seed-2");
    expect(world._populationTarget).toBe(world.activeRikishiIds.size);
    expect(world._populationTarget!).toBeGreaterThan(0);
  });
});
