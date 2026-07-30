/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { assignQuirk, hasPoorEyesight, applyGlasses } from "@/engine/systems/generation/QuirkAssignment";
import { mockRikishi } from "../utils";
import { SeededRNG } from "@/engine/rng";

describe("Poor Eyesight Quirk (B5)", () => {
  it("assignQuirk can assign poorEyesight quirk", () => {
    const r = mockRikishi("quirk-1", {} as any);
    const rng = new SeededRNG("quirk-test-poor-eyesight");
    // Force assignment by trying many times
    let assigned = false;
    for (let i = 0; i < 100; i++) {
      const result = assignQuirk(r, rng);
      if (result.quirks?.poorEyesight) {
        assigned = true;
        break;
      }
    }
    expect(assigned).toBe(true);
  });

  it("hasPoorEyesight returns true when quirk is set", () => {
    const r = mockRikishi("quirk-2", {
      quirks: { poorEyesight: true },
    } as any);
    expect(hasPoorEyesight(r)).toBe(true);
  });

  it("hasPoorEyesight returns false when quirk is not set", () => {
    const r = mockRikishi("quirk-3", {} as any);
    expect(hasPoorEyesight(r)).toBe(false);
  });

  it("applyGlasses sets glasses style and acquiredBasho", () => {
    const r = mockRikishi("quirk-4", {
      quirks: { poorEyesight: true },
    } as any);
    const result = applyGlasses(r, "round", "hatsu-2025");
    expect(result.quirks?.glasses).toBeDefined();
    expect(result.quirks?.glasses?.style).toBe("round");
    expect(result.quirks?.glasses?.acquiredBasho).toBe("hatsu-2025");
  });

  it("applyGlasses does nothing if poorEyesight is not set", () => {
    const r = mockRikishi("quirk-5", {} as any);
    const result = applyGlasses(r, "square", "hatsu-2025");
    expect(result.quirks?.glasses).toBeUndefined();
  });

  it("assignQuirk is deterministic for same seed", () => {
    const r1 = mockRikishi("quirk-6", {} as any);
    const r2 = mockRikishi("quirk-6", {} as any);
    const rng1 = new SeededRNG("deterministic-quirk");
    const rng2 = new SeededRNG("deterministic-quirk");
    const result1 = assignQuirk(r1, rng1);
    const result2 = assignQuirk(r2, rng2);
    expect(result1.quirks).toEqual(result2.quirks);
  });

  it("assignQuirk does not override existing quirks", () => {
    const r = mockRikishi("quirk-7", {
      quirks: { poorEyesight: true },
    } as any);
    const rng = new SeededRNG("quirk-no-override");
    const result = assignQuirk(r, rng);
    expect(result.quirks?.poorEyesight).toBe(true);
  });

  it("poorEyesight chance is 2% (POOR_EYESIGHT_CHANCE = 0.02)", () => {
    // Statistical test: in 5000 rolls, expect ~100 hits (±3σ ≈ 60-140)
    let count = 0;
    for (let i = 0; i < 5000; i++) {
      const r = mockRikishi(`stat-${i}`, {} as any);
      const rng = new SeededRNG(`stat-eyesight-${i}`);
      const result = assignQuirk(r, rng);
      if (result.quirks?.poorEyesight) count++;
    }
    expect(count).toBeGreaterThan(50);
    expect(count).toBeLessThan(200);
  });
});
