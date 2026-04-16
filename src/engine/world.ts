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

import type { WorldState } from "./types/world";
import type { BashoName, BoutResult, BashoState } from "./types/basho";
import type { Id } from "./types/common";
import { toRankPosition, type Side } from "./types/index";
import type { BashoPerformance, BanzukeEntry } from "./banzuke";
import { getNextBasho } from "./calendar";
import { resolveBout } from "./bout/boutResolver";
import { advanceOneDay, enterInterim } from "./tick/tickDaily";
import * as governance from "./governance/GovernanceService";
import { resetBashoMediaTracking, handleMediaEvent } from "./systems/media/MediaService";
import { updateBanzuke, generateKeshoForPromotions } from "./banzuke";
import { applyBoutResult } from "./bout/boutResultApplier";
import { createImpactBuilder } from "./core/ImpactBuilder";
import { resolveImpacts } from "./core/ImpactResolver";
import type { StateImpact } from "./core/StateImpact";
import { getActiveRikishi, getStableRikishi } from "./queries";
import { checkShikonaChange, recordShikonaChange } from "./history";

// New Lifecycle Services
import * as bashoManager from "./lifecycle/BashoManager";
import * as competition from "./lifecycle/CompetitionService";
import { ensureDaySchedule } from "./schedule";

export { getActiveRikishi, getStableRikishi, applyBoutResult, handleMediaEvent };

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

  if (nextDay <= 15) {
    const scheduleImpact = ensureDaySchedule(world, nextDay);
    const resolvedWorld = resolveImpacts(world, [scheduleImpact]);
    Object.assign(world, resolvedWorld);
  }

  const eventImpact = createImpactBuilder("advanceDay")
    .logEvent(
      "BASHO_STATUS",
      "basho",
      {
        status: "day_advanced",
        day: nextDay,
      },
      { importance: nextDay === 15 ? "headline" : "notable" }
    )
    .build();
  const eventResolved = resolveImpacts(world, [eventImpact]);
  Object.assign(world, eventResolved);

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
    ? eastHeyaId === playerHeyaId
      ? ("east" as Side)
      : westHeyaId === playerHeyaId
        ? ("west" as Side)
        : undefined
    : undefined;

  const boutContext = {
    id: `d${basho.day}-b${unplayedIndex}`,
    day: basho.day,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
    division: east.division,
    playerSide,
  };

  const { result, impact: resolveImpact } = resolveBout(
    boutContext,
    east,
    west,
    basho,
    playerTactic,
    world
  );

  const boutImpact = applyBoutResult(world, match, result);
  const resolvedWorld = resolveImpacts(world, [resolveImpact, boutImpact]);
  Object.assign(world, resolvedWorld);

  // Handle standings update from metadata
  if (boutImpact.metadata?.updatedStandings && world.currentBasho) {
    world.currentBasho.standings = boutImpact.metadata.updatedStandings;
  }

  return { world, result };
}

// applyBoutResult - removed and moved to src/engine/bout/boutResultApplier.ts

/**
 * End basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function endBasho(world: WorldState): WorldState {
  const impact = competition.concludeBashoCompetition(world);
  const resolvedWorld = resolveImpacts(world, [impact]);
  Object.assign(world, resolvedWorld);
  return world;
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
 * Returns StateImpact describing banzuke update instead of mutating state directly.
 * @param world - The World.
 * @returns The result.
 */
