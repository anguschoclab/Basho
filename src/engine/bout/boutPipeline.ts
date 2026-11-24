/**
 * src/engine/bout/boutPipeline.ts
 * ================================
 * Shared bout-resolution pipeline.
 *
 * Single entry point every bout-resolution path routes through — the
 * interactive single-bout path (simulateBoutForToday), the batch path
 * (simulateBoutsForDay), and the autosim path (TournamentSimulator).
 * Harmonization (W0): there is exactly one absence semantics, one result
 * applier, one standings writer.
 *
 * Absent === isRetired || isKyujo. `injured` never means absent — an
 * injured rikishi who has not withdrawn competes (see morningOfDay).
 */

import type { WorldState } from "@/engine/types/world";
import type { BashoState, BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { Side } from "@/engine/types/index";
import type { BoutTactic } from "@/engine/types/combat";
import { resolveBout } from "@/engine/bout/boutResolver";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

/** Schedule fields the pipeline needs — callers may pass richer shapes. */
export type MatchScheduleLike = Pick<
  MatchSchedule,
  "boutId" | "day" | "eastRikishiId" | "westRikishiId"
>;

/**
 * Shared per-bout core: resolve the bout, apply its result impact, and return
 * the evolved world plus the standings delta the caller must persist.
 * Does NOT write `match.result` into `basho.matches` or consume tactics —
 * callers own those so the batch path can avoid per-bout array copies.
 *
 * @param {WorldState} currentWorld - The current world state.
 * @param {BashoState} basho - The current basho state.
 * @param {MatchScheduleLike} match - The bout schedule information.
 * @param {BoutTactic} [tactic] - Optional tactic chosen by the player.
 * @param {string} fallbackBoutId - Fallback ID if the match lacks a boutId.
 * @returns {Object} An object containing the updated world state, the bout result, and updated standings.
 */
export function resolveAndApplyBout(
  currentWorld: WorldState,
  basho: BashoState,
  match: MatchScheduleLike,
  tactic: BoutTactic | undefined,
  fallbackBoutId: string
): {
  world: WorldState;
  result?: BoutResult;
  updatedStandings?: Map<string, { wins: number; losses: number; absences?: number }>;
} {
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
    id: match.boutId ?? fallbackBoutId,
    day: basho.day,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
    division: east.division,
    playerSide,
    // The schedule record is already in hand — threading it through lets
    // enrichment skip the O(matches) find per bout (callers pass richer shapes).
    scheduleMatch: match as Partial<MatchSchedule>,
  };

  const { result, impact: resolveImpact } = resolveBout(
    boutContext,
    east,
    west,
    basho,
    tactic,
    currentWorld
  );

  const boutImpact = applyBoutResult(currentWorld, match as MatchSchedule, result);
  const nextWorld = resolveImpacts(currentWorld, [resolveImpact, boutImpact]);

  return {
    world: nextWorld,
    result,
    updatedStandings: boutImpact.metadata?.updatedStandings as
      Map<string, { wins: number; losses: number; absences?: number }> | undefined,
  };
}
