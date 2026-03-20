// naturalization.ts
// Implements the Future Naturalization system for foreign-born rikishi.
// Aligned with Basho Constitution A13 (5.5 Future Naturalization).

import type { WorldState } from "./types/world";
import { logEngineEvent } from "./events";
import { generateGovernanceHeadline } from "./media";

/**
 * Checks if any foreign-born rikishi are eligible for and receive Japanese citizenship.
 * Naturalization is "rare, prestige-gated, narrative-significant".
 * If activated, gaining Japanese citizenship frees the foreign slot.
 */
export function checkNaturalizations(world: WorldState): void {
  // Usually this would be run yearly or post-basho.
  const foreignRikishi = Array.from(world.rikishi.values()).filter(
    (r) => r.nationality !== "Japan"
  );

  for (const r of foreignRikishi) {
    // Basic criteria: High career wins (e.g., > 300), high rank (Ozeki/Yokozuna), or long career (> 10 years).
    const age = world.year - r.birthYear;

    // Check eligibility
    let isEligible = false;
    if (r.careerWins >= 400) isEligible = true;
    if (r.rank === "yokozuna" && age >= 28) isEligible = true;
    if (r.rank === "ozeki" && r.careerWins >= 350) isEligible = true;

    // Needs high momentum or just time for narrative significance
    if (!isEligible) continue;

    // Rare chance (e.g. ~5% per year they are eligible)
    // To make it deterministic, we hash their ID and year
    let hash = 0;
    const seedString = `nat_${r.id}_${world.year}`;
    for (let i = 0; i < seedString.length; i++) {
      hash = ((hash << 5) - hash + seedString.charCodeAt(i)) | 0;
    }
    const chance = Math.abs(hash) % 100;

    if (chance < 5) { // 5% chance if eligible
      // Naturalize
      r.nationality = "Japan";

      const heya = world.heyas.get(r.heyaId);

      logEngineEvent(world, {
        type: "NATURALIZATION",
        category: "career",
        importance: "headline",
        scope: "rikishi",
        rikishiId: r.id,
        heyaId: r.heyaId,
        title: `${r.shikona || r.name} acquires Japanese citizenship`,
        summary: `In a major milestone, ${r.shikona || r.name} has formally naturalized as a Japanese citizen. This frees up the foreign slot for ${heya?.name || "their stable"}.`,
        data: { originalNationality: r.origin, newNationality: "Japan" }
      });

      if (heya) {
        generateGovernanceHeadline({
          world,
          heyaId: heya.id,
          type: "milestone",
          severity: "major",
          description: `${r.shikona || r.name} acquires Japanese citizenship, freeing up ${heya.name}'s foreign slot.`
        });
      }
    }
  }
}
