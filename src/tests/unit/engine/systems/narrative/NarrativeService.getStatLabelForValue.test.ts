import { describe, it, expect } from "vitest";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { SeededRNG } from "@/engine/rng";

describe("NarrativeService.getStatLabelForValue", () => {
  const rng = new SeededRNG("test-seed");

  it("equals getStatLabel(rng, getStatBand(95))", () => {
    expect(NarrativeService.getStatLabelForValue(rng, 95)).toBe(
      NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(95))
    );
  });

  it("equals getStatLabel(rng, getStatBand(50))", () => {
    expect(NarrativeService.getStatLabelForValue(rng, 50)).toBe(
      NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(50))
    );
  });

  it("equals getStatLabel(rng, getStatBand(10))", () => {
    expect(NarrativeService.getStatLabelForValue(rng, 10)).toBe(
      NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(10))
    );
  });

  it("equals getStatLabel(rng, getStatBand(0))", () => {
    expect(NarrativeService.getStatLabelForValue(rng, 0)).toBe(
      NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(0))
    );
  });

  it("equals getStatLabel(rng, getStatBand(100))", () => {
    expect(NarrativeService.getStatLabelForValue(rng, 100)).toBe(
      NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(100))
    );
  });

  it("handles undefined gracefully (defaults to 50)", () => {
    expect(NarrativeService.getStatLabelForValue(rng, undefined)).toBe(
      NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(50))
    );
  });

  it("is deterministic for same rng seed", () => {
    const rng1 = new SeededRNG("deterministic");
    const rng2 = new SeededRNG("deterministic");
    expect(NarrativeService.getStatLabelForValue(rng1, 75)).toBe(
      NarrativeService.getStatLabelForValue(rng2, 75)
    );
  });
});
