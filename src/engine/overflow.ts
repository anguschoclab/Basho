import { WorldState } from "./types/world";
import { Id } from "./types/common";
import { Rikishi } from "./types/rikishi";
import { Heya } from "./types/heya";
import { EventBus } from "./events";
import { getForeignCountInHeya, countsAsForeignFromRikishi, reinjectToTalentPool } from "./systems/generation/TalentPoolService";
import { stableTieBreak, stableSort } from "./utils/sort";

// Hard cap constants
/** h a r d_ c a p_ r o s t e r_ s i z e. */
export const HARD_CAP_ROSTER_SIZE = 30;

/**
 * Ensures no stable has more than 30 rikishi.
 * If overflow occurs, it releases rikishi back to the talent pool based on deterministic criteria:
 * - Lowest potential band
 * - Lowest loyalty (we'll proxy this if not explicitly modeled)
 * - Worst injury trajectory
 * - Worst recent performance trend
 * - Foreign-slot rikishi have retention bias.
 */
export function enforceHardCapRosterOverflow(world: WorldState): number {
  let totalReleased = 0;

  for (const heya of stableSort(world.heyas.values(), x => x.id)) {
    if (!heya.rikishiIds || heya.rikishiIds.length <= HARD_CAP_ROSTER_SIZE) continue;

    const overflowCount = heya.rikishiIds.length - HARD_CAP_ROSTER_SIZE;
    const candidatesForRelease = heya.rikishiIds
      .map((rId) => world.rikishi.get(rId))
      .filter((r): r is Rikishi => r !== undefined);

    // Score rikishi for retention (lower score = more likely to be released)
    const scoredCandidates = candidatesForRelease.map((r) => {
      let score = 0;

      // 1. Potential: Use talentSeed (0-100) or approximate from stats
      const potential = r.talentSeed ?? ((r.power + r.speed + r.technique) / 3);
      score += potential;

      // 2. Loyalty / Experience proxy: higher experience = higher loyalty/retention
      score += (r.experience ?? 0) * 0.5;

      // 3. Injury trajectory: severely injured are more likely to be released
      if (r.injured) {
        score -= (r.injuryWeeksRemaining ?? 0) * 2;
      }

      // 4. Performance trend: recent basho wins/losses
      const winRatio = (r.currentBashoWins ?? 0) / ((r.currentBashoWins ?? 0) + (r.currentBashoLosses ?? 0) || 1);
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
    scoredCandidates.sort((a, b) => a.score - b.score || stableTieBreak(a.rikishi.id, b.rikishi.id));

    const toRelease = scoredCandidates.slice(0, overflowCount);

    for (const { rikishi } of toRelease) {
      releaseRikishiToPool(world, heya, rikishi);
      totalReleased++;
    }
  }

  return totalReleased;
}

/**
 * Moves a rikishi from a stable back to the active talent pool.
 */
function releaseRikishiToPool(world: WorldState, heya: Heya, rikishi: Rikishi) {
  // Remove from stable
  heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== rikishi.id);
  rikishi.heyaId = ""; // No longer attached to a stable

  // Audit event for the release
  EventBus.rosterEvent(world, heya.id, {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona,
    heya: heya.name,
    limit: HARD_CAP_ROSTER_SIZE
  });

  // Re-inject into the talent pool as a free agent
  reinjectToTalentPool(world, rikishi);
}
