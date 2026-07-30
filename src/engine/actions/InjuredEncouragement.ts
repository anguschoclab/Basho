/**
 * Injured Rikishi Encouragement System (B6)
 *
 * Injured/sidelined rikishi can provide "encouragement" to active stablemates.
 * This gives a small motivation boost to the recipient and is recorded as a
 * relationship event in the world's encouragement log.
 */

import type { Rikishi } from "../types/rikishi";
import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";

/** Motivation boost applied to the recipient */
export const ENCOURAGEMENT_MOTIVATION_BOOST = 3;

/**
 * Check whether an injured rikishi can encourage an active stablemate.
 * Both must be in the same heya. The sender must be injured (not retired),
 * and the recipient must be active (not injured, not retired).
 */
export function canEncourage(from: Rikishi, to: Rikishi): boolean {
  if (!from.injured) return false;
  if (from.isRetired) return false;
  if (from.heyaId !== to.heyaId) return false;
  if (to.injured) return false;
  if (to.isRetired) return false;
  return true;
}

/**
 * Provide encouragement from an injured rikishi to an active stablemate.
 *
 * @returns A StateImpact with the motivation update, encouragement log entry,
 *          and a narrative event.
 */
export function provideEncouragement(
  world: WorldState,
  from: Rikishi,
  to: Rikishi,
  basho: string
): StateImpact {
  const builder = createImpactBuilder("provideEncouragement");

  // Apply motivation boost to recipient
  const newMotivation = Math.min(
    100,
    (to.motivation ?? 50) + ENCOURAGEMENT_MOTIVATION_BOOST
  );
  builder.updateRikishi(to.id, { motivation: newMotivation });

  // Append to encouragement log
  const existingLog = world.encouragementLog ?? [];
  builder.updateWorldField("encouragementLog", [
    ...existingLog,
    { from: from.id, to: to.id, basho },
  ]);

  // Log narrative event
  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      rikishiId: to.id,
      heyaId: to.heyaId,
      shikona: to.shikona || to.name,
      fromShikona: from.shikona || from.name,
      eventId: "injured_encouragement",
      title: "Injured Rikishi Encourages Stablemate",
      description: `${from.shikona}, though injured, encourages ${to.shikona} from the sidelines.`,
    },
    { importance: "minor", rikishiId: to.id }
  );

  return builder.build();
}
