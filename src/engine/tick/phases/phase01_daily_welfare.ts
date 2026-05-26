// @ts-nocheck
/**
 * phase01_daily_welfare.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Daily rikishi maintenance.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { WelfareService } from "../../systems/welfare/WelfareService";
import { toRikishiDescriptor } from "../../descriptorBands";
import { clamp } from "../../utils";
import { rngFromSeed } from "../../rng";
import { tickCondition } from "../conditionTick";
import {
  MAX_MENTAL_STAT,
  MIN_MENTAL_STAT,
  DEFAULT_MENTAL_STAT,
} from "../../../constants/engine/health";
import {
  MIN_WEIGHT,
  WEIGHT_LOSS_STARVATION,
  MENTAL_LOSS_STARVATION,
  WEIGHT_GAIN_HIGH_CALORIE,
  MENTAL_LOSS_POOR,
  WEIGHT_GAIN_MODERATE,
  MENTAL_GAIN_GOOD,
  FATIGUE_RECOVERY_GOOD,
} from "../../../constants/engine/condition";

export function phase01_daily_welfare(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_daily_welfare");

  // Cache heya diets
  const heyaDietCache = new Map<string, string>();
  for (const heya of world.heyas.values()) {
    heyaDietCache.set(
      heya.id,
      WelfareService.ensureHeyaWelfareState(heya).activeDiet || "maintenance"
    );
  }

  for (const id of world.activeRikishiIds) {
    const r = world.rikishi.get(id);
    if (!r) continue;

    const next = { ...r };

    // 1. Sync Descriptor
    const rikishiRng = rngFromSeed(`desc-${world.dayIndexGlobal}-${id}`, "narrative", "rikishi");
    next.descriptor = toRikishiDescriptor(rikishiRng, next, next.descriptor);

    // 2. Diet Effects
    const diet = heyaDietCache.get(next.heyaId);
    if (diet === "austerity") {
      next.weight = Math.max(MIN_WEIGHT, next.weight - WEIGHT_LOSS_STARVATION);
      if (next.stats) {
        next.stats = {
          ...next.stats,
          mental: Math.max(MIN_MENTAL_STAT, (next.stats.mental || DEFAULT_MENTAL_STAT) - MENTAL_LOSS_STARVATION),
        };
      }
    } else if (diet === "heavy_bulk") {
      next.weight += WEIGHT_GAIN_HIGH_CALORIE;
      if (next.stats) {
        next.stats = {
          ...next.stats,
          mental: Math.max(MIN_MENTAL_STAT, (next.stats.mental || DEFAULT_MENTAL_STAT) - MENTAL_LOSS_POOR),
        };
      }
    } else if (diet === "premium") {
      next.weight += WEIGHT_GAIN_MODERATE;
      if (next.stats) {
        next.stats = {
          ...next.stats,
          mental: Math.min(MAX_MENTAL_STAT, (next.stats.mental || DEFAULT_MENTAL_STAT) + MENTAL_GAIN_GOOD),
        };
      }
      if (!next.injured && (next.fatigue ?? 0) > 0) {
        next.fatigue = Math.max(0, (next.fatigue ?? 0) - 1); // Premium recovery
      }
    }

    // 3. Base Daily Fatigue Recovery
    if (!next.injured && (next.fatigue ?? 0) > 0) {
      next.fatigue = Math.max(0, (next.fatigue ?? 0) - FATIGUE_RECOVERY_GOOD);
    }

    // 4. Condition decay (during basho) / recovery (during off-season)
    const withCondition = tickCondition(
      next as unknown as import("../../types/rikishi").Rikishi,
      world.cyclePhase as Parameters<typeof tickCondition>[1]
    );
    next.condition = withCondition.condition;

    builder.updateRikishi(id, next);
  }

  return builder.build();
}
