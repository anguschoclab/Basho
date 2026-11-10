/**
 * phase01_week_health.ts
 * ======================
 * Pipeline Phase: Weekly Health Checks.
 *
 * Responsibilities:
 * 1. Roll for new injuries for all active rikishi.
 * 2. Advance recovery for already injured rikishi.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { createImpactBuilder, type ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { rollWeeklyInjury } from "@/engine/health/InjuryService";
import { tickRikishiRecovery } from "@/engine/health/RecoveryService";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { getHeyaStaffBonuses } from "@/engine/economy/staff";
import type { InjurySeverity, InjuryBodyArea, InjuryType } from "@/engine/health/BodyDefinitions";
import { getRikishi } from "@/engine/core/queries";
import { recordGomenfuda } from "@/engine/governance/services/GomenfudaService";

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

    let r: RikishiWithFatigue = { ...rikishi };
    if (r.injuryStatus) r.injuryStatus = { ...r.injuryStatus };
    let changed = false;

    if (r.injured) {
      // tickRikishiRecovery is pure — adopt the returned rikishi so partial
      // recovery progress is persisted.
      r = processRecovery(world, r, builder);
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

function processRecovery(world: WorldState, r: Rikishi, builder: ImpactBuilder): Rikishi {
  const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
  // activeModifiers.recoveryMultiplier is derived from the PLAYER heya's
  // facilities/nutrition (phase02_context) — apply it to player rikishi only;
  // NPC heyas heal via their own staff bonuses alone.
  const activeModifiers = world.transientContext?.activeModifiers;
  const recoveryMultiplier =
    r.heyaId === world.playerHeyaId ? (activeModifiers?.recoveryMultiplier ?? 1.0) : 1.0;
  // Combine staff medical bonus with facility/nutrition-derived recoveryMultiplier
  const effectiveRecoveryMult = staffBonuses.medical * recoveryMultiplier;
  const { recovered, rikishi: updated } = tickRikishiRecovery(r, effectiveRecoveryMult);

  if (recovered) {
    // Clear the stale injury record — tickRikishiRecovery resets flags but
    // does not touch currentInjury.
    updated.currentInjury = undefined;
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

  return updated;
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
    // Welfare's serious-injury gates read injuryStatus.severity — without this
    // write every phase-rolled injury was invisible to compliance pressure.
    r.injuryStatus = {
      type: result.type,
      isInjured: true,
      severity: result.severity,
      location: result.area,
      weeksRemaining: result.weeksOut,
      weeksToHeal: result.weeksOut,
    };
    r.injury = r.injuryStatus;

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

    // Post gomenfuda (apology notice) when a rikishi is injured before a basho
    // and will miss the upcoming tournament.
    if (world.cyclePhase === "pre_basho" || world.cyclePhase === "interim") {
      const heya = world.heyas.get(r.heyaId);
      if (heya) {
        const bashoName = world.currentBashoName ?? "upcoming";
        const gomenfudaImpact = recordGomenfuda(world, heya, r, bashoName, "injury");
        builder.merge(gomenfudaImpact);
      }
    }

    return true;
  }

  return false;
}
