// @ts-nocheck
import type { Id } from "./types/common";
import type { WorldState } from "./types/world";
import { generateGovernanceHeadline } from "./systems/media/MediaService";
import { stableSort } from "./utils/sort";
import { rngFromSeed } from "./rng";
import { createImpactBuilder } from "./core/ImpactBuilder";
import { resolveImpacts } from "./core/ImpactResolver";
import type { StateImpact } from "./core/StateImpact";

/**
 * Checks if any foreign-born rikishi are eligible for and receive Japanese citizenship.
 * Naturalization is "rare, prestige-gated, narrative-significant".
 * If activated, gaining Japanese citizenship frees the foreign slot.
 * Returns StateImpact describing naturalization updates instead of mutating state directly.
 */
export function checkNaturalizations(world: WorldState): StateImpact {
  const builder = createImpactBuilder("checkNaturalizations");

  // Usually this would be run yearly or post-basho.
  const foreignRikishi: import("./types/rikishi").Rikishi[] = [];
  for (const r of world.rikishi.values()) {
    if (!r.isRetired && r.nationality !== "Japan") {
      foreignRikishi.push(r);
    }
  }

  // Sort only the foreign rikishi for deterministic tie-break before iteration
  const sortedForeign = stableSort(foreignRikishi, (x) => x.id);

  for (const r of sortedForeign) {
    // Basic criteria: High career wins (e.g., > 300), high rank (Ozeki/Yokozuna), or long career (> 10 years).
    const birthYear = r.birthYear || world.year - 18;
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

    if (chance < 5) {
      // 5% chance if eligible
      const originalNationality = r.nationality;

      // Queue rikishi update for nationality
      builder.updateRikishi(r.id, { nationality: "Japan" });

      // Log event
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "career",
        {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona || r.name,
          status: "naturalization",
          reason: originalNationality,
        },
        { rikishiId: r.id, heyaId: r.heyaId }
      );

      const heya = world.heyas.get(r.heyaId);
      if (heya) {
        // Generate governance headline and merge its impact
        const headlineImpact = generateGovernanceHeadline({
          world,
          heyaId: heya.id,
          templatePath: "institutional.governance.naturalization_headline",
          severity: "national",
        });

        builder.merge(headlineImpact);
      }
    }
  }

  return builder.build();
}
