/**
 * SponsorStrategy.ts
 *
 * Interface for NPC sponsor strategy implementations.
 */

import type { WorldState } from "../../../types/world";
import type { Heya } from "../../../types/heya";
import type { Oyakata } from "../../../types/oyakata";

export interface SponsorStrategy {
  /**
   * Evaluate sponsor decisions for a heya.
   * @param world - The current world state
   * @param heya - The heya to evaluate
   * @param oyakata - The oyakata making decisions
   */
  evaluateSponsors(world: WorldState, heya: Heya, oyakata: Oyakata): void;
}
