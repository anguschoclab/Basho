import { seededPick } from "../../utils/random";
import { SeededRNG } from "../../rng";
import { RikishiStats, Rikishi } from "../../types/rikishi";
import { Rank, Division, Side } from "../../types/banzuke";
import { CombatProfile, Style, CombatArchetype } from "../../types/combat";
import { clamp, clampInt } from "../../utils/math";
import { generateShikona } from "../../shikona";
import { rollArchetype, buildCombatProfile, deriveWeakAgainstStyles } from "../../archetype";
import type { InjurySeverity } from "../../systems/health/BodyDefinitions";
import type { TalentCandidate, TalentPoolType } from "../../types/talent";
import { generateAvatarConfig } from "../../avatarGenerator";
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
function rollDevelopmentProfile(rng: SeededRNG, age: number, rank: Rank): DevelopmentProfile {
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

interface DivisionRecords {
  makuuchi: { wins: number; losses: number };
  juryo: { wins: number; losses: number };
  makushita: { wins: number; losses: number };
  sandanme: { wins: number; losses: number };
  jonidan: { wins: number; losses: number };
  jonokuchi: { wins: number; losses: number };
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

/**
 * Simulates career progression through divisions with realistic win rates per division.
 * Returns total career wins/losses, yusho count, and division-specific records.
 */
function simulateCareerProgression(args: {
  rng: SeededRNG;
  targetRank: Rank;
  targetDivision: Division;
  birthYear: number;
  currentYear: number;
  nationality?: string;
  developmentSpeed?: number;
}): {
  careerWins: number;
  careerLosses: number;
  yushoCount: number;
  divisionRecords: {
    makuuchi: { wins: number; losses: number };
    juryo: { wins: number; losses: number };
    makushita: { wins: number; losses: number };
    sandanme: { wins: number; losses: number };
    jonidan: { wins: number; losses: number };
    jonokuchi: { wins: number; losses: number };
  };
} {
  const {
    rng,
    targetRank,
    targetDivision,
    birthYear,
    currentYear,
    nationality,
    developmentSpeed = 1.0,
  } = args;

  const age = currentYear - birthYear;
  const debutAge = 15 + rng.int(0, 5);
  let yearsActive = Math.max(1, age - debutAge);

  // Limit career length for foreign wrestlers (realistic pattern)
  if (nationality && nationality !== "Japan") {
    // Foreign wrestlers typically have shorter careers (8-12 years vs 15-20 for Japanese)
    const maxForeignYears = 8 + rng.int(0, 5);
    yearsActive = Math.min(yearsActive, maxForeignYears);
  }

  const bashoCount = yearsActive * 6;

  // Win rates by division (more realistic than single rate)
  const divisionWinRates: Record<Division, number> = {
    makuuchi: 0.5,
    juryo: 0.52,
    makushita: 0.48,
    sandanme: 0.45,
    jonidan: 0.42,
    jonokuchi: 0.4,
  };

  // Win rate modifiers by rank within division
  const rankModifiers: Record<Rank, number> = {
    yokozuna: 0.15,
    ozeki: 0.1,
    sekiwake: 0.05,
    komusubi: 0.02,
    maegashira: 0.0,
    juryo: 0.0,
    makushita: 0.0,
    sandanme: 0.0,
    jonidan: 0.0,
    jonokuchi: 0.0,
  };

  // Determine progression path (simplified for now)
  // In a full implementation, this would simulate actual promotion/demotion
  const divisions: Division[] = [
    "jonokuchi",
    "jonidan",
    "sandanme",
    "makushita",
    "juryo",
    "makuuchi",
  ];
  const targetIndex = divisions.indexOf(targetDivision);

  let totalWins = 0;
  let totalLosses = 0;
  let yushoCount = 0;

  const divisionRecords: DivisionRecords = {
    makuuchi: { wins: 0, losses: 0 },
    juryo: { wins: 0, losses: 0 },
    makushita: { wins: 0, losses: 0 },
    sandanme: { wins: 0, losses: 0 },
    jonidan: { wins: 0, losses: 0 },
    jonokuchi: { wins: 0, losses: 0 },
  };

  // Simulate basho progression
  let currentDivIndex = 0;
  for (let basho = 0; basho < bashoCount; basho++) {
    // Gradually progress through divisions — faster for prodigies, slower for late bloomers.
    // Base cadence: one division per 6 basho (1 yr); scaled by developmentSpeed.
    const bashoPerPromotion = Math.max(2, Math.round(6 / developmentSpeed));
    if (currentDivIndex < targetIndex && basho > 0 && basho % bashoPerPromotion === 0) {
      currentDivIndex = Math.min(currentDivIndex + 1, targetIndex);
    }

    const currentDiv = divisions[currentDivIndex];
    const boutsPerBasho = ["makuuchi", "juryo"].includes(currentDiv) ? 15 : 7;

    // Calculate win rate for this division/rank
    let winRate = divisionWinRates[currentDiv];
    if (currentDiv === targetDivision && rankModifiers[targetRank]) {
      winRate += rankModifiers[targetRank];
    }

    // Add randomness
    winRate = clamp(winRate + (rng.next() - 0.5) * 0.1, 0.25, 0.85);

    // Simulate bouts
    const wins = Math.round(boutsPerBasho * winRate);
    const losses = boutsPerBasho - wins;

    totalWins += wins;
    totalLosses += losses;

    divisionRecords[currentDiv].wins += wins;
    divisionRecords[currentDiv].losses += losses;

    // Yusho only possible in makuuchi
    if (currentDiv === "makuuchi") {
      let yushoChance = 0.001; // Base chance
      if (targetRank === "yokozuna") yushoChance = 0.1;
      else if (targetRank === "ozeki") yushoChance = 0.04;
      else if (targetRank === "sekiwake") yushoChance = 0.02;
      else if (targetRank === "komusubi") yushoChance = 0.01;
      else if (targetRank === "maegashira") yushoChance = 0.002;

      if (rng.next() < yushoChance) yushoCount++;
    }
  }

  return {
    careerWins: totalWins,
    careerLosses: totalLosses,
    yushoCount,
    divisionRecords,
  };
}

/**
 * Generates synthetic career records for worldgen rikishi.
 */
export function generateSyntheticCareer(args: {
  rng: SeededRNG;
  rank: Rank;
  division: Division;
  birthYear: number;
  currentYear: number;
  nationality?: string;
  developmentSpeed?: number;
}): {
  careerWins: number;
  careerLosses: number;
  yushoCount: number;
  divisionRecords: DivisionRecords;
} {
  // Use career progression simulation for more realistic records
  const progression = simulateCareerProgression({
    rng: args.rng,
    targetRank: args.rank,
    targetDivision: args.division,
    birthYear: args.birthYear,
    currentYear: args.currentYear,
    nationality: args.nationality,
    developmentSpeed: args.developmentSpeed,
  });

  return {
    careerWins: progression.careerWins,
    careerLosses: progression.careerLosses,
    yushoCount: progression.yushoCount,
    divisionRecords: progression.divisionRecords,
  };
}

/**
 * Generates a complete Rikishi object for world orchestration.
 */
export function generateFullRikishi(args: {
  id: string;
  rng: SeededRNG;
  currentYear: number;
  rank: Rank;
  division: Division;
  side: Side;
  rankNumber: number;
  legacyShikona?: string;
  heyaPrefix?: string;
}): Rikishi {
  const { id, rng, currentYear, rank, division, side, rankNumber } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);

  // Age first (biased by rank, Gaussian, not hard-gated)
  const age = rollAgeForRank(rng, rank);
  const birthYear = currentYear - age;

  // Development profile — consistency-checked against age/rank
  const developmentProfile = rollDevelopmentProfile(rng, age, rank);

  // Nationality first for regional PA biases (Phase 3)
  const nationality =
    rng.next() < 0.15
      ? rng.next() < 0.7
        ? "Mongolia"
        : rng.pick(["Georgia", "Russia", "Bulgaria", "Estonia", "Brazil", "Hawaii"])
      : "Japan";

  // Roll PA (potential ceiling) once, then derive CA from age-based maturity
  const potentialPkg = rollPotential({ rng, rank, profile, developmentProfile, nationality });
  const statsBase = deriveCurrentAbility({ rng, potential: potentialPkg, age });

  const records = generateSyntheticCareer({
    rng,
    rank,
    division,
    birthYear,
    currentYear,
    nationality,
    developmentSpeed: potentialPkg.developmentSpeed,
  });

  // Promising wrestlers are branded with the heya prefix more often.
  // Boost scales with average PA (normalized to 0–0.35) and prodigy profile.
  const paAvg =
    (potentialPkg.stats.strength +
      potentialPkg.stats.technique +
      potentialPkg.stats.speed +
      potentialPkg.stats.stamina +
      potentialPkg.stats.mental) /
    5;
  const paBoost = clamp((paAvg - 55) / 120, 0, 0.3); // PA 55→0, PA 85→+0.25, PA 95→+0.33
  const profileBoost =
    potentialPkg.profile === "prodigy"
      ? 0.15
      : potentialPkg.profile === "late_bloomer"
        ? 0.05
        : potentialPkg.profile === "journeyman"
          ? -0.1
          : 0;
  const heyaPrefixBoost = Math.max(0, paBoost + profileBoost);

  const name = generateShikona(`${rng.seed}::${id}`, {
    rng,
    heyaId: undefined, // Will be set when assigned to heya
    nationality,
    rank,
    legacyShikona: args.legacyShikona,
    heyaPrefix: args.heyaPrefix,
    heyaPrefixBoost,
  });

  const rikishiStats: RikishiStats = {
    ...statsBase,
    achievements: {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      mochikyukinPoints: 0,
    },
  };

  return {
    ...createBaseInfo(
      id,
      name,
      birthYear,
      rank,
      rankNumber,
      division,
      side,
      statsBase.height,
      statsBase.weight,
      rng,
      nationality,
      currentYear
    ),
    ...createCombatStats(rikishiStats, division, archetype, profile),
    ...createCareerHistory(records),
    potential: {
      stats: {
        ...potentialPkg.stats,
        achievements: rikishiStats.achievements,
      },
      heightCm: potentialPkg.heightCm,
      weightKg: potentialPkg.weightKg,
      developmentSpeed: potentialPkg.developmentSpeed,
      peakAgeOffset: potentialPkg.peakAgeOffset,
      ceilingFraction: potentialPkg.ceilingFraction,
      profile: potentialPkg.profile,
    },
  } as Rikishi;
}

// --- Refactored Helper Functions ---

function createBaseInfo(
  id: string,
  name: string,
  birthYear: number,
  rank: Rank,
  rankNumber: number,
  division: Division,
  side: Side,
  height: number,
  weight: number,
  rng: SeededRNG,
  nationality: string,
  currentYear: number
) {
  const age = currentYear - birthYear;
  const isSekitori = division === "makuuchi" || division === "juryo";
  const citizenshipStatus =
    nationality === "Japan" || nationality === "Japanese" ? "native" : "foreign";

  return {
    id,
    shikona: name,
    name: name,
    heyaId: "", // Assigned by factory
    nationality,
    birthYear,
    rank,
    rankNumber,
    division,
    side,

    height,
    weight,

    behavior: { discipline: 70, mediaSavvy: 50, stress: 0 },
    personalityTraits: [],

    faceAvatarUrl: "",
    avatarConfig: generateAvatarConfig({
      seed: id,
      nationality,
      age,
      isSekitori,
    }),
    talentSeed: rng.int(0, 1000000),
    joinedHeyaDate: String(currentYear),
    citizenshipStatus,
  };
}

function deriveStyle(archetype: CombatArchetype): Style {
  if (archetype === "oshi" || archetype === "tsuppari") return "oshi";
  if (archetype === "yotsu" || archetype === "giant") return "yotsu";
  return "hybrid";
}

function createCombatStats(
  rikishiStats: RikishiStats,
  division: Division,
  archetype: CombatArchetype,
  profile: CombatProfile
) {
  return {
    stats: rikishiStats,

    // Flattened accessors for performance/legacy compatibility
    power: rikishiStats.strength,
    speed: rikishiStats.speed,
    balance: rikishiStats.balance,
    technique: rikishiStats.technique,
    aggression: rikishiStats.mental,
    mental: rikishiStats.mental, // composure under pressure (edge crisis recovery)
    stamina: rikishiStats.stamina,
    adaptability: rikishiStats.adaptability,
    experience: division === "makuuchi" ? 40 : 10,

    momentum: 50,
    fatigue: 0,
    condition: 100,
    motivation: 70,

    injured: false,
    injuryWeeksRemaining: 0,
    injuryStatus: {
      type: "none" as const,
      isInjured: false,
      severity: "none" as InjurySeverity,
      location: undefined,
      weeksRemaining: 0,
      weeksToHeal: 0,
    },

    style: deriveStyle(archetype),
    combatProfile: profile,
    // Legacy fields omitted — combatProfile.archetype is the canonical source
    archetypeEvidence: {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    },

    favoredKimarite: (profile.favoredKimarite ?? []) as import("../../types/rikishi").KimariteId[],
    weakAgainstStyles: deriveWeakAgainstStyles(archetype) as import("../../types/rikishi").Style[],
  };
}

function createCareerHistory(records: {
  careerWins: number;
  careerLosses: number;
  yushoCount: number;
  divisionRecords?: DivisionRecords;
}) {
  return {
    careerWins: records.careerWins,
    careerLosses: records.careerLosses,
    careerAbsences: 0,
    makuuchiWins: records.divisionRecords?.makuuchi?.wins ?? 0, // Use division records for makuuchi wins
    divisionRecords: records.divisionRecords || {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    consecutiveYusho: 0,
    isKyujo: false,
    kyujoReason: undefined,
    medicalCertificate: undefined,

    careerRecord: {
      wins: records.careerWins,
      losses: records.careerLosses,
      yusho: records.yushoCount,
    },
    currentBashoWins: 0,
    currentBashoLosses: 0,
    currentBashoRecord: { wins: 0, losses: 0 },

    careerHistory: [],
    milestones: [],
    history: [],
    h2h: {},
  };
}

/**
 * Converts a TalentCandidate into a full Rikishi entity.
 * This is the final step of the recruitment pipeline.
 */
export function convertCandidateToRikishi(args: {
  candidate: TalentCandidate;
  rng: SeededRNG;
  currentYear: number;
  heyaId: string;
}): Rikishi {
  const { candidate, rng, currentYear, heyaId } = args;

  // New recruits start at the bottom of the banzuke
  const rank: Rank = "jonokuchi";
  const division: Division = "jonokuchi";
  const side: Side = "east";
  const rankNumber = 50;

  const statsBase = generateRikishiStats({ rng, rank, profile: candidate.combatProfile });

  const rikishiStats: RikishiStats = {
    ...statsBase,
    achievements: {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      mochikyukinPoints: 0,
    },
  };

  const rikishi = {
    ...createBaseInfo(
      candidate.personId,
      candidate.name,
      candidate.birthYear,
      rank,
      rankNumber,
      division,
      side,
      statsBase.height,
      statsBase.weight,
      rng,
      candidate.nationality,
      currentYear
    ),
    ...createCombatStats(rikishiStats, division, candidate.archetype, candidate.combatProfile),
    ...createCareerHistory({ careerWins: 0, careerLosses: 0, yushoCount: 0 }),
    heyaId,
    nationality: candidate.nationality,
    origin: candidate.originRegion,
    talentSeed: candidate.talentSeed,
    behavior: {
      discipline: candidate.temperament.discipline,
      mediaSavvy: 50,
      stress: 0,
    },
    potential: candidate.potentialStats
      ? {
          stats: {
            ...candidate.potentialStats,
            weight: candidate.weightPotentialKg,
            achievements: rikishiStats.achievements,
          } as RikishiStats,
          heightCm: candidate.heightPotentialCm,
          weightKg: candidate.weightPotentialKg,
          developmentSpeed: candidate.developmentSpeed ?? 1.0,
          peakAgeOffset: candidate.peakAgeOffset ?? 0,
          ceilingFraction: candidate.ceilingFraction ?? 1.0,
          profile: candidate.developmentProfile ?? "standard",
        }
      : undefined,
  } as Rikishi;

  return rikishi;
}

/**
 * Generates a single TalentCandidate for the recruitment pools.
 */

import { LineageService } from "./LineageService";
import type { WorldState } from "../../types/world";

export function generateCandidate(args: {
  id: string;
  rng: SeededRNG;
  currentYear: number;
  poolType: TalentPoolType;
  world?: WorldState;
}): TalentCandidate {
  const { id, rng, currentYear, poolType, world } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);

  // Candidates are always future jonokuchi recruits — roll PA + dev profile so
  // scouting can reveal their trajectory before signing.
  const developmentProfile = (() => {
    const roll = rng.next();
    let acc = 0;
    for (const [p, w] of Object.entries(DEVELOPMENT_PROFILE_WEIGHTS)) {
      acc += w;
      if (roll < acc) return p as DevelopmentProfile;
    }
    return "standard" as DevelopmentProfile;
  })();

  // Phase 5: Emergent Prodigy (1.5% chance)
  const isEmergentProdigy = rng.next() < 0.015;
  const devProfileForRoll = isEmergentProdigy ? "prodigy" : developmentProfile;

  const paPkg = rollPotential({
    rng,
    rank: "jonokuchi",
    profile,
    developmentProfile: devProfileForRoll,
  });

  // Apply Prodigy bonus to stat ceilings
  if (isEmergentProdigy) {
    Object.keys(paPkg.stats).forEach((stat) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paPkg.stats as any)[stat] = clampInt((paPkg.stats as any)[stat] + 12, 40, 99);
    });
    paPkg.ceilingFraction = 1.0; // Prodigies always reach their full PA
    paPkg.developmentSpeed *= 1.25; // Faster growth
  }

  // Phase 5 Depth: Genetic Lineage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bloodlineTrait: any = null;
  if (world) {
    bloodlineTrait = LineageService.rollGeneticLineage(
      world,
      {
        ...args, // Partial mock since we haven't built the candidate yet
        tags: isEmergentProdigy ? ["prodigy"] : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      rng
    );
  }

  // Determine origin based on pool
  const origin =
    poolType === "foreign"
      ? seededPick(rng, ["Mongolia", "Georgia", "Russia", "Brazil", "USA"])
      : seededPick(rng, ["Aomori", "Osaka", "Tokyo", "Fukuoka", "Hokkaido", "Ishikawa"]);

  const name = generateShikona(`${rng.seed}::candidate::${id}`, {
    rng,
    heyaId: undefined,
    nationality: poolType === "foreign" ? origin : "Japan",
    rank: "jonokuchi",
    legacyShikona: undefined,
  });

  return {
    candidateId: id,
    personId: rng.uuid("PS"),
    name,
    nationality: poolType === "foreign" ? origin : "Japan",
    birthYear: currentYear - (15 + rng.int(0, poolType === "university" ? 7 : 3)),
    originRegion: origin,

    visibilityBand: "hidden",
    availabilityState: "available",

    // Core combat stats (masked by visibility in UI)
    archetype,
    style: archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid",
    combatProfile: profile,

    reputationSeed: rng.int(0, 100),
    heightPotentialCm: paPkg.heightCm,
    weightPotentialKg: paPkg.weightKg,
    talentSeed: rng.int(0, 100),
    temperament: { discipline: rng.int(0, 100), volatility: rng.int(0, 100) },

    competingSuitors: [],
    tags: isEmergentProdigy ? ["prodigy"] : rng.next() > 0.8 ? ["amateur_star"] : [],
    isEmergentProdigy,

    potentialStats: {
      strength: paPkg.stats.strength,
      speed: paPkg.stats.speed,
      technique: paPkg.stats.technique,
      balance: paPkg.stats.balance,
      stamina: paPkg.stats.stamina,
      mental: paPkg.stats.mental,
      adaptability: paPkg.stats.adaptability,
    },
    developmentProfile: devProfileForRoll,
    developmentSpeed: paPkg.developmentSpeed,
    peakAgeOffset: paPkg.peakAgeOffset,
    ceilingFraction: paPkg.ceilingFraction,
    bloodlineTrait,
  };

  // Apply lineage bonuses to the final object
  if (bloodlineTrait) {
    LineageService.applyLineageBonuses(candidate, bloodlineTrait);
  }

  return candidate;
}
