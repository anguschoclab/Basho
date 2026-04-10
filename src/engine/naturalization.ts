import type { Id } from "./types/common";
import type { WorldState } from "./types/world";
import { EventBus } from "./events";
import { generateGovernanceHeadline } from "./systems/media/MediaService";
import { stableSort } from "./utils/sort";
import { rngFromSeed } from "./rng";

/**
 * Checks if any foreign-born rikishi are eligible for and receive Japanese citizenship.
 * Naturalization is "rare, prestige-gated, narrative-significant".
 * If activated, gaining Japanese citizenship frees the foreign slot.
 */
export function checkNaturalizations(world: WorldState): void {
  // Usually this would be run yearly or post-basho.
  const foreignRikishi: import("./types/rikishi").Rikishi[] = [];
  for (const r of world.rikishi.values()) {
    if (!r.isRetired && r.nationality !== "Japan") {
      foreignRikishi.push(r);
    }
  }

  // Sort only the foreign rikishi for deterministic tie-break before iteration
  const sortedForeign = stableSort(foreignRikishi, x => x.id);

  for (const r of sortedForeign) {
    // Basic criteria: High career wins (e.g., > 300), high rank (Ozeki/Yokozuna), or long career (> 10 years).
    const birthYear = r.birthYear || (world.year - 18);
    const age = world.year - birthYear;

    // Check eligibility
    let isEligible = false;
    if ((r.careerWins || 0) >= 400) isEligible = true;
    if (r.rank === "yokozuna" && age >= 28) isEligible = true;
    if (r.rank === "ozeki" && (r.careerWins || 0) >= 350) isEligible = true;

    // Needs high momentum or just time for narrative significance
    if (!isEligible) continue;

    // Rare chance (~5% per year they are eligible), deterministic via seeded RNG
    const natRng = rngFromSeed(`nat_${r.id}_${world.year}`, "naturalization", "chance");
    const chance = natRng.next() * 100;

    if (chance < 5) { // 5% chance if eligible
      const originalNationality = r.nationality;
      // Naturalize
      r.nationality = "Japan";

      const heya = world.heyas.get(r.heyaId);

      EventBus.lifecycleEvent(world, {
        rikishiId: r.id,
        heyaId: r.heyaId,
        shikona: r.shikona || r.name,
        status: "naturalization",
        reason: originalNationality
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

