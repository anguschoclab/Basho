import { describe, it, expect } from "vitest";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("junYusho ID bug — simulateEntireBasho must return rikishi IDs", () => {
  it("junYusho contains rikishi IDs, not shikona names", () => {
    const world = generateInitialWorld("junyusho-id-seed-1");
    const result = simulateEntireBasho(world, "hatsu", "junyusho-id-seed-1");

    for (const junId of result.junYusho) {
      expect(result.finalWorld.rikishi.has(junId)).toBe(true);
    }
  }, 60000);

  it("junYusho entries are valid rikishi IDs in the world", () => {
    const world = generateInitialWorld("junyusho-id-seed-2");
    const result = simulateEntireBasho(world, "hatsu", "junyusho-id-seed-2");

    const allIds = new Set(result.finalWorld.rikishi.keys());
    for (const junEntry of result.junYusho) {
      expect(allIds.has(junEntry)).toBe(true);
    }
  }, 60000);

  it("junYusho entries are NOT shikona names", () => {
    const world = generateInitialWorld("junyusho-id-seed-3");
    const result = simulateEntireBasho(world, "hatsu", "junyusho-id-seed-3");

    const allShikona = new Set<string>();
    for (const r of result.finalWorld.rikishi.values()) {
      if (r.shikona) allShikona.add(r.shikona);
    }

    for (const junEntry of result.junYusho) {
      expect(allShikona.has(junEntry)).toBe(false);
    }
  }, 60000);

  it("junYusho entries correspond to standings with second-highest win count", () => {
    const world = generateInitialWorld("junyusho-id-seed-4");
    const result = simulateEntireBasho(world, "hatsu", "junyusho-id-seed-4");

    if (result.junYusho.length === 0) return;

    // junYusho is the second entry in sorted standings — could have same wins as yusho (lost tiebreak)
    // Find the second sorted entry's win count
    const sortedWins = Array.from(result.standings.values())
      .map((s) => s.wins)
      .sort((a, b) => b - a);
    const yushoWins = sortedWins[0];
    // Second-highest is the first value < yushoWins, or yushoWins if there's a tie
    const secondBestWins = sortedWins.find((w) => w < yushoWins) ?? yushoWins;

    for (const junId of result.junYusho) {
      const stats = result.standings.get(junId);
      expect(stats).toBeDefined();
      expect(stats!.wins).toBeLessThanOrEqual(yushoWins);
      expect(stats!.wins).toBeGreaterThanOrEqual(secondBestWins);
    }
  }, 60000);
});
