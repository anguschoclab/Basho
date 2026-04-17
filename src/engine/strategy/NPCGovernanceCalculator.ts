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
      scandalScore >= 20 &&
      politicalCapital >= 20 &&
      (TraitChecks.isAmbitious(70)(oyakata) || TraitChecks.isCompassionate(70)(oyakata))
    );
  },
  action: (ctx) => {
    const { heya } = ctx;
    const politicalCapital = heya.politicalCapital ?? 0;
    const scandalScore = heya.scandalScore ?? 0;
    const spendAmount = Math.min(20, politicalCapital);

    if (!trySpendResource(heya, "politicalCapital", spendAmount)) {
      return false;
    }

    heya.scandalScore = adjustScore(scandalScore, -5, 0, 100);
    return true;
  },
  buildEvent: (ctx) => ({
    action: "reduce_scandal",
    spent: Math.min(20, ctx.heya.politicalCapital ?? 0),
    reasoning: TraitChecks.isAmbitious(70)(ctx.oyakata)
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
      TraitChecks.isTraditionalist(70)(oyakata) && scandalScore >= 10 && politicalCapital >= 15
    );
  },
  action: (ctx) => {
    const { heya } = ctx;
    const politicalCapital = heya.politicalCapital ?? 0;
    const scandalScore = heya.scandalScore ?? 0;
    const spendAmount = Math.min(15, politicalCapital);

    if (!trySpendResource(heya, "politicalCapital", spendAmount)) {
      return false;
    }

    heya.scandalScore = adjustScore(scandalScore, -3, 0, 100);
    return true;
  },
  buildEvent: (ctx) => ({
    action: "maintain_standing",
    spent: Math.min(15, ctx.heya.politicalCapital ?? 0),
    reasoning: "Traditionalist oyakata spent political capital to maintain good standing",
  }),
  importance: "minor",
};

const riskTakerHoardRule: StrategyRule = {
  id: "risk_taker_hoard",
  condition: (ctx) => {
    const { heya, oyakata } = ctx;
    const politicalCapital = heya.politicalCapital ?? 0;

    return TraitChecks.isRiskTaker(60)(oyakata) && politicalCapital < 80;
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

    return scandalScore >= 15 && politicalCapital >= 25;
  },
  action: (ctx) => {
    const { heya } = ctx;
    const scandalScore = heya.scandalScore ?? 0;

    if (!trySpendResource(heya, "politicalCapital", 10)) {
      return false;
    }

    heya.scandalScore = adjustScore(scandalScore, -2, 0, 100);
    return true;
  },
  buildEvent: () => ({
    action: "maintenance_spend",
    spent: 10,
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
