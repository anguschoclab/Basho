/**
 * phase_global_cup.ts
 * ===================
 * Runs every weekly off-season tick when a Global Cup is active.
 * Advances the tournament one round per tick: QF → SF → Finale → Complete.
 *
 * Initialization happens in phase06_yearly_boundary on the Jan 1 year boundary.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { GlobalCupService } from "@/engine/economy/GlobalCupService";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";

export function phase_global_cup_advance(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase_global_cup_advance");
  if (!world.globalCup?.isActive) return builder.build();
  builder.merge(GlobalCupService.advanceTournament(world));
  return builder.build();
}
