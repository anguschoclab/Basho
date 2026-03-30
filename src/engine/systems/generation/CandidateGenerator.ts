/**
 * CandidateGenerator.ts — Logic for generating new rikishi candidates.
 */

import { SeededRNG } from "../../rng";
import { RikishiStats } from "../../types/rikishi";
import { Rank, Division } from "../../types/banzuke";
import { CombatProfile } from "../../types/combat";
import { clamp, clampInt } from "../../utils/math";

/**
 * Generates rikishi stats using Gaussian distribution and archetype modifiers.
 */
export function generateRikishiStats(args: {
  rng: SeededRNG;
  rank: Rank;
  profile: CombatProfile;
}): RikishiStats {
  const { rng, rank, profile } = args;
  
  const baseMean = rank === "yokozuna" ? 85 :
                   rank === "ozeki" ? 75 :
                   rank === "sekiwake" || rank === "komusubi" ? 65 :
                   rank === "maegashira" ? 55 : 40;
  
  const mods = profile.statModifiers;
  const stdDev = 8;

  const genStat = (key: keyof RikishiStats | 'weight' | 'height', defaultVal?: number) => {
    const mean = (defaultVal ?? baseMean) * (mods[key] ?? 1.0);
    return clampInt(rng.gaussian(mean, stdDev), 10, 100);
  };

  const weight = clampInt(rng.gaussian(150 * (mods.weight ?? 1.0), 20), 80, 250);
  const height = clampInt(rng.gaussian(180 * (mods.height ?? 1.0), 8), 160, 210);

  return {
    strength: genStat('strength'),
    technique: genStat('technique'),
    speed: genStat('speed'),
    stamina: genStat('stamina'),
    mental: genStat('mental'),
    adaptability: genStat('adaptability'),
    balance: genStat('balance'),
    weight,
    height
  } as any;
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
}): { careerWins: number; careerLosses: number; yushoCount: number } {
  const { rng, rank, division, birthYear, currentYear } = args;
  
  const age = currentYear - birthYear;
  const debutAge = 15 + rng.int(0, 5);
  const yearsActive = Math.max(1, age - debutAge);
  const bashoCount = yearsActive * 6;
  const boutsPerBasho = ["makuuchi", "juryo"].includes(division) ? 15 : 7;

  let winRateBase: number;
  let yushoChance: number;

  switch (rank) {
    case "yokozuna": winRateBase = 0.72; yushoChance = 0.15; break;
    case "ozeki":    winRateBase = 0.62; yushoChance = 0.05; break;
    case "sekiwake": winRateBase = 0.57; yushoChance = 0.02; break;
    case "komusubi": winRateBase = 0.52; yushoChance = 0.01; break;
    default:         winRateBase = 0.48; yushoChance = 0.003; break;
  }

  const winRate = clamp(winRateBase + (rng.next() - 0.5) * 0.12, 0.25, 0.85);
  const totalBouts = bashoCount * boutsPerBasho;
  const wins = Math.round(totalBouts * winRate);
  const losses = totalBouts - wins;

  let yushoCount = 0;
  for (let i = 0; i < bashoCount; i++) {
    if (rng.next() < yushoChance) yushoCount++;
  }

  return { careerWins: wins, careerLosses: losses, yushoCount };
}
