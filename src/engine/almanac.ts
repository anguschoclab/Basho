// almanac.ts
// Almanac System - Historical Memory per Constitution §A5 and §4
// Tracks rikishi career records, heya records, and historical snapshots

import type { WorldState, Rikishi, Heya, BashoResult, BashoName, Division, Rank, Id } from "./types";
import { BASHO_CALENDAR } from "./calendar";
import { RANK_HIERARCHY } from "./banzuke";

// === CAREER RECORD TYPES ===

/** Defines the structure for basho performance. */
export interface BashoPerformance {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  division: Division;
  rank: Rank;
  rankNumber?: number;
  wins: number;
  losses: number;
  absences: number;
  yusho: boolean;
  junYusho: boolean;
  ginoSho: boolean;
  kantosho: boolean;
  shukunsho: boolean;
  kinboshiCount: number;
}

/** Defines the structure for rikishi career record. */
export interface RikishiCareerRecord {
  rikishiId: Id;
  shikona: string;
  debutYear: number;
  debutBasho: BashoName;

  totalWins: number;
  totalLosses: number;
  totalAbsences: number;

  yushoCount: number;
  junYushoCount: number;
  sanshoCounts: {
    ginoSho: number;
    kantosho: number;
    shukunsho: number;
  };
  kinboshiCount: number;

  highestRank: Rank;
  highestRankNumber?: number;
  highestRankAchievedYear?: number;
  ozekiRunCount: number;
  yokozunaPromotion?: { year: number; bashoName: BashoName };

  bashoHistory: BashoPerformance[];

  currentWinStreak: number;
  longestWinStreak: number;
  currentLossStreak: number;

  isActive: boolean;
  retiredYear?: number;
  retiredBasho?: BashoName;
}

/** Defines the structure for heya record. */
export interface HeyaRecord {
  heyaId: Id;
  name: string;

  totalYusho: number;
  totalJunYusho: number;
  totalSansho: number;

  yokozunaProduced: number;
  ozekiProduced: number;
  sekitoriProduced: number;

  bashoHistory: Array<{
    year: number;
    bashoName: BashoName;
    sekitoriCount: number;
    bestResult: string;
    totalWins: number;
    totalLosses: number;
  }>;

  foundedYear: number;
  founderName?: string;
}

/** Defines the structure for oyakata record. */
export interface OyakataRecord {
  oyakataId: Id;
  name: string;
  formerShikona?: string;

  careerAsRikishi?: {
    highestRank: Rank;
    yushoCount: number;
    retiredYear: number;
  };

  stableMasterSince: number;
  heyaId: Id;
  rikishiTrained: number;
  yokozunaProduced: number;
  ozekiProduced: number;
  yushoDuringTenure: number;
}

// === RECORD GENERATION ===

/**
 * Generate career record.
 *  * @param rikishi - The Rikishi.
 *  * @param world - The World.
 *  * @param rng - The Rng.
 *  * @returns The result.
 */
