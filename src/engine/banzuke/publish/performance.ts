import type { WorldState } from "@/engine/types/world";
import type { BashoState, MatchSchedule } from "@/engine/types/basho";
import type { BashoPerformance } from "@/engine/types/banzuke";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { currentAbility } from "@/engine/development/caPa";
import type { Rikishi, RikishiStats } from "@/engine/types/rikishi";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { getRikishi } from "@/engine/core/queries";
import { KihakuService } from "@/engine/governance/services/KihakuService";
import { finiteOr } from "@/engine/utils/math";
import { isKachiKoshi } from "@/engine/banzuke/banzukeHelpers";
import { BASHO_CALENDAR } from "@/engine/calendar/calendar";
import { getTotalBashodays } from "@/engine/calendar/scheduleHelpers";
import { DIVISIONS, isLowerSanyakuRank } from "@/constants/engine/rankDisplay";
import {
  YOKOZUNA_VACANCY_STREAK_THRESHOLD,
  YOKOZUNA_VACANCY_PRESTIGE_WINS,
  OZEKI_YOKOZUNA_BID_WINS,
} from "@/constants/engine/governanceExtended";
import { SEKIWAKE_33_WIN_THRESHOLD, SEKIWAKE_OZEKI_RECLAIM_WINS } from "@/constants/engine/banzuke";

type Builder = ReturnType<typeof createImpactBuilder>;
type StandingStats = { wins: number; losses: number; absences: number; draws?: number };

/** Iron-man streaks that earn a milestone entry (consecutive basho with zero absences). */
const IRON_MAN_MILESTONES = [25, 50, 75, 100] as const;

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
  // Promotion Case 2: 1 Yusho + 1 Jun-Yusho (elite-win bar both basho)
  else if (
    (isYusho && wasJunYushoPrevious && lastWins >= OZEKI_YOKOZUNA_BID_WINS) ||
    (isJunYusho && wonPrevious && currentWins >= OZEKI_YOKOZUNA_BID_WINS)
  ) {
    promoteToYokozuna = true;
  }
  // Promotion Case 3: 3 consecutive elite-win basho + at least one yusho
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
  // relax criteria: an elite-win yusho is sufficient.
  else if (
    (world.yokozunaVacancyStreak ?? 0) >= YOKOZUNA_VACANCY_STREAK_THRESHOLD &&
    stats.wins >= YOKOZUNA_VACANCY_PRESTIGE_WINS &&
    isYusho
  ) {
    promoteToYokozuna = true;
  }

  // Track consecutive strong performances (elite-win bar) for borderline cases
  const consecutiveStrongOzeki =
    currentWins >= OZEKI_YOKOZUNA_BID_WINS ? (rikishi.consecutiveStrongOzeki || 0) + 1 : 0;

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
  divisionDays: number,
  builder: Builder
): YokozunaPressure {
  let pressureScore = rikishi.pressureScore ?? 0;
  let councilWarnings = rikishi.councilWarnings ?? 0;
  let statsUpdate: Partial<RikishiStats> = {};

  const isMakeKoshi = stats.wins < 8; // Official make-koshi
  const isKyujo = stats.absences >= divisionDays; // Full tournament miss
  const subPar = stats.wins < 10; // Fails to meet "Yokozuna standard"

  const consecutiveMakeKoshi = isMakeKoshi || isKyujo ? (rikishi.consecutiveMakeKoshi ?? 0) + 1 : 0;

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

  return { consecutiveMakeKoshi, pressureScore, councilWarnings, statsUpdate };
}

/**
 * Appends the completed basho to the rikishi's career history (rebuilding
 * the hoshitori day-by-day star chart from the match schedule) and applies
 * the promotion-tracking field update including the Kihaku isen score.
 */
/** Exported for tests — the basho-history writer, incl. the stat snapshot
 *  that feeds progression charts. */
