import type { WorldState } from "../types/world";
import type { BashoSimResult, BanzukeUpdateHook, BashoResult } from "../types/basho";
import { getNextBasho, getBashoNumber } from "../calendar";
import { advanceDays, enterPostBasho, enterInterim } from "../tick/tickDaily";
import { simulateEntireBasho } from "./TournamentSimulator";
import { ChronicleService } from "./ChronicleService";
import { SimTuningService, type TuningMetrics } from "./SimTuningService";
import type { ChronicleReport } from "../types/records";
import { RANK_HIERARCHY, updateBanzuke } from "../banzuke";
import type { BashoPerformance } from "../types/banzuke";
import { assertNever } from "../utils/types";

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

    // 1. Process Banzuke Updates Immediately Post-Basho
    const activeRikishi = Array.from(currentWorld.rikishi.values()).filter(r => !r.isRetired);
    const currentBanzuke = activeRikishi.map(r => ({
      rikishiId: r.id,
      division: r.division,
      position: { rank: r.rank, rankNumber: r.rankNumber, side: r.side }
    }));

    const perfById = new Map<string, BashoPerformance>();
    bashoResult.standings.forEach((stats, id) => {
      perfById.set(id, {
        rikishiId: id,
        wins: stats.wins,
        losses: stats.losses,
        absences: stats.absences || 0
      });
    });

    const banzukeResult = updateBanzuke(
      currentBanzuke,
      perfById,
      currentWorld,
      currentWorld.ozekiKadoban || {},
      currentWorld.heyas
    );

    const nextRikishiMap = new Map(currentWorld.rikishi);
    banzukeResult.newBanzuke.forEach(e => {
      const r = nextRikishiMap.get(e.rikishiId);
      if (r) {
        nextRikishiMap.set(e.rikishiId, { 
          ...r, 
          division: e.division,
          position: e.position,
          rank: e.position.rank,
          side: e.position.side,
          rankNumber: e.position.rankNumber || 1,
          currentBashoWins: 0,
          currentBashoLosses: 0
        });
      }
    });

    currentWorld = {
      ...currentWorld,
      rikishi: nextRikishiMap,
      currentBashoName: nextBashoName,
      ozekiKadoban: banzukeResult.updatedOzekiKadoban,
      history: [
        ...(currentWorld.history || []),
        {
          bashoName: bashoName as any,
          year: currentWorld.year,
          bashoNumber: getBashoNumber(bashoName),
          yusho: bashoResult.yushoWinner.id,
          junYusho: bashoResult.junYusho,
          prizes: {
            yushoAmount: 10_000_000,
            junYushoAmount: 2_000_000,
            specialPrizes: 2_000_000,
          },
        } as BashoResult,
      ],
    };

    // 2. Advance through off-season phases to trigger yearly boundary & training
    currentWorld = enterPostBasho(currentWorld);
    currentWorld = advanceDays(currentWorld, 7); 
    
    currentWorld = enterInterim(currentWorld);
    currentWorld = advanceDays(currentWorld, 42); 

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
