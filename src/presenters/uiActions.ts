/**
 * uiActions.ts
 *
 * Action functions that mutate world state from UI interactions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../engine/types/world";
import type { DietRegimen } from "../engine/types/economy";

/**
 * Update heya diet via presenter.
 */
export function setHeyaDietAction(world: WorldState, heyaId: string, diet: DietRegimen): boolean {
  const heya = world.heyas.get(heyaId);
  if (!heya) return false;
  if (!heya.welfareState) {
    heya.welfareState = {
      welfareRisk: 0,
      activeDiet: diet,
      complianceState: "compliant",
      weeksInState: 0,
    };
  } else {
    heya.welfareState.activeDiet = diet;
  }
  return true;
}
