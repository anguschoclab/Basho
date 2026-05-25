/**
 * src/engine/systems/training/__tests__/sparringTick.test.ts
 * ========================================================
 * Integration tests for weekly sparring tick
 *
 * Tests:
 * - applyWeeklySparring applies stat bonuses to weaker rikishi
 * - applyWeeklySparring increments weeksActive
 * - applyWeeklySparring skips injured rikishi
 * - applyWeeklySparring skips retired rikishi
 * - Integration with phase01_week_training
 */

import { describe, it, expect } from "vitest";
import { mockRikishi, makeMockWorld } from "../../../__tests__/utils";
import { assignSparringPair, applyWeeklySparring } from "../SparringService";
import { phase01_week_training } from "../../../tick/phases/phase01_week_training";
import { resolveImpacts } from "../../../core/ImpactResolver";
import type { CombatProfile } from "../../../types/combat";

// Helper to create a minimal combat profile for testing
function makeCombatProfile(archetype: string): CombatProfile {
  return {
    archetype: archetype as any,
    familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    statModifiers: {},
  };
}

describe("applyWeeklySparring", () => {
  it("applies stat bonuses to weaker rikishi", () => {
    const a = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 80,
      speed: 75,
      technique: 70,
      balance: 65,
    });
    const b = mockRikishi("r2", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 40,
      speed: 35,
      technique: 30,
      balance: 25,
    });
    const world = makeMockWorld({
      rikishi: new Map([
        [a.id, a],
        [b.id, b],
      ]),
    });

    const assignImpact = assignSparringPair(world, "h1", a.id, b.id, 10);
    const world1 = resolveImpacts(world, [assignImpact]);

    const sparringImpact = applyWeeklySparring(world1);
    const world2 = resolveImpacts(world1, [sparringImpact]);

    const updatedB = world2.rikishi.get("r2");
    expect(updatedB?.power).toBeGreaterThan(40);
    expect(updatedB?.speed).toBeGreaterThan(35);
  });

  it("increments weeksActive for sparring pairs", () => {
    const a = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 80,
      speed: 75,
      technique: 70,
      balance: 65,
    });
    const b = mockRikishi("r2", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 40,
      speed: 35,
      technique: 30,
      balance: 25,
    });
    const world = makeMockWorld({
      rikishi: new Map([
        [a.id, a],
        [b.id, b],
      ]),
    });

    const assignImpact = assignSparringPair(world, "h1", a.id, b.id, 10);
    const world1 = resolveImpacts(world, [assignImpact]);

    const sparringImpact = applyWeeklySparring(world1);
    const world2 = resolveImpacts(world1, [sparringImpact]);

    const pair = world2.sparringPairs?.get("h1")?.pairs["r1|r2"];
    expect(pair?.weeksActive).toBe(1);
  });

  it("skips injured rikishi", () => {
    const a = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      isRetired: false,
      power: 80,
      speed: 75,
      technique: 70,
      balance: 65,
    });
    const b = mockRikishi("r2", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 40,
      speed: 35,
      technique: 30,
      balance: 25,
    });
    const world = makeMockWorld({
      rikishi: new Map([
        [a.id, a],
        [b.id, b],
      ]),
    });

    const assignImpact = assignSparringPair(world, "h1", a.id, b.id, 10);
    const world1 = resolveImpacts(world, [assignImpact]);

    const sparringImpact = applyWeeklySparring(world1);
    const world2 = resolveImpacts(world1, [sparringImpact]);

    const updatedB = world2.rikishi.get("r2");
    expect(updatedB?.power).toBe(40); // No change
  });

  it("skips retired rikishi", () => {
    const a = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      isRetired: true,
      power: 80,
      speed: 75,
      technique: 70,
      balance: 65,
    });
    const b = mockRikishi("r2", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 40,
      speed: 35,
      technique: 30,
      balance: 25,
    });
    const world = makeMockWorld({
      rikishi: new Map([
        [a.id, a],
        [b.id, b],
      ]),
    });

    const assignImpact = assignSparringPair(world, "h1", a.id, b.id, 10);
    const world1 = resolveImpacts(world, [assignImpact]);

    const sparringImpact = applyWeeklySparring(world1);
    const world2 = resolveImpacts(world1, [sparringImpact]);

    const updatedB = world2.rikishi.get("r2");
    expect(updatedB?.power).toBe(40); // No change
  });

  it("returns empty impact when no sparring pairs exist", () => {
    const world = makeMockWorld({});

    const sparringImpact = applyWeeklySparring(world);
    const world2 = resolveImpacts(world, [sparringImpact]);

    // When no sparring pairs exist, rikishiUpdates is undefined
    expect(sparringImpact.entities?.rikishiUpdates).toBeFalsy();
  });

  it("handles multiple sparring pairs in same heya", () => {
    const a = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 80,
      speed: 75,
      technique: 70,
      balance: 65,
    });
    const b = mockRikishi("r2", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 40,
      speed: 35,
      technique: 30,
      balance: 25,
    });
    const c = mockRikishi("r3", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 85,
      speed: 80,
      technique: 75,
      balance: 70,
    });
    const d = mockRikishi("r4", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 35,
      speed: 30,
      technique: 25,
      balance: 20,
    });
    const world = makeMockWorld({
      rikishi: new Map([
        [a.id, a],
        [b.id, b],
        [c.id, c],
        [d.id, d],
      ]),
    });

    const assignImpact1 = assignSparringPair(world, "h1", a.id, b.id, 10);
    const world1 = resolveImpacts(world, [assignImpact1]);

    const assignImpact2 = assignSparringPair(world1, "h1", c.id, d.id, 10);
    const world2 = resolveImpacts(world1, [assignImpact2]);

    const sparringImpact = applyWeeklySparring(world2);
    const world3 = resolveImpacts(world2, [sparringImpact]);

    const updatedB = world3.rikishi.get("r2");
    const updatedD = world3.rikishi.get("r4");
    expect(updatedB?.power).toBeGreaterThan(40);
    expect(updatedD?.power).toBeGreaterThan(35);
  });
});

describe("phase01_week_training integration", () => {
  it("includes sparring impact in weekly training phase", () => {
    const a = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 80,
      speed: 75,
      technique: 70,
      balance: 65,
    });
    const b = mockRikishi("r2", {
      heyaId: "h1",
      injured: false,
      isRetired: false,
      power: 40,
      speed: 35,
      technique: 30,
      balance: 25,
    });
    const world = makeMockWorld({
      rikishi: new Map([
        [a.id, a],
        [b.id, b],
      ]),
    });

    const assignImpact = assignSparringPair(world, "h1", a.id, b.id, 10);
    const world1 = resolveImpacts(world, [assignImpact]);

    const trainingImpact = phase01_week_training(world1);
    const world2 = resolveImpacts(world1, [trainingImpact]);

    // Sparring should have applied bonuses
    const updatedB = world2.rikishi.get("r2");
    expect(updatedB?.power).toBeGreaterThan(40);

    // Sparring state should be updated
    const pair = world2.sparringPairs?.get("h1")?.pairs["r1|r2"];
    expect(pair?.weeksActive).toBe(1);
  });
});
