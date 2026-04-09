/**
 * phase04_welfare.ts
 * ==================
 * Pipeline Phase 4 — Stamina Recovery, Healing, Injury Rolls
 *
 * For each non-retired rikishi in the player stable:
 *   - Recover stamina: BASE_RECOVERY * activeModifiers.recoveryMultiplier
 *   - Progress existing injury healing
 *   - Roll weekly injury chance (seeded RNG, deterministic)
 *
 * New injuries are recorded in `transientContext.deltas.injuriesSustained`.
 * Phase 6 reads this list to generate headline events.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { rollWeeklyInjury } from "../../systems/health/InjuryService";
import { RNGRegistry } from "../../core/RNGRegistry";
import { stableSort } from "../../utils/sort";
import { clamp } from "../../utils";
import { getHeyaStaffBonuses } from "../../staff";


const BASE_STAMINA_RECOVERY = 12; // Stamina points recovered per week at 1.0×
const INJURY_HEAL_PER_WEEK = 1;   // Weeks of injury healed per week (normally 1:1)

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase04_welfare(world: WorldState): WorldState {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return world;

  const activeModifiers = world.transientContext?.activeModifiers;
  if (!activeModifiers) return world;

  const playerHeya = world.heyas.get(playerHeyaId);
  const playerRikishiIds = playerHeya?.rikishiIds ?? [];

  const rng = RNGRegistry.get("welfare", world.seed, `week${world.week}`);
  const nextRikishi = new Map(world.rikishi);
  const newInjuries: string[] = [];

  for (const rId of stableSort(playerRikishiIds, (id) => id)) {
    const r = world.rikishi.get(rId);
    if (!r || r.isRetired) continue;

    let next: Rikishi = { ...r };

    if (r.injured && (r.injuryWeeksRemaining ?? 0) > 0) {
      // Progress healing
      const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
      const healed = Math.max(
        0,
        (r.injuryWeeksRemaining ?? 0) -
          INJURY_HEAL_PER_WEEK * activeModifiers.recoveryMultiplier * staffBonuses.medical,
      );
      next = {
        ...next,
        injuryWeeksRemaining: Math.ceil(healed),
        injured: healed > 0,
      };

    } else if (!r.injured) {
      // Recover stamina
      const recoveryGain =
        BASE_STAMINA_RECOVERY * activeModifiers.recoveryMultiplier;
      const nextStamina = clamp(
        (r.stats?.stamina ?? 50) + recoveryGain,
        0,
        100,
      );
      next = {
        ...next,
        fatigue: clamp((r.fatigue ?? 0) - recoveryGain * 0.5, 0, 100),
        stats: next.stats ? { ...next.stats, stamina: nextStamina } : next.stats,
      };

      // Roll for new injury
      const injury = rollWeeklyInjury({
        rng,
        rikishi: r,
        fatigue: r.fatigue ?? 0,
      });
      if (injury) {
        next = {
          ...next,
          injured: true,
          injuryWeeksRemaining: injury.weeksOut,
        };
        newInjuries.push(rId);
      }
    }

    nextRikishi.set(rId, next);
  }

  const prevDeltas = world.transientContext!.deltas;
  return {
    ...world,
    rikishi: nextRikishi,
    transientContext: {
      activeModifiers,
      deltas: {
        ...prevDeltas,
        injuriesSustained: [...prevDeltas.injuriesSustained, ...newInjuries],
      },
    },
  };
}
