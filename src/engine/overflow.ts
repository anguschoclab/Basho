import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import {
  countsAsForeignFromRikishi,
  reinjectToTalentPool,
} from "./systems/generation/TalentPoolService";
import { stableTieBreak } from "./utils/sort";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { EntityCollection } from "./core/EntityCollection";
import { getRikishi } from "./queries";

// Hard cap constants
/** h a r d_ c a p_ r o s t e r_ s i z e. */
export const HARD_CAP_ROSTER_SIZE = 30;

/**
 * Ensures no stable has more than 30 rikishi.
 * If overflow occurs, it releases rikishi back to the talent pool based on deterministic criteria.
 * Returns StateImpact describing the releases.
 */
export function enforceHardCapRosterOverflow(world: WorldState): StateImpact {
  const builder = createImpactBuilder("enforceHardCapRosterOverflow");

  // ⚡ Bolt Optimization: Use EntityCollection.getHeyas() instead of Array.from().sort()
  // EntityCollection already returns heyas sorted by ID
  for (const heya of EntityCollection.getHeyas(world)) {
    if (!heya.rikishiIds || heya.rikishiIds.length <= HARD_CAP_ROSTER_SIZE) continue;

    const overflowCount = heya.rikishiIds.length - HARD_CAP_ROSTER_SIZE;
    const candidatesForRelease = heya.rikishiIds
      .map((rId) => getRikishi(world, rId))
      .filter((r): r is Rikishi => r !== undefined);

    // Score rikishi for retention (lower score = more likely to be released)
    const scoredCandidates = candidatesForRelease.map((r) => {
      let score = 0;

      // 1. Potential: Use talentSeed (0-100) or approximate from stats
      const potential = r.talentSeed ?? (r.power + r.speed + r.technique) / 3;
      score += potential;

      // 2. Loyalty / Experience proxy: higher experience = higher loyalty/retention
      score += (r.experience ?? 0) * 0.5;

      // 3. Injury trajectory: severely injured are more likely to be released
      if (r.injured) {
        score -= (r.injuryWeeksRemaining ?? 0) * 2;
      }

      // 4. Performance trend: recent basho wins/losses
      const winRatio =
        (r.currentBashoWins ?? 0) / ((r.currentBashoWins ?? 0) + (r.currentBashoLosses ?? 0) || 1);
      score += winRatio * 20;

      // 5. Foreign-slot retention bias
      if (countsAsForeignFromRikishi(r)) {
        score += 30; // Strong retention bias
      }

      // Add small tie-breaker using stable ID string comparison to keep it deterministic
      const tieBreaker = parseInt(r.id.slice(-4), 16) / 65535 || 0;
      score += tieBreaker;

      return { rikishi: r, score };
    });

    // Sort by score ascending (lowest score = release first)
    scoredCandidates.sort(
      (a, b) => a.score - b.score || stableTieBreak(a.rikishi.id, b.rikishi.id)
    );

    const toRelease = scoredCandidates.slice(0, overflowCount);

    for (const { rikishi } of toRelease) {
      // Remove from stable
      const nextRikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== rikishi.id);
      builder.updateHeya(heya.id, { rikishiIds: nextRikishiIds });
      builder.updateRikishi(rikishi.id, { heyaId: "" });

      // Re-inject into the talent pool as a free agent
      // Note: reinjectToTalentPool should return an impact
      builder.merge(reinjectToTalentPool(world, rikishi));

      builder.logEvent(
        "ROSTER_OVERFLOW_RELEASE",
        "narrative",
        {
          rikishiId: rikishi.id,
          shikona: rikishi.shikona,
          heya: heya.name,
          limit: HARD_CAP_ROSTER_SIZE,
        },
        { heyaId: heya.id, rikishiId: rikishi.id }
      );
    }
  }

  return builder.build();
}
