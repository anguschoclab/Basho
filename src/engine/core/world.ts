/**
 * File Name: src/engine/core/world.ts
 * Notes:
 * - Orchestrates the game simulation using high-fidelity types.
 * - 'advanceDay' runs bouts for the current day using 'resolveBout' (which handles H2H).
 * - 'endBasho' handles rankings, prizes, and crucially, the LIFECYCLE check (retirements/new recruits).
 * - 'advanceInterim' handles between-basho ticks (AI, scouting, economics).
 * - All lifecycle transitions emit canonical EventBus events.
 * - Almanac snapshots are written at basho end (Constitution A5.1).
 * - FTUE state is updated after first basho completion.
 */

import type { WorldState } from "@/engine/types/world";
import type { BashoName, BoutResult, BashoState } from "@/engine/types/basho";
import type { Id } from "@/engine/types/common";
import { advanceOneDay, advanceDaysFast } from "@/engine/tick/tickDaily";
import { resetBashoMediaTracking, handleMediaEvent } from "@/engine/media/MediaService";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveAndApplyBout } from "@/engine/bout/boutPipeline";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { getActiveRikishi, getHeyaRoster } from "@/engine/core/queries";

// New Lifecycle Services
import * as bashoManager from "@/engine/lifecycle/BashoManager";
import * as competition from "@/engine/lifecycle/CompetitionService";
import { ensureDaySchedule } from "@/engine/calendar/schedule";
import { resolveMorningOfDay } from "@/engine/basho/morningOfDay";
import { runPostBashoResolution } from "@/engine/core/SimulationRunner";

export { getActiveRikishi, getHeyaRoster, applyBoutResult, handleMediaEvent };

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

export { issueGovernanceRuling } from "@/engine/governance/services/ScandalService";

/**
 * Initializes and starts a new basho (tournament).
 *
 * @param {WorldState} world - The current world state.
 * @param {BashoName} [bashoName] - The optional name of the basho to start.
 * @returns {WorldState} The updated world state with the new basho started.
 */
