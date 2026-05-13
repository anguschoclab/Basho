import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import {
  StrategyContext,
  StrategyRule,
  evaluateRulesCumulative,
  TraitChecks,
} from "./strategy/NPCStrategyFramework";
import { getAvailableStables } from "./selectors";

interface GovernanceStrategy {
  evaluateGovernanceDecisions: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

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

    // Find a rival with high scandal
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
    const target = rivals[0]; // Simplification: pick first high-scandal rival

    builder.updateHeya(ctx.heya.id, { politicalCapital: (ctx.heya.politicalCapital ?? 0) - 30 });

    // Trigger a media event for the rival
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
  buildEvent: (ctx) => ({
    action: "political_sabotage",
    reasoning: `Leveraging political capital to expose the scandals of rivals and diminish their standing.`,
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

export const DefaultGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const ctx: StrategyContext = { world, heya, oyakata };
    const rules = [REDUCE_SCANDAL_RULE, POLITICAL_SABOTAGE_RULE, MAINTAIN_STANDING_RULE];
    return evaluateRulesCumulative(ctx, rules);
  },
};

const GOVERNANCE_STRATEGIES: Record<OyakataArchetype, GovernanceStrategy> = {
  traditionalist: DefaultGovernanceStrategy,
  scientist: DefaultGovernanceStrategy,
  gambler: DefaultGovernanceStrategy,
  nurturer: DefaultGovernanceStrategy,
  tyrant: DefaultGovernanceStrategy,
  strategist: DefaultGovernanceStrategy,
  strict: DefaultGovernanceStrategy,
  indulgent: DefaultGovernanceStrategy,
};

export function getGovernanceStrategy(archetype: OyakataArchetype): GovernanceStrategy {
  return GOVERNANCE_STRATEGIES[archetype] || DefaultGovernanceStrategy;
}
