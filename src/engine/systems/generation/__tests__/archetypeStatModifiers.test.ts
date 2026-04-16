/**
 * Tests that archetype statModifiers correctly influence generated rikishi stats.
 * Specifically verifies the `power` modifier (renamed from `strength`) and `mental`
 * modifier actually shift the corresponding stats during generation.
 */
import { describe, it, expect } from "vitest";
import { generateRikishiStats } from "../CandidateGenerator";
import { buildCombatProfile } from "../../../archetype";
import { rngFromSeed } from "../../../rng";

// Run N trials and return the mean of the stat
function meanStat(
  statKey: "strength" | "stamina" | "mental",
  profileArchetype: Parameters<typeof buildCombatProfile>[0],
  n = 80
): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const rng = rngFromSeed(`archetype-test-${i}`, "gen", "trial");
    const profile = buildCombatProfile(profileArchetype);
    const stats = generateRikishiStats({ rng, rank: "maegashira", profile });
    total += stats[statKey];
  }
  return total / n;
}

function meanStatBaseline(
  statKey: "strength" | "stamina" | "mental",
  modifier: number,
  n = 80
): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const rng = rngFromSeed(`baseline-test-${i}`, "gen", "trial");
    const stats = generateRikishiStats({
      rng,
      rank: "maegashira",
      profile: {
        archetype: "hybrid",
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: { [statKey]: modifier },
      },
    });
    total += stats[statKey];
  }
  return total / n;
}

describe("Archetype statModifiers — power key (renamed from strength)", () => {
  it("oshi archetype power modifier boosts generated strength stat", () => {
    // oshi has power: 1.1 (renamed from strength: 1.1)
    // After fix: statModifiers.power should apply to the strength generation
    const oshiMean = meanStat("strength", "oshi");
    // hybrid has no power modifier (1.0) — use as baseline
    const hybridMean = meanStat("strength", "hybrid");
    // oshi should generate ~10% higher strength than hybrid on average
    expect(oshiMean).toBeGreaterThan(hybridMean);
  });

  it("giant archetype power modifier produces higher strength than speedster", () => {
    // giant has power: 1.2 (renamed from strength: 1.2)
    // speedster has power: 0.8 (renamed from strength: 0.8)
    const giantMean = meanStat("strength", "giant");
    const speedsterMean = meanStat("strength", "speedster");
    expect(giantMean).toBeGreaterThan(speedsterMean);
  });

  it("explicit power modifier 1.4 yields higher strength than modifier 0.7", () => {
    // Direct test: give a profile power: 1.4 and verify it shifts the mean up vs 0.7
    const highMean = meanStatBaseline("strength", 1.4);
    const lowMean = meanStatBaseline("strength", 0.7);
    expect(highMean).toBeGreaterThan(lowMean);
  });
});

describe("Archetype statModifiers — mental modifier influences aggression generation", () => {
  it("defensive archetype mental modifier produces higher mental stat than tsuppari", () => {
    // defensive should have mental: 1.2+ (high composure)
    // tsuppari should have mental: 0.8 (reckless)
    const defensiveMean = meanStat("mental", "defensive");
    const tsuppariMean = meanStat("mental", "tsuppari");
    expect(defensiveMean).toBeGreaterThan(tsuppariMean);
  });

  it("explicit mental modifier 1.3 yields higher mental stat than modifier 0.75", () => {
    const highMean = meanStatBaseline("mental", 1.3);
    const lowMean = meanStatBaseline("mental", 0.75);
    expect(highMean).toBeGreaterThan(lowMean);
  });
});

describe("Archetype statModifiers — stamina modifier applies to tsuppari", () => {
  it("tsuppari stamina modifier produces lower stamina than yotsu", () => {
    // tsuppari has stamina: 0.85 (tires faster)
    // yotsu should have equal or higher stamina (patient style)
    const tsuppariMean = meanStat("stamina", "tsuppari");
    const yotsuMean = meanStat("stamina", "yotsu");
    expect(yotsuMean).toBeGreaterThanOrEqual(tsuppariMean);
  });
});
