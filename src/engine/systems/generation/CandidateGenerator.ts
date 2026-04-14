import { seededPick } from "../../utils/random";
import { SeededRNG } from "../../rng";
import { RikishiStats, Rikishi } from "../../types/rikishi";
import { Rank, Division, Side } from "../../types/banzuke";
import { CombatProfile, Style, CombatArchetype } from "../../types/combat";
import { clamp, clampInt } from "../../utils/math";
import { generateShikona } from "../../shikona";
import { rollArchetype, buildCombatProfile } from "../../archetype";
import type { InjurySeverity } from "../../systems/health/BodyDefinitions";
import type { TalentCandidate, TalentPoolType } from "../../types/talent";

interface GeneratedStats extends RikishiStats {
  height: number;
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

  return {
    strength: genStat("strength"),
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
  const { rng, targetRank, targetDivision, birthYear, currentYear, nationality } = args;

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
    // Gradually progress through divisions
    if (currentDivIndex < targetIndex && basho > 0 && basho % 6 === 0) {
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
}): Rikishi {
  const { id, rng, currentYear, rank, division, side, rankNumber } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);
  const statsBase = generateRikishiStats({ rng, rank, profile });

  // Evaluate birthYear once to preserve RNG sequence
  const birthYear = currentYear - (18 + rng.int(0, 15));
  const nationality =
    rng.next() < 0.15
      ? rng.next() < 0.7
        ? "Mongolia"
        : rng.pick(["Georgia", "Russia", "Bulgaria", "Estonia", "Brazil", "Hawaii"])
      : "Japan";
  const records = generateSyntheticCareer({
    rng,
    rank,
    division,
    birthYear,
    currentYear,
    nationality,
  });

  const name = generateShikona(`${rng.seed}::${id}`, {
    rng,
    heyaId: undefined, // Will be set when assigned to heya
    nationality,
    rank,
    legacyShikona: args.legacyShikona,
  });

  const rikishiStats: RikishiStats = {
    ...statsBase,
    achievements: {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
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
      nationality
    ),
    ...createCombatStats(rikishiStats, division, archetype, profile),
    ...createCareerHistory(records),
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
  nationality: string
) {
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
    talentSeed: rng.int(0, 1000000),
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

    favoredKimarite: [],
    weakAgainstStyles: [],
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
  const { candidate, rng, heyaId } = args;

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
      candidate.nationality
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
  } as Rikishi;

  return rikishi;
}

/**
 * Generates a single TalentCandidate for the recruitment pools.
 */

export function generateCandidate(args: {
  id: string;
  rng: SeededRNG;
  currentYear: number;
  poolType: TalentPoolType;
}): TalentCandidate {
  const { id, rng, currentYear, poolType } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);

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
    heightPotentialCm: 170 + rng.int(0, 30),
    weightPotentialKg: 80 + rng.int(0, 40),
    talentSeed: rng.int(0, 100),
    temperament: { discipline: rng.int(0, 100), volatility: rng.int(0, 100) },

    competingSuitors: [],
    tags: rng.next() > 0.8 ? ["amateur_star"] : [],
  };
}
