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

  const events: any[] = [];

  for (const [id, rikishi] of world.rikishi) {
    if (rikishi.isRetired) continue;

    const r = { ...rikishi };
    let changed = false;

    if (r.injured) {
      changed = processRecovery(world, r, events);
    } else {
      changed = processInjuryRoll(world, r, events);
    }

    if (changed) {
      nextRikishi.set(id, r);
    }
  }

  let nextWorld = {
    ...world,
    rikishi: nextRikishi,
  };

  for (const event of events) {
    EventBus.lifecycleEvent(nextWorld, {
      rikishiId: event.rikishiId,
      heyaId: event.heyaId,
      shikona: event.shikona,
      status: event.status,
      reason: event.reason,
      score: event.score,
    });
  }

  return nextWorld;
}

// --- Helper Functions ---

function processRecovery(world: WorldState, r: Rikishi, events: any[]): boolean {
  const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
  const recovered = tickRikishiRecovery(r, staffBonuses.medical);

  if (recovered) {
    events.push({
      type: 'lifecycleEvent',
      rikishiId: r.id,
      heyaId: r.heyaId,
      shikona: r.shikona || r.name,
      status: "recovery",
    });
  }

  return true;
}

function processInjuryRoll(world: WorldState, r: Rikishi, events: any[]): boolean {
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

    events.push({
      type: 'lifecycleEvent',
      rikishiId: r.id,
      heyaId: r.heyaId,
      shikona: r.shikona || r.name,
      status: "injury",
      reason: result.area,
      score: result.weeksOut,
    });

    return true;
  }

  return false;
}
