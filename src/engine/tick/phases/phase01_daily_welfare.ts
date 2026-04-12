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

  for (const [id, r] of world.rikishi) {
    if (r.isRetired) continue;

    const next = { ...r };

    // 1. Sync Descriptor
    const rikishiRng = rngFromSeed(`desc-${world.dayIndexGlobal}-${id}`, "narrative", "rikishi");
    next.descriptor = toRikishiDescriptor(rikishiRng, next, next.descriptor);

    // 2. Diet Effects
    const diet = heyaDietCache.get(next.heyaId);
    if (diet === "austerity") {
      next.weight = Math.max(70, next.weight - 0.05);
      if (next.stats) {
        next.stats = { ...next.stats, mental: Math.max(1, (next.stats.mental || 50) - 0.5) };
      }
    } else if (diet === "heavy_bulk") {
      next.weight += 0.1;
      if (next.stats) {
        next.stats = { ...next.stats, mental: Math.max(1, (next.stats.mental || 50) - 0.2) };
      }
    } else if (diet === "premium") {
      next.weight += 0.08;
      if (next.stats) {
        next.stats = { ...next.stats, mental: Math.min(100, (next.stats.mental || 50) + 0.5) };
      }
      if (!next.injured && (next.fatigue ?? 0) > 0) {
        next.fatigue = Math.max(0, (next.fatigue ?? 0) - 1); // Premium recovery
      }
    }

    // 3. Base Daily Fatigue Recovery
    if (!next.injured && (next.fatigue ?? 0) > 0) {
      next.fatigue = Math.max(0, (next.fatigue ?? 0) - 0.3);
    }

    builder.updateRikishi(id, next);
  }

  return builder.build();
}
