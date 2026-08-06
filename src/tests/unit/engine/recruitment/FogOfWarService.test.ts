 
import { describe, it, expect } from "vitest";
import {
  calculateScoutingLevel,
  getConfidenceFromLevel,
  getConfidenceLevel,
  getEstimatedValue,
  resolveScoutedAttribute,
  generateScoutingBias,
  applyBias,
  decayBias,
  type ScoutingBias,
} from "@/engine/systems/recruitment/FogOfWarService";
import {
  MAX_SCOUTING_LEVEL,
  PASSIVE_SCOUTING_MAX_BASE,
  PASSIVE_SCOUTING_MULTIPLIER,
  FOG_OF_WAR_CERTAIN_THRESHOLD,
  FOG_OF_WAR_HIGH_THRESHOLD,
  FOG_OF_WAR_MEDIUM_THRESHOLD,
  FOG_OF_WAR_LOW_THRESHOLD,
  STYLE_HIGH_OBSERVATIONS,
  STYLE_MEDIUM_OBSERVATIONS,
  POTENTIAL_HIGH_THRESHOLD,
  POTENTIAL_MEDIUM_THRESHOLD,
  POTENTIAL_LOW_THRESHOLD,
  HIGH_ERROR_PERCENTAGE,
  SCOUTING_BIAS_MAX,
  SCOUTING_BIAS_DECAY_OBSERVATIONS,
  FULL_BIAS_FACTOR,
} from "@/constants/engine/recruitmentExtended";
import { INVESTMENT_BONUS } from "@/constants/engine/recruitment";

// ── calculateScoutingLevel ─────────────────────────────────────────────────

describe("calculateScoutingLevel", () => {
  it("returns MAX_SCOUTING_LEVEL (100) for owned rikishi", () => {
    expect(calculateScoutingLevel(true, 0, "none")).toBe(MAX_SCOUTING_LEVEL);
    expect(calculateScoutingLevel(true, 50, "deep")).toBe(MAX_SCOUTING_LEVEL);
  });

  it("returns 0 for non-owned with 0 observations and no investment", () => {
    expect(calculateScoutingLevel(false, 0, "none")).toBe(0);
  });

  it("passive base = min(PASSIVE_SCOUTING_MAX_BASE, observations * PASSIVE_SCOUTING_MULTIPLIER)", () => {
    const expected = Math.min(PASSIVE_SCOUTING_MAX_BASE, 10 * PASSIVE_SCOUTING_MULTIPLIER);
    expect(calculateScoutingLevel(false, 10, "none")).toBe(expected);
  });

  it("caps passive base at PASSIVE_SCOUTING_MAX_BASE", () => {
    const many = 1000;
    const expected = Math.min(PASSIVE_SCOUTING_MAX_BASE, many * PASSIVE_SCOUTING_MULTIPLIER);
    expect(calculateScoutingLevel(false, many, "none")).toBe(expected);
  });

  it("adds investment bonus to passive base", () => {
    const obs = 5;
    const base = Math.min(PASSIVE_SCOUTING_MAX_BASE, obs * PASSIVE_SCOUTING_MULTIPLIER);
    expect(calculateScoutingLevel(false, obs, "light")).toBe(base + INVESTMENT_BONUS.light);
    expect(calculateScoutingLevel(false, obs, "standard")).toBe(base + INVESTMENT_BONUS.standard);
    expect(calculateScoutingLevel(false, obs, "deep")).toBe(base + INVESTMENT_BONUS.deep);
  });

  it("clamps total to 0-100", () => {
    expect(calculateScoutingLevel(false, 0, "none")).toBeGreaterThanOrEqual(0);
    expect(calculateScoutingLevel(false, 1000, "deep")).toBeLessThanOrEqual(MAX_SCOUTING_LEVEL);
  });

  it("handles negative observations as 0", () => {
    expect(calculateScoutingLevel(false, -5, "none")).toBe(0);
  });
});

// ── getConfidenceFromLevel ─────────────────────────────────────────────────

