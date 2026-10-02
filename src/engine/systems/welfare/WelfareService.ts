/**
 * src/engine/systems/welfare/WelfareService.ts
 * ============================================
 * State hydration for the Welfare System.
 *
 * The weekly compliance tick and transition logic live in
 * `engine/tick/phases/welfare/transitions.ts` (pure functions).
 */

import type { Heya } from "../../types/heya";
import type { WelfareState } from "../../types/economy";
import { DEFAULT_WELFARE_RISK } from "../../../constants/engine/welfareTransitions";
import { DEFAULT_MORALE } from "../../../constants/engine/welfare";

/**
 * Fresh default WelfareState for a heya that has none.
 */
function createHeyaWelfareState(): WelfareState {
  return {
    welfareRisk: DEFAULT_WELFARE_RISK,
    complianceState: "compliant",
    weeksInState: 0,
    lastReviewedWeek: 0,
    activeDiet: "maintenance",
    morale: DEFAULT_MORALE,
  };
}

/**
 * Pure accessor — returns the heya's welfare state or a fresh default WITHOUT
 * assigning it to the input entity. Callers that need the state persisted must
 * write it via updateHeya (the weekly phase does through heyaUpdates).
 */
export function ensureHeyaWelfareState(heya: Heya): WelfareState {
  return heya.welfareState ?? createHeyaWelfareState();
}

export const WelfareService = {
  ensureHeyaWelfareState,
};
