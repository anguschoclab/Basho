/**
 * File Name: src/engine/world.ts
 * Notes:
 * - Orchestrates the game simulation using high-fidelity types.
 * - 'advanceDay' runs bouts for the current day using 'resolveBout' (which handles H2H).
 * - 'endBasho' handles rankings, prizes, and crucially, the LIFECYCLE check (retirements/new recruits).
 * - 'advanceInterim' handles between-basho ticks (AI, scouting, economics).
 * - All lifecycle transitions emit canonical EventBus events.
 * - Almanac snapshots are written at basho end (Constitution A5.1).
 * - FTUE state is updated after first basho completion.
 */

import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { WorldState } from "./types/world";
import type { BashoName, BoutResult, MatchSchedule, BashoState } from "./types/basho";
import type { Id } from "./types/common";
import { toRankPosition, type Side } from "./types/index";
import type { BashoPerformance, BanzukeEntry } from "./banzuke";
import * as talentpool from "./systems/generation/TalentPoolService";
import { initializeBasho } from "./systems/generation/WorldFactory";
import { getNextBasho } from "./calendar";
import { resolveBout } from "./bout/boutResolver";
import { stableTieBreak } from "./utils/sort";
import { updateH2H } from "./h2h";
import { EventBus } from "./events";
import { advanceOneDay, enterPostBasho, enterInterim, type DailyTickReport } from "./tick/tickDaily";
import { buildAlmanacSnapshot } from "./almanac";
import { autosave } from "./saveload";
import { runSponsorChurn } from "./economics";
import * as schedule from "./schedule";
import * as events from "./events";
import * as injuries from "./systems/health/InjuryService";
import * as rivalries from "./rivalries";
import { 
  updateMediaFromBout, 
  processWeeklyMediaBoundary,
  resetBashoMediaTracking,
  snapshotMediaHeatForBasho,
  handleMediaEvent
} from "./systems/media/MediaService";
import * as economics from "./economics";
import * as governance from "./governance/GovernanceService";
import { executeMerger, findMergerTarget } from "./mergers";
import { issueBailoutLoanIfNeeded, processMonthlyLoanRepayments } from "./loans";
import { checkNaturalizations } from "./naturalization";

import * as npcAI from "./npcAI";
import * as scoutingStore from "./scoutingStore";
import * as historyIndex from "./historyIndex";
 
import { } from "./systems/generation/CandidateGenerator";
import { determineSpecialPrizes, updateBanzuke } from "./banzuke"; 
import { applyBoutResult } from "./bout/boutResultApplier";
import { checkRetirement } from "./lifecycle";
import { generateOyakata } from "./oyakataPersonalities";
import { getHeyaRoster, getRikishi, getActiveRikishi, getStableRikishi } from "./queries";
import { runPrestigeDecay, updateStatureBand } from "./prestige/prestigeSystem";
import { runGovernanceReview, runRetirements, runAIMetaDrift } from "./governance/governanceReview";
import { onRikishiRetired } from "./records";
import { runHistoryUpdates } from "./history";
import { recordOyakataHandover } from "./lineage";
import { safeCall } from "./utils/safe";

// New Lifecycle Services
import * as bashoManager from "./lifecycle/BashoManager";
import * as competition from "./lifecycle/CompetitionService";
import * as registry from "./lifecycle/RegistryService";
import { ensureDaySchedule } from "./schedule";


export { 
  getActiveRikishi, 
  getStableRikishi, 
  applyBoutResult,
  handleMediaEvent
};


// Type guard or helper to access current basho
/**
 * Get current basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

export const issueGovernanceRuling = governance.issueGovernanceRuling;

/**
 * Start basho.
 */
export function startBasho(world: WorldState, bashoName?: BashoName): WorldState {
  const updated = bashoManager.startBasho(world, bashoName);
  
  // Reset basho-scoped media tracking (streaks, promo watch)
  if (updated.mediaState) {
    updated.mediaState = resetBashoMediaTracking(updated.mediaState);
  }
  return updated;
}




/**
 * Advance basho day.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function advanceBashoDay(world: WorldState): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const nextDay = basho.day + 1;
  basho.day = nextDay;
  // Legacy sync
  basho.currentDay = nextDay;

  if (nextDay <= 15) ensureDaySchedule(world, nextDay);

  EventBus.bashoStatus(world, { 
    status: "day_advanced", 
    day: nextDay 
  });
  return world;
}

/**
 * Simulate bout for today.
 *  * @param world - The World.
 *  * @param unplayedIndex - The Unplayed index.
 *  * @returns The result.
 */
