import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { BashoName } from "../types/basho";
import type { Division, Rank } from "../types/banzuke";
import type { BashoPerformance, RikishiCareerRecord } from "./types";
import {
  CAREER_BASHO_BASE,
  CAREER_BASHO_RANK_MULTIPLIER,
  CAREER_BASHO_RNG_RANGE,
  BOUTS_PER_BASHO_SEKITORI,
  BOUTS_PER_BASHO_LOWER_DIVISION,
  YUSHO_THRESHOLD_15_DAY,
  YUSHO_THRESHOLD_7_DAY,
  CLIMBING_WIN_RATE_BASE,
  CLIMBING_WIN_RATE_RNG_RANGE,
  BASE_WIN_RATE,
  DECLINING_WIN_RATE_BASE,
  DECLINING_WIN_RATE_RNG_RANGE,
  WIN_RATE_VARIANCE_MULTIPLIER,
  GINO_SHO_CHANCE,
  ABSENCE_CHANCE,
  ABSENCE_RANGE,
  ABSENCE_MIN,
  AT_TARGET_WIN_RATE_BASE,
  AT_TARGET_WIN_RATE_RNG_RANGE,
  YUSHO_CHANCE,
  JUN_YUSHO_CHANCE,
  KANTOSHO_CHANCE,
  SHUKUNSHO_CHANCE,
  KINBOSHI_CHANCE,
  RANK_PROGRESSION_DOUBLE_PROMOTE_MARGIN,
  RANK_PROGRESSION_PROMOTE_MARGIN,
  RANK_PROGRESSION_NUMBER_MARGIN,
  RANK_PROGRESSION_DOUBLE_DEMOTE_MARGIN,
  RANK_PROGRESSION_DEMOTE_MARGIN,
} from "../../constants/engine/career";

export function generateCareerRecord(
  rikishi: Rikishi,
  world: WorldState,
  rng: () => number
): RikishiCareerRecord {
  const rankMult = getRankCareerMultiplier(rikishi.rank);

  const careerBasho = Math.floor(
    CAREER_BASHO_BASE + rankMult * CAREER_BASHO_RANK_MULTIPLIER + rng() * CAREER_BASHO_RNG_RANGE
  );
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
  let highestRankAchievedYear: number | undefined = undefined;

  let currentWinStreak = 0;
  let longestWinStreak = 0;

  for (let i = 0; i < careerBasho; i++) {
    const bashoIndex = (debutBashoIndex + i) % 6;
    const year = debutYear + Math.floor((debutBashoIndex + i) / 6);

    const worldBasho = world.currentBashoName || "hatsu";
    const worldBashoIndex = bashoNames.indexOf(worldBasho);

    if (year > world.year || (year === world.year && bashoIndex >= worldBashoIndex)) break;

    const performance = simulateBashoPerformance(
      currentRank,
      currentDivision,
      rikishi.rank,
      rankNumber,
      rng
    );

    const abs = rng() < ABSENCE_CHANCE ? Math.floor(ABSENCE_MIN + rng() * ABSENCE_RANGE) : 0;

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
      kinboshiCount: performance.kinboshi,
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
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
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

    isActive: true,
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
  const boutCount =
    currentDivision === "makuuchi" || currentDivision === "juryo"
      ? BOUTS_PER_BASHO_SEKITORI
      : BOUTS_PER_BASHO_LOWER_DIVISION;
  const targetMult = getRankCareerMultiplier(targetRank);
  const currentMult = getRankCareerMultiplier(currentRank);

  const isClimbing = targetMult > currentMult;
  const atTarget = targetRank === currentRank;

  let baseWinRate = BASE_WIN_RATE;
  if (isClimbing) baseWinRate = CLIMBING_WIN_RATE_BASE + rng() * CLIMBING_WIN_RATE_RNG_RANGE;
  else if (atTarget) baseWinRate = AT_TARGET_WIN_RATE_BASE + rng() * AT_TARGET_WIN_RATE_RNG_RANGE;
  else baseWinRate = DECLINING_WIN_RATE_BASE + rng() * DECLINING_WIN_RATE_RNG_RANGE;

  const winsRaw = Math.round(
    boutCount * baseWinRate + (rng() - 0.5) * WIN_RATE_VARIANCE_MULTIPLIER
  );
  const wins = Math.max(0, Math.min(boutCount, winsRaw));
  const losses = boutCount - wins;

  const yushoThreshold =
    boutCount === BOUTS_PER_BASHO_SEKITORI ? YUSHO_THRESHOLD_15_DAY : YUSHO_THRESHOLD_7_DAY;
  const yusho = atTarget && wins >= yushoThreshold && rng() < YUSHO_CHANCE;
  const junYusho = atTarget && wins >= yushoThreshold - 1 && !yusho && rng() < JUN_YUSHO_CHANCE;

  const ginoSho = currentDivision === "makuuchi" && wins >= 11 && rng() < GINO_SHO_CHANCE;
  const kantosho = currentDivision === "makuuchi" && wins >= 11 && rng() < KANTOSHO_CHANCE;
  const shukunsho = currentDivision === "makuuchi" && wins >= 11 && rng() < SHUKUNSHO_CHANCE;

  const kinboshi = currentRank === "maegashira" && wins >= 9 && rng() < KINBOSHI_CHANCE ? 1 : 0;

  return { wins, losses, yusho, junYusho, ginoSho, kantosho, shukunsho, kinboshi };
}

function simulateRankProgression(
  currentRank: Rank,
  _currentDivision: Division,
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
    "yokozuna",
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
    yokozuna: "makuuchi",
  };

  let rankIndex = rankOrder.indexOf(currentRank);
  let newRankNumber = rankNumber;

  if (isKachiKoshi) {
    if (margin >= RANK_PROGRESSION_DOUBLE_PROMOTE_MARGIN && rankIndex < rankOrder.length - 1)
      rankIndex = Math.min(rankIndex + 2, rankOrder.length - 1);
    else if (margin >= RANK_PROGRESSION_PROMOTE_MARGIN && rankIndex < rankOrder.length - 1)
      rankIndex++;

    if (newRankNumber !== undefined && margin >= RANK_PROGRESSION_NUMBER_MARGIN)
      newRankNumber = Math.max(1, newRankNumber - Math.floor(margin / 2));
  } else {
    const absMargin = Math.abs(margin);
    if (absMargin >= RANK_PROGRESSION_DOUBLE_DEMOTE_MARGIN && rankIndex > 0)
      rankIndex = Math.max(0, rankIndex - 2);
    else if (absMargin >= RANK_PROGRESSION_DEMOTE_MARGIN && rankIndex > 0) rankIndex--;

    if (newRankNumber !== undefined) newRankNumber = newRankNumber + Math.floor(absMargin / 2);
  }

  const newRank = rankOrder[rankIndex];
  const numbered = [
    "maegashira",
    "juryo",
    "makushita",
    "sandanme",
    "jonidan",
    "jonokuchi",
  ].includes(newRank);

  return {
    newRank,
    newDivision: divisionMap[newRank],
    newRankNumber: numbered ? newRankNumber : undefined,
  };
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
    jonokuchi: 0.5,
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
    yokozuna: 10,
  };
  return values[rank] || 0;
}
