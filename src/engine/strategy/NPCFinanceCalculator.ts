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
import {
  TRAIT_HOARDER_AMBITION_THRESHOLD,
  TRAIT_TRADITION_THRESHOLD,
  TRAIT_PATIENCE_THRESHOLD,
} from "../../constants/engine/npcStrategy";
import {
  MYOSEKI_THRESHOLD_HOARDER,
  MYOSEKI_THRESHOLD_DEFAULT,
  MYOSEKI_THRESHOLD_TRADITIONALIST,
  MYOSEKI_THRESHOLD_PATIENT,
  MYOSEKI_BUFFER_AMOUNT,
  MYOSEKI_BUFFER_TRADITIONALIST,
} from "../../constants/engine/economic";

// ============================================================================
// Finance Strategy Rules
// ============================================================================

const defaultMyosekiRule: StrategyRule = {
  id: "default_myoseki_purchase",
  condition: (ctx) => {
    const { world, heya, oyakata } = ctx;
    if (!world.myosekiMarket) return false;
    if (!TraitChecks.isAmbitious(TRAIT_HOARDER_AMBITION_THRESHOLD)(oyakata)) return false;

    const baseThreshold = TraitChecks.isHoarder(30)(oyakata) ? MYOSEKI_THRESHOLD_HOARDER : MYOSEKI_THRESHOLD_DEFAULT;
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

    const buffer = TraitChecks.isHoarder(30)(oyakata) ? MYOSEKI_BUFFER_AMOUNT : MYOSEKI_BUFFER_AMOUNT;

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
    if (!TraitChecks.isTraditionalist(TRAIT_TRADITION_THRESHOLD)(oyakata)) return false;
    if ((oyakata.traits.tradition ?? 0) <= TRAIT_TRADITION_THRESHOLD) return false;

    let threshold = MYOSEKI_THRESHOLD_TRADITIONALIST;
    if (TraitChecks.isPatient(TRAIT_PATIENCE_THRESHOLD)(oyakata)) {
      threshold = MYOSEKI_THRESHOLD_PATIENT;
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
        s.askingPrice < (heya.funds ?? 0) - MYOSEKI_BUFFER_TRADITIONALIST
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
