/**
 * events.ts
 * =========
 * NPC AI event collection helpers.
 * Extracted from phase01_week_npc_ai.ts for modularity.
 */

import type { Id } from "../../../types/common";
import type { NPCWeeklyDecision } from "../../../npcAI";
import type { ImpactBuilder } from "../../../core/ImpactBuilder";

export function collectManagementDecisionEvents(
  heyaId: Id,
  decision: NPCWeeklyDecision,
  builder: ImpactBuilder
): void {
  builder.logEvent(
    "MANAGEMENT_DECISION",
    "narrative",
    {
      archetype: decision.archetype,
      intensity: decision.trainingIntensity,
      focus: decision.trainingFocus,
      recovery: decision.recovery,
      scouting: decision.scoutingPriority,
      protectedCount: decision.individualProtects.length,
      reasoningLog: decision.reasoning.join(" | "),
    },
    {
      heyaId,
      importance:
        decision.trainingIntensity === "punishing" || decision.trainingIntensity === "conservative"
          ? "notable"
          : "minor",
    }
  );
}

export function collectStrategyShiftEvents(
  heyaId: Id,
  decision: NPCWeeklyDecision,
  builder: ImpactBuilder
): void {
  if (decision.trainingIntensity === "punishing") {
    builder.logEvent(
      "STRATEGY_SHIFT",
      "narrative",
      {
        intensity: "punishing",
        reasoning: decision.reasoning[0],
      },
      { heyaId }
    );
  }
}
