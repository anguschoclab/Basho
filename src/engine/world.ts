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
import type { Side } from "./types/index";
import { resolveBout } from "./bout/boutResolver";
import { advanceOneDay, advanceDaysFast } from "./tick/tickDaily";
import * as governance from "./systems/governance/ScandalService";
import { resetBashoMediaTracking, handleMediaEvent } from "./systems/media/MediaService";
import { applyBoutResult } from "./bout/boutResultApplier";
import { createImpactBuilder } from "./core/ImpactBuilder";
import { resolveImpacts } from "./core/ImpactResolver";
import { getActiveRikishi, getStableRikishi } from "./queries";

// New Lifecycle Services
import * as bashoManager from "./lifecycle/BashoManager";
import * as competition from "./lifecycle/CompetitionService";
import { ensureDaySchedule } from "./schedule";
import { onBashoEnded } from "./records";

export { getActiveRikishi, getStableRikishi, applyBoutResult, handleMediaEvent };

// Type guard or helper to access current basho
/**
 * Retrieves the current basho state from the world.
 *
 * @param {WorldState} world - The current world state.
 * @returns {BashoState | undefined} The current basho state, or undefined if none is active.
 */
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

export const issueGovernanceRuling = governance.issueGovernanceRuling;

/**
 * Initializes and starts a new basho (tournament).
 *
 * @param {WorldState} world - The current world state.
 * @param {BashoName} [bashoName] - The optional name of the basho to start.
 * @returns {WorldState} The updated world state with the new basho started.
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
 * Advances the current basho by one day.
 * Handles day increments, schedule validation, and status event logging.
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The updated world state after advancing the day.
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
 * Simulates a specific bout for the current day.
 * Handles bout resolution, impact calculation, and standings updates.
 *
 * @param {WorldState} world - The current world state.
 * @param {number} unplayedIndex - The index of the bout to simulate among today's unplayed matches.
 * @param {import("./types/combat").BoutTactic} [playerTactic] - Optional tactic chosen by the player.
 * @returns {Object} An object containing the updated world state and the bout result.
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
    id: match.boutId ?? `d${basho.day}-b${unplayedIndex}`,
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
 * Concludes the current basho, finalizing rankings and distributions.
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The updated world state after basho conclusion.
 */
export function endBasho(world: WorldState): WorldState {
  const competitionImpact = competition.concludeBashoCompetition(world);
  const recordsImpact = onBashoEnded(world);
  return resolveImpacts(world, [competitionImpact, recordsImpact]);
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
 * Advances the world state through the interim period (between tournaments).
 * Processes multiple weeks of daily ticks.
 *
 * @param {WorldState} world - The current world state.
 * @param {number} [weeks=1] - The number of weeks to advance.
 * @returns {WorldState} The updated world state.
 */
export function advanceInterim(world: WorldState, weeks: number = 1): WorldState {
  if (
    world.cyclePhase !== "interim" &&
    world.cyclePhase !== "pre_basho" &&
    world.cyclePhase !== "post_basho"
  )
    return world;

  const days = Math.max(1, Math.trunc(weeks)) * 7;
  const currentWorld = advanceDaysFast(world, days);

  return currentWorld;
}

/**
 * Advance a single day.
 * Delegates to the canonical advanceOneDay tick pipeline.
 */
export function advanceDay(world: WorldState): WorldState {
  return advanceOneDay(world);
}

// --- CANONICAL SELECTORS ---

/**
 * Retrieves the basho statistics (wins, losses, absences) for a specific rikishi.
 *
 * @param {WorldState} world - The current world state.
 * @param {Id} rikishiId - The unique ID of the rikishi.
 * @returns {Object} An object containing wins, losses, and absences.
 */
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
    wins: statsArr.wins ?? 0,
    losses: statsArr.losses ?? 0,
    absences: statsArr.absences ?? 0,
  };
}
