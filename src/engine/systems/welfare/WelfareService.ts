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
import { EntityService } from "../../core/EntityService";
import { DEFAULT_WELFARE_RISK } from "../../../constants/engine/welfareTransitions";
import { DEFAULT_MORALE } from "../../../constants/engine/welfare";

/**
 * Ensures that a heya has a valid welfare state.
 * If not present, initializes it with default values.
 *
 * @param heya - The heya to check/initialize
 * @returns The current or new WelfareState
 */
export function ensureHeyaWelfareState(heya: Heya): WelfareState {
  return EntityService.ensureState(heya, "welfareState", (): WelfareState => ({
    welfareRisk: DEFAULT_WELFARE_RISK,
    complianceState: "compliant",
    weeksInState: 0,
    lastReviewedWeek: 0,
    activeDiet: "maintenance",
    morale: DEFAULT_MORALE,
  }));
}

export const WelfareService = {
  ensureHeyaWelfareState,
};