export function startBasho(world: WorldState, bashoName?: BashoName): WorldState {
  const impact = bashoManager.buildStartBashoImpact(world, bashoName);
  const updated = resolveImpacts(world, [impact]);

  // Reset basho-scoped media tracking (streaks, promo watch) — immutably
  if (updated.mediaState) {
    return {
      ...updated,
      mediaState: resetBashoMediaTracking(updated.mediaState),
    };
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

  // Update basho day immutably via impacts.
  // boutTactics are per-day — clear them so stale entries can't leak into the
  // next day's bouts (V5-B09).
  const dayUpdateImpact = createImpactBuilder("advanceBashoDay")
    .updateWorldField("currentBasho", {
      ...basho,
      day: nextDay,
      currentDay: nextDay,
    })
    .updateWorldField("boutTactics", {})
    .build();
  currentWorld = resolveImpacts(currentWorld, [dayUpdateImpact]);

  if (nextDay <= 15) {
    const scheduleImpact = ensureDaySchedule(currentWorld, nextDay);
    currentWorld = resolveImpacts(currentWorld, [scheduleImpact]);

    // Morning-of-day evaluation (W A): NPC kyujo calls + player
    // kyujo_decisions for injured entrants on the freshly scheduled card.
    // Without this the interactive path never evaluates hurt rikishi.
    currentWorld = resolveImpacts(currentWorld, [resolveMorningOfDay(currentWorld)]);
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

/** Consume a bout tactic after it has been applied (V5-B09 semantics). */
function consumeBoutTactic(world: WorldState, boutId: string | undefined): WorldState {
  if (!boutId || world.boutTactics?.[boutId] === undefined) return world;
  const nextTactics = Object.fromEntries(
    Object.entries(world.boutTactics).filter(([k]) => k !== boutId)
  );
  return resolveImpacts(world, [
    createImpactBuilder("consumeBoutTactic").updateWorldField("boutTactics", nextTactics).build(),
  ]);
}

/**
 * Simulates a single unplayed bout for the current basho day.
 *
 * Contract details:
 * - `unplayedIndex` is the 0-based index within the array of today's *unplayed* bouts
 *   (i.e., `basho.matches.filter(m => m.day === basho.day && !m.result)`).
 *   It is NOT the absolute index of the bout in the `basho.matches` array.
 * - On success the match result is persisted into `currentBasho.matches` and the
 *   `world.boutTactics` entry keyed by the resolved match's `boutId` is consumed.
 * - `result` is absent when there is no active basho, the index resolves to no
 *   unplayed match, or the resolution produced no result — callers must handle
 *   the `result?: BoutResult` absence.
 *
 * @param world - The current world state.
 * @param unplayedIndex - 0-based index of the target bout among today's remaining unplayed bouts.
 * @param playerTactic - Optional combat tactic chosen by the player for this bout.
 * @returns An object containing the evolved `world` and, when a bout resolved, its `result`.
 */
export function simulateBoutForToday(
  world: WorldState,
  unplayedIndex: number,
  playerTactic?: import("@/engine/types/combat").BoutTactic
): { world: WorldState; result?: BoutResult } {
  let currentWorld = world;
  const basho = getCurrentBasho(currentWorld);
  if (!basho) return { world: currentWorld };

  const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
  const match = todays[unplayedIndex];
  if (!match) return { world: currentWorld };

  const {
    world: appliedWorld,
    result,
    updatedStandings,
  } = resolveAndApplyBout(
    currentWorld,
    basho,
    match,
    playerTactic,
    `d${basho.day}-b${unplayedIndex}`
  );
  currentWorld = appliedWorld;
  if (!result) return { world: currentWorld };

  // Persist match.result (and standings) into the current basho
  if (currentWorld.currentBasho) {
    const updatedMatches = currentWorld.currentBasho.matches.map((m) =>
      m.boutId === match.boutId ? { ...m, result } : m
    );
    currentWorld = resolveImpacts(currentWorld, [
      createImpactBuilder("simulateBoutForToday")
        .updateWorldField("currentBasho", {
          ...currentWorld.currentBasho,
          ...(updatedStandings ? { standings: updatedStandings } : {}),
          matches: updatedMatches,
        })
        .build(),
    ]);
  }

  currentWorld = consumeBoutTactic(currentWorld, match.boutId);

  return { world: currentWorld, result };
}

/**
 * Simulates ALL unplayed bouts for the basho's current day in one pass.
 *
 * The per-bout `simulateBoutForToday` path scans `basho.matches` (filter) and
 * rebuilds it (map) on every call — O(matches²) per day, ~2.7M element ops for
 * a full card. This batch variant takes one mutable copy of the matches array
 * per day and writes results by index — O(matches) once — while preserving
 * per-bout world evolution (standings feed each subsequent bout).
 */
export function simulateBoutsForDay(world: WorldState): {
  world: WorldState;
  results: BoutResult[];
} {
  let currentWorld = world;
  const initialBasho = getCurrentBasho(currentWorld);
  if (!initialBasho) return { world: currentWorld, results: [] };

  const day = initialBasho.day;
  // Owned mutable copy — safe to share across iterations because worldFields
  // updates shallow-spread (no clone) and nothing else mutates this array.
  const matches = (initialBasho.matches ?? []).slice();
  const results: BoutResult[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match.day !== day || match.result) continue;

    const basho = getCurrentBasho(currentWorld);
    if (!basho || basho.day !== day) break;

    const tactic = (match.boutId ? currentWorld.boutTactics?.[match.boutId] : undefined) as
      import("@/engine/types/combat").BoutTactic | undefined;

    const {
      world: appliedWorld,
      result,
      updatedStandings,
    } = resolveAndApplyBout(currentWorld, basho, match, tactic, `d${day}-b${i}`);
    currentWorld = appliedWorld;
    if (!result) continue;

    matches[i] = { ...match, result };

    if (currentWorld.currentBasho) {
      currentWorld = resolveImpacts(currentWorld, [
        createImpactBuilder("simulateBoutsForDay")
          .updateWorldField("currentBasho", {
            ...currentWorld.currentBasho,
            ...(updatedStandings ? { standings: updatedStandings } : {}),
            matches,
          })
          .build(),
      ]);
    }

    currentWorld = consumeBoutTactic(currentWorld, match.boutId);
    results.push(result);
  }

  return { world: currentWorld, results };
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
  const resolvedWorld = resolveImpacts(world, [competitionImpact]);
  return runPostBashoResolution(resolvedWorld);
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

export { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";

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
