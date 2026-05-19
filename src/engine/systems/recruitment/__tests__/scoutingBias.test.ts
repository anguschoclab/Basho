import { describe, it, expect } from "vitest";
import {
  generateScoutingBias,
  applyBias,
  decayBias,
} from "../FogOfWarService";

describe("generateScoutingBias", () => {
  it("produces a bias in the ±20 range for each stat", () => {
    const bias = generateScoutingBias("candidate-123", 2025);
    for (const val of Object.values(bias.statOffsets)) {
      expect(val).toBeGreaterThanOrEqual(-20);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it("produces deterministic output for the same seed", () => {
    const a = generateScoutingBias("candidate-abc", 2025);
    const b = generateScoutingBias("candidate-abc", 2025);
    expect(a.statOffsets.strength).toBe(b.statOffsets.strength);
    expect(a.statOffsets.speed).toBe(b.statOffsets.speed);
  });

  it("produces different output for different seeds", () => {
    const a = generateScoutingBias("candidate-aaa", 2025);
    const b = generateScoutingBias("candidate-bbb", 2025);
    // At least one stat should differ
    const diffFound = Object.keys(a.statOffsets).some(
      (k) =>
        a.statOffsets[k as keyof typeof a.statOffsets] !==
        b.statOffsets[k as keyof typeof b.statOffsets]
    );
    expect(diffFound).toBe(true);
  });

  it("includes all required stat fields", () => {
    const bias = generateScoutingBias("candidate-xyz", 2025);
    expect(bias.statOffsets).toHaveProperty("strength");
    expect(bias.statOffsets).toHaveProperty("speed");
    expect(bias.statOffsets).toHaveProperty("balance");
    expect(bias.statOffsets).toHaveProperty("technique");
    expect(bias.statOffsets).toHaveProperty("stamina");
    expect(bias.statOffsets).toHaveProperty("mental");
    expect(bias.statOffsets).toHaveProperty("adaptability");
  });

  it("starts with full decayFactor of 1.0", () => {
    const bias = generateScoutingBias("candidate-123", 2025);
    expect(bias.decayFactor).toBe(1.0);
  });
});

describe("applyBias", () => {
  it("adds bias offset to true value, clamped to 0–99", () => {
    const result = applyBias(70, 15, 1.0);
    expect(result).toBe(85);
  });

  it("clamps at 99", () => {
    expect(applyBias(95, 20, 1.0)).toBe(99);
  });

  it("clamps at 0", () => {
    expect(applyBias(5, -20, 1.0)).toBe(0);
  });

  it("scales bias toward 0 as decayFactor approaches 0", () => {
    expect(applyBias(70, 20, 0.0)).toBe(70);
    expect(applyBias(70, 20, 0.5)).toBe(80);
  });

  it("handles negative offsets correctly", () => {
    expect(applyBias(70, -15, 1.0)).toBe(55);
  });
});

describe("decayBias", () => {
  it("reduces bias magnitude when observations increase", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 5);
    expect(decayed.decayFactor).toBeLessThan(bias.decayFactor);
  });

  it("reaches 0 decay factor at 20 observations", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 20);
    expect(decayed.decayFactor).toBe(0);
  });

  it("does not decay below 0", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 100);
    expect(decayed.decayFactor).toBe(0);
  });

  it("preserves stat offsets when decaying", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 5);
    expect(decayed.statOffsets).toEqual(bias.statOffsets);
  });

  it("has no effect when observations is 0", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 0);
    expect(decayed.decayFactor).toBe(bias.decayFactor);
  });
});
