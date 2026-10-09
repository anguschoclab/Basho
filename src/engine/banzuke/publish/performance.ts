import type { WorldState } from "../../types/world";
import type { BashoState } from "../../types/basho";
import type { BashoPerformance } from "../../banzuke";
import type { Rikishi, RikishiStats } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getRikishi } from "../../queries";
import { KihakuService } from "../../systems/governance/KihakuService";
import { finiteOr } from "../../utils/math";
import { isKachiKoshi } from "../banzukeHelpers";
import { BASHO_CALENDAR } from "../../calendar";
import {
  YOKOZUNA_VACANCY_STREAK_THRESHOLD,
  YOKOZUNA_VACANCY_PRESTIGE_WINS,
} from "../../../constants/engine/governanceExtended";

type Builder = ReturnType<typeof createImpactBuilder>;
type StandingStats = { wins: number; losses: number; absences: number };

interface OzekiBidResult {
  promoteToYokozuna: boolean;
  consecutiveStrongOzeki: number;
}

/**
 * Yokozuna promotion logic based on real sumo criteria.
 * Standard: 2 consecutive yusho OR 1 yusho + 1 jun-yusho (13+ wins both),
 * plus prestige/vacancy relaxations. Also tracks consecutiveStrongOzeki
 * and logs the "yokozuna watch" narrative event.
 */
function evaluateOzekiYokozunaBid(
  world: WorldState,
  rikishi: Rikishi,
  stats: StandingStats,
  isYusho: boolean,
  isJunYusho: boolean,
  builder: Builder
): OzekiBidResult {
  let promoteToYokozuna = false;

  const currentWins = stats.wins;
  const cHistory = rikishi.careerHistory || [];
  const prevBasho = cHistory[cHistory.length - 1];

  const wonPrevious = prevBasho?.isYusho === true;
  const wasJunYushoPrevious = prevBasho?.isJunYusho === true;
  const lastWins = prevBasho?.wins || 0;

  // Promotion Case 1: 2 Consecutive Yusho
  if (isYusho && wonPrevious) {
    promoteToYokozuna = true;
  }
  // Promotion Case 2: 1 Yusho + 1 Jun-Yusho (13+ wins both)
  else if (
    (isYusho && wasJunYushoPrevious && lastWins >= 13) ||
    (isJunYusho && wonPrevious && currentWins >= 13)
  ) {
    promoteToYokozuna = true;
  }
  // Promotion Case 3: 3 consecutive 12+ wins + at least one yusho
  else if ((rikishi.consecutiveStrongOzeki || 0) >= 2 && (isYusho || wonPrevious)) {
    promoteToYokozuna = true;
  }
  // Promotion Case 4: Prestige Promotion (If world has 0 Yokozuna, 13+ win Yusho is enough)
  else if (stats.wins >= 13) {
    let hasActiveYokozuna = false;
    for (const r of world.rikishi.values()) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        hasActiveYokozuna = true;
        break;
      }
    }
    if (!hasActiveYokozuna && isYusho) {
      promoteToYokozuna = true;
    }
  }
  // Promotion Case 5: Vacancy-streak prestige promotion
  // After YOKOZUNA_VACANCY_STREAK_THRESHOLD basho with no yokozuna,
  // relax criteria: 12+ win yusho is sufficient.
  else if (
    (world.yokozunaVacancyStreak ?? 0) >= YOKOZUNA_VACANCY_STREAK_THRESHOLD &&
    stats.wins >= YOKOZUNA_VACANCY_PRESTIGE_WINS &&
    isYusho
  ) {
    promoteToYokozuna = true;
  }

  // Track consecutive strong performances (12+) for borderline cases
  const consecutiveStrongOzeki =
    currentWins >= 12 ? (rikishi.consecutiveStrongOzeki || 0) + 1 : 0;

  // Narrative: Yokozuna Watch
  if (isYusho && !promoteToYokozuna) {
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "yokozuna_watch",
        description: `${rikishi.shikona} is on Yokozuna promotion watch following a strong performance.`,
      },
      { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
    );
  }

  return { promoteToYokozuna, consecutiveStrongOzeki };
}

