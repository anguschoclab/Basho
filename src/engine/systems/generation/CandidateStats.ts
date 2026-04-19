// CandidateStats.ts
// Stat-generation logic: age rolling, development profiles, potential packages,
// and current-ability derivation from age-based maturity curves.

import { SeededRNG } from "../../rng";
import { RikishiStats } from "../../types/rikishi";
import { Rank } from "../../types/banzuke";
import { CombatProfile } from "../../types/combat";
import { clamp, clampInt } from "../../utils/math";
import {
  AGE_BY_RANK,
  PA_BY_RANK,
  PROFILE_PRESETS,
  SIZE_POTENTIAL,
  STAT_GROUP,
  DEVELOPMENT_PROFILE_WEIGHTS,
  maturityFactor,
  type DevelopmentProfile,
} from "../../constants/DevelopmentCurves";

export interface GeneratedStats extends RikishiStats {
  height: number;
}

export interface PotentialPackage {
  stats: RikishiStats;
  heightCm: number;
  weightKg: number;
  developmentSpeed: number;
  peakAgeOffset: number;
  ceilingFraction: number;
  profile: DevelopmentProfile;
}

/**
 * Rolls age from a Gaussian biased by rank, clamped to rank-specific plausibility bounds.
 * Prodigies and late-career holdouts remain possible via the tails.
 */
export function rollAgeForRank(rng: SeededRNG, rank: Rank): number {
  const cfg = AGE_BY_RANK[rank];
  const raw = rng.gaussian(cfg.mean, cfg.stdDev);
  return Math.round(clamp(raw, cfg.min, cfg.max));
}

/** Picks a development profile via weighted roll. */
export function rollDevelopmentProfile(rng: SeededRNG, age: number, rank: Rank): DevelopmentProfile {
  // Consistency check: a young high-rank rikishi must be a fast developer.
  const ageCfg = AGE_BY_RANK[rank];
  const ageIsPrecocious = age < ageCfg.mean - ageCfg.stdDev;
  const ageIsLate = age > ageCfg.mean + ageCfg.stdDev;

  if (ageIsPrecocious && (rank === "yokozuna" || rank === "ozeki" || rank === "sekiwake")) {
    return rng.next() < 0.5 ? "prodigy" : "early_peaker";
  }
  if (ageIsLate && (rank === "makushita" || rank === "sandanme" || rank === "jonidan")) {
    // An old rikishi stuck low is usually a journeyman or late bloomer still waiting
    return rng.next() < 0.7 ? "journeyman" : "late_bloomer";
  }

  const roll = rng.next();
  let acc = 0;
  for (const [profile, weight] of Object.entries(DEVELOPMENT_PROFILE_WEIGHTS)) {
    acc += weight;
    if (roll < acc) return profile as DevelopmentProfile;
  }
  return "standard";
}

/**
 * Rolls PA (potential ceiling) for all stats + size, biased by rank with fat tails.
 */
export function rollPotential(args: {
  rng: SeededRNG;
  rank: Rank;
  profile: CombatProfile;
  developmentProfile: DevelopmentProfile;
  nationality?: string;
}): PotentialPackage {
  const { rng, rank, profile, developmentProfile, nationality } = args;
  const preset = PROFILE_PRESETS[developmentProfile];
  const paCfg = PA_BY_RANK[rank];

  // Fat-tail sampling: 15% of rolls use wider σ (creates sleeper talents / busts)
  const effectiveStdDev = rng.next() < 0.15 ? paCfg.stdDev * 2 : paCfg.stdDev;

  const rollStat = (mod: number = 1.0, regionalBonus: number = 0): number => {
    const mean = paCfg.mean * mod + regionalBonus;
    return clampInt(rng.gaussian(mean, effectiveStdDev), 25, 99);
  };

  // Define Regional Biases (Phase 3)
  const isMongolian = nationality === "Mongolia";
  const isEastEuropean = ["Georgia", "Russia", "Bulgaria", "Estonia"].includes(nationality ?? "");
  const isAmericas = ["Brazil", "USA", "Hawaii"].includes(nationality ?? "");

  const mods = profile.statModifiers;
  const powerMod = (mods as Record<string, number | undefined>)["power"] ?? mods["strength"] ?? 1.0;

  const paStats: RikishiStats = {
    strength: rollStat(powerMod, isEastEuropean ? 12 : 0),
    technique: rollStat(mods.technique ?? 1.0, isMongolian ? 10 : isAmericas ? 4 : 0),
    speed: rollStat(mods.speed ?? 1.0, isMongolian ? 5 : isAmericas ? 8 : 0),
    stamina: rollStat(mods.stamina ?? 1.0, isEastEuropean ? 8 : 0),
    mental: rollStat(mods.mental ?? 1.0),
    adaptability: rollStat(mods.adaptability ?? 1.0, isAmericas ? 4 : 0),
    balance: rollStat(mods.balance ?? 1.0),
    weight: 0, // Size handled separately below
  };

  // Size potential: Gaussian biased by archetype modifiers, clamped
  const heightMean = SIZE_POTENTIAL.heightCm.mean * (mods.height ?? 1.0);
  const weightMean = SIZE_POTENTIAL.weightKg.mean * (mods.weight ?? 1.0);
  const heightCm = clampInt(
    rng.gaussian(heightMean, SIZE_POTENTIAL.heightCm.stdDev),
    SIZE_POTENTIAL.heightCm.min,
    SIZE_POTENTIAL.heightCm.max
  );
  const weightKg = clampInt(
    rng.gaussian(weightMean, SIZE_POTENTIAL.weightKg.stdDev),
    SIZE_POTENTIAL.weightKg.min,
    SIZE_POTENTIAL.weightKg.max
  );

  return {
    stats: paStats,
    heightCm,
    weightKg,
    developmentSpeed: preset.developmentSpeed,
    peakAgeOffset: preset.peakAgeOffset,
    ceilingFraction: preset.ceilingFraction,
    profile: developmentProfile,
  };
}

