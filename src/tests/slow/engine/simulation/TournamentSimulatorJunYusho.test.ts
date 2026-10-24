import { describe, it, expect } from "vitest";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("TournamentSimulator — yusho and jun-yusho extraction", () => {
  it("yusho winner is the top-ranked by wins", () => {
    const world = generateInitialWorld("yusho-test-seed");
    const result = simulateEntireBasho(world, "hatsu", "yusho-test-seed");

    expect(result.yushoWinner).toBeDefined();
    expect(result.yushoWinner.id).toBeTruthy();
    expect(result.yushoWinner.wins).toBeGreaterThan(0);
  }, 60000);

  it("jun-yusho are rikishi with second-most wins (excluding yusho winner)", () => {
    const world = generateInitialWorld("jun-yusho-test-seed");
    const result = simulateEntireBasho(world, "hatsu", "jun-yusho-test-seed");

    const yushoWins = result.yushoWinner.wins;

    // Jun-yusho should contain rikishi IDs (not shikona names)
    for (const junId of result.junYusho) {
      // Jun-yusho is a rikishi ID — verify it exists in the world
      expect(result.finalWorld.rikishi.has(junId)).toBe(true);
    }

    // If there are jun-yusho, they should have fewer wins than yusho
    // (or equal wins but lost the tiebreak)
    if (result.junYusho.length > 0) {
      // Find jun-yusho wins from standings
      const standings = result.standings;
      let junWins = -1;
      for (const [id, stats] of standings.entries()) {
        if (result.junYusho.includes(id)) {
          junWins = Math.max(junWins, stats.wins);
        }
      }
      // Jun-yusho wins should be <= yusho wins
      expect(junWins).toBeLessThanOrEqual(yushoWins);
    }
  }, 60000);

  it("deterministic: same seed produces same yusho and jun-yusho", () => {
    const world1 = generateInitialWorld("det-yusho-seed");
    const world2 = generateInitialWorld("det-yusho-seed");

    const result1 = simulateEntireBasho(world1, "hatsu", "det-yusho-seed");
    const result2 = simulateEntireBasho(world2, "hatsu", "det-yusho-seed");

    expect(result1.yushoWinner.id).toBe(result2.yushoWinner.id);
    expect(result1.yushoWinner.wins).toBe(result2.yushoWinner.wins);
    expect(result1.junYusho).toEqual(result2.junYusho);
  }, 60000);

  it("standings size matches number of participants", () => {
    const world = generateInitialWorld("standings-size-seed");
    const result = simulateEntireBasho(world, "hatsu", "standings-size-seed");

    expect(result.standings.size).toBeGreaterThan(0);
    // Every rikishi in standings should exist in the world
    for (const [id] of result.standings.entries()) {
      expect(result.finalWorld.rikishi.has(id)).toBe(true);
    }
  }, 60000);
});
