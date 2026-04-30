// @ts-nocheck
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
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { rollWeeklyInjury } from "../../systems/health/InjuryService";
import { tickRikishiRecovery } from "../../systems/health/RecoveryService";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getHeyaStaffBonuses } from "../../staff";
import type {
  InjurySeverity,
  InjuryBodyArea,
  InjuryType,
} from "../../systems/health/BodyDefinitions";

interface CurrentInjury {
  id: string;
  severity: InjurySeverity;
  area: InjuryBodyArea;
  type: InjuryType;
  weeksOut: number;
  weekOccurred: number;
}

interface RikishiWithFatigue extends Rikishi {
  fatigue?: number;
  currentInjury?: CurrentInjury;
}

export function phase01_week_health(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_health");

  for (const [id, rikishi] of world.rikishi) {
    if (rikishi.isRetired) continue;

    const r = { ...rikishi };
    let changed = false;

    if (r.injured) {
      changed = processRecovery(world, r, builder);
    } else {
      changed = processInjuryRoll(world, r, builder);
    }

    if (changed) {
      builder.updateRikishi(id, r);
    }
  }

  return builder.build();
}

// --- Helper Functions ---

function processRecovery(world: WorldState, r: Rikishi, builder: ImpactBuilder): boolean {
  const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
  const recovered = tickRikishiRecovery(r, staffBonuses.medical);

  if (recovered) {
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "welfare",
      {
        rikishiId: r.id,
        heyaId: r.heyaId,
        shikona: r.shikona || r.name,
        status: "recovery",
      },
      { rikishiId: r.id, heyaId: r.heyaId }
    );
  }

  return true;
}

function processInjuryRoll(
  world: WorldState,
  r: RikishiWithFatigue,
  builder: ImpactBuilder
): boolean {
  const seededRng = RNGRegistry.getSystemRNG(world, "health", `tick::${r.id}::${world.week}`);
  const fatigue = r.fatigue ?? 0;
  const result = rollWeeklyInjury({ rng: seededRng, rikishi: r, fatigue });

  if (result) {
    r.injured = true;
    r.injuryWeeksRemaining = result.weeksOut;
    r.currentInjury = {
      id: seededRng.uuid("IJ"),
      severity: result.severity,
      area: result.area,
      type: result.type,
      weeksOut: result.weeksOut,
      weekOccurred: world.week ?? 0,
    };

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "welfare",
      {
        rikishiId: r.id,
        heyaId: r.heyaId,
        shikona: r.shikona || r.name,
        status: "injury",
        reason: result.area,
        score: result.weeksOut,
      },
      { rikishiId: r.id, heyaId: r.heyaId }
    );

    return true;
  }

  return false;
}
