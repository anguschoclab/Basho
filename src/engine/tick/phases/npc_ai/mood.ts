/**
 * mood.ts
 * =======
 * NPC AI mood processing helpers.
 * Extracted from phase01_week_npc_ai.ts for modularity.
 */

import type { Id } from "../../../types/common";
import type { Oyakata } from "../../../types/oyakata";
import type { NPCWeeklyDecision } from "../../../npcAI";
import type { ImpactBuilder } from "../../../core/ImpactBuilder";

export function processOyakataMood(
  oyakata: Oyakata,
  decision: NPCWeeklyDecision,
  heyaId: Id,
  builder: ImpactBuilder
): void {
  const oldMood = oyakata.mood ?? "content";
  const newMood = decision.mood;
  if (newMood) oyakata.mood = newMood;

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
}
