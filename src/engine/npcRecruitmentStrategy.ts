import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";

interface RecruitmentStrategy {
  evaluateVacancies: (world: WorldState, heya: Heya, oyakata: Oyakata) => number;
  calculateMaxBid: (world: WorldState, heya: Heya, oyakata: Oyakata, candidateId: string, rivalHeyaId?: string) => number;
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
  },

  calculateMaxBid(world: WorldState, heya: Heya, oyakata: Oyakata, candidateId: string, rivalHeyaId?: string): number {
    // Basic value based on heya funds and ambition
    let maxBase = heya.funds * 0.15; // 15% of funds as a standard max
    if (oyakata.traits.ambition > 80) maxBase *= 1.25;

    // Drama Pass (Initiative 4): Vindictive NPCs overpay to spite rivals
    if (rivalHeyaId && oyakata.temperament === 'Vindictive') {
      const isGrudge = oyakata.grudges?.includes(rivalHeyaId);
      if (isGrudge) {
        console.log(`[DramaPass] Oyakata ${oyakata.name} is overpaying (Vindictive) to deny a recruit to rival heya ${rivalHeyaId}`);
        maxBase *= 1.4; // 40% premium to block a hated rival
      }
    }

    return maxBase;
  }
};

export function getRecruitmentStrategy(archetype: string): RecruitmentStrategy {
   return DefaultRecruitmentStrategy;
}
