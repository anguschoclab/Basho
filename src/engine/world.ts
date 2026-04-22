// @ts-nocheck
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
  let currentWorld = world;
  const basho = getCurrentBasho(currentWorld);
  if (!basho) return currentWorld;

  const nextDay = basho.day + 1;

  // Update basho day immutably via impacts
  const dayUpdateImpact = createImpactBuilder("advanceBashoDay")
    .updateWorldField("currentBasho", {
      ...basho,
      day: nextDay,
      currentDay: nextDay,
    })
    .build();
  currentWorld = resolveImpacts(currentWorld, [dayUpdateImpact]);

  if (nextDay <= 15) {
    const scheduleImpact = ensureDaySchedule(currentWorld, nextDay);
    currentWorld = resolveImpacts(currentWorld, [scheduleImpact]);
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
  currentWorld = resolveImpacts(currentWorld, [eventImpact]);

  return currentWorld;
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
  let currentWorld = world;
  const basho = getCurrentBasho(currentWorld);
  if (!basho) return { world: currentWorld };

  const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
  const match = todays[unplayedIndex];
  if (!match) return { world: currentWorld };

  const east = currentWorld.rikishi.get(match.eastRikishiId);
  const west = currentWorld.rikishi.get(match.westRikishiId);
  if (!east || !west) return { world: currentWorld };

  const eastHeyaId = east.heyaId;
  const westHeyaId = west.heyaId;
  const playerHeyaId = currentWorld.playerHeyaId;

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
    currentWorld
  );

  const boutImpact = applyBoutResult(currentWorld, match, result);
  currentWorld = resolveImpacts(currentWorld, [resolveImpact, boutImpact]);

  // Handle standings update from metadata immutably
  if (boutImpact.metadata?.updatedStandings && currentWorld.currentBasho) {
    const standingsMap = boutImpact.metadata.updatedStandings as Map<
      string,
      { wins: number; losses: number }
    >;
    currentWorld = resolveImpacts(currentWorld, [
      createImpactBuilder("simulateBoutForToday")
        .updateWorldField("currentBasho", {
          ...currentWorld.currentBasho,
          standings: standingsMap,
        })
        .build(),
    ]);
  }

  return { world: currentWorld, result };
}

// applyBoutResult - removed and moved to src/engine/bout/boutResultApplier.ts

/**
 * End basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function endBasho(world: WorldState): WorldState {
  const impact = competition.concludeBashoCompetition(world);
  return resolveImpacts(world, [impact]);
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

export { publishBanzukeUpdate } from "./banzuke/BanzukePublisher";

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

  const statsArr = standings.get(rikishiId);

  if (!statsArr) {
    return { wins: 0, losses: 0, absences: 0 };
  }
  return {
    wins: statsArr.wins || 0,
    losses: statsArr.losses || 0,
    absences: statsArr.absences || 0,
  };
}