export function simulateBoutForToday(
  world: WorldState,
  unplayedIndex: number,
  playerTactic?: import("./types/combat").BoutTactic
): { world: WorldState; result?: BoutResult } {
  const basho = getCurrentBasho(world);
  if (!basho) return { world };

  const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
  const match = todays[unplayedIndex];
  if (!match) return { world };

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return { world };

  const eastHeyaId = east.heyaId;
  const westHeyaId = west.heyaId;
  const playerHeyaId = world.playerHeyaId;

  const playerSide = playerHeyaId
    ? (eastHeyaId === playerHeyaId ? ("east" as Side) : westHeyaId === playerHeyaId ? ("west" as Side) : undefined)
    : undefined;


  const boutContext = {
      id: `d${basho.day}-b${unplayedIndex}`,
      day: basho.day,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
      division: east.division,
      playerSide
  };

  const result = resolveBout(boutContext, east, west, basho, playerTactic, world);

  applyBoutResult(world, match, result);
  return { world, result };
}

// applyBoutResult - removed and moved to src/engine/bout/boutResultApplier.ts

/**
 * End basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function endBasho(world: WorldState): WorldState {
  return competition.concludeBashoCompetition(world);
}


// runRetirements moved to governanceReview.ts

// ─── 5. RECRUITMENT WINDOWS (Constitution A3.4) ────────────────

/**
 * Recruitment window — per Constitution, recruitment occurs at:
 *   1) Post-basho review (here)
 *   2) Mid-interim (week 3) — handled in dailyTick weekly gate
 *
 * NPC stables auto-fill from talent pool.
 * Player gets a recruitment window event with duration tracking.
 */


/**
 * Publish banzuke update.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function publishBanzukeUpdate(world: WorldState): WorldState {
  if (world.cyclePhase !== "post_basho") return world;

  const lastBasho = getCurrentBasho(world);
  if (!lastBasho) return world;

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const r of world.rikishi.values()) {
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({ rank: r.rank, rankNumber: r.rankNumber, side: r.side })
    });
  }

  const performanceList: BashoPerformance[] = [];
  for (const [id, stats] of lastBasho.standings.entries()) {
    const history = world.history[world.history.length - 1];
    const isYusho = history.yusho === id;
    const isJunYusho = history.junYusho.includes(id);
    const rikishi = world.rikishi.get(id);

    let prizePoints = 0;
    if (history.ginoSho === id) prizePoints += 1;
    if (history.shukunsho === id) prizePoints += 1;
    if (history.kantosho === id) prizePoints += 1;

    // Yokozuna promotion logic based on real sumo criteria
    // Standard: 2 consecutive yusho OR 1 yusho + 1 jun-yusho (13+ wins both)
    let promoteToYokozuna = false;
    if (rikishi?.rank === "ozeki") {
      const currentWins = stats.wins;
      const history = rikishi.history || [];
      const lastBashoPerf = history[history.length - 1];
      
      const wonPrevious = lastBashoPerf?.yusho === true;
      const wasJunYushoPrevious = lastBashoPerf?.junYusho === true;
      const lastWins = lastBashoPerf?.wins || 0;

      // Promotion Case 1: 2 Consecutive Yusho
      if (isYusho && wonPrevious) {
        promoteToYokozuna = true;
      }
      // Promotion Case 2: 1 Yusho + 1 Jun-Yusho (13+ wins both)
      else if ((isYusho && wasJunYushoPrevious && lastWins >= 13) || (isJunYusho && wonPrevious && currentWins >= 13)) {
        promoteToYokozuna = true;
      }
      // Promotion Case 3: 3 consecutive 13+ wins + at least one yusho
      else if (rikishi.consecutiveStrongOzeki! >= 3 && (isYusho || wonPrevious)) {
        promoteToYokozuna = true;
      }

      // Track consecutive strong performances (12+) for borderline cases
      if (currentWins >= 12) {
        rikishi.consecutiveStrongOzeki = (rikishi.consecutiveStrongOzeki || 0) + 1;
      } else {
        rikishi.consecutiveStrongOzeki = 0;
      }

      // Narrative: Yokozuna Watch
      if (isYusho && !promoteToYokozuna) {
        EventBus.mediaEvent(world, {
          rikishiId: id,
          heyaId: rikishi.heyaId,
          type: "narrative",
          path: "media.yokozuna_watch",
          severity: "national",
          description: `${rikishi.shikona} wins the basho! Yokozuna promotion watch begins.`
        });
      }
    }

    // Yokozuna make-koshi and kyujo tracking for retirement pressure
    // Real sumo: Yokozuna with consecutive losing records face retirement pressure
    if (rikishi?.rank === "yokozuna") {
      const isMakeKoshi = stats.wins < 8; // Official make-koshi
      const isKyujo = stats.absences >= 15; // Full tournament miss
      const subPar = stats.wins < 10; // Fails to meet "Yokozuna standard"

      if (isMakeKoshi || isKyujo) {
        rikishi.consecutiveMakeKoshi = (rikishi.consecutiveMakeKoshi || 0) + 1;
      } else {
        rikishi.consecutiveMakeKoshi = 0;
      }

      if (isKyujo) {
        (rikishi as any).consecutiveKyujo = ((rikishi as any).consecutiveKyujo || 0) + 1;
      } else {
        (rikishi as any).consecutiveKyujo = 0;
      }

      // Council Recommendation / Warning Logic
      if (subPar || isKyujo) {
        rikishi.pressureScore = (rikishi.pressureScore || 0) + 1;
        
        // Every 2 "sub-par" performances = 1 Council Warning
        if (rikishi.pressureScore % 2 === 0) {
          (rikishi as any).councilWarnings = ((rikishi as any).councilWarnings || 0) + 1;
          
          // Apply Stat Debuff: 10% reduction in Mental and Technique (Dignity loss)
          rikishi.stats.mental *= 0.9;
          rikishi.stats.technique *= 0.9;
          // Sync flattened fields
          rikishi.aggression = rikishi.stats.mental;
          rikishi.technique = rikishi.stats.technique;

          EventBus.mediaEvent(world, {
            rikishiId: id,
            heyaId: rikishi.heyaId,
            type: "narrative",
            path: "media.yokozuna_warning",
            severity: "national",
            description: `The Council issues a formal warning to Yokozuna ${rikishi.shikona} following disappointing results.`
          });
        }
      }
    }

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: 0,
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints,
      promoteToYokozuna
    });
  }

  const perfMap = new Map(performanceList.map(p => [p.rikishiId, p]));
  const result = updateBanzuke(currentBanzukeList, perfMap, world.ozekiKadoban ?? {}, world.heyas);
  
  // Persist updated kadoban state
  world.ozekiKadoban = result.updatedOzekiKadoban;

  for (const newEntry of result.newBanzuke) {
    const rikishi = world.rikishi.get(newEntry.rikishiId);
    if (rikishi) {
      rikishi.division = newEntry.division;
      rikishi.rank = newEntry.position.rank;
      rikishi.rankNumber = newEntry.position.rankNumber;
      rikishi.side = newEntry.position.side;
      
      rikishi.currentBashoWins = 0;
      rikishi.currentBashoLosses = 0;
    }
  }

  const next = getNextBasho(lastBasho.bashoName);
  const nextYear = next === "hatsu" ? world.year + 1 : world.year;

  world.year = nextYear;
  world.currentBashoName = next;
  world.currentBasho = undefined;
  enterInterim(world);

  return world;
}

/**
 * Advance interim.
 *  * @param world - The World.
 *  * @param weeks - The Weeks.
 *  * @returns The result.
 */
