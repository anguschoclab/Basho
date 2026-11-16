/**
 * resolution/missedCall.ts
 * ========================
 * Proactive shimpan review — the panel catches calls the gyoji got wrong
 * even when physics flagged no controversy. Real commentary is full of
 * these: "the gyoji missed the hand coming down — the chief judge
 * reversed it."
 *
 * Triggers:
 * - Hiwaza finishes (isamiashi / koshikudake / tsukite / tsukihiza /
 *   fumidashi) — the losing side touched first; calls on hands and knees
 *   are the most commonly reversed.
 * - Close edge finishes — an edge_crisis that ended without a flagged
 *   controversy still draws occasional scrutiny.
 */

import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { KimariteId } from "@/engine/types/combat";
import { rngFromSeed } from "@/engine/core/rng";
import {
  FOUL_REVIEW_MIN_SHIMPAN,
  MISSED_CALL_HIWAZA_REVIEW_CHANCE,
  MISSED_CALL_EDGE_REVIEW_CHANCE,
} from "@/constants/engine/bout";

/** Finishes where a body part touched down — most-reversed call family. */
const HIWAZA_FINISH_KIMARITE: ReadonlySet<KimariteId> = new Set([
  "isamiashi",
  "koshikudake",
  "tsukite",
  "tsukihiza",
  "fumidashi",
]);

/**
 * A non-controversial edge crisis that ended the bout is a "close edge
 * finish" — someone was nearly out at the tawara and the call could
 * plausibly have gone the other way.
 */
function hasCloseEdgeFinish(result: BoutResult): boolean {
  return result.log.some(
    (entry) =>
      entry.phase === "edge_crisis" &&
      entry.data?.controversial !== true &&
      entry.data?.escaped === false
  );
}

/**
 * Roll a proactive panel review. Sets `monoii` + `monoiiKind` on the
 * result so the downstream verdict resolution picks it up through the
 * normal path. Skips bouts already flagged or under foul review, and
 * requires a panelable shimpan pool.
 */
export function rollMissedCallReview(
  result: BoutResult,
  world: WorldState | undefined,
  seedStem: string
): void {
  if (!world?.shimpanPool || world.shimpanPool.length < FOUL_REVIEW_MIN_SHIMPAN) return;
  if (result.monoii || result.foulReview || !result.winnerRikishiId) return;

  const chance = HIWAZA_FINISH_KIMARITE.has(result.kimarite)
    ? MISSED_CALL_HIWAZA_REVIEW_CHANCE
    : hasCloseEdgeFinish(result)
      ? MISSED_CALL_EDGE_REVIEW_CHANCE
      : 0;
  if (chance <= 0) return;

  const rng = rngFromSeed(`${seedStem}-missed-call`, "monoii", "review");
  if (rng.next() < chance) {
    result.monoii = true;
    result.monoiiKind = "missed_call";
  }
}
