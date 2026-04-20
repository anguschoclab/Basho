/**
 * BloodlineService.ts
 * ===================
 * Manages heritable stat bonuses from legendary retired rikishi.
 * (Phase 5: The Legacy Engine)
 */

import type { Rikishi } from "../../types/rikishi";
import type { BloodlineTrait, BloodlineRegistry } from "../../types/dynasty";
import { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

/** Minimum thresholds for a rikishi to leave a bloodline trait on retirement. */
const REGISTER_THRESHOLDS = {
  yokozuna: { minYusho: 1, ceilingBonus: 8, label: "Iron Wrists" },
  ozeki: { minYusho: 0, ceilingBonus: 5, label: "Granite Base" },
  sekiwake: { minYusho: 0, ceilingBonus: 3, label: "Stoic Foundation" },
} as const;

export const BloodlineService = {
  /**
   * Called on retirement: if the rikishi meets thresholds, register a trait.
   */
  registerBloodlineOnRetirement(world: WorldState, rikishi: Rikishi): StateImpact {
    const builder = createImpactBuilder("registerBloodlineOnRetirement");
    const rankThreshold = REGISTER_THRESHOLDS[rikishi.rank as keyof typeof REGISTER_THRESHOLDS];
    if (!rankThreshold) return builder.build();

    // Use the rikishi's peak stat to determine which stat the bloodline grants
    const stats: import("../../types/rikishi").RikishiStats = rikishi.stats;
    const peakStat = this.findPeakStat(stats);

    const trait: BloodlineTrait = {
      traitId: `bl_${rikishi.id}`,
      label: rankThreshold.label,
      description: `Rikishi carrying the bloodline of ${rikishi.shikona} show natural strength in ${peakStat}.`,
      statFloorBonus: { [peakStat]: 6 },
      ceilingBonus: rankThreshold.ceilingBonus,
      ancestorShikona: rikishi.shikona,
      registeredYear: world.year,
    };

    const existing = world.bloodlineRegistry;
    const registry: BloodlineRegistry = {
      traits: {
        ...(existing?.traits ?? {}),
        [trait.traitId]: trait,
      },
    };

    builder.updateWorldField("bloodlineRegistry", registry);
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: rikishi.id,
        shikona: rikishi.shikona,
        status: "bloodline_registered",
        incident: `A new bloodline has been established: "${trait.label}" — passed down from ${rikishi.shikona}.`,
      },
      { rikishiId: rikishi.id, importance: "notable" }
    );

    return builder.build();
  },

  /**
   * Called during candidate generation for domestic candidates.
   * Checks if the candidate's lineage maps to a known trait and applies bonuses.
   */
  applyBloodline(
    candidateStats: Partial<import("../../types/rikishi").RikishiStats>,
    lineageId: string | undefined,
    worldRegistry: BloodlineRegistry | undefined
  ): Partial<import("../../types/rikishi").RikishiStats> {
    if (!lineageId || !worldRegistry?.traits[lineageId]) return candidateStats;
    const trait = worldRegistry.traits[lineageId];
    const boosted = { ...candidateStats };

    const traitEntries = Object.entries(trait.statFloorBonus) as Array<
      [keyof import("../../types/rikishi").RikishiStats, number]
    >;

    for (const [stat, bonus] of traitEntries) {
      const current = boosted[stat] ?? 50;
      boosted[stat] = Math.min(99, current + bonus);
    }
    return boosted;
  },

  findPeakStat(
    stats: import("../../types/rikishi").RikishiStats
  ): keyof import("../../types/rikishi").RikishiStats {
    const keys: Array<keyof import("../../types/rikishi").RikishiStats> = [
      "strength",
      "technique",
      "speed",
      "stamina",
      "mental",
      "adaptability",
      "balance",
    ];
    let peak: keyof import("../../types/rikishi").RikishiStats = "technique";
    let peakVal = -1;
    for (const key of keys) {
      const val = stats[key] ?? 0;
      if (val > peakVal) {
        peakVal = val;
        peak = key;
      }
    }
    return peak;
  },
};
