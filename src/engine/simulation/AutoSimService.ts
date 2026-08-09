import type { WorldState } from "../types/world";
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import type { Rikishi } from "../types/rikishi";
import type { BashoSimResult, BanzukeUpdateHook } from "../types/basho";
import { getBashoNumber } from "../calendar";
import { enterPostBasho, enterInterim } from "../tick/tickDaily";
import { advanceWithGates } from "../tick/advanceWithGates";
import { resolveImpacts } from "../core/ImpactResolver";
import { INTERIM_DURATION_DAYS } from "../../constants/engine/recruitmentExtended";
import { simulateEntireBasho } from "./TournamentSimulator";
import { ChronicleService } from "./ChronicleService";
import { SimTuningService, type TuningMetrics } from "./SimTuningService";
import type { ChronicleReport } from "../types/records";
import { RANK_HIERARCHY } from "../banzuke";
import { publishBanzukeUpdate } from "../banzuke/BanzukePublisher";
import { getHeya, getRikishi } from "../queries";
import { SIMULATION_CONFIG } from "../core/SimulationConfig";

// === AUTO-SIM CONFIGURATION ===

/** Recovery weeks at/above which an injury counts as "major" for auto-sim stop conditions. */
const MAJOR_INJURY_WEEKS_THRESHOLD = 8;

export type StopCondition =
  | "yokozunaPromotion"
  | "ozekiPromotion"
  | "yusho"
  | "stableInsolvency"
  | "majorInjury"
  | "scandal"
  | "retirementOfStar"
  | "never";

export type SimDuration =
  | { type: "days"; count: number }
  | { type: "weeks"; count: number }
  | { type: "months"; count: number }
  | { type: "basho"; count: number }
  | { type: "years"; count: number }
  | { type: "untilEvent"; eventType: StopCondition };

export type VerbosityLevel = "minimal" | "standard" | "detailed";

export interface AutoSimConfig {
  duration: SimDuration;
  stopConditions: StopCondition[];
  verbosity: VerbosityLevel;
  delegationPolicy: "conservative" | "balanced" | "aggressive";
  observerMode: boolean;
  playerHeyaId?: string;
}

export interface AutoSimResult {
  startYear: number;
  endYear: number;
  bashoSimulated: number;
  daysSimulated: number;
  stoppedBy: StopCondition | "completed";
  chronicle: ChronicleReport;
  finalWorld: WorldState;
  tuningMetrics: TuningMetrics;
}

/**
 * Main Auto-Sim Coordination Service.
 * Runs the simulation for a specified duration or until a stop condition is met.
 *
 * @param world - The starting world state
 * @param config - Configuration for the auto-simulation
 * @param opts - Optional hooks and extra options
 * @returns The final result of the auto-simulation including metrics and chronicles
 */
