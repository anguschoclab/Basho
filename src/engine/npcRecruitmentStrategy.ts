import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";

export interface RecruitmentStrategy {
  evaluateVacancies: (world: WorldState, heya: Heya, oyakata: Oyakata) => number;
}

export const DefaultRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(world: WorldState, heya: Heya, oyakata: Oyakata): number {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;

    // Use ambition and tradition traits to determine target roster size
    let targetSize = 8;
    if (oyakata.traits.ambition > 75) targetSize += 2;
    if (oyakata.traits.tradition < 30) targetSize -= 1; // Modern less is more approach

    const currentSize = heya.rikishiIds ? heya.rikishiIds.length : 0;
    
    return Math.max(0, targetSize - currentSize);
  }
};

export function getRecruitmentStrategy(archetype: string): RecruitmentStrategy {
   return DefaultRecruitmentStrategy;
}
