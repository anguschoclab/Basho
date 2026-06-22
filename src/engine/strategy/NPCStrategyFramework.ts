/**
 * NPCStrategyFramework.ts
 * =======================
 * Shared framework for all NPC strategy evaluations.
 * Eliminates duplication in strategy pattern: condition → threshold → action → event
 */

import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";

import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";
import {
  THRESHOLD_BOOST_HIGH,
  THRESHOLD_BOOST_MODERATE,
  THRESHOLD_BOOST_LOW,
  DEFAULT_TRAIT_VALUE,
  TRAIT_MULTIPLIER_DIVISOR,
  ADJUST_SCORE_DEFAULT_MIN,
  ADJUST_SCORE_DEFAULT_MAX,
  TRAIT_AMBITION_THRESHOLD,
  TRAIT_RISK_LOW_THRESHOLD,
  TRAIT_TRADITION_THRESHOLD,
  TRAIT_RISK_HIGH_THRESHOLD,
  TRAIT_COMPASSION_THRESHOLD,
  TRAIT_PATIENCE_THRESHOLD,
  TRAIT_GREEDY_RISK_THRESHOLD,
  TRAIT_VINDICTIVE_AMBITION_THRESHOLD,
  TRAIT_VINDICTIVE_RISK_THRESHOLD,
} from "../../constants/engine/npcStrategy";

/** Base context for all strategy evaluations */
export interface StrategyContext {
  world: WorldState;
  heya: Heya;
  oyakata: Oyakata;
}

/** Trait condition check */
export type TraitCheck = (oyakata: Oyakata) => boolean;

/** Threshold calculator based on traits and state */
export type ThresholdCalculator = (ctx: StrategyContext) => number;

/** Decision action that returns a state impact */
export type StrategyAction = (ctx: StrategyContext) => StateImpact;

/** Event to emit on successful action */
export interface StrategyEvent {
  action: string;
  reasoning: string;
  [key: string]: unknown;
}

/** Complete strategy rule: condition + action + event */
export interface StrategyRule {
  /** Unique identifier for this rule */
  id: string;
  /** Check if this rule should be evaluated */
  condition: (ctx: StrategyContext) => boolean;
  /** Attempt the strategy action, return StateImpact */
  action: (ctx: StrategyContext) => StateImpact;
  /** Generate event details on success */
  buildEvent: (ctx: StrategyContext) => StrategyEvent;
  /** Event importance */
  importance?: "headline" | "major" | "notable" | "minor";
}

/**
 * Evaluate a single strategy rule.
 * @returns StateImpact if rule was executed, empty impact otherwise
 */
export function evaluateRule(ctx: StrategyContext, rule: StrategyRule): StateImpact {
  if (!rule.condition(ctx)) return createImpactBuilder(rule.id).build();

  const impact = rule.action(ctx);
  // Check if impact actually did something (rough check via events or updates)
  const hasChanges =
    (impact.entities && Object.keys(impact.entities).length > 0) ||
    (impact.worldFields && Object.keys(impact.worldFields).length > 0) ||
    (impact.arrayAppends && impact.arrayAppends.length > 0);

  if (hasChanges) {
    const event = rule.buildEvent(ctx);
    const builder = createImpactBuilder(rule.id);
    builder.merge(impact);
    builder.logEvent(
      "NPC_MANAGER_DECISION",
      "narrative",
      {
        archetype: ctx.oyakata.archetype,
        ...event,
      },
      {
        heyaId: ctx.heya.id,
        importance: rule.importance ?? "minor",
      }
    );
    return builder.build();
  }
  return impact;
}

/**
 * Evaluate multiple rules in priority order.
 * Stops after first executed rule (mutually exclusive strategies).
 */
export function evaluateRulesExclusive(ctx: StrategyContext, rules: StrategyRule[]): StateImpact {
  for (const rule of rules) {
    const impact = evaluateRule(ctx, rule);
    const hasChanges =
      (impact.entities && Object.keys(impact.entities).length > 0) ||
      (impact.worldFields && Object.keys(impact.worldFields).length > 0) ||
      (impact.arrayAppends && impact.arrayAppends.length > 0) ||
      (impact.events && impact.events.length > 0);
    if (hasChanges) {
      return impact; // Stop after first match
    }
  }
  return createImpactBuilder("exclusive_fallback").build();
}

