/**
 * NPCGovernanceCalculator.ts
 * ========================
 * Pure calculation logic for NPC governance decisions.
 * Uses NPCStrategyFramework to eliminate duplication.
 */

import type { StrategyContext, StrategyRule } from "./NPCStrategyFramework";
import {
  TraitChecks,
  trySpendResource,
  adjustScore,
  evaluateRulesExclusive,
} from "./NPCStrategyFramework";
import {
  SCANDAL_THRESHOLD_REDUCE,
  POLITICAL_CAPITAL_THRESHOLD_REDUCE,
  TRAIT_THRESHOLD_AMBITIOUS,
  TRAIT_THRESHOLD_COMPASSIONATE,
  POLITICAL_SPEND_REDUCE,
  SCANDAL_REDUCTION_REDUCE,
  SCANDAL_THRESHOLD_MAINTAIN,
  POLITICAL_CAPITAL_THRESHOLD_MAINTAIN,
  TRAIT_THRESHOLD_TRADITIONALIST,
  POLITICAL_SPEND_MAINTAIN,
  SCANDAL_REDUCTION_MAINTAIN,
  POLITICAL_CAPITAL_HOARD_THRESHOLD,
  TRAIT_THRESHOLD_RISK_TAKER,
  SCANDAL_THRESHOLD_MAINTENANCE,
  POLITICAL_CAPITAL_THRESHOLD_MAINTENANCE,
  POLITICAL_SPEND_MAINTENANCE,
  SCANDAL_REDUCTION_MAINTENANCE,
} from "../../constants/engine/governance";

// ============================================================================
// Governance Strategy Rules
// ============================================================================

const reduceScandalAmbitiousRule: StrategyRule = {
  id: "reduce_scandal_ambitious",
  condition: (ctx) => {
    const { heya, oyakata } = ctx;
    const scandalScore = heya.scandalScore ?? 0;
    const politicalCapital = heya.politicalCapital ?? 50;

    return (
      scandalScore >= SCANDAL_THRESHOLD_REDUCE &&
      politicalCapital >= POLITICAL_CAPITAL_THRESHOLD_REDUCE &&
      (TraitChecks.isAmbitious(TRAIT_THRESHOLD_AMBITIOUS)(oyakata) || TraitChecks.isCompassionate(TRAIT_THRESHOLD_COMPASSIONATE)(oyakata))
    );
  },
  action: (ctx) => {
    const { heya } = ctx;
    const politicalCapital = heya.politicalCapital ?? 0;
    const scandalScore = heya.scandalScore ?? 0;
    const spendAmount = Math.min(POLITICAL_SPEND_REDUCE, politicalCapital);

    if (!trySpendResource(heya, "politicalCapital", spendAmount)) {
      return false;
    }

    heya.scandalScore = adjustScore(scandalScore, -SCANDAL_REDUCTION_REDUCE, 0, 100);
    return true;
  },
  buildEvent: (ctx) => ({
    action: "reduce_scandal",
    spent: Math.min(POLITICAL_SPEND_REDUCE, ctx.heya.politicalCapital ?? 0),
    reasoning: TraitChecks.isAmbitious(TRAIT_THRESHOLD_AMBITIOUS)(ctx.oyakata)
      ? "Ambitious oyakata spent political capital to protect reputation"
      : "Compassionate oyakata spent political capital to protect heya members",
  }),
  importance: "minor",
};

const maintainStandingTraditionalistRule: StrategyRule = {
  id: "maintain_standing_traditionalist",
  condition: (ctx) => {
    const { heya, oyakata } = ctx;
    const scandalScore = heya.scandalScore ?? 0;
    const politicalCapital = heya.politicalCapital ?? 50;

    return (
      TraitChecks.isTraditionalist(TRAIT_THRESHOLD_TRADITIONALIST)(oyakata) && scandalScore >= SCANDAL_THRESHOLD_MAINTAIN && politicalCapital >= POLITICAL_CAPITAL_THRESHOLD_MAINTAIN
    );
  },
  action: (ctx) => {
    const { heya } = ctx;
    const politicalCapital = heya.politicalCapital ?? 0;
    const scandalScore = heya.scandalScore ?? 0;
    const spendAmount = Math.min(POLITICAL_SPEND_MAINTAIN, politicalCapital);

    if (!trySpendResource(heya, "politicalCapital", spendAmount)) {
      return false;
    }

    heya.scandalScore = adjustScore(scandalScore, -SCANDAL_REDUCTION_MAINTAIN, 0, 100);
    return true;
  },
  buildEvent: (ctx) => ({
    action: "maintain_standing",
    spent: Math.min(POLITICAL_SPEND_MAINTAIN, ctx.heya.politicalCapital ?? 0),
    reasoning: "Traditionalist oyakata spent political capital to maintain good standing",
  }),
  importance: "minor",
};

const riskTakerHoardRule: StrategyRule = {
  id: "risk_taker_hoard",
  condition: (ctx) => {
    const { heya, oyakata } = ctx;
    const politicalCapital = heya.politicalCapital ?? 0;

    return TraitChecks.isRiskTaker(TRAIT_THRESHOLD_RISK_TAKER)(oyakata) && politicalCapital < POLITICAL_CAPITAL_HOARD_THRESHOLD;
  },
  action: () => {
    // Risk-takers hoard capital for future opportunities - no action, just exit
    return false;
  },
  buildEvent: () => ({
    action: "hoard_capital",
    reasoning: "Risk-taker hoarding political capital for future opportunities",
  }),
  importance: "minor",
};

const maintenanceSpendRule: StrategyRule = {
  id: "maintenance_spend",
  condition: (ctx) => {
    const { heya } = ctx;
    const scandalScore = heya.scandalScore ?? 0;
    const politicalCapital = heya.politicalCapital ?? 0;

    return scandalScore >= SCANDAL_THRESHOLD_MAINTENANCE && politicalCapital >= POLITICAL_CAPITAL_THRESHOLD_MAINTENANCE;
  },
  action: (ctx) => {
    const { heya } = ctx;
    const scandalScore = heya.scandalScore ?? 0;

    if (!trySpendResource(heya, "politicalCapital", POLITICAL_SPEND_MAINTENANCE)) {
      return false;
    }

    heya.scandalScore = adjustScore(scandalScore, -SCANDAL_REDUCTION_MAINTENANCE, 0, 100);
    return true;
  },
  buildEvent: () => ({
    action: "maintenance_spend",
    spent: POLITICAL_SPEND_MAINTENANCE,
    reasoning: "Standard political capital maintenance",
  }),
  importance: "minor",
};

// Ordered by priority (specific strategies first, default last)
const governanceRules: StrategyRule[] = [
  riskTakerHoardRule, // Exit early for risk-takers
  reduceScandalAmbitiousRule,
  maintainStandingTraditionalistRule,
  maintenanceSpendRule, // Default fallback
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Evaluate governance decisions for an NPC heya.
 * Returns true if any governance action was taken.
 */
export function evaluateGovernanceStrategy(ctx: StrategyContext): boolean {
  return evaluateRulesExclusive(ctx, governanceRules);
}

/**
 * Legacy compatibility: interface-based strategy object.
 * @deprecated Use evaluateGovernanceStrategy with StrategyContext instead.
 */
export const DefaultGovernanceStrategy = {
  evaluateGovernanceDecisions(
    world: StrategyContext["world"],
    heya: StrategyContext["heya"],
    oyakata: StrategyContext["oyakata"]
  ): void {
    evaluateGovernanceStrategy({ world, heya, oyakata });
  },
};