export function recordBashoPerformance(
  world: WorldState,
  lastBasho: BashoState,
  rikishi: Rikishi,
  stats: StandingStats,
  isYusho: boolean,
  isJunYusho: boolean,
  rikishiMatches: MatchSchedule[],
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

  const dayResults = rikishiMatches
    .sort((a, b) => a.day - b.day)
    .flatMap((m) => {
      const res = m.result;
      if (!res) return [];
      const isDraw = res.isDraw === true;
      const won = !isDraw && res.winnerRikishiId === id;
      const isKinboshi =
        won && (res.awards?.some((a) => a.type === "kinboshi") || res.isKinboshi === true);
      const isGinboshi = won && (res.awards?.some((a) => a.type === "ginboshi") ?? false);
      return [
        {
          day: m.day,
          outcome: (isDraw
            ? "draw"
            : won
              ? "win"
              : res.kimarite === "fusensho"
                ? "absence"
                : "loss") as "win" | "loss" | "absence" | "draw",
          ...(isDraw && res.drawType ? { drawType: res.drawType } : {}),
          ...(isKinboshi ? { isKinboshi: true } : {}),
          ...(isGinboshi ? { isGinboshi: true } : {}),
          opponentId: isDraw
            ? m.eastRikishiId === id
              ? m.westRikishiId
              : m.eastRikishiId
            : won
              ? res.loserRikishiId
              : res.winnerRikishiId,
          kimarite: res.kimarite,
        },
      ];
    });

  // Post-basho stat sheet — shared by the snapshot (progression history)
  // and the roster update below.
  const nextStats = { ...rikishi.stats, ...tracked.statsUpdate } as RikishiStats;

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
    ...(stats.draws ? { draws: stats.draws } : {}),
    isYusho,
    isJunYusho,
    specialPrizes: {
      shukunsho: (history?.shukunsho ?? []).includes(id),
      kantosho: (history?.kantosho ?? []).includes(id),
      ginosho: (history?.ginoSho ?? []).includes(id),
    },
    weight: rikishi.weight,
    momentum: rikishi.momentum,
    // Ability at the moment this basho closed — feeds CA/PA progression
    // charts; bounded by the same 6-entry window as the history itself.
    stats: nextStats,
    dayResults,
  };
  const updatedHistory = [...(rikishi.careerHistory || []), historyEntry];
  // Keep last 6 basha only — promotion logic only needs recent history

  // Track absentFinalDay: rikishi missed days and didn't complete the
  // scheduled division program (withdrew before their last scheduled bout).
  const divisionDays = getTotalBashodays(rikishi.division);
  const totalBouts = stats.wins + stats.losses + (stats.draws ?? 0);
  const absentFinalDay = stats.absences > 0 && totalBouts < divisionDays;

  // Calculate kihaku isen (fighting spirit) score using KihakuService
  const kihakuInput = KihakuService.extractFromBasho(id, lastBasho, stats.wins, absentFinalDay);
  const kihakuIsenScore = KihakuService.calculateScore(kihakuInput);

  // Iron-man streak: any absence (partial or full kyujo) resets it.
  const consecutiveBashoFought =
    (stats.absences ?? 0) === 0 ? (rikishi.consecutiveBashoFought ?? 0) + 1 : 0;
  const ironManMilestone = IRON_MAN_MILESTONES.find((m) => consecutiveBashoFought === m);
  if (ironManMilestone) {
    const milestone = {
      id: `ironman-${id}-${lastBasho.bashoName}-${world.year}`,
      type: "iron_man_streak" as const,
      title: `${consecutiveBashoFought} consecutive basho contested`,
      description: `${rikishi.shikona} has contested every scheduled bout for ${consecutiveBashoFought} consecutive tournaments — an Iron Man run.`,
      date: { year: world.year, month: BASHO_CALENDAR[lastBasho.bashoName]?.month ?? 0 },
    };
    builder.updateRikishi(id, { milestones: [...(rikishi.milestones ?? []), milestone] });
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "milestone",
      {
        status: "iron_man_streak",
        rikishiId: id,
        shikona: rikishi.shikona,
        streak: consecutiveBashoFought,
        description: milestone.description,
      },
      { rikishiId: id, importance: "notable" }
    );
  }

  // Lifetime career bookkeeping — careerHistory truncates to the last 6
  // basho, so the founding bar (12 sanyaku / 25 makuuchi basho) and any
  // archive of a career's peak must be carried on the rikishi itself.
  const SANYAKU_RANKS = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
  let careerPeakRank = rikishi.careerPeakRank;
  let careerPeakYear = rikishi.careerPeakYear;
  let careerPeakDivision = rikishi.careerPeakDivision;
  let peakTier = careerPeakRank ? (RANK_HIERARCHY[careerPeakRank]?.tier ?? 99) : 99;
  // Seed legacy objects from the bounded window before it scrolls away.
  for (const e of updatedHistory) {
    const t = RANK_HIERARCHY[e.rank]?.tier ?? 99;
    if (t < peakTier) {
      peakTier = t;
      careerPeakRank = e.rank;
      careerPeakYear = e.year;
      careerPeakDivision = e.division;
    }
  }

  builder.updateRikishi(id, {
    consecutiveStrongOzeki: tracked.consecutiveStrongOzeki,
    consecutiveMakeKoshi: tracked.consecutiveMakeKoshi,
    consecutiveKachiKoshi: tracked.consecutiveKachiKoshi,
    consecutiveKyujo: tracked.consecutiveKyujo,
    consecutiveBashoFought,
    pressureScore: tracked.pressureScore,
    councilWarnings: tracked.councilWarnings,
    stats: nextStats,
    careerHistory: updatedHistory.slice(-6),
    careerPeakRank,
    careerPeakYear,
    careerPeakDivision,
    sanyakuBashoCount:
      (rikishi.sanyakuBashoCount ?? 0) + (SANYAKU_RANKS.has(historyEntry.rank) ? 1 : 0),
    makuuchiBashoCount:
      (rikishi.makuuchiBashoCount ?? 0) + (historyEntry.division === "makuuchi" ? 1 : 0),
    careerPeakCA: Math.max(
      rikishi.careerPeakCA ?? 0,
      currentAbility({ stats: nextStats })
    ),
    careerAbsences: (rikishi.careerAbsences ?? 0) + stats.absences,
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
    if (isLowerSanyakuRank(h.rank)) {
      recentSanyakuWins += h.wins;
      count++;
      if (count === 2) break;
    }
  }
  const sekiwakeThreeBashoWins = recentSanyakuWins + stats.wins;
  const promoteToOzeki =
    isSanyakuForOzeki &&
    sekiwakeThreeBashoWins >= SEKIWAKE_33_WIN_THRESHOLD &&
    stats.wins >= SEKIWAKE_OZEKI_RECLAIM_WINS;

  return { avgBoutDuration, opponentAvgTier, sekiwakeThreeBashoWins, promoteToOzeki };
}