export function generateCareerRecord(rikishi: Rikishi, world: WorldState, rng: () => number): RikishiCareerRecord {
  const rankMult = getRankCareerMultiplier(rikishi.rank);

  // Realistic basho counts calibrated from real wrestlers:
  // Hakuhō (GOAT yokozuna): ~120 basho over 20 years
  // Hōshōryū (new yokozuna): ~42 basho over 7 years
  // Terunofuji: ~84 basho over 14 years
  // Most wrestlers have much shorter careers
  const careerBasho = Math.floor(6 + rankMult * 12 + rng() * 10);
  const debutYear = world.year - Math.floor(careerBasho / 6);
  const debutBashoIndex = Math.floor(rng() * 6);
  const bashoNames: BashoName[] = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"];

  const bashoHistory: BashoPerformance[] = [];
  let currentRank: Rank = "jonokuchi";
  let currentDivision: Division = "jonokuchi";
  let rankNumber: number | undefined = undefined;

  let totalWins = 0;
  let totalLosses = 0;
  let totalAbsences = 0;

  let yushoCount = 0;
  let junYushoCount = 0;
  const sanshoCounts = { ginoSho: 0, kantosho: 0, shukunsho: 0 };
  let kinboshiTotal = 0;

  let highestRank: Rank = currentRank;
  let highestRankNumber: number | undefined = undefined;
  let highestRankAchievedYear: number | undefined = undefined;

  let currentWinStreak = 0;
  let longestWinStreak = 0;
  let currentLossStreak = 0;

  for (let i = 0; i < careerBasho; i++) {
    const bashoIndex = (debutBashoIndex + i) % 6;
    const year = debutYear + Math.floor((debutBashoIndex + i) / 6);

    const worldBasho = world.currentBashoName || "hatsu";
    const worldBashoIndex = bashoNames.indexOf(worldBasho);

    if (year > world.year || (year === world.year && bashoIndex >= worldBashoIndex)) break;

    const performance = simulateBashoPerformance(currentRank, currentDivision, rikishi.rank, rankNumber, rng);

    // Realistic absence rate (~5-8% of basho have some absences)
    const abs = rng() < 0.06 ? Math.floor(1 + rng() * 2) : 0;

    const record: BashoPerformance = {
      year,
      bashoNumber: (bashoIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: bashoNames[bashoIndex],
      division: currentDivision,
      rank: currentRank,
      rankNumber,
      wins: performance.wins,
      losses: performance.losses,
      absences: abs,
      yusho: performance.yusho,
      junYusho: performance.junYusho,
      ginoSho: performance.ginoSho,
      kantosho: performance.kantosho,
      shukunsho: performance.shukunsho,
      kinboshiCount: performance.kinboshi
    };

    bashoHistory.push(record);

    totalWins += performance.wins;
    totalLosses += performance.losses;
    totalAbsences += abs;

    if (performance.yusho) yushoCount++;
    if (performance.junYusho) junYushoCount++;
    if (performance.ginoSho) sanshoCounts.ginoSho++;
    if (performance.kantosho) sanshoCounts.kantosho++;
    if (performance.shukunsho) sanshoCounts.shukunsho++;
    kinboshiTotal += performance.kinboshi;

    if (performance.wins > performance.losses) {
      currentWinStreak += performance.wins - performance.losses;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      currentLossStreak += performance.losses - performance.wins;
      currentWinStreak = 0;
    }

    const { newRank, newDivision, newRankNumber } = simulateRankProgression(
      currentRank,
      currentDivision,
      performance.wins,
      performance.losses,
      rankNumber,
      rng
    );

    if (getRankValue(newRank) > getRankValue(highestRank)) {
      highestRank = newRank;
      highestRankNumber = newRankNumber;
      highestRankAchievedYear = year;
    }

    currentRank = newRank;
    currentDivision = newDivision;
    rankNumber = newRankNumber;
  }

  return {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona,
    debutYear,
    debutBasho: bashoNames[debutBashoIndex],

    totalWins,
    totalLosses,
    totalAbsences,

    yushoCount,
    junYushoCount,
    sanshoCounts,
    kinboshiCount: kinboshiTotal,

    highestRank: rikishi.rank,
    highestRankNumber: rikishi.rankNumber,
    highestRankAchievedYear,

    ozekiRunCount: rikishi.rank === "ozeki" || rikishi.rank === "yokozuna" ? 1 : 0,
    yokozunaPromotion:
      rikishi.rank === "yokozuna"
        ? { year: world.year - Math.floor(rng() * 3), bashoName: bashoNames[Math.floor(rng() * 6)] }
        : undefined,

    bashoHistory,

    currentWinStreak: 0,
    longestWinStreak,
    currentLossStreak: 0,

    isActive: true
  };
}

/**
 * Simulate basho performance.
 *  * @param currentRank - The Current rank.
 *  * @param currentDivision - The Current division.
 *  * @param targetRank - The Target rank.
 *  * @param _rankNumber - The _rank number.
 *  * @param rng - The Rng.
 *  * @returns The result.
 */
function simulateBashoPerformance(
  currentRank: Rank,
  currentDivision: Division,
  targetRank: Rank,
  _rankNumber: number | undefined,
  rng: () => number
): {
  wins: number;
  losses: number;
  yusho: boolean;
  junYusho: boolean;
  ginoSho: boolean;
  kantosho: boolean;
  shukunsho: boolean;
  kinboshi: number;
} {
  const boutCount = currentDivision === "makuuchi" || currentDivision === "juryo" ? 15 : 7;
  const targetMult = getRankCareerMultiplier(targetRank);
  const currentMult = getRankCareerMultiplier(currentRank);

  const isClimbing = targetMult > currentMult;
  const atTarget = targetRank === currentRank;

  // Calibrated win rates:
  // Climbing wrestlers dominate their current division (~60-70%)
  // At-target wrestlers hover around 50-55% (realistic kachi-koshi rates)
  // Past-peak wrestlers struggle (~40-50%)
  let baseWinRate = 0.5;
  if (isClimbing) baseWinRate = 0.58 + rng() * 0.12;
  else if (atTarget) baseWinRate = 0.47 + rng() * 0.10;
  else baseWinRate = 0.38 + rng() * 0.15;

  const winsRaw = Math.round(boutCount * baseWinRate + (rng() - 0.5) * 3);
  const wins = Math.max(0, Math.min(boutCount, winsRaw));
  const losses = boutCount - wins;

  // Yūshō calibration:
  // Even Hakuhō only won 45/120 makuuchi basho (37%)
  // A typical yokozuna wins ~3-8 yūshō in career
  // Hōshōryū: 2 yūshō in ~28 makuuchi basho (~7%)
  // Only possible with dominant records (13+ wins in makuuchi, 6+ in lower)
  const yushoThreshold = boutCount === 15 ? 13 : 6;
  const yusho = atTarget && wins >= yushoThreshold && rng() < 0.08;
  const junYusho = atTarget && wins >= yushoThreshold - 1 && !yusho && rng() < 0.10;

  // Sanshō calibration:
  // Only awarded in makuuchi, and quite rare
  // Hakuhō: 6 total sanshō; Hōshōryū: 3 total sanshō
  // Most wrestlers get 0-2 in their entire career
  const ginoSho = currentDivision === "makuuchi" && wins >= 11 && rng() < 0.015;
  const kantosho = currentDivision === "makuuchi" && wins >= 11 && rng() < 0.02;
  const shukunsho = currentDivision === "makuuchi" && wins >= 11 && rng() < 0.01;

  // Kinboshi: only maegashira beating a yokozuna
  // Most maegashira get 0-1 in career, a few exceptional ones get 2-3
  const kinboshi =
    currentRank === "maegashira" && wins >= 9 && rng() < 0.08 ? 1 : 0;

  return { wins, losses, yusho, junYusho, ginoSho, kantosho, shukunsho, kinboshi };
}

/**
 * Simulate rank progression.
 *  * @param currentRank - The Current rank.
 *  * @param currentDivision - The Current division.
 *  * @param wins - The Wins.
 *  * @param losses - The Losses.
 *  * @param rankNumber - The Rank number.
 *  * @param _rng - The _rng.
 *  * @returns The result.
 */
function simulateRankProgression(
  currentRank: Rank,
  currentDivision: Division,
  wins: number,
  losses: number,
  rankNumber: number | undefined,
  _rng: () => number
): { newRank: Rank; newDivision: Division; newRankNumber?: number } {
  const isKachiKoshi = wins > losses;
  const margin = wins - losses;

  const rankOrder: Rank[] = [
    "jonokuchi",
    "jonidan",
    "sandanme",
    "makushita",
    "juryo",
    "maegashira",
    "komusubi",
    "sekiwake",
    "ozeki",
    "yokozuna"
  ];

  const divisionMap: Record<Rank, Division> = {
    jonokuchi: "jonokuchi",
    jonidan: "jonidan",
    sandanme: "sandanme",
    makushita: "makushita",
    juryo: "juryo",
    maegashira: "makuuchi",
    komusubi: "makuuchi",
    sekiwake: "makuuchi",
    ozeki: "makuuchi",
    yokozuna: "makuuchi"
  };

  let rankIndex = rankOrder.indexOf(currentRank);
  let newRankNumber = rankNumber;

  if (isKachiKoshi) {
    if (margin >= 5 && rankIndex < rankOrder.length - 1) rankIndex = Math.min(rankIndex + 2, rankOrder.length - 1);
    else if (margin >= 2 && rankIndex < rankOrder.length - 1) rankIndex++;

    if (newRankNumber !== undefined && margin >= 3) newRankNumber = Math.max(1, newRankNumber - Math.floor(margin / 2));
  } else {
    const absMargin = Math.abs(margin);
    if (absMargin >= 5 && rankIndex > 0) rankIndex = Math.max(0, rankIndex - 2);
    else if (absMargin >= 2 && rankIndex > 0) rankIndex--;

    if (newRankNumber !== undefined) newRankNumber = newRankNumber + Math.floor(absMargin / 2);
  }

  const newRank = rankOrder[rankIndex];
  const numbered = ["maegashira", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"].includes(newRank);

  return { newRank, newDivision: divisionMap[newRank], newRankNumber: numbered ? newRankNumber : undefined };
}

/**
 * Get rank career multiplier.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
function getRankCareerMultiplier(rank: Rank): number {
  const multipliers: Record<Rank, number> = {
    yokozuna: 5,
    ozeki: 4.5,
    sekiwake: 4,
    komusubi: 3.8,
    maegashira: 3,
    juryo: 2.5,
    makushita: 2,
    sandanme: 1.5,
    jonidan: 1,
    jonokuchi: 0.5
  };
  return multipliers[rank] || 1;
}

/**
 * Get rank value.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    jonokuchi: 1,
    jonidan: 2,
    sandanme: 3,
    makushita: 4,
    juryo: 5,
    maegashira: 6,
    komusubi: 7,
    sekiwake: 8,
    ozeki: 9,
    yokozuna: 10
  };
  return values[rank] || 0;
}

// === HEYA RECORD GENERATION ===

/**
 * Generate heya record.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @param rng - The Rng.
 *  * @returns The result.
 */
export function generateHeyaRecord(heya: Heya, world: WorldState, rng: () => number): HeyaRecord {
  const rikishiInHeya = Array.from(world.rikishi.values()).filter((r) => r.heyaId === heya.id);

  const sekitori = rikishiInHeya.filter((r) =>
    ["juryo", "maegashira", "komusubi", "sekiwake", "ozeki", "yokozuna"].includes(r.rank)
  );

  const statureMultiplier =
    {
      legendary: 4,
      powerful: 2.5,
      established: 1.5,
      rebuilding: 0.8,
      fragile: 0.5,
      new: 0.1
    }[heya.statureBand] || 1;

  return {
    heyaId: heya.id,
    name: heya.name,
    totalYusho: Math.floor(statureMultiplier * 5 + rng() * 10),
    totalJunYusho: Math.floor(statureMultiplier * 8 + rng() * 15),
    totalSansho: Math.floor(statureMultiplier * 15 + rng() * 25),
    yokozunaProduced: Math.floor(statureMultiplier * 0.5 + rng() * 2),
    ozekiProduced: Math.floor(statureMultiplier * 1.5 + rng() * 3),
    sekitoriProduced: Math.floor(statureMultiplier * 10 + rng() * 20),
    bashoHistory: [],
    foundedYear: world.year - Math.floor(20 + statureMultiplier * 30 + rng() * 50)
  };
}

// === ALMANAC SNAPSHOT ===

/** Defines the structure for almanac snapshot. */
export interface AlmanacSnapshot {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;

  yushoWinner?: {
    rikishiId: Id;
    shikona: string;
    heyaName: string;
    record: string;
  };

  makuuchiSummary: {
    totalBouts: number;
    avgWins: number;
    injuryCount: number;
  };

  promotions: Array<{ rikishiId: Id; shikona: string; newRank: Rank }>;
  demotions: Array<{ rikishiId: Id; shikona: string; newRank: Rank }>;
  retirements: Array<{ rikishiId: Id; shikona: string; reason?: string }>;
}

/**
 * Build almanac snapshot.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function buildAlmanacSnapshot(world: WorldState): AlmanacSnapshot | null {
  if (!world.currentBasho) return null;

  const basho = world.currentBasho;

  let makuuchiRikishiCount = 0;
  let totalMakuuchiWins = 0;
  let makuuchiInjuryCount = 0;

  for (const r of world.rikishi.values()) {
    if (r.division === "makuuchi") {
      makuuchiRikishiCount++;
      totalMakuuchiWins += r.currentBashoWins;
      if (r.injured) {
        makuuchiInjuryCount++;
      }
    }
  }

  let totalBouts = 0;
  for (const m of basho.matches) {
    if (m.result) {
      totalBouts++;
    }
  }

  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    makuuchiSummary: {
      totalBouts,
      avgWins: totalMakuuchiWins / Math.max(1, makuuchiRikishiCount),
      injuryCount: makuuchiInjuryCount
    },
    promotions: [],
    demotions: [],
    retirements: []
  };
}

// === RECORD LOOKUP ===

/**
 * Get rikishi career summary.
 *  * @param record - The Record.
 *  * @returns The result.
 */
export function getRikishiCareerSummary(record: RikishiCareerRecord): string {
  const parts: string[] = [];

  if (record.yushoCount > 0) parts.push(`${record.yushoCount} Yusho`);
  if (record.junYushoCount > 0) parts.push(`${record.junYushoCount} Jun-Yusho`);

  const sanshoTotal = record.sanshoCounts.ginoSho + record.sanshoCounts.kantosho + record.sanshoCounts.shukunsho;
  if (sanshoTotal > 0) parts.push(`${sanshoTotal} Sansho`);

  if (record.kinboshiCount > 0) parts.push(`${record.kinboshiCount} Kinboshi`);

  parts.push(`${record.totalWins}-${record.totalLosses}`);

  return parts.join(" • ");
}