interface YokozunaPressure {
  consecutiveMakeKoshi: number;
  consecutiveKyujo: number;
  pressureScore: number;
  councilWarnings: number;
  statsUpdate: Partial<RikishiStats>;
}

/**
 * Yokozuna make-koshi and kyujo tracking for retirement pressure.
 * Real sumo: Yokozuna with consecutive losing records face retirement
 * pressure; every 2 sub-par performances earns a Council Warning plus a
 * 10% Mental/Technique dignity debuff.
 */
function evaluateYokozunaPressure(
  rikishi: Rikishi,
  stats: StandingStats,
  builder: Builder
): YokozunaPressure {
  let pressureScore = rikishi.pressureScore ?? 0;
  let councilWarnings = rikishi.councilWarnings ?? 0;
  let statsUpdate: Partial<RikishiStats> = {};

  const isMakeKoshi = stats.wins < 8; // Official make-koshi
  const isKyujo = stats.absences >= 15; // Full tournament miss
  const subPar = stats.wins < 10; // Fails to meet "Yokozuna standard"

  const consecutiveMakeKoshi = isMakeKoshi || isKyujo
    ? (rikishi.consecutiveMakeKoshi ?? 0) + 1
    : 0;

  const consecutiveKyujo = isKyujo ? (rikishi.consecutiveKyujo ?? 0) + 1 : 0;

  // Council Recommendation / Warning Logic
  if (subPar || isKyujo) {
    pressureScore = (rikishi.pressureScore ?? 0) + 1;

    // Every 2 "sub-par" performances = 1 Council Warning
    if (pressureScore % 2 === 0) {
      councilWarnings = (rikishi.councilWarnings ?? 0) + 1;

      // Apply Stat Debuff: 10% reduction in Mental and Technique (Dignity loss)
      const currentMental = finiteOr(rikishi.stats?.mental, 50);
      const currentTechnique = finiteOr(rikishi.stats?.technique, 50);
      statsUpdate = {
        mental: currentMental * 0.9,
        technique: currentTechnique * 0.9,
      };

      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          incident: "yokozuna_deliberation",
          description: `The Yokozuna Deliberation Council issues a formal warning to Yokozuna ${rikishi.shikona} following disappointing results.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }
  }

  return { consecutiveMakeKoshi, consecutiveKyujo, pressureScore, councilWarnings, statsUpdate };
}

/**
 * Appends the completed basho to the rikishi's career history (rebuilding
 * the hoshitori day-by-day star chart from the match schedule) and applies
 * the promotion-tracking field update including the Kihaku isen score.
 */
function recordBashoPerformance(
  world: WorldState,
  lastBasho: BashoState,
  rikishi: Rikishi,
  stats: StandingStats,
  isYusho: boolean,
  isJunYusho: boolean,
  tracked: {
    consecutiveStrongOzeki: number;
    consecutiveMakeKoshi: number;
    consecutiveKachiKoshi: number;
    consecutiveKyujo: number;
    pressureScore: number;
    councilWarnings: number;
    statsUpdate: Partial<RikishiStats>;
  },
  builder: Builder
): void {
  const id = rikishi.id;
  const history = world.history[world.history.length - 1];

  const dayResults = (lastBasho.matches ?? [])
    .filter(
      (m) => m.result && (m.eastRikishiId === id || m.westRikishiId === id) && m.day <= 15
    )
    .sort((a, b) => a.day - b.day)
    .flatMap((m) => {
      const res = m.result;
      if (!res) return [];
      const won = res.winnerRikishiId === id;
      const isKinboshi =
        won && (res.awards?.some((a) => a.type === "kinboshi") || res.isKinboshi === true);
      const isGinboshi = won && (res.awards?.some((a) => a.type === "ginboshi") ?? false);
      return [
        {
          day: m.day,
          outcome: (won ? "win" : res.kimarite === "fusensho" ? "absence" : "loss") as
            "win" | "loss" | "absence",
          ...(isKinboshi ? { isKinboshi: true } : {}),
          ...(isGinboshi ? { isGinboshi: true } : {}),
          opponentId: won ? res.loserRikishiId : res.winnerRikishiId,
          kimarite: res.kimarite,
        },
      ];
    });

  const historyEntry = {
    id: `${lastBasho.bashoName}-${world.year}-${id}`,
    bashoId: `${lastBasho.bashoName}-${world.year}`,
    year: world.year,
    month: BASHO_CALENDAR[lastBasho.bashoName]?.month ?? 0,
    bashoName: lastBasho.bashoName,
    rank: rikishi.rank,
    division: rikishi.division,
    rankNumber: rikishi.rankNumber ?? 1,
    side: rikishi.side,
    wins: stats.wins,
    losses: stats.losses,
    absences: stats.absences ?? 0,
    isYusho,
    isJunYusho,
    specialPrizes: {
      shukunsho: history?.shukunsho === id,
      kantosho: history?.kantosho === id,
      ginosho: history?.ginoSho === id,
    },
    weight: rikishi.weight,
    momentum: rikishi.momentum,
    dayResults,
  };
  const updatedHistory = [...(rikishi.careerHistory || []), historyEntry];
  // Keep last 6 basha only — promotion logic only needs recent history

  // Track absentFinalDay: if rikishi has any absences and didn't complete all 15 bouts
  const totalBouts = stats.wins + stats.losses;
  const absentFinalDay = stats.absences > 0 && totalBouts < 15;

  // Calculate kihaku isen (fighting spirit) score using KihakuService
  const kihakuInput = KihakuService.extractFromBasho(id, lastBasho, stats.wins, absentFinalDay);
  const kihakuIsenScore = KihakuService.calculateScore(kihakuInput);

  builder.updateRikishi(id, {
    consecutiveStrongOzeki: tracked.consecutiveStrongOzeki,
    consecutiveMakeKoshi: tracked.consecutiveMakeKoshi,
    consecutiveKachiKoshi: tracked.consecutiveKachiKoshi,
    consecutiveKyujo: tracked.consecutiveKyujo,
    pressureScore: tracked.pressureScore,
    councilWarnings: tracked.councilWarnings,
    stats: {
      ...rikishi.stats,
      ...tracked.statsUpdate,
    } as RikishiStats,
    careerHistory: updatedHistory.slice(-6),
    absentFinalDay,
    kihakuIsenScore,
  });
}

interface MetricEnrichment {
  avgBoutDuration?: number;
  opponentAvgTier?: number;
  sekiwakeThreeBashoWins: number;
  promoteToOzeki: boolean;
}

/**
 * Enriches a performance with bout metrics (7.1) + strength-of-schedule
 * (4.3), and detects Ozeki promotion (4.2): sanyaku with 33+ wins across
 * the last 3 basho and 10+ in the current one.
 */
function enrichMetrics(
  lastBasho: BashoState,
  rikishi: Rikishi | undefined,
  stats: StandingStats,
  id: string
): MetricEnrichment {
  const boutMetrics = lastBasho.boutMetrics?.[id];

  let avgBoutDuration: number | undefined;
  if (boutMetrics && boutMetrics.boutDurations.length > 0) {
    let sum = 0;
    for (const d of boutMetrics.boutDurations) {
      sum += d;
    }
    avgBoutDuration = sum / boutMetrics.boutDurations.length;
  }

  let opponentAvgTier: number | undefined;
  if (boutMetrics && boutMetrics.opponentTiers.length > 0) {
    let sum = 0;
    for (const t of boutMetrics.opponentTiers) {
      sum += t;
    }
    opponentAvgTier = sum / boutMetrics.opponentTiers.length;
  }

  const isSanyakuForOzeki = rikishi?.rank === "sekiwake" || rikishi?.rank === "komusubi";
  let recentSanyakuWins = 0;
  const chistory = rikishi?.careerHistory ?? [];
  let count = 0;
  for (let i = chistory.length - 1; i >= 0; i--) {
    const h = chistory[i];
    if (h.rank === "sekiwake" || h.rank === "komusubi") {
      recentSanyakuWins += h.wins;
      count++;
      if (count === 2) break;
    }
  }
  const sekiwakeThreeBashoWins = recentSanyakuWins + stats.wins;
  const promoteToOzeki = isSanyakuForOzeki && sekiwakeThreeBashoWins >= 33 && stats.wins >= 10;

  return { avgBoutDuration, opponentAvgTier, sekiwakeThreeBashoWins, promoteToOzeki };
}

/**
 * Builds the BashoPerformance list from standings and applies per-rikishi
 * updates: yokozuna promotion flags, YDC pressure tracking, kachi-koshi
 * streaks, career history append, kihaku score, bout-metric enrichment, and
 * ozeki promotion detection.
 */
export function buildPerformanceList(
  world: WorldState,
  lastBasho: BashoState,
  standingEntries: Array<[string, unknown]>,
  builder: Builder
): BashoPerformance[] {
  const performanceList: BashoPerformance[] = [];
  for (const [id, stats_any] of standingEntries) {
    const stats = stats_any as StandingStats;
    const history = world.history[world.history.length - 1];
    const isYusho = history?.yusho === id;
    const isJunYusho = history?.junYusho?.includes(id) ?? false;
    const rikishi = getRikishi(world, id);

    let prizePoints = 0;
    if (history?.ginoSho === id) prizePoints += 1;
    if (history?.shukunsho === id) prizePoints += 1;
    if (history?.kantosho === id) prizePoints += 1;

    let promoteToYokozuna = false;
    let consecutiveStrongOzeki = rikishi?.consecutiveStrongOzeki || 0;
    if (rikishi?.rank === "ozeki") {
      const bid = evaluateOzekiYokozunaBid(world, rikishi, stats, isYusho, isJunYusho, builder);
      promoteToYokozuna = bid.promoteToYokozuna;
      consecutiveStrongOzeki = bid.consecutiveStrongOzeki;
    }

    let pressure: YokozunaPressure = {
      consecutiveMakeKoshi: rikishi?.consecutiveMakeKoshi ?? 0,
      consecutiveKyujo: rikishi?.consecutiveKyujo ?? 0,
      pressureScore: rikishi?.pressureScore ?? 0,
      councilWarnings: rikishi?.councilWarnings ?? 0,
      statsUpdate: {},
    };
    if (rikishi?.rank === "yokozuna") {
      pressure = evaluateYokozunaPressure(rikishi, stats, builder);
    }

    // Consecutive kachi-koshi tracking for ALL rikishi (not just yokozuna)
    let consecutiveKachiKoshi = rikishi?.consecutiveKachiKoshi ?? 0;
    if (rikishi) {
      const isKachi = isKachiKoshi(stats.wins, stats.losses, rikishi.rank);
      const isFullAbsence = stats.absences >= 15;
      if (isKachi && !isFullAbsence) {
        consecutiveKachiKoshi = (rikishi.consecutiveKachiKoshi ?? 0) + 1;
      } else {
        consecutiveKachiKoshi = 0;
      }
    }

    // Update rikishi with promotion tracking fields and append careerHistory
    if (rikishi) {
      recordBashoPerformance(
        world,
        lastBasho,
        rikishi,
        stats,
        isYusho,
        isJunYusho,
        {
          consecutiveStrongOzeki,
          consecutiveMakeKoshi: pressure.consecutiveMakeKoshi,
          consecutiveKachiKoshi,
          consecutiveKyujo: pressure.consecutiveKyujo,
          pressureScore: pressure.pressureScore,
          councilWarnings: pressure.councilWarnings,
          statsUpdate: pressure.statsUpdate,
        },
        builder
      );
    }

    // Enrich performance with bout metrics (7.1) + SOS (4.3)
    const boutMetrics = lastBasho.boutMetrics?.[id];
    const { avgBoutDuration, opponentAvgTier, sekiwakeThreeBashoWins, promoteToOzeki } =
      enrichMetrics(lastBasho, rikishi, stats, id);

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: stats.absences ?? 0,
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints,
      promoteToYokozuna,
      promoteToOzeki,
      sekiwakeThreeBashoWins,
      kimariteUsed: boutMetrics?.kimariteUsed,
      upsetCount: boutMetrics?.upsetCount,
      avgBoutDuration,
      edgeCrisisSurvived: boutMetrics?.edgeCrisisSurvived,
      comebackWins: boutMetrics?.comebackWins,
      opponentAvgTier,
    });
  }

  return performanceList;
}
