// CandidateCareer.ts
// Career simulation logic: synthetic win/loss records and yusho counts generated
// from division progression rates for worldgen rikishi.

import { SeededRNG } from "../../rng";
import { Rank, Division } from "../../types/banzuke";
import { clamp } from "../../utils/math";

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