export function publishBanzukeUpdate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("publishBanzukeUpdate");

  if (world.cyclePhase !== "post_basho") return builder.build();

  const lastBasho = getCurrentBasho(world);
  if (!lastBasho) return builder.build();

  // Standings can be Map or Object depending on the simulation path; normalize here
  const standings = lastBasho.standings;
  if (!standings) {
    console.warn("publishBanzukeUpdate: No standings found in lastBasho!");
    return builder.build();
  }

  const standingEntries =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime type check for Map vs Object
    standings instanceof Map ? Array.from(standings.entries()) : Object.entries(standings as any);

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const r of world.rikishi.values()) {
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({ rank: r.rank, rankNumber: r.rankNumber, side: r.side }),
    });
  }

  const performanceList: BashoPerformance[] = [];
  for (const [id, stats_any] of standingEntries) {
    const stats = stats_any as { wins: number; losses: number; absences: number };
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
    let consecutiveStrongOzeki = rikishi?.consecutiveStrongOzeki || 0;

    if (rikishi?.rank === "ozeki") {
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
      // Promotion Case 3: 3 consecutive 13+ wins + at least one yusho
      else if ((rikishi.consecutiveStrongOzeki || 0) >= 3 && (isYusho || wonPrevious)) {
        promoteToYokozuna = true;
      }

      // Track consecutive strong performances (12+) for borderline cases
      if (currentWins >= 12) {
        consecutiveStrongOzeki = (rikishi.consecutiveStrongOzeki || 0) + 1;
      } else {
        consecutiveStrongOzeki = 0;
      }

      // Narrative: Yokozuna Watch
      if (isYusho && !promoteToYokozuna) {
        builder.logEvent(
          "LIFECYCLE_EVENT",
          "injury",
          {
            status: "yokozuna_watch",
            description: `${rikishi.shikona} wins the basho! Yokozuna promotion watch begins.`,
          },
          { rikishiId: id, heyaId: rikishi.heyaId }
        );
      }
    }

    // Yokozuna make-koshi and kyujo tracking for retirement pressure
    // Real sumo: Yokozuna with consecutive losing records face retirement pressure
    let consecutiveMakeKoshi = rikishi?.consecutiveMakeKoshi || 0;
    let consecutiveKyujo = rikishi?.consecutiveKyujo || 0;
    let pressureScore = rikishi?.pressureScore || 0;
    let councilWarnings = rikishi?.councilWarnings || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic object construction for conditional stat updates
    let statsUpdate: any = {};

    if (rikishi?.rank === "yokozuna") {
      const isMakeKoshi = stats.wins < 8; // Official make-koshi
      const isKyujo = stats.absences >= 15; // Full tournament miss
      const subPar = stats.wins < 10; // Fails to meet "Yokozuna standard"

      if (isMakeKoshi || isKyujo) {
        consecutiveMakeKoshi = (rikishi.consecutiveMakeKoshi || 0) + 1;
      } else {
        consecutiveMakeKoshi = 0;
      }

      if (isKyujo) {
        consecutiveKyujo = (rikishi.consecutiveKyujo || 0) + 1;
      } else {
        consecutiveKyujo = 0;
      }

      // Council Recommendation / Warning Logic
      if (subPar || isKyujo) {
        pressureScore = (rikishi.pressureScore || 0) + 1;

        // Every 2 "sub-par" performances = 1 Council Warning
        if (pressureScore % 2 === 0) {
          councilWarnings = (rikishi.councilWarnings || 0) + 1;

          // Apply Stat Debuff: 10% reduction in Mental and Technique (Dignity loss)
          const currentMental = rikishi.stats.mental || 50;
          const currentTechnique = rikishi.stats.technique || 50;
          statsUpdate = {
            mental: currentMental * 0.9,
            technique: currentTechnique * 0.9,
          };

          builder.logEvent(
            "GOVERNANCE_RULING",
            "economy",
            {
              incident: "yokozuna_deliberation",
              description: `The Council issues a formal warning to Yokozuna ${rikishi.shikona} following disappointing results.`,
            },
            { rikishiId: id, heyaId: rikishi.heyaId }
          );
        }
      }
    }

    // Update rikishi with promotion tracking fields
    if (rikishi) {
      builder.updateRikishi(id, {
        consecutiveStrongOzeki,
        consecutiveMakeKoshi,
        consecutiveKyujo,
        pressureScore,
        councilWarnings,
        stats: statsUpdate,
      });
    }

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: 0,
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints,
      promoteToYokozuna,
    });
  }

  const perfMap = new Map(performanceList.map((p) => [p.rikishiId, p]));
  const result = updateBanzuke(currentBanzukeList, perfMap, world.ozekiKadoban ?? {}, world.heyas);

  // Generate kesho-mawashi for promoted rikishi and apply impacts
  const keshoImpacts = generateKeshoForPromotions(world, result.events);
  const worldWithKesho = resolveImpacts(world, [keshoImpacts]);
  Object.assign(world, worldWithKesho);

  // Update ozekiKadoban world field
  builder.updateWorldField("ozekiKadoban", result.updatedOzekiKadoban);

  for (const newEntry of result.newBanzuke) {
    const rikishi = world.rikishi.get(newEntry.rikishiId);
    if (rikishi) {
      const oldRank = rikishi.rank;
      const oldShikona = rikishi.shikona;

      // Check if shikona should change due to promotion
      const newShikona = checkShikonaChange(world, rikishi, oldRank);

      if (newShikona) {
        recordShikonaChange(world, rikishi.id, oldShikona, newShikona);
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
          shikona: newShikona,
        });
      } else {
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
        });
      }
    }
  }

  const next = getNextBasho(lastBasho.bashoName);
  const nextYear = next === "hatsu" ? world.year + 1 : world.year;

  builder.updateWorldField("year", nextYear);
  builder.updateWorldField("currentBashoName", next);
  builder.updateWorldField("currentBasho", undefined);

  const interimWorld = enterInterim({
    ...world,
    year: nextYear,
    currentBashoName: next,
    currentBasho: undefined,
  });

  builder.updateWorldField("cyclePhase", interimWorld.cyclePhase);
  builder.updateWorldField("_interimDaysRemaining", interimWorld._interimDaysRemaining);

  return builder.build();
}

/**
 * Advance interim.
 *  * @param world - The World.
 *  * @param weeks - The Weeks.
 *  * @returns The result.
 */
export function advanceInterim(world: WorldState, weeks: number = 1): WorldState {
  if (
    world.cyclePhase !== "interim" &&
    world.cyclePhase !== "pre_basho" &&
    world.cyclePhase !== "post_basho"
  )
    return world;

  // Convert weeks to days and run through the daily tick pipeline
  const days = Math.max(1, Math.trunc(weeks)) * 7;
  let currentWorld = world;

  for (let i = 0; i < days; i++) {
    currentWorld = advanceOneDay(currentWorld);
    // Stop if we've transitioned into active_basho (UI should handle this)
    if ((currentWorld.cyclePhase as string) === "active_basho") break;
  }

  return currentWorld;
}

/**
 * Advance a single day in the interim period.
 * Used by UI for granular day-by-day control.
 */
export function advanceDay(world: WorldState): WorldState | null {
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

  const statsArr =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime type check for Map vs Object
    standings instanceof Map ? standings.get(rikishiId) : (standings as any)[rikishiId];

  if (!statsArr) {
    return { wins: 0, losses: 0, absences: 0 };
  }
  return {
    wins: statsArr.wins || 0,
    losses: statsArr.losses || 0,
    absences: statsArr.absences || 0,
  };
}
