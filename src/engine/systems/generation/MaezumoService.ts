/**
 * src/engine/systems/generation/MaezumoService.ts
 *
 * Maezumo (前相撲) assessment stage for new recruits.
 * In real sumo, new recruits participate in maezumo — a preliminary
 * assessment period before being placed on the jonokuchi banzuke.
 * The assessment determines their initial jonokuchi rankNumber.
 */

import type { Rikishi } from "../../types/rikishi";
import { rngFromSeed } from "../../rng";
import {
  MAEZUMO_STAT_COUNT,
  MAEZUMO_DEFAULT_STAT,
  MAEZUMO_RANK_BASE,
  MAEZUMO_RANK_RANGE,
  MAEZUMO_JITTER_MIN,
  MAEZUMO_JITTER_MAX,
  MAEZUMO_RANK_MIN,
  MAEZUMO_RANK_MAX,
} from "../../../constants/engine/generation";

/** Duration of the maezumo stage in weeks (within a single basha cycle) */
export const MAEZUMO_DURATION_WEEKS = 2;

/**
 * Assesses a new recruit's maezumo performance and determines their
 * initial jonokuchi rankNumber. Higher-stat recruits get lower (better)
 * rankNumbers. The assessment is deterministic based on the world seed
 * and the recruit's stats.
 *
 * @param rikishi - The new recruit to assess
 * @param worldSeed - The world seed for deterministic RNG
 * @returns Partial<Rikishi> with maezumoCompleted and rankNumber set
 */
export function assessMaezumo(
  rikishi: Rikishi,
  worldSeed: string
): Partial<Rikishi> {
  // Skip if already completed
  if (rikishi.maezumoCompleted) {
    return {
      maezumoCompleted: true,
      rankNumber: rikishi.rankNumber,
    };
  }

  const stats = rikishi.stats;
  const avgStat =
    ((stats.power ?? MAEZUMO_DEFAULT_STAT) +
      (stats.speed ?? MAEZUMO_DEFAULT_STAT) +
      (stats.technique ?? MAEZUMO_DEFAULT_STAT) +
      (stats.balance ?? MAEZUMO_DEFAULT_STAT) +
      (stats.stamina ?? MAEZUMO_DEFAULT_STAT) +
      (stats.mental ?? MAEZUMO_DEFAULT_STAT) +
      (stats.aggression ?? MAEZUMO_DEFAULT_STAT)) /
    MAEZUMO_STAT_COUNT;

  // Use RNG for slight variation around the stat-based placement
  // Seed is based on world seed + stats (not rikishi ID) so recruits with
  // identical stats get identical placements in the same world
  const statKey = Math.round(avgStat);
  const rng = rngFromSeed(`${worldSeed}::maezumo::${statKey}`, "generation", "maezumo");
  const jitter = rng.int(MAEZUMO_JITTER_MIN, MAEZUMO_JITTER_MAX);

  // Map avg stat (0-100) to rankNumber (1-50):
  // High stats → low rankNumber (better placement)
  // Low stats → high rankNumber (worse placement)
  const baseRank = Math.round(MAEZUMO_RANK_BASE - (avgStat / 100) * MAEZUMO_RANK_RANGE);
  const rankNumber = Math.max(MAEZUMO_RANK_MIN, Math.min(MAEZUMO_RANK_MAX, baseRank + jitter));

  return {
    maezumoCompleted: true,
    rankNumber,
  };
}
