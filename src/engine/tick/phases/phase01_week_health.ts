/**
 * phase01_week_health.ts
 * ======================
 * Pipeline Phase: Weekly Health Checks.
 * 
 * Responsibilities:
 * 1. Roll for new injuries for all active rikishi.
 * 2. Advance recovery for already injured rikishi.
 */

import type { WorldState } from "../../types/world";
import { 
  rollWeeklyInjury,
} from "../../systems/health/InjuryService";
//@ts-ignore
import { tickRikishiRecovery } from "../../systems/health/RecoveryService";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getHeyaStaffBonuses } from "../../staff";
import { EventBus } from "../../events";

export function phase01_week_health(world: WorldState): WorldState {
  const nextRikishi = new Map(world.rikishi);
  
  for (const [id, rikishi] of world.rikishi) {
    if (rikishi.isRetired) continue;

    const r = { ...rikishi };
    let changed = false;

    // 1. Recovery Logic
    if (r.injured) {
      const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
      const recovered = tickRikishiRecovery(r, staffBonuses.medical);
      changed = true;

      if (recovered) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona || r.name,
          status: "recovery"
        });
      }
    }

    // 2. Injury Logic (only if not already recovering this week)
    if (!r.injured) {
      const seededRng = RNGRegistry.getSystemRNG(world, "health", `tick::${r.id}::${world.week}`);
      const fatigue = (r as any).fatigue ?? 0;
      const result = rollWeeklyInjury({ rng: seededRng, rikishi: r, fatigue });

      if (result) {
        r.injured = true;
        r.injuryWeeksRemaining = result.weeksOut;
        (r as any).currentInjury = {
          id: seededRng.uuid('IJ'),
          severity: result.severity,
          area: result.area,
          type: result.type,
          weeksOut: result.weeksOut,
          weekOccurred: world.week ?? 0,
        };
        changed = true;

        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona || r.name,
          status: "injury",
          reason: result.area,
          score: result.weeksOut
        });
      }
    }

    if (changed) {
      nextRikishi.set(id, r);
    }
  }

  return {
    ...world,
    rikishi: nextRikishi
  };
}