export function advanceInterim(world: WorldState, weeks: number = 1): WorldState {
  if (world.cyclePhase !== "interim" && world.cyclePhase !== "pre_basho" && world.cyclePhase !== "post_basho") return world;

  // Convert weeks to days and run through the daily tick pipeline
  const days = Math.max(1, Math.trunc(weeks)) * 7;

  for (let i = 0; i < days; i++) {
    advanceOneDay(world);
    // Stop if we've transitioned into active_basho (UI should handle this)
    if ((world.cyclePhase as string) === "active_basho") break;
  }

  return world;
}

/**
 * Advance a single day in the interim period.
 * Used by UI for granular day-by-day control.
 */
export function advanceDay(world: WorldState): DailyTickReport | null {
  if (world.cyclePhase === "active_basho") return null;
  return advanceOneDay(world);
}

// redundant safeCall removed
// --- CANONICAL SELECTORS ---

export function getPlayerOyakata(world: WorldState) {
    if (!world.playerHeyaId) return undefined;
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return undefined;
    return world.oyakata.get(heya.oyakataId);
}

export function getPlayerStable(world: WorldState) {
    if (!world.playerHeyaId) return undefined;
    return world.heyas.get(world.playerHeyaId);
}

// getStableRikishi moved to queries.ts

export function getRikishiBashoStats(world: WorldState, rikishiId: Id) {
    const basho = world.currentBasho;
    const standings = basho?.standings;
    if (!standings) {
        return { wins: 0, losses: 0, absences: 0 };
    }
    
    const statsArr = standings instanceof Map 
        ? standings.get(rikishiId) 
        : (standings as any)[rikishiId];

    if (!statsArr) {
        return { wins: 0, losses: 0, absences: 0 };
    }
    return {
        wins: statsArr.wins || 0,
        losses: statsArr.losses || 0,
        absences: statsArr.absences || 0
    };
}