describe("getConfidenceFromLevel", () => {
  it("returns 'certain' at FOG_OF_WAR_CERTAIN_THRESHOLD and above", () => {
    expect(getConfidenceFromLevel(FOG_OF_WAR_CERTAIN_THRESHOLD)).toBe("certain");
    expect(getConfidenceFromLevel(100)).toBe("certain");
  });

  it("returns 'high' at FOG_OF_WAR_HIGH_THRESHOLD and up to certain threshold - 1", () => {
    expect(getConfidenceFromLevel(FOG_OF_WAR_HIGH_THRESHOLD)).toBe("high");
    expect(getConfidenceFromLevel(FOG_OF_WAR_CERTAIN_THRESHOLD - 1)).toBe("high");
  });

  it("returns 'medium' at FOG_OF_WAR_MEDIUM_THRESHOLD and up to high threshold - 1", () => {
    expect(getConfidenceFromLevel(FOG_OF_WAR_MEDIUM_THRESHOLD)).toBe("medium");
    expect(getConfidenceFromLevel(FOG_OF_WAR_HIGH_THRESHOLD - 1)).toBe("medium");
  });

  it("returns 'low' at FOG_OF_WAR_LOW_THRESHOLD and up to medium threshold - 1", () => {
    expect(getConfidenceFromLevel(FOG_OF_WAR_LOW_THRESHOLD)).toBe("low");
    expect(getConfidenceFromLevel(FOG_OF_WAR_MEDIUM_THRESHOLD - 1)).toBe("low");
  });

  it("returns 'unknown' below FOG_OF_WAR_LOW_THRESHOLD", () => {
    expect(getConfidenceFromLevel(FOG_OF_WAR_LOW_THRESHOLD - 1)).toBe("unknown");
    expect(getConfidenceFromLevel(0)).toBe("unknown");
  });
});

// ── getConfidenceLevel ─────────────────────────────────────────────────────

describe("getConfidenceLevel", () => {
  it("returns 'certain' for owned rikishi regardless of attribute type", () => {
    expect(getConfidenceLevel(0, true, 0, "hidden")).toBe("certain");
    expect(getConfidenceLevel(0, true, 0, "potential")).toBe("certain");
  });

  it("returns 'certain' for physical attributes (height/weight always known)", () => {
    expect(getConfidenceLevel(0, false, 0, "physical")).toBe("certain");
    expect(getConfidenceLevel(10, false, 0, "physical")).toBe("certain");
  });

  it("returns 'unknown' for hidden attributes regardless of scouting level", () => {
    expect(getConfidenceLevel(100, false, 100, "hidden")).toBe("unknown");
  });

  it("style: high observations → 'high'", () => {
    expect(getConfidenceLevel(0, false, STYLE_HIGH_OBSERVATIONS, "style")).toBe("high");
  });

  it("style: medium observations → 'medium'", () => {
    expect(getConfidenceLevel(0, false, STYLE_MEDIUM_OBSERVATIONS, "style")).toBe("medium");
  });

  it("style: low observations → 'low'", () => {
    expect(getConfidenceLevel(0, false, 0, "style")).toBe("low");
  });

  it("potential: high threshold → 'high'", () => {
    expect(getConfidenceLevel(POTENTIAL_HIGH_THRESHOLD, false, 0, "potential")).toBe("high");
  });

  it("potential: medium threshold → 'medium'", () => {
    expect(getConfidenceLevel(POTENTIAL_MEDIUM_THRESHOLD, false, 0, "potential")).toBe("medium");
  });

  it("potential: low threshold → 'low'", () => {
    expect(getConfidenceLevel(POTENTIAL_LOW_THRESHOLD, false, 0, "potential")).toBe("low");
  });

  it("potential: below low threshold → 'unknown'", () => {
    expect(getConfidenceLevel(POTENTIAL_LOW_THRESHOLD - 1, false, 0, "potential")).toBe("unknown");
  });

  it("combat: delegates to getConfidenceFromLevel", () => {
    expect(getConfidenceLevel(FOG_OF_WAR_CERTAIN_THRESHOLD, false, 0, "combat")).toBe("certain");
    expect(getConfidenceLevel(FOG_OF_WAR_HIGH_THRESHOLD, false, 0, "combat")).toBe("high");
    expect(getConfidenceLevel(0, false, 0, "combat")).toBe("unknown");
  });
});

// ── getEstimatedValue ──────────────────────────────────────────────────────

