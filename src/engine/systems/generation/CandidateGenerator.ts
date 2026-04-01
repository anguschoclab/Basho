import { SeededRNG } from "../../rng";
import { RikishiStats, Rikishi } from "../../types/rikishi";
import { Rank, Division, Side } from "../../types/banzuke";
import { CombatProfile, Style } from "../../types/combat";
import { clamp, clampInt } from "../../utils/math";
import { generateRikishiName } from "../../shikona";
import { rollArchetype, buildCombatProfile } from "../../archetype";

/**
 * Generates rikishi stats using Gaussian distribution and archetype modifiers.
 */
export function generateRikishiStats(args: {
  rng: SeededRNG;
  rank: Rank;
  profile: CombatProfile;
}): any {
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
}): Rikishi {
  const { id, rng, currentYear, rank, division, side, rankNumber } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);
  const statsBase = generateRikishiStats({ rng, rank, profile });
  const records = generateSyntheticCareer({ rng, rank, division, birthYear: currentYear - (18 + rng.int(0, 15)), currentYear });

  const name = generateRikishiName(`${rng.seed}::${id}`);

  const rikishiStats: RikishiStats = {
    ...statsBase,
    achievements: {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
    }
  };

  return {
    id,
    shikona: name,
    name: name,
    heyaId: "", // Assigned by factory
    nationality: "Japan",
    birthYear: currentYear - (18 + rng.int(0, 15)),
    rank,
    rankNumber,
    division,
    side,
    
    height: statsBase.height,
    weight: statsBase.weight,

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
    injuryStatus: { type: "none", isInjured: false, severity: 0, location: "", weeksRemaining: 0, weeksToHeal: 0 },
    
    style: (archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid") as Style,
    combatProfile: profile,
    archetype,
    derivedArchetype: archetype,
    tacticalArchetypePrimary: archetype as any, // Mapping needed?
    archetypeEvidence: [],
    
    careerWins: records.careerWins,
    careerLosses: records.careerLosses,
    careerAbsences: 0,
    makuuchiWins: division === "makuuchi" ? records.careerWins : 0,
    consecutiveYusho: 0,
    
    careerRecord: { wins: records.careerWins, losses: records.careerLosses, yusho: records.yushoCount },
    currentBashoWins: 0,
    currentBashoLosses: 0,
    currentBashoRecord: { wins: 0, losses: 0 },
    
    careerHistory: [],
    milestones: [],
    history: [],
    h2h: {},
    
    favoredKimarite: [],
    weakAgainstStyles: [],
    
    behavior: { discipline: 70, mediaSavvy: 50, stress: 0 },
    personalityTraits: [],
    
    faceAvatarUrl: "",
    talentSeed: rng.int(0, 1000000)
  } as Rikishi;
}

/**
 * Generates a single TalentCandidate for the recruitment pools.
 */
export function generateCandidate(args: {
  id: string;
  rng: SeededRNG;
  currentYear: number;
  poolType: any; // TalentPoolType
}): any {
  const { id, rng, currentYear, poolType } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);
  const statsBase = generateRikishiStats({ rng, rank: "jonokuchi", profile });

  const name = generateRikishiName(`${rng.seed}::candidate::${id}`);

  // Determine origin based on pool
  const origin = poolType === "foreign" 
    ? seededPick(rng, ["Mongolia", "Georgia", "Russia", "Brazil", "USA"])
    : seededPick(rng, ["Aomori", "Osaka", "Tokyo", "Fukuoka", "Hokkaido", "Ishikawa"]);

  return {
    candidateId: id,
    personId: `p_${id}`,
    name,
    nationality: poolType === "foreign" ? origin : "Japan",
    birthYear: currentYear - (15 + rng.int(0, (poolType === "university" ? 7 : 3))),
    originRegion: origin,
    
    visibilityBand: "hidden",
    availabilityState: "available",
    
    scoutingStatus: "unscouted",
    
    // Core combat stats (masked by visibility in UI)
    archetype,
    style: (archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid"),
    combatProfile: profile,
    
    // Potentials
    potentialGrade: seededPick(rng, ["S", "A", "B", "C", "D"]),
    
    competingSuitors: [],
    tags: rng.next() > 0.8 ? ["amateur_star"] : []
  };
}

function seededPick<T>(rng: SeededRNG, items: T[]): T {
  return items[rng.int(0, items.length - 1)];
}
