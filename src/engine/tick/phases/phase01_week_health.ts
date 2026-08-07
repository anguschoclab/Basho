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
import { getRikishi } from "../../queries";

interface CurrentInjury {
  id: string;
  severity: InjurySeverity;
  area: InjuryBodyArea;
  type: InjuryType;
  weeksOut: number;
  weekOccurred: number;
}

interface RikishiWithFatigue extends Rikishi {
  currentInjury?: CurrentInjury;
}

export function phase01_week_health(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_health");

  for (const id of world.activeRikishiIds) {
    const rikishi = getRikishi(world, id);
    if (!rikishi) continue;

    const r = { ...rikishi };
    let changed = false;

    if (r.injured) {
      processRecovery(world, r, builder);
      // Always persist recovery progress — tickRikishiRecovery mutates r in place
      // (reduces injuryWeeksRemaining), and partial recovery must be saved.
      changed = true;
    } else if (world.cyclePhase !== "active_basho") {
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
  const activeModifiers = world.transientContext?.activeModifiers;
  const recoveryMultiplier = activeModifiers?.recoveryMultiplier ?? 1.0;
  // Combine staff medical bonus with facility/nutrition-derived recoveryMultiplier
  const effectiveRecoveryMult = staffBonuses.medical * recoveryMultiplier;
  const recovered = tickRikishiRecovery(r, effectiveRecoveryMult);

  if (recovered) {
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "injury",
      {
        rikishiId: r.id,
        heyaId: r.heyaId,
        shikona: r.shikona || r.name,
        status: "recovery",
      },
      { rikishiId: r.id, heyaId: r.heyaId }
    );
  }

  return recovered;
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
      "injury",
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