/**
 * Builds the BashoPerformance list from standings and applies per-rikishi
 * updates: yokozuna promotion flags, YDC pressure tracking, kachi-koshi
 * streaks, career history append, kihaku score, bout-metric enrichment, and
 * ozeki promotion detection.
 */
/** Normalize raw standings and synthesize 0-0-divisionDays rows for full-kyujo banzuke members. */
function normalizeStandingEntries(
  world: WorldState,
  standingEntries: Array<[string, unknown]>
): Array<[string, StandingStats]> {
  const normalizedEntries: Array<[string, StandingStats]> = standingEntries.map(
    ([id, stats_any]) => {
      const stats = stats_any as StandingStats;
      const r = getRikishi(world, id);
      const divisionDays = r ? getTotalBashodays(r.division) : 15;
      const absences = Math.max(0, divisionDays - stats.wins - stats.losses - (stats.draws ?? 0));
      return [
        id,
        {
          wins: stats.wins,
          losses: stats.losses,
          absences,
          ...(stats.draws ? { draws: stats.draws } : {}),
        },
      ];
    }
  );

  const standingIds = new Set(normalizedEntries.map(([id]) => id));
  const eligibleIds: string[] = [];
  if (world.currentBanzuke) {
    for (const division of DIVISIONS) {
      const snap = world.currentBanzuke.divisions[division];
      if (!snap) continue;
      for (const a of snap.assignments) {
        if (world.activeRikishiIds.has(a.rikishiId)) eligibleIds.push(a.rikishiId);
      }
    }
  } else {
    eligibleIds.push(...world.activeRikishiIds);
  }
  for (const id of eligibleIds) {
    if (standingIds.has(id)) continue;
    const r = getRikishi(world, id);
    if (!r || r.isMaezumo || r.isEphemeralMaezumo || r.isBanzukeGai) continue;
    normalizedEntries.push([id, { wins: 0, losses: 0, absences: getTotalBashodays(r.division) }]);
  }
  return normalizedEntries;
}

/**
 * Builds the banzuke-performance records used by promotion logic from bout results.
 */
