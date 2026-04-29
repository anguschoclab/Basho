import type { WorldState } from "../types/world";
import type { BashoSimResult, BanzukeUpdateHook, BashoResult } from "../types/basho";
import { getNextBasho, getBashoNumber } from "../calendar";
import { advanceDays, enterPostBasho, enterInterim } from "../tick/tickDaily";
import { simulateEntireBasho } from "./TournamentSimulator";
import { ChronicleService } from "./ChronicleService";
import { SimTuningService, type TuningMetrics } from "./SimTuningService";
import type { ChronicleReport } from "../types/records";
import { RANK_HIERARCHY } from "../banzuke";
import { publishBanzukeUpdate } from "../banzuke/BanzukePublisher";
import { assertNever } from "../utils/types";
import { phase06_yearly_boundary } from "../tick/phases/phase06_yearly_boundary";
import { applyImpact } from "../core/ImpactResolver";

// === AUTO-SIM CONFIGURATION ===

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

    currentWorld = bashoResult.world;
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
        `${titleCase(bashoName)} ${currentWorld.calendar.year}: ${bashoResult.yushoWinner.shikona} wins (${bashoResult.yushoWinner.wins}-${bashoResult.yushoWinner.losses})`
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
    const standingsForPublish = new Map<string, { wins: number; losses: number; absences: number }>();
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
        },
        transientContext: {
          ...currentWorld.transientContext,
          boundaries: {
            ...currentWorld.transientContext?.boundaries,
            yearBoundary: true,
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
  const activeRikishi = Array.from(currentWorld.rikishi.values()).filter(r => !r.isRetired);
  const successions = (currentWorld.governanceLog || []).filter(l => l.incident === "oyakata_promotion" || l.data?.status === "oyakata_promotion").length;
  const yokozunaVacancy = activeRikishi.filter(r => r.rank === "yokozuna").length === 0 ? 1 : 0;

  const tuningMetrics = SimTuningService.calculateMetrics(currentWorld, {
    yokozunaVacancy,
    uniqueWinners: championCounts.size,
    successions
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

export function checkStopCondition(
  condition: StopCondition,
  bashoResult: BashoSimResult,
  world: WorldState,
  config: AutoSimConfig
): boolean {
  const hasPlayer = !config.observerMode && !!config.playerHeyaId;

  switch (condition) {
    case "yokozunaPromotion":
      return bashoResult.promotions.some((p) => p.to === "yokozuna");
    case "ozekiPromotion":
      return bashoResult.promotions.some((p) => p.to === "ozeki");
    case "yusho":
      return (
        hasPlayer && world.rikishi.get(bashoResult.yushoWinner.id)?.heyaId === config.playerHeyaId
      );
    case "stableInsolvency":
      return (
        hasPlayer &&
        config.playerHeyaId !== undefined &&
        world.heyas.get(config.playerHeyaId)?.runwayBand === "desperate"
      );
    case "scandal": {
      const scandals = world.scandals ?? [];
      const eventLogList = world.eventLog ?? [];
      return (
        scandals.some((s) => s.severity === "major" && s.year === world.year) ||
        eventLogList.some((e) => e.type === "scandal")
      );
    }
    case "retirementOfStar": {
      const retirements = world.retirements ?? [];
      return retirements.some((r) => {
        const rikishi = world.rikishi.get(r.rikishiId);
        return rikishi && (RANK_HIERARCHY[rikishi.rank]?.tier ?? 999) <= 4;
      });
    }

    default:
      return false;
  }
}

function computeTargetBasho(duration: SimDuration): number {
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
    default:
      assertNever(duration as never);
      return 0;
  }
}

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
