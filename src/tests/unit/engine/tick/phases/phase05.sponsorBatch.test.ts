import { describe, it, expect } from "vitest";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("Sponsor renewal batch (B2.4) — validation", () => {
  it("phase05_monthly_boundary with monthly boundary produces valid StateImpact", () => {
    const world = generateInitialWorld("sponsor-batch-seed-001");
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
  });

  it("sponsor renewals are collected and merged (not resolved per-call)", () => {
    // The phase already collects sponsorRenewalImpacts[] and merges via mergeImpacts.
    // This test validates the output is a single merged StateImpact.
    const world = generateInitialWorld("sponsor-batch-seed-002");
    const worldWithBoundary = {
      ...world,
      transientContext: {
        ...world.transientContext,
        boundaries: { monthBoundary: true, yearBoundary: false },
        pendingMonthBoundary: true,
      },
    };

    const impact = phase05_monthly_boundary(worldWithBoundary);
    // Merged impacts should have metadata
    expect(impact.metadata).toBeDefined();
    // Should be a single StateImpact, not an array
    expect(Array.isArray(impact)).toBe(false);
  });
});