export function runAutoSim(
  world: WorldState,
  config: AutoSimConfig,
  opts?: {
    banzukeUpdateHook?: BanzukeUpdateHook;
  }
): AutoSimResult {
  const startYear = world.year;
  let bashoSimulated = 0;
  let daysSimulated = 0;
  let stoppedBy: StopCondition | "completed" = "completed";

  const chronicle = ChronicleService.createEmptyReport();
  const championCounts = new Map<string, number>();
  const cumulativeKimarite: Record<string, number> = {};
  let prevKimariteStats: Record<string, number> = {};
  let yokozunaVacantBashoCount = 0;

  const targetBasho = computeTargetBasho(config.duration);

  // Mark this as an autonomous run so player-facing loop decisions are suppressed
  // and the within-tick crisis halt is disabled (otherwise the sim freezes waiting
  // for an interactive choice that never comes).
  let currentWorld: WorldState = {
    ...world,
    _autonomousSim: true,
    _autonomousPolicy: config.delegationPolicy,
  };
  while (bashoSimulated < targetBasho) {
    const bashoName = currentWorld.currentBashoName || "hatsu";
    const bashoSeed = `${currentWorld.seed}-basho-${currentWorld.year}-${bashoName}`;

    const bashoResult = simulateEntireBasho(currentWorld, bashoName, bashoSeed, {
      banzukeUpdateHook: opts?.banzukeUpdateHook,
    });

    currentWorld = bashoResult.finalWorld;
    bashoSimulated++;
    // Full cycle: 15 basho days + 7 post-basho + 42 interim days
    daysSimulated += 15 + 7 + INTERIM_DURATION_DAYS;

    // Accumulate kimarite stats before year-boundary reset wipes them
    const bashoKimarite = currentWorld.globalKimariteStats ?? {};
    for (const [k, v] of Object.entries(bashoKimarite)) {
      const prev = prevKimariteStats[k] ?? 0;
      const delta = v - prev;
      if (delta > 0) cumulativeKimarite[k] = (cumulativeKimarite[k] ?? 0) + delta;
    }
    prevKimariteStats = { ...bashoKimarite };

    if (bashoResult.yushoWinner.id) {
      championCounts.set(
        bashoResult.yushoWinner.id,
        (championCounts.get(bashoResult.yushoWinner.id) || 0) + 1
      );
    }

    if (config.verbosity !== "minimal") {
      ChronicleService.addHighlight(
        chronicle,
        `${titleCase(bashoName)} ${currentWorld.year ?? DEFAULT_START_YEAR}: ${bashoResult.yushoWinner.shikona} wins (${bashoResult.yushoWinner.wins}-${bashoResult.yushoWinner.losses})`
      );
    }

    for (const condition of config.stopConditions) {
      if (checkStopCondition(condition, bashoResult, currentWorld, config)) {
        stoppedBy = condition;
        break;
      }
    }
    if (stoppedBy !== "completed") break;

    // 1. Build standings map in the format publishBanzukeUpdate expects
    const standingsForPublish = new Map<
      string,
      { wins: number; losses: number; absences: number }
    >();
    bashoResult.standings.forEach((stats, id) => {
      standingsForPublish.set(id, {
        wins: stats.wins,
        losses: stats.losses,
        absences: stats.absences ?? 0,
      });
    });

    // 2. Inject standings + history record into world before calling publishBanzukeUpdate
    const worldWithStandings: WorldState = {
      ...currentWorld,
      cyclePhase: "post_basho",
      _postBashoDays: 7,
      currentBasho: currentWorld.currentBasho
        ? { ...currentWorld.currentBasho, standings: standingsForPublish }
        : {
            bashoName: bashoName,
            year: currentWorld.year,
            bashoNumber: getBashoNumber(bashoName) as 1 | 2 | 3 | 4 | 5 | 6,
            day: 15,
            matches: [],
            standings: standingsForPublish,
            isActive: false,
          },
      history: [
        ...(currentWorld.history || []),
        {
          id: `${bashoName}-${currentWorld.year}`,
          bashoName,
          year: currentWorld.year,
          bashoNumber: getBashoNumber(bashoName),
          yusho: bashoResult.yushoWinner.id,
          junYusho: bashoResult.junYusho ?? [],
          ginoSho: bashoResult.ginoSho,
          shukunsho: bashoResult.shukunsho,
          kantosho: bashoResult.kantosho,
          prizes: {
            yushoAmount: SIMULATION_CONFIG.prizes.yusho,
            junYushoAmount: SIMULATION_CONFIG.prizes.junYusho,
            specialPrizes: SIMULATION_CONFIG.prizes.specialPrize,
          },
        },
      ],
    };

    // 3. Run publishBanzukeUpdate — handles yokozuna promotion, careerHistory, council warnings
    const banzukeImpact = publishBanzukeUpdate(worldWithStandings);
    currentWorld = resolveImpacts(worldWithStandings, [banzukeImpact]);

    // Count yokozuna vacancy per basho (after banzuke update so freshly-promoted yokozuna aren't falsely counted vacant)
    let hasYokozuna = false;
    for (const r of currentWorld.rikishi.values()) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        hasYokozuna = true;
        break;
      }
    }
    if (!hasYokozuna) yokozunaVacantBashoCount++;

    // 2. Advance through off-season phases to trigger yearly boundary & training.
    // P3.6: Use advanceWithGates for post-basho + interim + year-boundary crossing.
    currentWorld = enterPostBasho(currentWorld);
    currentWorld = advanceWithGates(currentWorld, {
      maxDays: 7,
      autonomous: true,
    }).world;

    currentWorld = enterInterim(currentWorld);
    currentWorld = advanceWithGates(currentWorld, {
      maxDays: 42,
      autonomous: true,
    }).world;

    // 3. After kyushu (last basho of the year), ensure the year boundary fires.
    // P3.6: Use advanceWithGates with a target predicate for year-boundary detection.
    if (bashoName === "kyushu") {
      const yearResult = advanceWithGates(currentWorld, {
        maxDays: 31,
        autonomous: true,
        isTargetReached: (w) => w.calendar?.month === 1,
      });
      currentWorld = yearResult.world;
    }

    // Preparation for next basho
    // bashoName is reassigned at the top of the loop from currentWorld

    if (
      config.duration.type === "untilEvent" &&
      checkStopCondition(config.duration.eventType, bashoResult, currentWorld, config)
    ) {
      stoppedBy = config.duration.eventType;
      break;
    }
  }

  // Final Metrics Calculation
  const successions = (currentWorld.governanceLog || []).filter(
    (l) => l.incident === "oyakata_promotion" || l.data?.status === "oyakata_promotion"
  ).length;
  const yokozunaVacancy = yokozunaVacantBashoCount;

  const tuningMetrics = SimTuningService.calculateMetrics(currentWorld, {
    yokozunaVacancy,
    uniqueWinners: championCounts.size,
    successions,
    cumulativeKimarite,
  });

  // Collect auto-resolved decision events into chronicle highlights
  const decisionEvents = (currentWorld.events?.log ?? [])
    .filter((e) => e.type === "DECISION_AUTO_RESOLVED")
    .slice(-10);
  for (const e of decisionEvents) {
    const summary =
      (e as { data?: { summary?: string } }).data?.summary ?? "Auto-decided a stable matter";
    ChronicleService.addHighlight(chronicle, `Auto-decided: ${summary}`);
  }

  return {
    startYear,
    endYear: currentWorld.year,
    bashoSimulated,
    daysSimulated,
    stoppedBy,
    chronicle: ChronicleService.finalizeReport(currentWorld, chronicle, championCounts, startYear),
    finalWorld: currentWorld,
    tuningMetrics,
  };
}

