import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata, OyakataArchetype } from "./types/oyakata";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import {
  MONTHLY_BURN_PER_RIKISHI,
  MONTHS_PER_YEAR,
  RECRUITMENT_BASE_RISK_MODIFIER,
  RECRUITMENT_AMBITION_THRESHOLD_RISK,
  RECRUITMENT_RISK_THRESHOLD_RISK,
  RECRUITMENT_RISK_TAKER_BONUS,
  RECRUITMENT_BASE_TARGET_SIZE,
  RECRUITMENT_AMBITION_THRESHOLD_SIZE,
  RECRUITMENT_AMBITIOUS_SIZE_BONUS,
  RECRUITMENT_TRADITION_THRESHOLD_SIZE,
  RECRUITMENT_TRADITIONALIST_SIZE_BONUS,
  RECRUITMENT_BASE_MULTIPLIER,
  RECRUITMENT_SPITE_PREMIUM_MULTIPLIER,
  RECRUITMENT_MIN_BID,
} from "../constants/engine/economy";

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
  const monthlyBurn = (heya.rikishiIds?.length ?? 0) * MONTHLY_BURN_PER_RIKISHI;
  const yearlyBurn = monthlyBurn * MONTHS_PER_YEAR;
  const surplus = Math.max(0, heya.funds - yearlyBurn);

  // Ambitious/Risk-Takers use more of their surplus
  let riskMod = RECRUITMENT_BASE_RISK_MODIFIER;
  if (oyakata.traits.ambition > RECRUITMENT_AMBITION_THRESHOLD_RISK)
    riskMod += RECRUITMENT_RISK_TAKER_BONUS;
  if (oyakata.traits.risk > RECRUITMENT_RISK_THRESHOLD_RISK)
    riskMod += RECRUITMENT_RISK_TAKER_BONUS;

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

    let targetSize = RECRUITMENT_BASE_TARGET_SIZE;
    if (oyakata.traits.ambition > RECRUITMENT_AMBITION_THRESHOLD_SIZE)
      targetSize += RECRUITMENT_AMBITIOUS_SIZE_BONUS;
    if (oyakata.traits.tradition > RECRUITMENT_TRADITION_THRESHOLD_SIZE)
      targetSize += RECRUITMENT_TRADITIONALIST_SIZE_BONUS;

    const currentSize = heya.rikishiIds?.length ?? 0;
    const count = Math.max(0, targetSize - currentSize);

    return { impact: builder.build(), count };
  },

  calculateMaxBid(world, heya, oyakata, candidateId, rivalHeyaId) {
    let maxBid = calculateRunwayAwareMaxBid(heya, oyakata, RECRUITMENT_BASE_MULTIPLIER);

    // Talent premium: scale bid 0.5x–1.5x by candidate talentSeed so high-potential
    // prospects trigger competitive bidding wars between stables.
    const candidate = candidateId ? world.talentPool?.candidates?.[candidateId] : undefined;
    const talentSeed = candidate?.talentSeed ?? 50;
    const talentMult = 0.5 + talentSeed / 100;
    maxBid *= talentMult;

    // Spite Premium
    if (rivalHeyaId && oyakata.temperament === "Vindictive") {
      maxBid *= RECRUITMENT_SPITE_PREMIUM_MULTIPLIER;
    }

    return Math.max(RECRUITMENT_MIN_BID, maxBid); // Minimum bid of 5m
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
