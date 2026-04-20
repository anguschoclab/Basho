import { WorldState } from "../../types/world";
import { TalentCandidate } from "../../types/talent";
import { BloodlineTrait } from "../../types/dynasty";
import { SeededRNG } from "../../rng";
import { clampInt } from "../../utils/math";

/**
 * LineageService.ts
 * =================
 * Handles the generation of "Genetic Legacy" recruits — candidates who are descendants
 * of former champions found in the Hall of Fame or the All-Time Record lists.
 */
export const LineageService = {
  /**
   * Attempts to roll a genetic lineage for a candidate.
   * 1% base chance for extremely high-potential candidates (isAmateurStar or visibilityBand="rumored").
   * 0.1% chance for standard candidates.
   */
  rollGeneticLineage(
    world: WorldState,
    candidate: Partial<TalentCandidate>,
    rng: SeededRNG
  ): BloodlineTrait | null {
    const isElite = candidate.isAmateurStar || candidate.visibilityBand === "rumored";
    const roll = rng.next();
    const threshold = isElite ? 0.05 : 0.005; // 5% for elites, 0.5% for others

    if (roll > threshold) return null;

    // Must have records to draw from
    const records = world.records?.allTime;
    if (!records || records.yusho.length === 0) return null;

    // Pick a legend from the Yusho or Career Wins records
    const pool = [...records.yusho, ...records.careerWins];
    const legend = pool[rng.int(0, pool.length - 1)];

    if (!legend) return null;

    // Determine the stat to buff based on the legend's archetype if we could find it
    const isYushoWinner = records.yusho.some((y) => y.rikishiId === legend.rikishiId);

    const traitId = `lineage_${legend.rikishiId}_${world.year}`;
    const labels = [
      "Blood of the Titan",
      "Heir to the Throne",
      "Legacy of the Sands",
      "Grandson of Greatness",
    ];
    const label = labels[rng.int(0, labels.length - 1)];

    const trait: BloodlineTrait = {
      traitId,
      label,
      description: `${candidate.name || "Unknown"} is the direct descendant of the legendary ${legend.shikona}, who achieved ${legend.value} ${isYushoWinner ? "Yusho titles" : "career wins"}.`,
      ancestorShikona: legend.shikona,
      registeredYear: world.year,
      statFloorBonus: {
        strength: isYushoWinner ? 10 : 5,
        technique: rng.next() > 0.5 ? 8 : 0,
        mental: 12, // Legacy recruits are always mentally tough
      },
      ceilingBonus: isYushoWinner ? 15 : 8,
    };

    return trait;
  },

  /**
   * Applies the lineage trait bonuses to the candidate's potential stats.
   */
  applyLineageBonuses(candidate: TalentCandidate, trait: BloodlineTrait): void {
    if (!candidate.potentialStats) return;

    // Add floor bonuses to current potential
    const p = candidate.potentialStats;
    if (trait.statFloorBonus.strength)
      p.strength = clampInt((p.strength || 0) + trait.statFloorBonus.strength, 0, 99);
    if (trait.statFloorBonus.technique)
      p.technique = clampInt((p.technique || 0) + trait.statFloorBonus.technique, 0, 99);
    if (trait.statFloorBonus.mental)
      p.mental = clampInt((p.mental || 0) + trait.statFloorBonus.mental, 0, 99);

    // Apply ceiling bonus to primary stat based on archetype
    const primaryStat: keyof import("../../types/rikishi").RikishiStats =
      candidate.archetype === "oshi"
        ? "strength"
        : candidate.archetype === "yotsu"
          ? "technique"
          : "stamina";
    p[primaryStat] = clampInt((p[primaryStat] || 0) + trait.ceilingBonus, 0, 99);

    // Add the "legacy" tag
    if (!candidate.tags.includes("legacy")) {
      candidate.tags.push("legacy");
    }
  },
};
