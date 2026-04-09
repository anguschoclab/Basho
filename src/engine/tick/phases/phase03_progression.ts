/**
 * phase03_progression.ts
 * ======================
 * Pipeline Phase 3 — Training Gains, Fatigue, Age Decay
 *
 * Reads `transientContext.activeModifiers` (set by phase02) and calls the
 * pure `calculateGains()` function from TrainingMath for each active rikishi
 * in the player's stable.
 *
 * All stat deltas are recorded in `transientContext.deltas.statChanges` so
 * WeeklyDigest can display "+2 Strength" summaries without re-deriving them.
 *
 * NPC rikishi are handled by phase05_npcAI; this phase is player-heya only.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { calculateGains, calculateFatigueDelta } from "../../systems/training/TrainingMath";
import { ensureHeyaTrainingState } from "../../systems/training/TrainingService";
import { stableSort } from "../../utils/sort";
import { getHeyaStaffBonuses } from "../../staff";


// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase03_progression(world: WorldState): WorldState {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return world;

  const activeModifiers = world.transientContext?.activeModifiers;
  if (!activeModifiers) return world; // Phase 2 must run first

  const ts = ensureHeyaTrainingState(world, playerHeyaId);
  const profile = ts.activeProfile;

  // Clone rikishi map — only player stable entries are modified
  const nextRikishi = new Map(world.rikishi);
  const statChanges: Record<string, { stat: string; amount: number }[]> = {
    ...(world.transientContext?.deltas.statChanges ?? {}),
  };

  const playerHeya = world.heyas.get(playerHeyaId);
  const playerRikishiIds = playerHeya?.rikishiIds ?? [];

  for (const rId of stableSort(playerRikishiIds, (id) => id)) {
    const r = world.rikishi.get(rId);
    if (!r || r.isRetired || r.injured) continue;

    // Find individual focus for this rikishi
    const focus = ts.focusSlots?.find((f) => f.rikishiId === rId);

    // Apply gains using pure math + active modifiers
    const gains = calculateGains(r, activeModifiers, profile, focus);
    const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
    const fatigueDelta = calculateFatigueDelta(profile, focus);

    const changes: { stat: string; amount: number }[] = [];
    const nextStats = { ...(r.stats ?? {}) } as any;

    const statStaffMap: Record<string, keyof import("../../staff").StaffBonuses> = {
      strength: "conditioning",
      speed: "conditioning",
      technique: "technique",
      balance: "conditioning",
      stamina: "conditioning",
      adaptability: "technique", // small help
      mental: "technique"
    };

    for (const [stat, delta] of Object.entries(gains)) {
      if (delta === 0) continue;
      
      const mult = (staffBonuses as any)[statStaffMap[stat]] || 1.0;
      const finalDelta = delta * mult;

      const rounded = Math.round(finalDelta * 100) / 100; // keep 2dp precision
      if (nextStats[stat] !== undefined) {
        nextStats[stat] = Math.min(99, Math.max(0, nextStats[stat] + rounded));
      }
      changes.push({ stat, amount: rounded });
    }


    const nextFatigue = Math.min(100, Math.max(0, (r.fatigue ?? 0) + fatigueDelta));

    nextRikishi.set(rId, {
      ...r,
      stats: nextStats,
      fatigue: nextFatigue,
    });

    if (changes.length > 0) {
      statChanges[rId] = changes;
    }
  }

  return {
    ...world,
    rikishi: nextRikishi,
    transientContext: {
      activeModifiers,
      deltas: {
        ...world.transientContext!.deltas,
        statChanges,
      },
    },
  };
}
