import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { OyakataArchetype } from "@/engine/types/oyakata";
import { checkRetirement } from "@/engine/lifecycle/retirementCheck";
import { retireRikishiFully } from "@/engine/lifecycle/processRetirements";
import type { Rikishi } from "@/engine/types/rikishi";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import {
  StrategyContext,
  StrategyRule,
  evaluateRulesCumulative,
  TraitChecks,
} from "@/engine/strategy/NPCStrategyFramework";
import { getRikishi } from "@/engine/queries";
import { foreignRetentionMultiplier } from "@/engine/npcAI/ForeignSlotPolicy";

interface RetirementStrategy {
  evaluateRetirements: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

const NATURAL_RETIREMENT_RULE: StrategyRule = {
  id: "ret_natural",
  condition: (ctx) => {
    // Check if ANY rikishi in heya wants to retire naturally
    return [...new Set(ctx.heya.rikishiIds ?? [])].some((id) => {
      const r = getRikishi(ctx.world, id);
      return r && checkRetirement(r, ctx.world.year, ctx.world.seed);
    });
  },
  action: (ctx) => {
    const builder = createImpactBuilder("ret_natural");
    for (const id of [...new Set(ctx.heya.rikishiIds ?? [])]) {
      const r = getRikishi(ctx.world, id);
      if (!r) continue;
      const reason = checkRetirement(r, ctx.world.year, ctx.world.seed);
      if (reason) {
        retireRikishiFully(ctx.world, r, reason, builder);
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
    return new Set(ctx.heya.rikishiIds ?? []).size >= 15;
  },
  action: (ctx) => {
    const builder = createImpactBuilder("ret_force_stagnant");
    // §9.3 sunk-cost retention: foreign-slot rikishi get a retention bonus on
    // the release-ordering key, so a heya clears equivalent natives first.
    const candidates = [...new Set(ctx.heya.rikishiIds ?? [])]
      .map((id) => getRikishi(ctx.world, id))
      .filter(
        (r): r is Rikishi =>
          !!r && ctx.world.year - r.birthYear > 32 && ctx.world.year - r.birthYear >= 28
      )
      .sort(
        (a, b) =>
          (a.stats.power ?? 50) * foreignRetentionMultiplier(a, ctx.oyakata, ctx.world.year) -
          (b.stats.power ?? 50) * foreignRetentionMultiplier(b, ctx.oyakata, ctx.world.year)
      );

    if (candidates.length > 0) {
      retireRikishiFully(
        ctx.world,
        candidates[0],
        "Forced retirement due to stable restructuring",
        builder
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
