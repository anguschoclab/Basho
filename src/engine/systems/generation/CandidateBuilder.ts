// @ts-nocheck
// CandidateBuilder.ts
// Rikishi assembly: builds complete Rikishi objects from stats, career records,
// and candidate data. Includes base-info, combat-stats, and career-history helpers.

import { SeededRNG } from "../../rng";
import { RikishiStats, Rikishi } from "../../types/rikishi";
import { Rank, Division, Side } from "../../types/banzuke";
import { CombatProfile, Style, CombatArchetype } from "../../types/combat";
import { clamp, clampInt } from "../../utils/math";
import { generateShikona } from "../../shikona";
import { rollArchetype, buildCombatProfile, deriveWeakAgainstStyles } from "../../archetype";
import type { InjurySeverity } from "../../systems/health/BodyDefinitions";
import type { TalentCandidate } from "../../types/talent";
import { generateAvatarConfig } from "../../avatarGenerator";
import {
  rollAgeForRank,
  rollDevelopmentProfile,
  rollPotential,
  deriveCurrentAbility,
  generateRikishiStats,
  type GeneratedStats,
  type PotentialPackage,
} from "./CandidateStats";
import { generateSyntheticCareer, type DivisionRecords } from "./CandidateCareer";

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