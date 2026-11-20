/**
 * resolution/monoiiVerdict.ts
 * ===========================
 * Applies a resolved mono-ii verdict to the bout result — the honesty
 * half of officiating. Before this module existed, "reversed" and
 * "rematch" outcomes were recorded as labels while the original result
 * stood: standings, kinboshi, h2h, and kensho all attributed the wrong
 * winner, and a "rematch" never actually re-fought the bout.
 *
 * - sashichigae (reversed): flips winner/loser sides and ids, preserves
 *   the apparent call for the narrative, recomputes `upset`.
 * - torinaoshi (rematch): re-runs physics under a salted basho id and
 *   only the rematch counts. The rematch can itself draw a mono-ii, but
 *   its verdict may never order another rematch.
 */

import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Side } from "@/engine/types/banzuke";
import type { BoutTactic, DrawOutcomeType } from "@/engine/types/combat";
import type { Gyoji, ShimpanPanel, MonoiiOutcome } from "@/engine/types/gyoji";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { rngFromSeed } from "@/engine/core/rng";
import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";
import { applyOfficiating } from "@/engine/bout/resolution/officiating";
import { rollMissedCallReview } from "@/engine/bout/resolution/missedCall";
import { resolveMonoii } from "@/engine/types/gyoji";
import {
  AZUKARI_REMATCH_CHANCE,
  DRAW_OUTCOME_METADATA,
  ITAMIWAKE_MINOR_INJURY_CHANCE,
  MISSED_CALL_REVERSAL_BONUS,
} from "@/constants/engine/bout";

export interface MonoiiVerdictParams {
  /** Original bout context (id, day, rikishi ids). */
  bout: BoutContext;
  /** The tactic-resolved context physics ran under. */
  ctxFinal: BoutContext;
  /** The resolved physics result carrying the verdict. */
  result: BoutResult;
  east: Rikishi;
  west: Rikishi;
  /** Rivalry-adjusted bout clones physics ran on. */
  eastBout: Rikishi;
  westBout: Rikishi;
  basho: BashoState;
  eastTactic?: BoutTactic;
  westTactic?: BoutTactic;
  world?: WorldState;
  builder: ImpactBuilder;
  /** Era-drift meta, forwarded to the physics rerun. */
  meta?: { tone: string; drift: Record<string, number> };
  /** Assigned gyoji + panel, needed to re-resolve a verdict on a rematch. */
  gyoji?: Gyoji;
  panel?: ShimpanPanel | null;
}

/** Deterministic mono-ii roll — seeded from the verdict key. */
function monoiiRoll(key: string): { next: () => number } {
  const rng = rngFromSeed(key, "monoii", "roll");
  return {
    next: () => rng.next(),
  };
}

/**
 * Flip a bout result to the other side (gunbai-chigai / sashichigae).
 * Records the apparent call so post-bout narrative can still say "the
 * gunbai went to X, but the judges reversed it."
 */
export function flipResultWinner(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi
): BoutResult {
  const winnerSide: Side = result.winner === "east" ? "west" : "east";
  const winner = winnerSide === "east" ? east : west;
  const loser = winnerSide === "east" ? west : east;
  const winnerRankNum = winner.rankNumber ?? 99;
  const loserRankNum = loser.rankNumber ?? 99;
  return {
    ...result,
    winner: winnerSide,
    winnerRikishiId: winner.id,
    loserRikishiId: loser.id,
    apparentWinner: result.apparentWinner ?? result.winner,
    apparentLoser: result.apparentLoser ?? (result.winner === "east" ? "west" : "east"),
    upset: winnerRankNum > loserRankNum,
  };
}

/**
 * Apply a resolved mono-ii verdict to the result.
 *
 * Foul reviews are exempt: `applyOfficiating` already flipped a confirmed
 * hansoku when the foul was detected — re-flipping would double-reverse.
 * Rematches re-run the full physics + officiating stack under a salted
 * basho id (basho.id is what reaches the physics RNG, not bout.id).
 */
export function applyMonoiiVerdict(params: MonoiiVerdictParams): { result: BoutResult } {
  const { result } = params;
  if (result.monoiiOutcome === "reversed" && !result.foulReview) {
    return { result: flipResultWinner(result, params.east, params.west) };
  }
  if (result.monoiiOutcome === "rematch") {
    return { result: runTorinaoshi(params) };
  }
  return { result };
}

