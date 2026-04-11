import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import { assertNever } from "./utils/types";
import type { Oyakata, OyakataArchetype } from "./types/oyakata";

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

/**
 * Recruitment strategies for NPC stables.
 * Aligned with real-world sumo archetypes (Traditionalist, Scientist, Gambler, etc.)
 */
export const TraditionalistRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(world, heya, oyakata) {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;
    
    // Traditionalists keep a stable, medium roster (approx 10-12)
    const targetSize = Math.max(10, 8 + Math.floor(oyakata.traits.tradition / 20));
    const currentSize = heya.rikishiIds?.length ?? 0;
    return Math.max(0, targetSize - currentSize);
  },
  calculateMaxBid(world, heya, oyakata, candidateId, rivalHeyaId) {
    // Traditionalists are conservative with money unless it's a "Traditional" prospect
    let maxBase = heya.funds * 0.10; 
    const candidate = Object.values(world.talentPool?.candidates || {}).find(c => c.candidateId === candidateId);
    if (candidate?.style === "yotsu") maxBase *= 1.35; // Value belt-wrestlers
    return maxBase;
  }
};

export const ScientistRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(world, heya, oyakata) {
    // Scientists lean, high-potential rosters
    const targetSize = oyakata.traits.ambition > 80 ? 15 : 9;
    return Math.max(0, targetSize - (heya.rikishiIds?.length ?? 0));
  },
  calculateMaxBid(world, heya, oyakata, candidateId) {
    // Scientists value 'Potential' (talentSeed) above all else
    const candidate = Object.values(world.talentPool?.candidates || {}).find(c => c.candidateId === candidateId);
    const potentialMultiplier = (candidate?.talentSeed ?? 50) / 50;
    return heya.funds * 0.20 * potentialMultiplier;
  }
};

export const GamblerRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(world, heya, oyakata) {
    // Gamblers always have room for one more "long shot"
    return 1; 
  },
  calculateMaxBid(world, heya, oyakata, candidateId, rivalHeyaId) {
    // Gamblers take massive risks if it denies a rival or if they feel lucky
    let base = heya.funds * 0.25;
    if (rivalHeyaId) base *= 1.5; // "The Spite Premium"
    return base;
  }
};

export const TyrantRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(world, heya, oyakata) {
    // Tyrants want a massive meat-grinder roster
    return Math.max(0, 25 - (heya.rikishiIds?.length ?? 0));
  },
  calculateMaxBid(world, heya, oyakata, candidateId, rivalHeyaId) {
    // Tyrants will spend 50% of their total wealth to secure a top prospect
    return heya.funds * 0.50;
  }
};

export function getRecruitmentStrategy(archetype: OyakataArchetype): RecruitmentStrategy {
  switch (archetype) {
    case "traditionalist":
    case "strict":
      return TraditionalistRecruitmentStrategy;
    case "scientist":
    case "strategist":
      return ScientistRecruitmentStrategy;
    case "gambler":
      return GamblerRecruitmentStrategy;
    case "tyrant":
      return TyrantRecruitmentStrategy;
    case "nurturer":
    case "indulgent":
      return DefaultRecruitmentStrategy;
    default:
      assertNever(archetype);
      return DefaultRecruitmentStrategy;
  }
}
