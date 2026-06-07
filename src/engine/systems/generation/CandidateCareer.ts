// CandidateCareer.ts
// Career simulation logic: synthetic win/loss records and yusho counts generated
// from division progression rates for worldgen rikishi.

import { SeededRNG } from "../../rng";
import { Rank, Division } from "../../types/banzuke";
import { clamp } from "../../utils/math";
import {
  DEBUT_AGE_BASE,
  DEBUT_AGE_RANGE,
  FOREIGN_MAX_YEARS_BASE,
  FOREIGN_MAX_YEARS_RANGE,
  BASHO_PER_YEAR,
  DIVISION_WIN_RATE_MAKUUCHI,
  DIVISION_WIN_RATE_JURYO,
  DIVISION_WIN_RATE_MAKUSHITA,
  DIVISION_WIN_RATE_SANDANME,
  DIVISION_WIN_RATE_JONIDAN,
  DIVISION_WIN_RATE_JONOKUCHI,
  RANK_MODIFIER_YOKOZUNA,
  RANK_MODIFIER_OZEKI,
  RANK_MODIFIER_SEKIWAKE,
  RANK_MODIFIER_KOMUSUBI,
  RANK_MODIFIER_MAEGASHIRA,
  BASHO_PER_PROMOTION_BASE,
  BASHO_PER_PROMOTION_MIN,
  BOUTS_PER_BASHO_TOP,
  BOUTS_PER_BASHO_LOWER,
  WIN_RATE_RANDOMNESS,
  WIN_RATE_MIN,
  WIN_RATE_MAX,
  YUSHO_CHANCE_BASE,
  YUSHO_CHANCE_YOKOZUNA,
  YUSHO_CHANCE_OZEKI,
  YUSHO_CHANCE_SEKIWAKE,
  YUSHO_CHANCE_KOMUSUBI,
  YUSHO_CHANCE_MAEGASHIRA,
} from "../../../constants/engine/generation";

export interface DivisionRecords {
  makuuchi: { wins: number; losses: number };
  juryo: { wins: number; losses: number };
  makushita: { wins: number; losses: number };
  sandanme: { wins: number; losses: number };
  jonidan: { wins: number; losses: number };
  jonokuchi: { wins: number; losses: number };
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
  divisionRecords: DivisionRecords;
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
  const debutAge = DEBUT_AGE_BASE + rng.int(0, DEBUT_AGE_RANGE);
  let yearsActive = Math.max(1, age - debutAge);

  // Limit career length for foreign wrestlers (realistic pattern)
  if (nationality && nationality !== "Japan") {
    // Foreign wrestlers typically have shorter careers (8-12 years vs 15-20 for Japanese)
    const maxForeignYears = FOREIGN_MAX_YEARS_BASE + rng.int(0, FOREIGN_MAX_YEARS_RANGE);
    yearsActive = Math.min(yearsActive, maxForeignYears);
  }

  const bashoCount = yearsActive * BASHO_PER_YEAR;

  // Win rates by division (more realistic than single rate)
  const divisionWinRates: Record<Division, number> = {
    makuuchi: DIVISION_WIN_RATE_MAKUUCHI,
    juryo: DIVISION_WIN_RATE_JURYO,
    makushita: DIVISION_WIN_RATE_MAKUSHITA,
    sandanme: DIVISION_WIN_RATE_SANDANME,
    jonidan: DIVISION_WIN_RATE_JONIDAN,
    jonokuchi: DIVISION_WIN_RATE_JONOKUCHI,
  };

  // Win rate modifiers by rank within division
  const rankModifiers: Record<Rank, number> = {
    yokozuna: RANK_MODIFIER_YOKOZUNA,
    ozeki: RANK_MODIFIER_OZEKI,
    sekiwake: RANK_MODIFIER_SEKIWAKE,
    komusubi: RANK_MODIFIER_KOMUSUBI,
    maegashira: RANK_MODIFIER_MAEGASHIRA,
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
    const bashoPerPromotion = Math.max(BASHO_PER_PROMOTION_MIN, Math.round(BASHO_PER_PROMOTION_BASE / developmentSpeed));
    if (currentDivIndex < targetIndex && basho > 0 && basho % bashoPerPromotion === 0) {
      currentDivIndex = Math.min(currentDivIndex + 1, targetIndex);
    }

    const currentDiv = divisions[currentDivIndex];
    const boutsPerBasho = ["makuuchi", "juryo"].includes(currentDiv) ? BOUTS_PER_BASHO_TOP : BOUTS_PER_BASHO_LOWER;

    // Calculate win rate for this division/rank
    let winRate = divisionWinRates[currentDiv];
    if (currentDiv === targetDivision && rankModifiers[targetRank]) {
      winRate += rankModifiers[targetRank];
    }

    // Add randomness
    winRate = clamp(winRate + (rng.next() - 0.5) * WIN_RATE_RANDOMNESS, WIN_RATE_MIN, WIN_RATE_MAX);

    // Simulate bouts
    const wins = Math.round(boutsPerBasho * winRate);
    const losses = boutsPerBasho - wins;

    totalWins += wins;
    totalLosses += losses;

    divisionRecords[currentDiv].wins += wins;
    divisionRecords[currentDiv].losses += losses;

    // Yusho only possible in makuuchi
    if (currentDiv === "makuuchi") {
      let yushoChance = YUSHO_CHANCE_BASE; // Base chance
      if (targetRank === "yokozuna") yushoChance = YUSHO_CHANCE_YOKOZUNA;
      else if (targetRank === "ozeki") yushoChance = YUSHO_CHANCE_OZEKI;
      else if (targetRank === "sekiwake") yushoChance = YUSHO_CHANCE_SEKIWAKE;
      else if (targetRank === "komusubi") yushoChance = YUSHO_CHANCE_KOMUSUBI;
      else if (targetRank === "maegashira") yushoChance = YUSHO_CHANCE_MAEGASHIRA;

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
