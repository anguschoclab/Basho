import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { checkRetirement } from "./lifecycle";
import type { Rikishi } from "./types/rikishi";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import {
  StrategyContext,
  StrategyRule,
  evaluateRulesCumulative,
  TraitChecks,
} from "./strategy/NPCStrategyFramework";

interface RetirementStrategy {
  evaluateRetirements: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

const NATURAL_RETIREMENT_RULE: StrategyRule = {
  id: "ret_natural",
  condition: (ctx) => {
    // Check if ANY rikishi in heya wants to retire naturally
    return (ctx.heya.rikishiIds ?? []).some((id) => {
      const r = ctx.world.rikishi.get(id);
      return r && checkRetirement(r, ctx.world.calendar?.year ?? 2026, ctx.world.seed);
    });
  },
  action: (ctx) => {
    const builder = createImpactBuilder("ret_natural");
    for (const id of ctx.heya.rikishiIds ?? []) {
      const r = ctx.world.rikishi.get(id);
      if (!r) continue;
      const reason = checkRetirement(r, ctx.world.calendar?.year ?? 2026, ctx.world.seed);
      if (reason) {
        builder.retireRikishi(id, ctx.world.calendar?.year ?? 2026, reason);
      }
    }
    return builder.build();
  },
  buildEvent: () => ({
    action: "natural_retirement",
    reasoning: "Rikishi reaching natural career boundaries due to age or injury.",
  }),
};

const FORCE_RETIRE_STAGNANT_RULE: StrategyRule = {
  id: "ret_force_stagnant",
  condition: (ctx) => {
    if (!TraitChecks.isAmbitious(70)(ctx.oyakata)) return false;
    // Only force retire if heya is full and we have high ambition
    return (ctx.heya.rikishiIds?.length ?? 0) >= 15;
  },
  action: (ctx) => {
    const builder = createImpactBuilder("ret_force_stagnant");
    const candidates = (ctx.heya.rikishiIds ?? [])
      .map((id) => ctx.world.rikishi.get(id))
      .filter((r): r is Rikishi => !!r && (ctx.world.calendar?.year ?? 2026) - r.birthYear > 32)
      .sort((a, b) => (a.power ?? 50) - (b.power ?? 50));

    if (candidates.length > 0) {
      builder.retireRikishi(
        candidates[0].id,
        ctx.world.calendar?.year ?? 2026,
        "Forced retirement due to stable restructuring"
      );
    }
    return builder.build();
  },
  buildEvent: () => ({
    action: "forced_retirement",
    reasoning: "Ambitious oyakata clearing roster space for high-potential talent pool recruits.",
  }),
  importance: "notable",
};

export const DefaultRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const ctx: StrategyContext = { world, heya, oyakata };
    const rules = [NATURAL_RETIREMENT_RULE, FORCE_RETIRE_STAGNANT_RULE];
    return evaluateRulesCumulative(ctx, rules);
  },
};

const RETIREMENT_STRATEGIES: Record<OyakataArchetype, RetirementStrategy> = {
  traditionalist: DefaultRetirementStrategy,
  scientist: DefaultRetirementStrategy,
  gambler: DefaultRetirementStrategy,
  nurturer: DefaultRetirementStrategy,
  tyrant: DefaultRetirementStrategy,
  strategist: DefaultRetirementStrategy,
  strict: DefaultRetirementStrategy,
  indulgent: DefaultRetirementStrategy,
};

export function getRetirementStrategy(archetype: OyakataArchetype): RetirementStrategy {
  return RETIREMENT_STRATEGIES[archetype] || DefaultRetirementStrategy;
}
