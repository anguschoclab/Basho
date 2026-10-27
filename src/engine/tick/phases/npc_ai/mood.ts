/**
 * mood.ts
 * =======
 * NPC AI mood processing helpers.
 * Extracted from phase01_week_npc_ai.ts for modularity.
 */

import type { Id } from "@/engine/types/common";
import type { Oyakata } from "@/engine/types/oyakata";
import type { NPCWeeklyDecision } from "@/engine/npc/npcTypes";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";

export function processOyakataMood(
  oyakata: Oyakata,
  decision: NPCWeeklyDecision,
  heyaId: Id,
  builder: ImpactBuilder
): Oyakata["mood"] {
  const oldMood = oyakata.mood ?? "content";
  const newMood = decision.mood ?? oldMood;

  if (oldMood !== newMood) {
    builder.logEvent(
      "OYAKATA_MOOD_SHIFT",
      "narrative",
      {
        oldMood,
        newMood,
      },
      { heyaId }
    );
  }

  return newMood;
}
