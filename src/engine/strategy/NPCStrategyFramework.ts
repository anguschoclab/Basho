/**
 * NPCStrategyFramework.ts
 * =======================
 * Shared framework for all NPC strategy evaluations.
 * Eliminates duplication in strategy pattern: condition → threshold → action → event
 */

import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";
import { EventBus } from "../events";

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

/** Decision action that may mutate world state */
export type StrategyAction = (ctx: StrategyContext) => boolean;

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
  /** Attempt the strategy action, return true if executed */
  action: (ctx: StrategyContext) => boolean;
  /** Generate event details on success */
  buildEvent: (ctx: StrategyContext) => StrategyEvent;
  /** Event importance */
  importance?: "headline" | "major" | "notable" | "minor";
}

/**
 * Evaluate a single strategy rule.
 * @returns true if rule was executed
 */
export function evaluateRule(ctx: StrategyContext, rule: StrategyRule): boolean {
  if (!rule.condition(ctx)) return false;

  const executed = rule.action(ctx);
  if (executed) {
    const event = rule.buildEvent(ctx);
    EventBus.managementDecision(
      ctx.world,
      ctx.heya.id,
      {
        archetype: ctx.oyakata.archetype,
        ...event,
      },
      rule.importance ?? "minor"
    );
  }
  return executed;
}

/**
 * Evaluate multiple rules in priority order.
 * Stops after first executed rule (mutually exclusive strategies).
 */
export function evaluateRulesExclusive(ctx: StrategyContext, rules: StrategyRule[]): boolean {
  for (const rule of rules) {
    if (evaluateRule(ctx, rule)) {
      return true; // Stop after first match
    }
  }
  return false;
}

/**
 * Evaluate all rules regardless of execution (cumulative strategies).
 */
export function evaluateRulesCumulative(ctx: StrategyContext, rules: StrategyRule[]): number {
  let executedCount = 0;
  for (const rule of rules) {
    if (evaluateRule(ctx, rule)) {
      executedCount++;
    }
  }
  return executedCount;
}

// ============================================================================
// Common Trait Checks (DRY extraction from strategy files)
// ============================================================================

export const TraitChecks = {
  isAmbitious:
    (threshold = 50): TraitCheck =>
    (o) =>
      (o.traits.ambition ?? 0) > threshold,

  isHoarder:
    (threshold = 30): TraitCheck =>
    (o) =>
      (o.traits.risk ?? 50) < threshold,

  isTraditionalist:
    (threshold = 70): TraitCheck =>
    (o) =>
      (o.traits.tradition ?? 0) > threshold,

  isRiskTaker:
    (threshold = 60): TraitCheck =>
    (o) =>
      (o.traits.risk ?? 50) > threshold,

  isCompassionate:
    (threshold = 70): TraitCheck =>
    (o) =>
      (o.traits.compassion ?? 0) > threshold,

  isPatient:
    (threshold = 70): TraitCheck =>
    (o) =>
      (o.traits.patience ?? 0) > threshold,

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
      return baseThreshold * 1.5;
    case "obsessed":
      return baseThreshold * 0.8;
    case "furious":
      return baseThreshold * 0.7;
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
  const traitValue = oyakata.traits[trait] ?? 50;
  const adjustment = ((traitValue - 50) / 50) * traitMultiplier;
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
export function adjustScore(current: number, delta: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, current + delta));
}
