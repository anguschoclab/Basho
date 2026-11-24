// CandidateStats.ts
// Stat-generation logic: age rolling, development profiles, potential packages,
// and current-ability derivation from age-based maturity curves.

import { SeededRNG } from "@/engine/core/rng";
import { RikishiStats } from "@/engine/types/rikishi";
import { Rank } from "@/engine/types/banzuke";
import { CombatProfile } from "@/engine/types/combat";
import { clamp, clampInt } from "@/engine/utils/math";
import {
  AGE_BY_RANK,
  PA_BY_RANK,
  PROFILE_PRESETS,
  SIZE_POTENTIAL,
  STAT_GROUP,
  DEVELOPMENT_PROFILE_WEIGHTS,
  ELITE_CEILING_TAIL_CHANCE,
  ELITE_CEILING_TIERS,
  maturityFactor,
  type DevelopmentProfile,
} from "@/constants/engine/development";
import {
  PRODIGY_EARLY_PEAKER_CHANCE,
  JOURNEYMAN_LATE_BLOOMER_CHANCE,
  FAT_TAIL_SAMPLING_CHANCE,
  FAT_TAIL_STD_DEV_MULTIPLIER,
  STAT_MIN,
  STAT_MAX,
  CA_STAT_MIN,
  CA_STAT_MAX,
  REGIONAL_BONUS_EAST_EUROPEAN_POWER,
  REGIONAL_BONUS_EAST_EUROPEAN_STAMINA,
  REGIONAL_BONUS_MONGOLIAN_TECHNIQUE,
  REGIONAL_BONUS_MONGOLIAN_SPEED,
  REGIONAL_BONUS_AMERICAS_TECHNIQUE,
  REGIONAL_BONUS_AMERICAS_SPEED,
  REGIONAL_BONUS_AMERICAS_ADAPTABILITY,
  CA_NOISE_MEAN,
  CA_NOISE_STD_DEV,
  WEIGHT_MIN,
  WEIGHT_MAX,
  HEIGHT_MIN,
  HEIGHT_MAX,
  BASE_MEAN_YOKOZUNA,
  BASE_MEAN_OZEKI,
  BASE_MEAN_SEKIWAKE_KOMUSUBI,
  BASE_MEAN_MAEGASHIRA,
  BASE_MEAN_LOWER_DIVISIONS,
  STAT_GEN_STD_DEV,
  WEIGHT_BASE_MEAN,
  WEIGHT_GEN_STD_DEV,
  WEIGHT_GEN_MIN,
  WEIGHT_GEN_MAX,
  HEIGHT_BASE_MEAN,
  HEIGHT_GEN_STD_DEV,
  HEIGHT_GEN_MIN,
  HEIGHT_GEN_MAX,
} from "@/constants/engine/generation";
import { isYokozunaOrOzekiRank, isLowerSanyakuRank } from "@/constants/engine/rankDisplay";

interface GeneratedStats extends RikishiStats {
  height: number;
}

interface PotentialPackage {
  stats: RikishiStats;
  heightCm: number;
  weightKg: number;
  developmentSpeed: number;
  peakAgeOffset: number;
  ceilingFraction: number;
  profile: DevelopmentProfile;
  /** Set only when the elite-PA bust roll fires — hidden derailment trait. */
  bustFraction?: number;
}

/** Rolled PA mean (8 trainables) at which a candidate is "elite" enough to
 *  be able to bust — a modest prospect can't flop, only hyped talent can. */
export const BUST_ELITE_PA_MEAN = 65;
/** Share of elite-PA candidates carrying the hidden bust trait (FM's
 *  wonderkid-flop ballpark). */