export function buildPerformanceList(
  world: WorldState,
  _lastBasho: BashoState,
  standingEntries: Array<[string, unknown]>,
  builder: Builder
): BashoPerformance[] {
  const lastBasho = _lastBasho;
  const performanceList: BashoPerformance[] = [];
  const normalizedEntries = normalizeStandingEntries(world, standingEntries);

  // WS-11 — crossover evidence: bouts tagged `crossDivisionCallupId` are
  // sekitori-boundary exchanges (juryo↔makushita, makuuchi↔juryo callups).
  // Wins there are direct boundary merit; the pulled-up flag marks the
  // lower-division man fighting the card above.
  const crossWins = new Map<string, number>();
  const pulledUp = new Set<string>();
  for (const m of lastBasho.matches ?? []) {
    if (!m.crossDivisionCallupId || !m.result) continue;
    pulledUp.add(m.crossDivisionCallupId);
    const winnerId =
      m.result.winnerRikishiId ?? (m.result.winner === "east" ? m.eastRikishiId : m.westRikishiId);
    crossWins.set(winnerId, (crossWins.get(winnerId) ?? 0) + 1);
  }

  // Loop-invariant: the just-published basho result is the same for every entry.
  const history = world.history[world.history.length - 1];
  const junYushoSet = new Set(history?.junYusho ?? []);
  const ginoShoSet = new Set(history?.ginoSho ?? []);
  const shukunShoSet = new Set(history?.shukunsho ?? []);
  const kantoShoSet = new Set(history?.kantosho ?? []);

  // Index each rikishi's decided day<=15 matches once — recordBashoPerformance
  // rebuilds the day-by-day star chart from them per entry below.
  const matchesByRikishi = new Map<string, MatchSchedule[]>();
  for (const m of lastBasho.matches ?? []) {
    if (!m.result || m.day > 15) continue;
    for (const pid of [m.eastRikishiId, m.westRikishiId]) {
      const list = matchesByRikishi.get(pid);
      if (list) list.push(m);
      else matchesByRikishi.set(pid, [m]);
    }
  }

  for (const [id, stats] of normalizedEntries) {
    const isYusho = history?.yusho === id;
    const isJunYusho = junYushoSet.has(id);
    const rikishi = getRikishi(world, id);
    const divisionDays = rikishi ? getTotalBashodays(rikishi.division) : 15;

    let prizePoints = 0;
    if (ginoShoSet.has(id)) prizePoints += 1;
    if (shukunShoSet.has(id)) prizePoints += 1;
    if (kantoShoSet.has(id)) prizePoints += 1;

    let promoteToYokozuna = false;
    let consecutiveStrongOzeki = rikishi?.consecutiveStrongOzeki || 0;
    if (rikishi?.rank === "ozeki") {
      const bid = evaluateOzekiYokozunaBid(world, rikishi, stats, isYusho, isJunYusho, builder);
      promoteToYokozuna = bid.promoteToYokozuna;
      consecutiveStrongOzeki = bid.consecutiveStrongOzeki;
    }

    let pressure: YokozunaPressure = {
      consecutiveMakeKoshi: rikishi?.consecutiveMakeKoshi ?? 0,
      pressureScore: rikishi?.pressureScore ?? 0,
      councilWarnings: rikishi?.councilWarnings ?? 0,
      statsUpdate: {},
    };
    if (rikishi?.rank === "yokozuna") {
      pressure = evaluateYokozunaPressure(rikishi, stats, divisionDays, builder);
    }

    // Consecutive kachi-koshi / kyūjō tracking for ALL rikishi (not just
    // yokozuna) — consecutiveKyujo feeds kyūjō pressure, return narratives
    // and dynasty traits downstream.
    const isFullAbsence = stats.absences >= divisionDays;
    const consecutiveKyujo = rikishi && isFullAbsence ? (rikishi.consecutiveKyujo ?? 0) + 1 : 0;
    let consecutiveKachiKoshi = rikishi?.consecutiveKachiKoshi ?? 0;
    if (rikishi) {
      const isKachi = isKachiKoshi(stats.wins, stats.losses, rikishi.rank);
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
        matchesByRikishi.get(id) ?? [],
        {
          consecutiveStrongOzeki,
          consecutiveMakeKoshi: pressure.consecutiveMakeKoshi,
          consecutiveKachiKoshi,
          consecutiveKyujo,
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
      ...(stats.draws ? { draws: stats.draws } : {}),
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
      ...(crossWins.get(id) ? { crossDivisionWins: crossWins.get(id) } : {}),
      ...(pulledUp.has(id) ? { crossoverPulledUp: true } : {}),
    });
  }

  return performanceList;
}
