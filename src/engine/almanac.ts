// almanac.ts
// Almanac System - Historical Memory per Constitution §A5 and §4
// Tracks rikishi career records, heya records, and historical snapshots

import type { WorldState, Rikishi, Heya, BashoResult, BashoName, Division, Rank, Id } from "./types";
import { BASHO_CALENDAR } from "./calendar";
import { RANK_HIERARCHY } from "./banzuke";

// === CAREER RECORD TYPES ===

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

export function generateCareerRecord(rikishi: Rikishi, world: WorldState, rng: () => number): RikishiCareerRecord {
  const rankMult = getRankCareerMultiplier(rikishi.rank);

  const careerBasho = Math.floor(6 + rankMult * 30 + rng() * 20);
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

    // Optional: inject absence texture lightly (kept deterministic)
    const abs = rng() < 0.08 ? Math.floor(rng() * 3) : 0;

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

  let baseWinRate = 0.5;
  if (isClimbing) baseWinRate = 0.55 + rng() * 0.15;
  else if (atTarget) baseWinRate = 0.48 + rng() * 0.12;
  else baseWinRate = 0.35 + rng() * 0.2;

  const winsRaw = Math.round(boutCount * baseWinRate + (rng() - 0.5) * 4);
  const wins = Math.max(0, Math.min(boutCount, winsRaw));
  const losses = boutCount - wins;

  const yusho = atTarget && wins >= boutCount - 1 && rng() < 0.02;
  const junYusho = atTarget && wins >= boutCount - 2 && !yusho && rng() < 0.05;

  const ginoSho = currentDivision === "makuuchi" && wins >= 10 && rng() < 0.03;
  const kantosho = currentDivision === "makuuchi" && wins >= 11 && rng() < 0.04;
  const shukunsho = currentDivision === "makuuchi" && wins >= 10 && rng() < 0.02;

  const kinboshi =
    currentRank === "maegashira" && wins >= 8 && rng() < 0.15 ? Math.floor(rng() * 2) + 1 : 0;

  return { wins, losses, yusho, junYusho, ginoSho, kantosho, shukunsho, kinboshi };
}

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

export function buildAlmanacSnapshot(world: WorldState): AlmanacSnapshot | null {
  if (!world.currentBasho) return null;

  const basho = world.currentBasho;
  const makuuchiRikishi = Array.from(world.rikishi.values()).filter((r) => r.division === "makuuchi");

  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    makuuchiSummary: {
      totalBouts: basho.matches.filter((m) => m.result).length,
      avgWins: makuuchiRikishi.reduce((sum, r) => sum + r.currentBashoWins, 0) / Math.max(1, makuuchiRikishi.length),
      injuryCount: makuuchiRikishi.filter((r) => r.injured).length
    },
    promotions: [],
    demotions: [],
    retirements: []
  };
}

// === RECORD LOOKUP ===

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