export const BUST_CHANCE = 0.12;
/** Reachable-ceiling truncation for busts: they top out at 35-65% of PA. */
export const BUST_FRACTION_MIN = 0.35;
export const BUST_FRACTION_MAX = 0.65;

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
export function rollDevelopmentProfile(
  rng: SeededRNG,
  age: number,
  rank: Rank
): DevelopmentProfile {
  // Consistency check: a young high-rank rikishi must be a fast developer.
  const ageCfg = AGE_BY_RANK[rank];
  const ageIsPrecocious = age < ageCfg.mean - ageCfg.stdDev;
  const ageIsLate = age > ageCfg.mean + ageCfg.stdDev;

  if (ageIsPrecocious && (isYokozunaOrOzekiRank(rank) || rank === "sekiwake")) {
    return rng.next() < PRODIGY_EARLY_PEAKER_CHANCE ? "prodigy" : "early_peaker";
  }
  if (ageIsLate && (rank === "makushita" || rank === "sandanme" || rank === "jonidan")) {
    // An old rikishi stuck low is usually a journeyman or late bloomer still waiting
    return rng.next() < JOURNEYMAN_LATE_BLOOMER_CHANCE ? "journeyman" : "late_bloomer";
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
 * The ceiling tier a recruit's potential is drawn from. Nearly everyone
 * rolls the jonokuchi row — debut rank and potential ceiling were once
 * conflated — but a thin elite tail draws sekitori-tier ceilings so the
 * sanyaku ranks have a pipeline at all.
 */
export function rollCeilingRank(rng: SeededRNG): Rank {
  if (rng.next() >= ELITE_CEILING_TAIL_CHANCE) return "jonokuchi";
  const roll = rng.next();
  let acc = 0;
  for (const [rank, weight] of ELITE_CEILING_TIERS) {
    acc += weight;
    if (roll < acc) return rank;
  }
  return "maegashira";
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
  /**
   * True when this package was drawn from an elite ceiling tier (see
   * rollCeilingRank) — bust eligibility keys on the drawn tier, not the
   * rolled paMean: a ceiling draw that rolls below BUST_ELITE_PA_MEAN is
   * still elite talent and still carries the wonderkid-flop chance.
   */
  eliteCeiling?: boolean;
}): PotentialPackage {
  const { rng, rank, profile, developmentProfile, nationality, eliteCeiling } = args;
  const preset = PROFILE_PRESETS[developmentProfile];
  const paCfg = PA_BY_RANK[rank];

  // Fat-tail sampling: 15% of rolls use wider σ (creates sleeper talents / busts)
  const effectiveStdDev =
    rng.next() < FAT_TAIL_SAMPLING_CHANCE
      ? paCfg.stdDev * FAT_TAIL_STD_DEV_MULTIPLIER
      : paCfg.stdDev;

  const rollStat = (mod: number = 1.0, regionalBonus: number = 0): number => {
    const mean = paCfg.mean * mod + regionalBonus;
    return clampInt(rng.gaussian(mean, effectiveStdDev), STAT_MIN, STAT_MAX);
  };

  // Define Regional Biases (Phase 3)
  const isMongolian = nationality === "Mongolia";
  // Post-2022 pipelines: Ukraine + Kazakhstan wrestlers carry the same
  // Eastern-European frame bias as the legacy Georgia/Russia corridor.
  const isEastEuropean = ["Georgia", "Russia", "Bulgaria", "Estonia", "Ukraine", "Kazakhstan"].includes(
    nationality ?? ""
  );
  const isAmericas = ["Brazil", "USA", "Hawaii"].includes(nationality ?? "");

  const mods = (profile.statModifiers || {}) as Record<string, number | undefined>;
  const powerMod = mods["power"] ?? 1.0;

  const paStats: RikishiStats = {
    power: rollStat(powerMod, isEastEuropean ? REGIONAL_BONUS_EAST_EUROPEAN_POWER : 0),
    technique: rollStat(
      mods["technique"] ?? 1.0,
      isMongolian
        ? REGIONAL_BONUS_MONGOLIAN_TECHNIQUE
        : isAmericas
          ? REGIONAL_BONUS_AMERICAS_TECHNIQUE
          : 0
    ),
    speed: rollStat(
      mods["speed"] ?? 1.0,
      isMongolian ? REGIONAL_BONUS_MONGOLIAN_SPEED : isAmericas ? REGIONAL_BONUS_AMERICAS_SPEED : 0
    ),
    stamina: rollStat(
      mods["stamina"] ?? 1.0,
      isEastEuropean ? REGIONAL_BONUS_EAST_EUROPEAN_STAMINA : 0
    ),
    mental: rollStat(mods["mental"] ?? 1.0),
    adaptability: rollStat(
      mods["adaptability"] ?? 1.0,
      isAmericas ? REGIONAL_BONUS_AMERICAS_ADAPTABILITY : 0
    ),
    balance: rollStat(mods["balance"] ?? 1.0),
    weight: 0, // Size handled separately below
    aggression: rollStat(mods["aggression"] ?? 1.0),
    experience: 0,
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

  // Bust roll — only elite-talent candidates can "bust" (a low-PA recruit
  // was never supposed to make it). Elite means either an elite ceiling
  // draw (eliteCeiling) or a fat-tail roll reaching the elite paMean —
  // gating on paMean alone let over half the elite tail escape the roll.
  // ~12% of elite talent carries a hidden bustFraction that truncates the
  // reachable ceiling to 35-65% of PA; scouts still see the full PA — you
  // only learn he busted in retrospect.
  const paMean =
    (paStats.power + paStats.technique + paStats.speed + paStats.stamina +
      paStats.mental + paStats.adaptability + paStats.balance + paStats.aggression) / 8;
  const bustFraction =
    (eliteCeiling === true || paMean >= BUST_ELITE_PA_MEAN) && rng.next() < BUST_CHANCE
      ? BUST_FRACTION_MIN + rng.next() * (BUST_FRACTION_MAX - BUST_FRACTION_MIN)
      : undefined;

  return {
    stats: paStats,
    heightCm,
    weightKg,
    developmentSpeed: preset.developmentSpeed,
    peakAgeOffset: preset.peakAgeOffset,
    ceilingFraction: preset.ceilingFraction,
    profile: developmentProfile,
    bustFraction,
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
    const noisy = target + rng.gaussian(CA_NOISE_MEAN, CA_NOISE_STD_DEV);
    return clampInt(noisy, CA_STAT_MIN, CA_STAT_MAX);
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
    power: deriveStat(pa.power, "power"),
    technique: deriveStat(pa.technique, "technique"),
    speed: deriveStat(pa.speed, "speed"),
    stamina: deriveStat(pa.stamina, "stamina"),
    mental: deriveStat(pa.mental, "mental"),
    adaptability: deriveStat(pa.adaptability, "adaptability"),
    balance: deriveStat(pa.balance, "balance"),
    weight: clampInt(potential.weightKg * weightM, WEIGHT_MIN, WEIGHT_MAX),
    height: clampInt(potential.heightCm * heightM, HEIGHT_MIN, HEIGHT_MAX),
    aggression: deriveStat(pa.aggression, "aggression"),
    experience: 0,
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
      ? BASE_MEAN_YOKOZUNA
      : rank === "ozeki"
        ? BASE_MEAN_OZEKI
        : isLowerSanyakuRank(rank)
          ? BASE_MEAN_SEKIWAKE_KOMUSUBI
          : rank === "maegashira"
            ? BASE_MEAN_MAEGASHIRA
            : BASE_MEAN_LOWER_DIVISIONS;

  const mods = (profile.statModifiers || {}) as Record<string, number | undefined>;
  const stdDev = STAT_GEN_STD_DEV;

  const genStat = (key: string, defaultVal?: number) => {
    const mean = (defaultVal ?? baseMean) * (mods[key] ?? 1.0);
    return clampInt(rng.gaussian(mean, stdDev), 10, 100);
  };

  const weight = clampInt(
    rng.gaussian(WEIGHT_BASE_MEAN * (mods["weight"] ?? 1.0), WEIGHT_GEN_STD_DEV),
    WEIGHT_GEN_MIN,
    WEIGHT_GEN_MAX
  );
  const height = clampInt(
    rng.gaussian(HEIGHT_BASE_MEAN * (mods["height"] ?? 1.0), HEIGHT_GEN_STD_DEV),
    HEIGHT_GEN_MIN,
    HEIGHT_GEN_MAX
  );

  return {
    power: genStat("power"),
    technique: genStat("technique"),
    speed: genStat("speed"),
    stamina: genStat("stamina"),
    mental: genStat("mental"),
    adaptability: genStat("adaptability"),
    balance: genStat("balance"),
    weight,
    height,
    aggression: genStat("aggression"),
    experience: 0,
  };
}