/** Build an official non-decision draw verdict (itamiwake or azukari). */
function buildDrawVerdictResult(
  base: BoutResult,
  drawType: DrawOutcomeType,
  outcome: MonoiiOutcome,
  extra?: Partial<BoutResult>
): BoutResult {
  const meta = DRAW_OUTCOME_METADATA[drawType];
  return {
    ...base,
    ...extra,
    winner: "east",
    winnerRikishiId: "",
    loserRikishiId: "",
    kimarite: drawType,
    kimariteName: meta.name,
    isDraw: true,
    drawType,
    upset: false,
    isKinboshi: false,
    awardFact: null,
    awards: undefined,
    kenshoEnvelopes: 0,
    monoii: true,
    monoiiOutcome: outcome,
  };
}

/**
 * Re-run the bout after a torinaoshi ordering. Physics seeds derive from
 * `basho.id + year + day + rikishiIds`, so salting the basho id produces a
 * genuinely different bout rather than an identical replay.
 *
 * Before re-fighting, checks for itamiwake (in-bout injury prevents clean
 * continuation on non-playoff bouts). If the rematch itself draws a panel,
 * azukari may hold the bout in abeyance without award.
 */
function runTorinaoshi(params: MonoiiVerdictParams): BoutResult {
  const {
    bout, ctxFinal, result, east, west, eastBout, westBout, basho,
    eastTactic, westTactic, world, builder, meta, gyoji, panel,
  } = params;

  if (!bout.isPlayoff && result.inBoutInjury != null) {
    const sev = result.inBoutInjury.severity;
    const isItamiwake =
      sev === "moderate" ||
      sev === "serious" ||
      (sev === "minor" &&
        monoiiRoll(`${result.boutId}-itamiwake`).next() < ITAMIWAKE_MINOR_INJURY_CHANCE);
    if (isItamiwake) {
      return buildDrawVerdictResult(result, "itamiwake", "itamiwake", {
        isTorinaoshi: false,
      });
    }
  }

  const rematchBasho: BashoState = { ...basho, id: `${basho.id}-torinaoshi` };
  const { result: rematchPhysics } = resolveBoutPhysics(
    ctxFinal,
    eastBout,
    westBout,
    rematchBasho,
    meta
  );
  let rematch = applyOfficiating(
    bout,
    rematchPhysics,
    eastBout,
    westBout,
    rematchBasho,
    eastTactic,
    westTactic,
    world,
    builder
  ).result;

  // The rematch itself can draw a panel — a missed-call review on the
  // second attempt or a flagged controversial finish.
  rollMissedCallReview(rematch, world, `${rematchBasho.id}-${bout.id}`);
  if (rematch.monoii && !rematch.foulReview && !rematch.isDraw) {
    rematch.monoiiKind ??= "contested";
  }

  let rematchOutcome: MonoiiOutcome | undefined;
  if (rematch.monoii && !rematch.isDraw && panel && gyoji) {
    if (rematch.foulReview) {
      rematchOutcome = rematch.foulReview.confirmed ? "reversed" : "upheld";
    } else if (
      !bout.isPlayoff &&
      monoiiRoll(`${result.boutId}-azukari`).next() < AZUKARI_REMATCH_CHANCE
    ) {
      return buildDrawVerdictResult(rematch, "azukari", "azukari", {
        boutId: result.boutId,
        isTorinaoshi: true,
        gyojiId: result.gyojiId,
        shimpanPanelIds: result.shimpanPanelIds,
        torinaoshiContext: {
          firstWinner: result.winner,
          firstKimarite: result.kimarite,
          firstLog: result.log,
          rematchOutcome: "azukari",
        },
      });
    } else {
      rematchOutcome = resolveMonoii(
        gyoji,
        panel,
        monoiiRoll(`${result.boutId}-torinaoshi-${panel.chief.id}`),
        {
          reversalBonus: rematch.monoiiKind === "missed_call" ? MISSED_CALL_REVERSAL_BONUS : 0,
          suppressRematch: true,
        }
      );
    }
    rematch.monoiiOutcome = rematchOutcome;
    if (rematchOutcome === "reversed" && !rematch.foulReview) {
      rematch = flipResultWinner(rematch, east, west);
    }
  }

  return {
    ...rematch,
    boutId: result.boutId,
    isTorinaoshi: true,
    // "rematch" is the verdict that shaped this bout — it stays the
    // recorded outcome so narrative announces the do-over honestly.
    monoiiOutcome: "rematch",
    gyojiId: result.gyojiId,
    shimpanPanelIds: result.shimpanPanelIds,
    torinaoshiContext: {
      firstWinner: result.winner,
      firstKimarite: result.kimarite,
      firstLog: result.log,
      rematchOutcome,
    },
  };
}
