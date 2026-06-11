import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { BashoSimResult, BanzukeUpdateHook } from "../types/basho";
import { getNextBasho, getBashoNumber } from "../calendar";
import { advanceDays, enterPostBasho, enterInterim } from "../tick/tickDaily";
import { simulateEntireBasho } from "./TournamentSimulator";
import { ChronicleService } from "./ChronicleService";
import { SimTuningService, type TuningMetrics } from "./SimTuningService";
import type { ChronicleReport } from "../types/records";
import { RANK_HIERARCHY } from "../banzuke";
import { publishBanzukeUpdate } from "../banzuke/BanzukePublisher";
import { phase06_yearly_boundary } from "../tick/phases/phase06_yearly_boundary";
import { applyImpact } from "../core/ImpactResolver";
import { getHeya, getRikishi } from "../queries";

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

  const targetBasho = computeTargetBasho(config.duration);

  let currentWorld = world;
  while (bashoSimulated < targetBasho) {
    let bashoName = currentWorld.currentBashoName || "hatsu";
    const bashoSeed = `${currentWorld.seed}-basho-${currentWorld.year}-${bashoName}`;

    const bashoResult = simulateEntireBasho(currentWorld, bashoName, bashoSeed, {
      banzukeUpdateHook: opts?.banzukeUpdateHook,
    });

    currentWorld = bashoResult.finalWorld;
    bashoSimulated++;
    daysSimulated += 15;

    if (bashoResult.yushoWinner.id) {
      championCounts.set(
        bashoResult.yushoWinner.id,
        (championCounts.get(bashoResult.yushoWinner.id) || 0) + 1
      );
    }

    if (config.verbosity !== "minimal") {
      ChronicleService.addHighlight(
        chronicle,
        `${titleCase(bashoName)} ${currentWorld.calendar?.year ?? currentWorld.year}: ${bashoResult.yushoWinner.shikona} wins (${bashoResult.yushoWinner.wins}-${bashoResult.yushoWinner.losses})`
      );
    }

    for (const condition of config.stopConditions) {
      if (checkStopCondition(condition, bashoResult, currentWorld, config)) {
        stoppedBy = condition;
        break;
      }
    }
    if (stoppedBy !== "completed") break;

    const nextBashoName = getNextBasho(bashoName);

    // 1. Build standings map in the format publishBanzukeUpdate expects
    const standingsForPublish = new Map<
      string,
      { wins: number; losses: number; absences: number }
    >();
    bashoResult.standings.forEach((stats, id) => {
      standingsForPublish.set(id, {
        wins: stats.wins,
        losses: stats.losses,
        absences: (stats as any).absences || 0,
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
          bashoName: bashoName as any,
          year: currentWorld.year,
          bashoNumber: getBashoNumber(bashoName),
          yusho: bashoResult.yushoWinner.id,
          junYusho: bashoResult.junYusho ?? [],
          ginoSho: (bashoResult as any).ginoSho ?? null,
          shukunsho: (bashoResult as any).shukunsho ?? null,
          kantosho: (bashoResult as any).kantosho ?? null,
          prizes: {
            yushoAmount: 10_000_000,
            junYushoAmount: 2_000_000,
            specialPrizes: 2_000_000,
          },
        } as any,
      ],
    };

    // 3. Run publishBanzukeUpdate — handles yokozuna promotion, careerHistory, council warnings
    const banzukeImpact = publishBanzukeUpdate(worldWithStandings);
    currentWorld = applyImpact(worldWithStandings, banzukeImpact);

    // 2. Advance through off-season phases to trigger yearly boundary & training
    currentWorld = enterPostBasho(currentWorld);
    currentWorld = advanceDays(currentWorld, 7);

    currentWorld = enterInterim(currentWorld);
    currentWorld = advanceDays(currentWorld, 42);

    // 3. After kyushu (last basho of the year), fire the yearly boundary explicitly.
    // We also reset the calendar to Jan 1 of the new year so the next year's off-seasons
    // don't naturally cross Dec 31 and double-trigger the yearly boundary.
    if (bashoName === "kyushu") {
      const yearBoundaryWorld: WorldState = {
        ...currentWorld,
        // Reset to Jan 1 so subsequent off-seasons never cross Dec 31 naturally.
        calendar: {
          ...currentWorld.calendar,
          currentDay: 1,
          month: 1,
          currentWeek: currentWorld.calendar?.currentWeek ?? 1,
        },
        transientContext: {
          ...currentWorld.transientContext,
          boundaries: {
            ...currentWorld.transientContext?.boundaries,
            yearBoundary: true,
            monthBoundary: currentWorld.transientContext?.boundaries?.monthBoundary ?? false,
          },
        },
      };
      const yearImpact = phase06_yearly_boundary(yearBoundaryWorld);
      currentWorld = applyImpact(yearBoundaryWorld, yearImpact);
    }

    // Preparation for next basho
    bashoName = nextBashoName;

    if (
      config.duration.type === "untilEvent" &&
      checkStopCondition(config.duration.eventType, bashoResult, currentWorld, config)
    ) {
      stoppedBy = config.duration.eventType;
      break;
    }
  }

  // Final Metrics Calculation
  const activeRikishi = Array.from(currentWorld.activeRikishiIds)
    .map((id) => currentWorld.rikishi.get(id))
    .filter((r): r is Rikishi => r !== undefined);
  const successions = (currentWorld.governanceLog || []).filter(
    (l) => (l as any).incident === "oyakata_promotion" || (l as any).data?.status === "oyakata_promotion"
  ).length;
  const yokozunaVacancy = activeRikishi.filter((r) => r.rank === "yokozuna").length === 0 ? 1 : 0;

  const tuningMetrics = SimTuningService.calculateMetrics(currentWorld, {
    yokozunaVacancy,
    uniqueWinners: championCounts.size,
    successions,
  });

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
        hasPlayer
          ? r.heyaId === config.playerHeyaId
          : (RANK_HIERARCHY[r.rank]?.tier ?? 999) <= 4;

      // bashoResult.injuries holds shikona of rikishi injured during this basho.
      const injuredThisBasho = new Set(bashoResult.injuries);
      // ⚡ Bolt Optimization: Use direct iteration with early exit instead of Array.from().some()
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
function computeTargetBasho(duration: SimDuration): number {
  const DURATION_RESOLVERS: Record<SimDuration["type"], (d: any) => number> = {
    days: (d) => Math.max(0, Math.ceil(d.count / 15)),
    weeks: (d) => Math.max(0, Math.ceil(d.count / 9)),
    months: (d) => Math.max(0, Math.ceil(d.count / 2)),
    basho: (d) => Math.max(0, Math.floor(d.count)),
    years: (d) => Math.max(0, Math.floor(d.count) * 6),
    untilEvent: () => 600, // 100-year cap
  };

  const resolver = DURATION_RESOLVERS[duration.type];
  return resolver ? resolver(duration) : 0;
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
