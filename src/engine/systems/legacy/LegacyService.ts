/**
 * LegacyService.ts
 * ================
 * The unified system for rikishi ancestry, emergent bloodlines, and historical heritage.
 * (Phase 5: The Legacy Engine)
 */

import type { Rikishi, RikishiStats } from "../../types/rikishi";
import type { BloodlineTrait, BloodlineRegistry } from "../../types/dynasty";
import type { WorldState } from "../../types/world";
import type { TalentCandidate } from "../../types/talent";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { clampInt } from "../../utils/math";
import { BardEngine } from "../../bard/BardEngine";
import type { SeededRNG } from "../../rng";
import { rngForWorld } from "../../rng";

/** Minimum thresholds for a rikishi to leave a bloodline trait on retirement. */
const REGISTER_THRESHOLDS = {
  yokozuna: { minYusho: 1, ceilingBonus: 8, label: "Iron Wrists" },
  ozeki: { minYusho: 0, ceilingBonus: 5, label: "Granite Base" },
  sekiwake: { minYusho: 0, ceilingBonus: 3, label: "Stoic Foundation" },
} as const;

const numericKeys = new Set<keyof Pick<RikishiStats, "power" | "technique" | "speed" | "weight" | "stamina" | "mental" | "adaptability" | "balance" | "aggression" | "experience">>([
  "power",
  "technique",
  "speed",
  "weight",
  "stamina",
  "mental",
  "adaptability",
  "balance",
  "aggression",
  "experience",
]);

function isNumericStat(key: string): key is keyof Pick<RikishiStats, "power" | "technique" | "speed" | "weight" | "stamina" | "mental" | "adaptability" | "balance" | "aggression" | "experience"> {
  return numericKeys.has(key as any);
}

export const LegacyService = {
  /**
   * Called on retirement: if the rikishi meets thresholds, register a trait.
   */
  registerLegacyTrait(world: WorldState, rikishi: Rikishi): StateImpact {
    const builder = createImpactBuilder("registerLegacyTrait");
    const rankThreshold = REGISTER_THRESHOLDS[rikishi.rank as keyof typeof REGISTER_THRESHOLDS];
    if (!rankThreshold) return builder.build();

    // Use the rikishi's peak stat to determine which stat the bloodline grants
    const stats: RikishiStats = rikishi.stats;
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

    // Generate dynasty narrative headline
    const rng = rngForWorld(world, "legacy", "registerTrait");
    const headline = BardEngine.resolve(rng, "dynasty.headline", {
      TRAIT_LABEL: trait.label,
      ANCESTOR: trait.ancestorShikona,
    }).text;

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: rikishi.id,
        shikona: rikishi.shikona,
        status: "bloodline_registered",
        incident: headline,
      },
      { rikishiId: rikishi.id, importance: "notable" }
    );

    return builder.build();
  },

  /**
   * Rolls for both emergent and ancestral lineages during candidate generation.
   */
  rollLegacyAncestry(
    world: WorldState,
    candidate: Partial<TalentCandidate>,
    rng: SeededRNG
  ): BloodlineTrait | null {
    // 1. Check for Emergent Bloodline (from in-game retirees) - 5% chance
    const emergentTrait = this.rollEmergentBloodline(world, rng);
    if (emergentTrait) return emergentTrait;

    // 2. Check for Ancestral Legend (from all-time records) - 2% chance
    return this.rollAncestralLegend(world, candidate, rng);
  },

  rollEmergentBloodline(world: WorldState, rng: SeededRNG): BloodlineTrait | null {
    const registry = world.bloodlineRegistry;
    if (!registry || Object.keys(registry.traits).length === 0) return null;

    const roll = rng.next();
    if (roll > 0.05) return null; // 5% chance

    const traits = Object.values(registry.traits);
    return traits[rng.int(0, traits.length - 1)];
  },

  rollAncestralLegend(
    world: WorldState,
    candidate: Partial<TalentCandidate>,
    rng: SeededRNG
  ): BloodlineTrait | null {
    const roll = rng.next();
    if (roll > 0.02) return null; // 2% chance

    // Must have records to draw from
    const records = world.records?.allTime;
    if (!records || records.yusho.length === 0) return null;

    // Pick a legend from the Yusho or Career Wins records
    const pool = [...records.yusho, ...records.careerWins];
    const legend = pool[rng.int(0, pool.length - 1)];
    if (!legend) return null;

    const isYushoWinner = records.yusho.some((y) => y.rikishiId === legend.rikishiId);

    return {
      traitId: `ancestry_${legend.rikishiId}_${world.year}`,
      label: isYushoWinner ? "Blood of the Titan" : "Heir to the Throne",
      description: `${candidate.name || "Unknown"} is the descendant of the legendary ${legend.shikona}.`,
      ancestorShikona: legend.shikona,
      registeredYear: world.year,
      statFloorBonus: {
        power: isYushoWinner ? 8 : 4,
        technique: rng.next() > 0.5 ? 6 : 0,
        mental: 10,
      },
      ceilingBonus: isYushoWinner ? 12 : 6,
    };
  },

  /**
   * Applies the legacy trait bonuses to the candidate's potential stats.
   */
  applyLegacyTrait(candidateStats: RikishiStats, trait: BloodlineTrait): RikishiStats {
    const boosted: RikishiStats = { ...candidateStats };

    // Apply Floor Bonuses
    for (const [stat, bonus] of Object.entries(trait.statFloorBonus)) {
      if (isNumericStat(stat)) {
        boosted[stat] = clampInt(
          (boosted[stat] || 0) + (bonus || 0),
          0,
          99
        );
      }
    }

    // Apply Ceiling Bonus to the peak stat in the trait
    const peakStat = this.findPeakStat(trait.statFloorBonus);
    if (peakStat && isNumericStat(peakStat)) {
      boosted[peakStat] = clampInt(
        (boosted[peakStat] || 0) + trait.ceilingBonus,
        0,
        99
      );
    }

    return boosted;
  },

  findPeakStat(stats: Partial<RikishiStats>): string {
    const keys: Array<keyof RikishiStats> = [
      "power",
      "technique",
      "speed",
      "stamina",
      "mental",
      "adaptability",
      "balance",
    ];
    let peak = "technique";
    let peakVal = -1;
    for (const key of keys) {
      const val = (stats[key] as number) ?? 0;
      if (val > peakVal) {
        peakVal = val;
        peak = key;
      }
    }
    return peak;
  },
};
