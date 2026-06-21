/**
 * NPCGovernanceCalculator.ts
 * ========================
 * Pure calculation logic for NPC governance decisions.
 * Uses NPCStrategyFramework to eliminate duplication.
 */

import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { OyakataArchetype } from "../types/oyakata";
import {
  StrategyContext,
  StrategyRule,
  evaluateRulesCumulative,
  TraitChecks,
} from "./NPCStrategyFramework";
import { getAvailableStables } from "../selectors";

const REDUCE_SCANDAL_RULE: StrategyRule = {
  id: "gov_reduce_scandal",
  condition: (ctx) => (ctx.heya.scandalScore ?? 0) >= 20 && (ctx.heya.politicalCapital ?? 0) >= 20,
  action: (ctx) => {
    const builder = createImpactBuilder("gov_reduce_scandal");
    const reduction = ctx.oyakata.archetype === "scientist" ? 8 : 5;
    builder.updateHeya(ctx.heya.id, {
      politicalCapital: (ctx.heya.politicalCapital ?? 0) - 20,
      scandalScore: Math.max(0, (ctx.heya.scandalScore ?? 0) - reduction),
    });
    return builder.build();
  },
  buildEvent: () => ({
    action: "reduce_scandal",
    reasoning: "Spending political capital to suppress growing stable scandals.",
  }),
  importance: "notable",
};

const POLITICAL_SABOTAGE_RULE: StrategyRule = {
  id: "gov_sabotage",
  condition: (ctx) => {
    if ((ctx.heya.politicalCapital ?? 0) < 40) return false;
    if (!TraitChecks.isVindictive()(ctx.oyakata) && !TraitChecks.isAmbitious(70)(ctx.oyakata))
      return false;

    const rivals = getAvailableStables(ctx.world).filter(
      (h) => h.id !== ctx.heya.id && (h.scandalScore ?? 0) > 15
    );
    return rivals.length > 0;
  },
  action: (ctx) => {
    const builder = createImpactBuilder("gov_sabotage");
    const rivals = getAvailableStables(ctx.world).filter(
      (h) => h.id !== ctx.heya.id && (h.scandalScore ?? 0) > 15
    );
    const target = rivals[0];

    builder.updateHeya(ctx.heya.id, { politicalCapital: (ctx.heya.politicalCapital ?? 0) - 30 });

    builder.logEvent(
      "NARRATIVE_CRISIS_TRIGGERED",
      "narrative",
      {
        heyaId: target.id,
        title: "Leaked Internal Memo",
        description: `An anonymous source from a rival stable has leaked damaging documents about ${target.name}'s internal conduct.`,
      },
      { importance: "major" }
    );

    return builder.build();
  },
  buildEvent: () => ({
    action: "political_sabotage",
    reasoning:
      "Leveraging political capital to expose the scandals of rivals and diminish their standing.",
  }),
  importance: "major",
};

const MAINTAIN_STANDING_RULE: StrategyRule = {
  id: "gov_maintain_standing",
  condition: (ctx) =>
    TraitChecks.isTraditionalist()(ctx.oyakata) &&
    (ctx.heya.scandalScore ?? 0) >= 5 &&
    (ctx.heya.politicalCapital ?? 0) >= 15,
  action: (ctx) => {
    const builder = createImpactBuilder("gov_maintain_standing");
    builder.updateHeya(ctx.heya.id, {
      politicalCapital: (ctx.heya.politicalCapital ?? 0) - 10,
      scandalScore: Math.max(0, (ctx.heya.scandalScore ?? 0) - 3),
    });
    return builder.build();
  },
  buildEvent: () => ({
    action: "maintain_standing",
    reasoning:
      "Traditionalist oyakata preserving the honor of the heya through diplomatic channels.",
  }),
};

const governanceRules: StrategyRule[] = [
  REDUCE_SCANDAL_RULE,
  POLITICAL_SABOTAGE_RULE,
  MAINTAIN_STANDING_RULE,
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Evaluate governance decisions for an NPC heya.
 * Returns a StateImpact describing any actions taken.
 */
export function evaluateGovernanceStrategy(ctx: StrategyContext): StateImpact {
  return evaluateRulesCumulative(ctx, governanceRules);
}

const GOVERNANCE_STRATEGIES: Record<OyakataArchetype, (ctx: StrategyContext) => StateImpact> = {
  traditionalist: evaluateGovernanceStrategy,
  scientist: evaluateGovernanceStrategy,
  gambler: evaluateGovernanceStrategy,
  nurturer: evaluateGovernanceStrategy,
  tyrant: evaluateGovernanceStrategy,
  strategist: evaluateGovernanceStrategy,
  strict: evaluateGovernanceStrategy,
  indulgent: evaluateGovernanceStrategy,
};

export function getGovernanceStrategy(
  archetype: OyakataArchetype
): (ctx: StrategyContext) => StateImpact {
  return GOVERNANCE_STRATEGIES[archetype] || evaluateGovernanceStrategy;
}