/**
 * Checks if a specific stop condition has been met.
 *
 * @param condition - The stop condition to check
 * @param bashoResult - The results of the most recent basho simulation
 * @param world - The current world state
 * @param config - The active auto-sim configuration
 * @returns True if the condition is met, false otherwise
 */
export function checkStopCondition(
  condition: StopCondition,
  bashoResult: BashoSimResult,
  world: WorldState,
  config: AutoSimConfig
): boolean {
  const hasPlayer = !config.observerMode && !!config.playerHeyaId;

  const STOP_HANDLERS: Record<
    StopCondition,
    (bashoResult: BashoSimResult, world: WorldState, config: AutoSimConfig) => boolean
  > = {
    yokozunaPromotion: (bashoResult) => bashoResult.promotions.some((p) => p.to === "yokozuna"),
    ozekiPromotion: (bashoResult) => bashoResult.promotions.some((p) => p.to === "ozeki"),
    yusho: (bashoResult, world, config) =>
      hasPlayer && getRikishi(world, bashoResult.yushoWinner.id)?.heyaId === config.playerHeyaId,
    stableInsolvency: (_bashoResult, world, config) =>
      hasPlayer &&
      config.playerHeyaId !== undefined &&
      getHeya(world, config.playerHeyaId)?.runwayBand === "desperate",
    scandal: (_bashoResult, world) => {
      const scandals = world.scandals ?? [];
      const eventLogList = world.eventLog ?? [];
      return (
        scandals.some((s) => s.severity === "major" && s.year === world.year) ||
        eventLogList.some((e) => e.type === "scandal")
      );
    },
    retirementOfStar: (_bashoResult, world) => {
      const retirements = world.retirements ?? [];
      return retirements.some((r) => {
        const rikishi = getRikishi(world, r.rikishiId);
        return rikishi && (RANK_HIERARCHY[rikishi.rank]?.tier ?? 999) <= 4;
      });
    },
    majorInjury: (bashoResult, world, config) => {
      const isMajorInjury = (r: Rikishi): boolean => {
        if (!r.injured) return false;
        const weeks = r.injuryStatus?.weeksRemaining ?? r.injuryWeeksRemaining ?? 0;
        return r.injuryStatus?.severity === "serious" || weeks >= MAJOR_INJURY_WEEKS_THRESHOLD;
      };
      const inScope = (r: Rikishi): boolean =>
        hasPlayer ? r.heyaId === config.playerHeyaId : (RANK_HIERARCHY[r.rank]?.tier ?? 999) <= 4;

      // bashoResult.injuries holds shikona of rikishi injured during this basho.
      const injuredThisBasho = new Set(bashoResult.injuries);
      for (const r of world.rikishi.values()) {
        if (injuredThisBasho.has(r.shikona) && inScope(r) && isMajorInjury(r)) {
          return true;
        }
      }
      return false;
    },
    never: () => false,
  };

  const handler = STOP_HANDLERS[condition];
  return handler ? handler(bashoResult, world, config) : false;
}

/**
 * Computes the total number of basho to simulate based on the duration config.
 *
 * @param duration - The specified simulation duration
 * @returns The number of basho to simulate
 */
export function computeTargetBasho(duration: SimDuration): number {
  switch (duration.type) {
    case "days":
      return Math.max(0, Math.ceil(duration.count / 15));
    case "weeks":
      return Math.max(0, Math.ceil(duration.count / 9));
    case "months":
      return Math.max(0, Math.ceil(duration.count / 2));
    case "basho":
      return Math.max(0, Math.floor(duration.count));
    case "years":
      return Math.max(0, Math.floor(duration.count) * 6);
    case "untilEvent":
      return 600; // 100-year cap
  }
}

/**
 * Helper to convert a string to title case.
 *
 * @param name - The string to convert
 * @returns The title-cased string
 */
function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