describe("getEstimatedValue", () => {
  it("returns clamped trueValue for 'certain' confidence", () => {
    expect(getEstimatedValue(75, "certain", "seed1")).toBe(75);
    expect(getEstimatedValue(120, "certain", "seed1", { min: 0, max: 100 })).toBe(100);
    expect(getEstimatedValue(-5, "certain", "seed1", { min: 0, max: 100 })).toBe(0);
  });

  it("returns midpoint of range for 'unknown' confidence", () => {
    expect(getEstimatedValue(75, "unknown", "seed1")).toBe(50);
    expect(getEstimatedValue(75, "unknown", "seed1", { min: 0, max: 200 })).toBe(100);
  });

  it("is deterministic: same seed + inputs → same output", () => {
    const a = getEstimatedValue(60, "medium", "my-seed");
    const b = getEstimatedValue(60, "medium", "my-seed");
    expect(a).toBe(b);
  });

  it("different seeds produce different estimates (probabilistic)", () => {
    const estimates = new Set<number>();
    for (let i = 0; i < 20; i++) {
      estimates.add(getEstimatedValue(50, "low", `seed-${i}`));
    }
    expect(estimates.size).toBeGreaterThan(1);
  });

  it("clamps result to range", () => {
    for (let i = 0; i < 50; i++) {
      const val = getEstimatedValue(95, "low", `clamp-${i}`, { min: 0, max: 100 });
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it("low confidence has larger error range than medium", () => {
    let lowSpread = 0;
    let medSpread = 0;
    for (let i = 0; i < 50; i++) {
      const lowVal = getEstimatedValue(50, "low", `cmp-low-${i}`);
      const medVal = getEstimatedValue(50, "medium", `cmp-med-${i}`);
      lowSpread = Math.max(lowSpread, Math.abs(lowVal - 50));
      medSpread = Math.max(medSpread, Math.abs(medVal - 50));
    }
    // Low confidence allows up to 35% error vs medium 20% on a 0-100 range
    expect(lowSpread).toBeGreaterThan(medSpread);
  });

  it("high confidence has smallest error range", () => {
    let highSpread = 0;
    for (let i = 0; i < 50; i++) {
      const val = getEstimatedValue(50, "high", `high-${i}`);
      highSpread = Math.max(highSpread, Math.abs(val - 50));
    }
    // High confidence max error is HIGH_ERROR_PERCENTAGE (9%) of span (100) = 9
    expect(highSpread).toBeLessThanOrEqual((HIGH_ERROR_PERCENTAGE / 100) * 100 + 1);
  });
});

// ── resolveScoutedAttribute ────────────────────────────────────────────────

describe("resolveScoutedAttribute", () => {
  it("returns 'unknown' confidence with narrative text for unknown", () => {
    const result = resolveScoutedAttribute("strength", 50, "unknown", "seed1");
    expect(result.confidence).toBe("unknown");
    expect(typeof result.value).toBe("string");
    expect(typeof result.narrative).toBe("string");
    expect(result.value.length).toBeGreaterThan(0);
  });

  it("returns 'certain' confidence with descriptive label for certain", () => {
    const result = resolveScoutedAttribute("strength", 85, "certain", "seed1");
    expect(result.confidence).toBe("certain");
    expect(typeof result.value).toBe("string");
    expect(result.value.length).toBeGreaterThan(0);
  });

  it("returns correct confidence for medium", () => {
    const result = resolveScoutedAttribute("speed", 60, "medium", "seed1");
    expect(result.confidence).toBe("medium");
    expect(typeof result.narrative).toBe("string");
  });

  it("returns correct confidence for low", () => {
    const result = resolveScoutedAttribute("balance", 40, "low", "seed1");
    expect(result.confidence).toBe("low");
    expect(typeof result.narrative).toBe("string");
  });

  it("is deterministic: same inputs → same output", () => {
    const a = resolveScoutedAttribute("power", 70, "medium", "det-seed");
    const b = resolveScoutedAttribute("power", 70, "medium", "det-seed");
    expect(a).toEqual(b);
  });
});

// ── generateScoutingBias ───────────────────────────────────────────────────

describe("generateScoutingBias", () => {
  it("is deterministic: same candidateId + year → same bias", () => {
    const a = generateScoutingBias("c1", 2025);
    const b = generateScoutingBias("c1", 2025);
    expect(a).toEqual(b);
  });

  it("different candidateId → different bias", () => {
    const a = generateScoutingBias("c1", 2025);
    const b = generateScoutingBias("c2", 2025);
    expect(a.statOffsets).not.toEqual(b.statOffsets);
  });

  it("different year → different bias", () => {
    const a = generateScoutingBias("c1", 2025);
    const b = generateScoutingBias("c1", 2026);
    expect(a.statOffsets).not.toEqual(b.statOffsets);
  });

  it("initial decayFactor is FULL_BIAS_FACTOR (1.0)", () => {
    const bias = generateScoutingBias("c1", 2025);
    expect(bias.decayFactor).toBe(FULL_BIAS_FACTOR);
  });

  it("stat offsets are within ±SCOUTING_BIAS_MAX range", () => {
    const bias = generateScoutingBias("c1", 2025);
    for (const key of Object.keys(bias.statOffsets) as (keyof ScoutingBias["statOffsets"])[]) {
      const val = bias.statOffsets[key];
      expect(val).toBeGreaterThanOrEqual(-SCOUTING_BIAS_MAX);
      expect(val).toBeLessThanOrEqual(SCOUTING_BIAS_MAX);
    }
  });

  it("generates all 7 stat keys", () => {
    const bias = generateScoutingBias("c1", 2025);
    expect(Object.keys(bias.statOffsets).sort()).toEqual(
      ["adaptability", "balance", "mental", "power", "speed", "stamina", "technique"].sort()
    );
  });
});

// ── applyBias ──────────────────────────────────────────────────────────────

describe("applyBias", () => {
  it("applies full offset when decayFactor = 1.0", () => {
    expect(applyBias(50, 10, 1.0)).toBe(60);
    expect(applyBias(50, -10, 1.0)).toBe(40);
  });

  it("applies scaled offset when decayFactor < 1.0", () => {
    expect(applyBias(50, 10, 0.5)).toBe(55);
    expect(applyBias(50, -20, 0.25)).toBe(45);
  });

  it("applies no offset when decayFactor = 0.0", () => {
    expect(applyBias(50, 10, 0.0)).toBe(50);
    expect(applyBias(50, -30, 0.0)).toBe(50);
  });

  it("clamps result to 0-99", () => {
    expect(applyBias(95, 20, 1.0)).toBe(99);
    expect(applyBias(5, -20, 1.0)).toBe(0);
  });

  it("rounds scaled offset to nearest integer", () => {
    expect(applyBias(50, 7, 0.5)).toBe(54); // round(3.5) = 4 → 50+4=54
  });
});

// ── decayBias ──────────────────────────────────────────────────────────────

describe("decayBias", () => {
  const baseBias: ScoutingBias = {
    statOffsets: {
      power: 10,
      speed: -5,
      balance: 3,
      technique: -8,
      stamina: 15,
      mental: -2,
      adaptability: 7,
    },
    decayFactor: 1.0,
  };

  it("returns full decay (1.0) at 0 observations", () => {
    const result = decayBias(baseBias, 0);
    expect(result.decayFactor).toBe(1.0);
  });

  it("returns zero decay (0.0) at SCOUTING_BIAS_DECAY_OBSERVATIONS", () => {
    const result = decayBias(baseBias, SCOUTING_BIAS_DECAY_OBSERVATIONS);
    expect(result.decayFactor).toBe(0);
  });

  it("returns zero decay (0.0) beyond SCOUTING_BIAS_DECAY_OBSERVATIONS", () => {
    const result = decayBias(baseBias, SCOUTING_BIAS_DECAY_OBSERVATIONS + 100);
    expect(result.decayFactor).toBe(0);
  });

  it("decays linearly: half at midpoint", () => {
    const halfObs = SCOUTING_BIAS_DECAY_OBSERVATIONS / 2;
    const result = decayBias(baseBias, halfObs);
    expect(result.decayFactor).toBeCloseTo(0.5, 5);
  });

  it("preserves statOffsets (only decayFactor changes)", () => {
    const result = decayBias(baseBias, 10);
    expect(result.statOffsets).toEqual(baseBias.statOffsets);
  });

  it("does not mutate the input bias", () => {
    const original = { ...baseBias, statOffsets: { ...baseBias.statOffsets } };
    decayBias(baseBias, 10);
    expect(baseBias.decayFactor).toBe(original.decayFactor);
    expect(baseBias.statOffsets).toEqual(original.statOffsets);
  });
});
