/**
 * NPCFinanceCalculator.ts
 * =======================
 * Pure calculation logic for NPC financial decisions.
 * Uses NPCStrategyFramework to eliminate duplication.
 */

import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";
import { buyMyoseki } from "../myosekiMarket";
import { stableSort } from "../utils/sort";
import type { OyakataArchetype } from "../types/oyakata";
import {
  StrategyContext,
  StrategyRule,
  evaluateRulesExclusive,
  TraitChecks,
} from "./NPCStrategyFramework";
import { getOyakataStyleProfile } from "../oyakataStylePreferences";
import {
  AMBITIOUS_TRAIT_THRESHOLD,
  RISK_TAKER_TRAIT_THRESHOLD,
  MONTHLY_BURN_PER_RIKISHI,
  RUNWAY_MONTHS_RISK_TAKER_STRATEGY,
  RUNWAY_MONTHS_STANDARD_STRATEGY,
  MYOSEKI_MAX_FUNDS_RATIO,
  STYLE_ALIGNMENT_SCORE,
} from "../../constants/engine/economy";
import { WEIGHT_JOURNEY_STALL_THRESHOLD } from "../training/WeightJourney";
import { getRikishi } from "../queries";

function getSortedMyosekiStocks(world: StrategyContext["world"]) {
  if (!world.myosekiMarket) return [];
  return stableSort(Object.values(world.myosekiMarket.stocks), (x) => x.id);
}

const BUY_MYOSEKI_RULE: StrategyRule = {
  id: "fin_buy_myoseki",
  condition: (ctx) => {
    if (!ctx.world.myosekiMarket) return false;
    if (!TraitChecks.isAmbitious(AMBITIOUS_TRAIT_THRESHOLD)(ctx.oyakata)) return false;

    const monthlyBurn = (ctx.heya.rikishiIds?.length ?? 0) * MONTHLY_BURN_PER_RIKISHI;
    const runway = ctx.heya.funds / (monthlyBurn || 1);
    const minRunway = TraitChecks.isRiskTaker(RISK_TAKER_TRAIT_THRESHOLD)(ctx.oyakata)
      ? RUNWAY_MONTHS_RISK_TAKER_STRATEGY
      : RUNWAY_MONTHS_STANDARD_STRATEGY;

    return runway > minRunway;
  },
  action: (ctx) => {
    const builder = createImpactBuilder("fin_buy_myoseki");
    const stocks = getSortedMyosekiStocks(ctx.world);
    const styleProfile = getOyakataStyleProfile(ctx.world, ctx.oyakata);

    const prioritized = stocks
      .filter(
        (s) =>
          s.status === "available" &&
          s.askingPrice &&
          s.askingPrice < ctx.heya.funds * MYOSEKI_MAX_FUNDS_RATIO
      )
      .sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (styleProfile.preferredStyle === a.bonusType) scoreA += STYLE_ALIGNMENT_SCORE;
        if (styleProfile.preferredStyle === b.bonusType) scoreB += STYLE_ALIGNMENT_SCORE;
        return scoreB - scoreA;
      });

    if (prioritized.length > 0) {
      const stock = prioritized[0];
      builder.merge(buyMyoseki(ctx.world, ctx.oyakata.id, ctx.heya.id, stock.id));
    }

    return builder.build();
  },
  buildEvent: () => ({
    action: "buy_myoseki",
    reasoning: "Strategic investment in stable prestige and training capability.",
  }),
  importance: "notable",
};

const PRESERVE_FUNDS_FOR_WEIGHT_JOURNEY_RULE: StrategyRule = {
  id: "fin_preserve_weight_journey",
  condition: (ctx) => {
    if (ctx.heya.funds >= WEIGHT_JOURNEY_STALL_THRESHOLD * 2) return false;
    for (const rikishiId of ctx.heya.rikishiIds ?? []) {
      const r = getRikishi(ctx.world, rikishiId);
      if (r?.weightJourney?.stalled === true) return true;
    }
    return false;
  },
  action: () => {
    return createImpactBuilder("fin_preserve_weight_journey").build();
  },
  buildEvent: () => ({
    action: "preserve_funds_weight_journey",
    reasoning: "Weight journey stalled due to low funds — preserving capital for nutrition.",
  }),
  importance: "notable",
};

const financeRules: StrategyRule[] = [
  PRESERVE_FUNDS_FOR_WEIGHT_JOURNEY_RULE,
  BUY_MYOSEKI_RULE,
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Evaluate finance decisions for an NPC heya.
 * Returns a StateImpact describing any actions taken.
 */
export function evaluateFinanceStrategy(ctx: StrategyContext): StateImpact {
  return evaluateRulesExclusive(ctx, financeRules);
}

const FINANCE_STRATEGIES: Record<OyakataArchetype, (ctx: StrategyContext) => StateImpact> = {
  traditionalist: evaluateFinanceStrategy,
  scientist: evaluateFinanceStrategy,
  gambler: evaluateFinanceStrategy,
  nurturer: evaluateFinanceStrategy,
  tyrant: evaluateFinanceStrategy,
  strategist: evaluateFinanceStrategy,
  strict: evaluateFinanceStrategy,
  indulgent: evaluateFinanceStrategy,
};

export function getFinanceStrategy(
  archetype: OyakataArchetype
): (ctx: StrategyContext) => StateImpact {
  return FINANCE_STRATEGIES[archetype] || evaluateFinanceStrategy;
}
