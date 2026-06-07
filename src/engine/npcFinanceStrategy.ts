import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { stableSort } from "./utils/sort";
import { buyMyoseki } from "./myosekiMarket";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import {
  StrategyContext,
  StrategyRule,
  evaluateRulesExclusive,
  TraitChecks,
  calculateTraitAdjustedThreshold,
} from "./strategy/NPCStrategyFramework";
import { getOyakataStyleProfile } from "./oyakataStylePreferences";
import {
  AMBITIOUS_TRAIT_THRESHOLD,
  RISK_TAKER_TRAIT_THRESHOLD,
  MONTHLY_BURN_PER_RIKISHI,
  RUNWAY_MONTHS_RISK_TAKER_STRATEGY,
  RUNWAY_MONTHS_STANDARD_STRATEGY,
  MYOSEKI_MAX_FUNDS_RATIO,
  STYLE_ALIGNMENT_SCORE,
} from "../constants/engine/economy";

interface FinanceStrategy {
  evaluateFinances: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

function getSortedMyosekiStocks(world: WorldState) {
  if (!world.myosekiMarket) return [];
  return stableSort(Object.values(world.myosekiMarket.stocks), (x) => x.id);
}

const BUY_MYOSEKI_RULE: StrategyRule = {
  id: "fin_buy_myoseki",
  condition: (ctx) => {
    if (!ctx.world.myosekiMarket) return false;
    if (!TraitChecks.isAmbitious(AMBITIOUS_TRAIT_THRESHOLD)(ctx.oyakata)) return false;

    // Runway Check: Don't buy if it puts us under 12 months of runway
    const monthlyBurn = (ctx.heya.rikishiIds?.length ?? 0) * MONTHLY_BURN_PER_RIKISHI;
    const runway = ctx.heya.funds / (monthlyBurn || 1);
    const minRunway = TraitChecks.isRiskTaker(RISK_TAKER_TRAIT_THRESHOLD)(ctx.oyakata) ? RUNWAY_MONTHS_RISK_TAKER_STRATEGY : RUNWAY_MONTHS_STANDARD_STRATEGY;

    return runway > minRunway;
  },
  action: (ctx) => {
    const builder = createImpactBuilder("fin_buy_myoseki");
    const stocks = getSortedMyosekiStocks(ctx.world);
    const styleProfile = getOyakataStyleProfile(ctx.world, ctx.oyakata);

    // Sort stocks by style alignment
    const prioritized = stocks
      .filter(
        (s) => s.status === "available" && s.askingPrice && s.askingPrice < ctx.heya.funds * MYOSEKI_MAX_FUNDS_RATIO
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
  buildEvent: (ctx) => ({
    action: "buy_myoseki",
    reasoning: "Strategic investment in stable prestige and training capability.",
  }),
  importance: "notable",
};

export const DefaultFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const ctx: StrategyContext = { world, heya, oyakata };
    const rules = [BUY_MYOSEKI_RULE];
    return evaluateRulesExclusive(ctx, rules);
  },
};

const FINANCE_STRATEGIES: Record<OyakataArchetype, FinanceStrategy> = {
  traditionalist: DefaultFinanceStrategy,
  scientist: DefaultFinanceStrategy,
  gambler: DefaultFinanceStrategy,
  nurturer: DefaultFinanceStrategy,
  tyrant: DefaultFinanceStrategy,
  strategist: DefaultFinanceStrategy,
  strict: DefaultFinanceStrategy,
  indulgent: DefaultFinanceStrategy,
};

export function getFinanceStrategy(archetype: OyakataArchetype): FinanceStrategy {
  return FINANCE_STRATEGIES[archetype] || DefaultFinanceStrategy;
}
