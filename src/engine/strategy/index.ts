/**
 * Strategy Module
 * ===============
 * Centralized NPC decision-making framework.
 *
 * This module provides:
 * 1. NPCStrategyFramework - Shared evaluation patterns (rules-based system)
 * 2. NPC*Calculator - Domain-specific calculation logic
 * 3. Legacy compatibility exports for gradual migration
 */

// ============================================================================
// Framework (DRY foundation)
// ============================================================================
export {
  type StrategyContext,
  type StrategyRule,
  type TraitCheck,
  type ThresholdCalculator,
  type StrategyAction,
  type StrategyEvent,
  evaluateRule,
  evaluateRulesExclusive,
  evaluateRulesCumulative,
  TraitChecks,
  calculateMoodAdjustedThreshold,
  calculateTraitAdjustedThreshold,
  trySpendResource,
  adjustScore,
} from "./NPCStrategyFramework";

// ============================================================================
// Domain Calculators (pure calculation logic)
// ============================================================================
export { evaluateFinanceStrategy } from "./NPCFinanceCalculator";

export { evaluateGovernanceStrategy } from "./NPCGovernanceCalculator";

// ============================================================================
// Re-export from legacy locations (for backward compatibility)
// ============================================================================
// Note: Other strategies (media, recruitment, retirement, sponsor) will be
// migrated to this pattern incrementally.
