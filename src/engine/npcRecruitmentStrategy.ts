import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata, OyakataArchetype } from "./types/oyakata";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

interface RecruitmentStrategy {
  evaluateVacancies: (
    world: WorldState,
    heya: Heya,
    oyakata: Oyakata
  ) => { impact: StateImpact; count: number };
  calculateMaxBid: (
    world: WorldState,
    heya: Heya,
    oyakata: Oyakata,
    candidateId: string,
    rivalHeyaId?: string
  ) => number;
}

/**
 * Calculates a sustainable max bid based on yearly runway.
 */
function calculateRunwayAwareMaxBid(heya: Heya, oyakata: Oyakata, baseMultiplier: number): number {
  const monthlyBurn = (heya.rikishiIds?.length ?? 0) * 150000;
  const yearlyBurn = monthlyBurn * 12;
  const surplus = Math.max(0, heya.funds - yearlyBurn);

  // Ambitious/Risk-Takers use more of their surplus
  let riskMod = 0.2;
  if (oyakata.traits.ambition > 80) riskMod += 0.2;
  if (oyakata.traits.risk > 70) riskMod += 0.3;

  return surplus * riskMod * baseMultiplier;
}

export const DefaultRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(
    _world: WorldState,
    heya: Heya,
    oyakata: Oyakata
  ): { impact: StateImpact; count: number } {
    const builder = createImpactBuilder("evaluateVacancies");
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return { impact: builder.build(), count: 0 };

    let targetSize = 10;
    if (oyakata.traits.ambition > 75) targetSize += 5;
    if (oyakata.traits.tradition > 70) targetSize += 2;

    const currentSize = heya.rikishiIds?.length ?? 0;
    const count = Math.max(0, targetSize - currentSize);

    return { impact: builder.build(), count };
  },

  calculateMaxBid(_world, heya, oyakata, _candidateId, rivalHeyaId) {
    let maxBid = calculateRunwayAwareMaxBid(heya, oyakata, 1.0);

    // Spite Premium
    if (rivalHeyaId && oyakata.temperament === "Vindictive") {
      maxBid *= 1.5;
    }

    return Math.max(5000000, maxBid); // Minimum bid of 5m
  },
};

const RECRUITMENT_STRATEGIES: Record<OyakataArchetype, RecruitmentStrategy> = {
  traditionalist: DefaultRecruitmentStrategy,
  scientist: DefaultRecruitmentStrategy,
  gambler: DefaultRecruitmentStrategy,
  nurturer: DefaultRecruitmentStrategy,
  tyrant: DefaultRecruitmentStrategy,
  strategist: DefaultRecruitmentStrategy,
  strict: DefaultRecruitmentStrategy,
  indulgent: DefaultRecruitmentStrategy,
};

export function getRecruitmentStrategy(archetype: OyakataArchetype): RecruitmentStrategy {
  return RECRUITMENT_STRATEGIES[archetype] || DefaultRecruitmentStrategy;
}