/**
 * Evaluate all rules regardless of execution (cumulative strategies).
 */
export function evaluateRulesCumulative(ctx: StrategyContext, rules: StrategyRule[]): StateImpact {
  const finalBuilder = createImpactBuilder("cumulative_rules");
  for (const rule of rules) {
    finalBuilder.merge(evaluateRule(ctx, rule));
  }
  return finalBuilder.build();
}

// ============================================================================
// Common Trait Checks (DRY extraction from strategy files)
// ============================================================================

export const TraitChecks = {
  isAmbitious:
    (threshold = TRAIT_AMBITION_THRESHOLD): TraitCheck =>
    (o) =>
      (o.traits.ambition ?? 0) > threshold,

  isHoarder:
    (threshold = TRAIT_RISK_LOW_THRESHOLD): TraitCheck =>
    (o) =>
      (o.traits.risk ?? 50) < threshold,

  isTraditionalist:
    (threshold = TRAIT_TRADITION_THRESHOLD): TraitCheck =>
    (o) =>
      (o.traits.tradition ?? 0) > threshold,

  isRiskTaker:
    (threshold = TRAIT_RISK_HIGH_THRESHOLD): TraitCheck =>
    (o) =>
      (o.traits.risk ?? 50) > threshold,

  isCompassionate:
    (threshold = TRAIT_COMPASSION_THRESHOLD): TraitCheck =>
    (o) =>
      (o.traits.compassion ?? 0) > threshold,

  isPatient:
    (threshold = TRAIT_PATIENCE_THRESHOLD): TraitCheck =>
    (o) =>
      (o.traits.patience ?? 0) > threshold,

  isVindictive: (): TraitCheck => (o) =>
    o.temperament === "Vindictive" ||
    (o.traits.ambition > TRAIT_VINDICTIVE_AMBITION_THRESHOLD &&
      o.traits.risk > TRAIT_VINDICTIVE_RISK_THRESHOLD),

  isGreedy: (): TraitCheck => (o) =>
    o.traits.risk < TRAIT_GREEDY_RISK_THRESHOLD || (o.quirks?.includes("Numbers Guy") ?? false),

  hasMood:
    (mood: Oyakata["mood"]): TraitCheck =>
    (o) =>
      o.mood === mood,
};

// ============================================================================
// Common Threshold Calculators
// ============================================================================

export function calculateMoodAdjustedThreshold(baseThreshold: number, oyakata: Oyakata): number {
  switch (oyakata.mood) {
    case "anxious":
      return baseThreshold * THRESHOLD_BOOST_HIGH;
    case "obsessed":
      return baseThreshold * THRESHOLD_BOOST_MODERATE;
    case "furious":
      return baseThreshold * THRESHOLD_BOOST_LOW;
    default:
      return baseThreshold;
  }
}

export function calculateTraitAdjustedThreshold(
  baseThreshold: number,
  oyakata: Oyakata,
  trait: keyof Oyakata["traits"],
  traitMultiplier: number
): number {
  const traitValue = oyakata.traits[trait] ?? DEFAULT_TRAIT_VALUE;
  const adjustment =
    ((traitValue - DEFAULT_TRAIT_VALUE) / TRAIT_MULTIPLIER_DIVISOR) * traitMultiplier;
  return baseThreshold * (1 + adjustment);
}

// ============================================================================
// Common Resource Helpers
// ============================================================================

/**
 * Attempt to spend a resource with bounds checking.
 * Mutates the heya object if successful.
 * @returns true if spend was successful
 */
export function trySpendResource(
  heya: Heya,
  resource: "funds" | "politicalCapital",
  amount: number
): boolean {
  const current = (heya[resource] as number | undefined) ?? 0;
  if (current < amount) return false;

  (heya[resource] as number) = current - amount;
  return true;
}

/**
 * Adjust a numeric score within bounds.
 */
export function adjustScore(
  current: number,
  delta: number,
  min = ADJUST_SCORE_DEFAULT_MIN,
  max = ADJUST_SCORE_DEFAULT_MAX
): number {
  return Math.max(min, Math.min(max, current + delta));
}
