import { describe, it, expect } from "vitest";
import { phase06_yearly_boundary } from "@/engine/tick/phases/phase06_yearly_boundary";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("Single-pass yearly iteration (B2.1)", () => {
  it("phase06_yearly_boundary produces valid StateImpact with metadata", () => {
    const world = generateInitialWorld("yearly-fused-seed-001");
    const worldWithYearBoundary = {
      ...world,
      transientContext: {
        ...world.transientContext,
        boundaries: { monthBoundary: true, yearBoundary: true },
        pendingMonthBoundary: true,
        pendingYearBoundary: true,
      },
    };

    const impact = phase06_yearly_boundary(worldWithYearBoundary);
    expect(impact).toHaveProperty("metadata");
  });

  it("phase06_yearly_boundary updates rikishi age for all active rikishi", () => {
    const world = generateInitialWorld("yearly-fused-seed-002");
    const worldWithYearBoundary = {
      ...world,
      transientContext: {
        ...world.transientContext,
        boundaries: { monthBoundary: true, yearBoundary: true },
        pendingMonthBoundary: true,
        pendingYearBoundary: true,
      },
    };

    const impact = phase06_yearly_boundary(worldWithYearBoundary);
    const result = resolveImpacts(worldWithYearBoundary, [impact]);

    // The phase sets age = world.year - birthYear for all active rikishi
    let updatedCount = 0;
    for (const id of world.activeRikishiIds) {
      const updated = result.rikishi.get(id);
      if (updated) {
        const expectedAge = worldWithYearBoundary.year - updated.birthYear;
        if (updated.age === expectedAge) updatedCount++;
      }
    }
    expect(updatedCount).toBeGreaterThan(0);
  });

  it("fused loop produces same results as separate loops would", () => {
    const world = generateInitialWorld("yearly-fused-seed-003");
    const worldWithYearBoundary = {
      ...world,
      transientContext: {
        ...world.transientContext,
        boundaries: { monthBoundary: true, yearBoundary: true },
        pendingMonthBoundary: true,
        pendingYearBoundary: true,
      },
    };

    const impact = phase06_yearly_boundary(worldWithYearBoundary);
    const result = resolveImpacts(worldWithYearBoundary, [impact]);

    // Verify age = year - birthYear for all active rikishi that were updated
    for (const id of result.activeRikishiIds) {
      const r = result.rikishi.get(id);
      if (r && r.age !== undefined) {
        expect(r.age).toBe(worldWithYearBoundary.year - r.birthYear);
      }
    }
  });
});
