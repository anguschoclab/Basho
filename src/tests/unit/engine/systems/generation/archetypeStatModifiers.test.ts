/**
 * Tests that archetype statModifiers correctly influence generated rikishi stats.
 * Specifically verifies the `power` modifier (renamed from `strength`) and `mental`
 * modifier actually shift the corresponding stats during generation.
 */
import { describe, it, expect } from "vitest";
import { generateRikishiStats } from "@/engine/systems/generation/CandidateStats";
import { buildCombatProfile } from "@/engine/archetype";
import { rngFromSeed } from "@/engine/rng";

// Run N trials and return the mean of the stat
function meanStat(
  statKey: "power" | "stamina" | "mental",
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
  statKey: "power" | "stamina" | "mental",
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

describe("Archetype statModifiers — power key", () => {
  it("oshi archetype power modifier boosts generated power stat", () => {
    // oshi has power: 1.1
    // After fix: statModifiers.power should apply to the power generation
    const oshiMean = meanStat("power", "oshi");
    // hybrid has no power modifier (1.0) — use as baseline
    const hybridMean = meanStat("power", "hybrid");
    // oshi should generate ~10% higher power than hybrid on average
    expect(oshiMean).toBeGreaterThan(hybridMean);
  });

  it("giant archetype power modifier produces higher power than speedster", () => {
    // giant has power: 1.2
    // speedster has power: 0.8
    const giantMean = meanStat("power", "giant");
    const speedsterMean = meanStat("power", "speedster");
    expect(giantMean).toBeGreaterThan(speedsterMean);
  });

  it("explicit power modifier 1.4 yields higher power than modifier 0.7", () => {
    // Direct test: give a profile power: 1.4 and verify it shifts the mean up vs 0.7
    const highMean = meanStatBaseline("power", 1.4);
    const lowMean = meanStatBaseline("power", 0.7);
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
