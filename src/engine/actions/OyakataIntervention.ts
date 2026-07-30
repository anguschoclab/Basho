/**
 * OyakataIntervention.ts
 * ======================
 * Mid-basho oyakata intervention action.
 * Available when a rikishi has 2+ consecutive losses during day 5-13.
 * Clears frozeUp flag, boosts motivation, sets interventionUsedThisBasho.
 */

import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";
import { getRikishi } from "../queries";
import { isGovernancePlayerRelevant } from "../npcAI/eventSurfacing";
import {
  INTERVENTION_MOTIVATION_BOOST,
  INTERVENTION_MIN_LOSSES,
  INTERVENTION_DAY_MIN,
  INTERVENTION_DAY_MAX,
} from "../../constants/engine/generation";

export interface InterventionResult {
  success: boolean;
  reason?: string;
  impact: StateImpact;
}

/**
 * Apply oyakata intervention on a rikishi mid-basho.
 * Requirements:
 *   - World must be in active_basho phase
 *   - Rikishi must exist and be active
 *   - Rikishi must have 2+ consecutive losses (currentLossStreak)
 *   - Basho day must be between 5 and 13 (inclusive)
 *   - interventionUsedThisBasho must not already be true
 *
 * Effects:
 *   - Sets interventionUsedThisBasho = true
 *   - Clears frozeUp flag
 *   - +5 motivation boost
 *   - Logs GOVERNANCE_RULING event
 */
export function applyOyakataIntervention(
  world: WorldState,
  rikishiId: string
): InterventionResult {
  const builder = createImpactBuilder("applyOyakataIntervention");

  if (world.cyclePhase !== "active_basho") {
    return { success: false, reason: "Not during active basho", impact: builder.build() };
  }

  const basho = world.currentBasho;
  if (!basho) {
    return { success: false, reason: "No active basho", impact: builder.build() };
  }

  const r = getRikishi(world, rikishiId);
  if (!r) {
    return { success: false, reason: "Rikishi not found", impact: builder.build() };
  }

  if (r.interventionUsedThisBasho) {
    return { success: false, reason: "Intervention already used this basho", impact: builder.build() };
  }

  const losses = r.currentLossStreak ?? 0;
  if (losses < INTERVENTION_MIN_LOSSES) {
    return {
      success: false,
      reason: `Requires ${INTERVENTION_MIN_LOSSES}+ consecutive losses (has ${losses})`,
      impact: builder.build(),
    };
  }

  if (basho.day < INTERVENTION_DAY_MIN || basho.day > INTERVENTION_DAY_MAX) {
    return {
      success: false,
      reason: `Only available on day ${INTERVENTION_DAY_MIN}-${INTERVENTION_DAY_MAX} (current: day ${basho.day})`,
      impact: builder.build(),
    };
  }

  const importance = isGovernancePlayerRelevant(r.heyaId, "minor");
  builder.updateRikishi(rikishiId, {
    interventionUsedThisBasho: true,
    frozeUp: false,
    motivation: Math.min(100, r.motivation + INTERVENTION_MOTIVATION_BOOST),
  });

  builder.logEvent(
    "GOVERNANCE_RULING",
    "discipline",
    {
      rikishiId,
      shikona: r.shikona,
      incident: "oyakata_intervention",
      bashoName: basho.bashoName,
      day: basho.day,
      motivationBoost: INTERVENTION_MOTIVATION_BOOST,
    },
    { heyaId: r.heyaId, importance }
  );

  return { success: true, impact: builder.build() };
}
