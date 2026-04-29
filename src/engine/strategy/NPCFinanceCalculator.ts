/**
 * NPCFinanceCalculator.ts
 * =======================
 * Pure calculation logic for NPC financial decisions.
 * Uses NPCStrategyFramework to eliminate duplication.
 */

import type { StrategyContext, StrategyRule } from "./NPCStrategyFramework";
import { TraitChecks, calculateMoodAdjustedThreshold } from "./NPCStrategyFramework";
import { evaluateRulesExclusive } from "./NPCStrategyFramework";
import { buyMyoseki } from "../myosekiMarket";
import { stableSort } from "../utils/sort";

// ============================================================================
// Finance Strategy Rules
// ============================================================================

const defaultMyosekiRule: StrategyRule = {
  id: "default_myoseki_purchase",
  condition: (ctx) => {
    const { world, heya, oyakata } = ctx;
    if (!world.myosekiMarket) return false;
    if (!TraitChecks.isAmbitious(50)(oyakata)) return false;

    const baseThreshold = TraitChecks.isHoarder(30)(oyakata) ? 500_000_000 : 300_000_000;
    const threshold = calculateMoodAdjustedThreshold(baseThreshold, oyakata);

    return (heya.funds ?? 0) > threshold;
  },
  action: (ctx) => {
    const { world, heya, oyakata } = ctx;
    if (!world.myosekiMarket) return false;

    const stocks = stableSort(
      Object.values(world.myosekiMarket.stocks),
      (x) => (x as { id?: string }).id || String(x)
    );

    const buffer = TraitChecks.isHoarder(30)(oyakata) ? 100_000_000 : 100_000_000;

    for (const stock of stocks) {
      const s = stock as {
        status?: string;
        askingPrice?: number;
        id?: string;
      };
      if (
        s.status === "available" &&
        s.askingPrice &&
        s.id &&
        s.askingPrice < (heya.funds ?? 0) - buffer
      ) {
        buyMyoseki(world, oyakata.id, heya.id, s.id);
        return true;
      }
    }
    return false;
  },
  buildEvent: () => ({
    action: "buy_myoseki",
    reasoning: "Default oyakata purchased myoseki",
  }),
  importance: "minor",
};

const traditionalistMyosekiRule: StrategyRule = {
  id: "traditionalist_myoseki_purchase",
  condition: (ctx) => {
    const { world, heya, oyakata } = ctx;
    if (!world.myosekiMarket) return false;
    if (!TraitChecks.isTraditionalist(60)(oyakata)) return false;
    if ((oyakata.traits.tradition ?? 0) <= 60) return false;

    let threshold = 600_000_000;
    if (TraitChecks.isPatient(70)(oyakata)) {
      threshold = 700_000_000;
    }

    return (heya.funds ?? 0) > threshold;
  },
  action: (ctx) => {
    const { world, heya, oyakata } = ctx;
    if (!world.myosekiMarket) return false;

    const stocks = stableSort(
      Object.values(world.myosekiMarket.stocks),
      (x) => (x as { id?: string }).id || String(x)
    );

    for (const stock of stocks) {
      const s = stock as {
        status?: string;
        askingPrice?: number;
        id?: string;
      };
      if (
        s.status === "available" &&
        s.askingPrice &&
        s.id &&
        s.askingPrice < (heya.funds ?? 0) - 200_000_000
      ) {
        buyMyoseki(world, oyakata.id, heya.id, s.id);
        return true;
      }
    }
    return false;
  },
  buildEvent: () => ({
    action: "buy_myoseki",
    reasoning: "Traditionalist purchased myoseki for tradition",
  }),
  importance: "minor",
};

// Ordered by priority (more specific first)
const financeRules: StrategyRule[] = [traditionalistMyosekiRule, defaultMyosekiRule];

// ============================================================================
// Public API
// ============================================================================

/**
 * Evaluate finance decisions for an NPC heya.
 * Returns true if any finance action was taken.
 */
export function evaluateFinanceStrategy(ctx: StrategyContext): boolean {
  return evaluateRulesExclusive(ctx, financeRules);
}

/**
 * Legacy compatibility: interface-based strategy object.
 * @deprecated Use evaluateFinanceStrategy with StrategyContext instead.
 */
export const DefaultFinanceStrategy = {
  evaluateFinances(
    world: StrategyContext["world"],
    heya: StrategyContext["heya"],
    oyakata: StrategyContext["oyakata"]
  ): void {
    evaluateFinanceStrategy({ world, heya, oyakata });
  },
};

/**
 * @deprecated Use evaluateFinanceStrategy with StrategyContext instead.
 */
export const TraditionalistFinanceStrategy = {
  evaluateFinances(
    world: StrategyContext["world"],
    heya: StrategyContext["heya"],
    oyakata: StrategyContext["oyakata"]
  ): void {
    // Traditionalist rule is now included in the default ruleset with priority
    evaluateFinanceStrategy({ world, heya, oyakata });
  },
};
