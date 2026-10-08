import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";

describe("TournamentSimulator match resolution", () => {
  it("resolves all scheduled matches across 15 days", () => {
    const world = generateInitialWorld("perf-sim-seed");
    const result = simulateEntireBasho(world, "hatsu", "perf-sim-seed");

    const allResolved = result.finalWorld.currentBasho?.matches.every(
      (m) => m.result !== undefined && m.result !== null
    );
    expect(allResolved).toBe(true);
  }, 60000);

  it("produces correct total bout count matching scheduled matches", () => {
    const world = generateInitialWorld("perf-sim-seed-2");
    const result = simulateEntireBasho(world, "hatsu", "perf-sim-seed-2");

    const totalMatches = result.finalWorld.currentBasho?.matches.length ?? 0;
    const resolvedMatches =
      result.finalWorld.currentBasho?.matches.filter((m) => m.result).length ?? 0;
    expect(resolvedMatches).toBe(totalMatches);
  }, 60000);

  it("deterministic: same seed produces same yusho winner and standings size", () => {
    const world1 = generateInitialWorld("perf-det-seed");
    const world2 = generateInitialWorld("perf-det-seed");

    const result1 = simulateEntireBasho(world1, "hatsu", "perf-det-seed");
    const result2 = simulateEntireBasho(world2, "hatsu", "perf-det-seed");

    expect(result1.yushoWinner.id).toBe(result2.yushoWinner.id);
    expect(result1.yushoWinner.wins).toBe(result2.yushoWinner.wins);
    expect(result1.standings.size).toBe(result2.standings.size);
  }, 60000);

  it("per-day bout counts are non-zero for days 1-15", () => {
    const world = generateInitialWorld("perf-daycount-seed");
    const result = simulateEntireBasho(world, "hatsu", "perf-daycount-seed");

    const matches = result.finalWorld.currentBasho?.matches ?? [];
    const dayCounts = new Map<number, number>();
    for (const m of matches) {
      if (m.result) {
        dayCounts.set(m.day, (dayCounts.get(m.day) ?? 0) + 1);
      }
    }

    for (let day = 1; day <= 15; day++) {
      expect(dayCounts.get(day) ?? 0).toBeGreaterThan(0);
    }
  }, 60000);
});
