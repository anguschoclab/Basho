import { describe, it, expect } from "vitest";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("Batched impact resolution (B2.2) — validation", () => {
  it("phase05_monthly_boundary returns a single StateImpact (not multiple resolves)", () => {
    const world = generateInitialWorld("batched-impact-seed-001");
    // Set up a monthly boundary scenario
    const worldWithBoundary = {
      ...world,
      transientContext: {
        ...world.transientContext,
        boundaries: { monthBoundary: true, yearBoundary: false },
        pendingMonthBoundary: true,
      },
    };

    const impact = phase05_monthly_boundary(worldWithBoundary);
    expect(impact).toHaveProperty("metadata");
    // Source should be the phase name (or "merged" if impacts were merged)
    expect(impact.metadata?.source).toBeTruthy();
  });

  it("phase05_monthly_boundary impact is well-formed (has entities or worldFields)", () => {
    const world = generateInitialWorld("batched-impact-seed-002");
    const worldWithBoundary = {
      ...world,
      transientContext: {
        ...world.transientContext,
        boundaries: { monthBoundary: true, yearBoundary: false },
        pendingMonthBoundary: true,
      },
    };

    const impact = phase05_monthly_boundary(worldWithBoundary);
    // Should have either entities, collections, or worldFields
    const hasContent =
      (impact.entities && Object.keys(impact.entities).length > 0) ||
      (impact.worldFields && Object.keys(impact.worldFields).length > 0) ||
      (impact.collections && Object.keys(impact.collections).length > 0);
    expect(hasContent).toBe(true);
  });
});