/**
 * Derives Current Ability from PA via age-dependent maturity curves.
 * CA = PA × ceilingFraction × maturity(age, attributeGroup) + small noise.
 */
export function deriveCurrentAbility(args: {
  rng: SeededRNG;
  potential: PotentialPackage;
  age: number;
}): GeneratedStats {
  const { rng, potential, age } = args;
  const { stats: pa, ceilingFraction, developmentSpeed, peakAgeOffset } = potential;

  const deriveStat = (paValue: number, key: keyof typeof STAT_GROUP): number => {
    const group = STAT_GROUP[key];
    const m = maturityFactor({ age, group, developmentSpeed, peakAgeOffset });
    const target = paValue * ceilingFraction * m;
    // Small noise so CA doesn't read as deterministic from PA
    const noisy = target + rng.gaussian(0, 2);
    return clampInt(noisy, 10, 100);
  };

  const heightM = maturityFactor({
    age,
    group: "size_height",
    developmentSpeed,
    peakAgeOffset,
  });
  const weightM = maturityFactor({
    age,
    group: "size_weight",
    developmentSpeed,
    peakAgeOffset,
  });

  return {
    strength: deriveStat(pa.strength, "strength"),
    technique: deriveStat(pa.technique, "technique"),
    speed: deriveStat(pa.speed, "speed"),
    stamina: deriveStat(pa.stamina, "stamina"),
    mental: deriveStat(pa.mental, "mental"),
    adaptability: deriveStat(pa.adaptability, "adaptability"),
    balance: deriveStat(pa.balance, "balance"),
    weight: clampInt(potential.weightKg * weightM, 70, 250),
    height: clampInt(potential.heightCm * heightM, 150, 210),
  };
}

/**
 * Generates rikishi stats using Gaussian distribution and archetype modifiers.
 */
export function generateRikishiStats(args: {
  rng: SeededRNG;
  rank: Rank;
  profile: CombatProfile;
}): GeneratedStats {
  const { rng, rank, profile } = args;

  const baseMean =
    rank === "yokozuna"
      ? 85
      : rank === "ozeki"
        ? 75
        : rank === "sekiwake" || rank === "komusubi"
          ? 65
          : rank === "maegashira"
            ? 55
            : 40;

  const mods = profile.statModifiers;
  const stdDev = 8;

  const genStat = (key: keyof RikishiStats | "weight" | "height", defaultVal?: number) => {
    const mean = (defaultVal ?? baseMean) * (mods[key] ?? 1.0);
    return clampInt(rng.gaussian(mean, stdDev), 10, 100);
  };

  const weight = clampInt(rng.gaussian(150 * (mods.weight ?? 1.0), 20), 80, 250);
  const height = clampInt(rng.gaussian(180 * (mods.height ?? 1.0), 8), 160, 210);

  // 'power' key in statModifiers maps to strength in RikishiStats → Rikishi.power
  const powerMod = (mods as Record<string, number | undefined>)["power"] ?? mods["strength"] ?? 1.0;
  const strengthMean = baseMean * powerMod;

  return {
    strength: clampInt(rng.gaussian(strengthMean, stdDev), 10, 100),
    technique: genStat("technique"),
    speed: genStat("speed"),
    stamina: genStat("stamina"),
    mental: genStat("mental"),
    adaptability: genStat("adaptability"),
    balance: genStat("balance"),
    weight,
    height,
  };
}
