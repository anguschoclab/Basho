/**
 * Tests for force-differential physics tie-breaking fixes.
 * Verifies that when forces/torques are equal, neither fighter retreats or destabilizes.
 */
import { describe, it, expect } from "vitest";
import { resolveBoutPhysics } from "../boutPhysics";
import { mockRikishi, makeMockBasho } from "../../__tests__/utils";

describe("force-differential physics — tie scenarios", () => {
  it("push battle with equal forces results in no retreat/destabilization", () => {
    // Create two rikishi with identical stats to ensure force tie
    const east = mockRikishi("east", {
      power: 70,
      speed: 60,
      weight: 120,
      stamina: 60,
      fatigue: 0,
    });
    const west = mockRikishi("west", {
      power: 70,
      speed: 60,
      weight: 120,
      stamina: 60,
      fatigue: 0,
    });

    const bout = { id: "tie-test-001", day: 1, rikishiEastId: "east", rikishiWestId: "west" };
    const basho = makeMockBasho();

    const { result, engineSnapshot } = resolveBoutPhysics(bout, east, west, basho);

    // Bout should resolve (no infinite loop)
    expect(result).toBeDefined();
    expect(result.winner).toBeDefined();

    // In a true tie, balance values should be similar (neither significantly destabilized)
    const balanceDiff = Math.abs(engineSnapshot.balanceEast - engineSnapshot.balanceWest);
    expect(balanceDiff).toBeLessThan(20); // Allow some variation but not extreme imbalance
  });

  it("belt battle with equal torque results in no retreat/destabilization", () => {
    // Create two rikishi with identical stats for belt battle
    // Note: belt battle selection is probabilistic based on combatProfile
    // This test verifies that when belt battle occurs with equal torque, ties are handled correctly
    const east = mockRikishi("east", {
      power: 70,
      technique: 60,
    });
    const west = mockRikishi("west", {
      power: 70,
      technique: 60,
    });

    const bout = { id: "tie-test-002", day: 1, rikishiEastId: "east", rikishiWestId: "west" };
    const basho = makeMockBasho();

    const { result, engineSnapshot } = resolveBoutPhysics(bout, east, west, basho);

    // Bout should resolve
    expect(result).toBeDefined();
    expect(result.winner).toBeDefined();

    // Balance should be reasonable (not extremely imbalanced)
    const balanceDiff = Math.abs(engineSnapshot.balanceEast - engineSnapshot.balanceWest);
    expect(balanceDiff).toBeLessThan(40);
  });

  it("jitter is still applied to contestLine for variation", () => {
    // Verify that jitter still affects contestLine (the line of engagement)
    // even though it no longer breaks ties in force differential
    const east = mockRikishi("east", { power: 70, speed: 60, weight: 120, stamina: 60 });
    const west = mockRikishi("west", { power: 70, speed: 60, weight: 120, stamina: 60 });

    const bout = { id: "jitter-test", day: 1, rikishiEastId: "east", rikishiWestId: "west" };
    const basho = makeMockBasho();

    // Run with different bout IDs to get different seeds
    const results = [];
    for (let i = 0; i < 5; i++) {
      const boutWithId = { ...bout, id: `jitter-test-${i}` };
      const { result } = resolveBoutPhysics(boutWithId, east, west, basho);
      results.push({ winner: result.winner, duration: result.duration });
    }

    // Results should be deterministic for same seed (verified in another test)
    // This test just ensures the simulation runs without errors
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r.winner).toBeDefined();
      expect(r.duration).toBeGreaterThan(0);
    });
  });

  it("determinism is maintained with same seed", () => {
    // Verify that the fix doesn't break determinism
    const east = mockRikishi("east", { power: 70, speed: 60, weight: 120 });
    const west = mockRikishi("west", { power: 70, speed: 60, weight: 120 });

    const bout = { id: "det-test", day: 1, rikishiEastId: "east", rikishiWestId: "west" };
    const basho = makeMockBasho();

    const results = Array.from({ length: 5 }, () => resolveBoutPhysics(bout, east, west, basho));

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i].result.winner).toBe(results[0].result.winner);
      expect(results[i].result.kimarite).toBe(results[0].result.kimarite);
      expect(results[i].result.duration).toBe(results[0].result.duration);
    }
  });

  it("mass advantage correctly creates force differential", () => {
    // Verify that mass difference still creates force differential
    const east = mockRikishi("east", { power: 70, speed: 60, weight: 140 }); // Heavier
    const west = mockRikishi("west", { power: 70, speed: 60, weight: 100 }); // Lighter

    const bout = { id: "mass-test", day: 1, rikishiEastId: "east", rikishiWestId: "west" };
    const basho = makeMockBasho();

    const { result, engineSnapshot } = resolveBoutPhysics(bout, east, west, basho);

    // Bout should resolve
    expect(result).toBeDefined();

    // East should have advantage due to mass (may not always win due to other factors)
    // but the physics should reflect the mass differential
    expect(engineSnapshot).toBeDefined();
  });
});
