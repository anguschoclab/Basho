/**
 * heyaProjections.ts
 *
 * Projections for heya data with oyakata and roster information.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "@/engine/types/world";
import type { HeyaDataUI } from "@/presenters/uiDigestTypes";
import { projectRikishi } from "@/presenters/rikishi/index";
import { getHeyaRoster } from "@/engine/core/queries";
import { isKachiKoshi } from "@/engine/banzuke/banzukeHelpers";
import type { UIRikishi } from "@/presenters/rikishi/index";

/**
 * Project heya data with oyakata for ceremony components.
 */
export function projectHeyaData(world: WorldState, heyaId: string): HeyaDataUI | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const oyakata = world.oyakata.get(heya.oyakataId);
  return {
    heya,
    oyakata,
    oyakataQuirks: oyakata?.quirks ?? [],
    oyakataTraits: oyakata?.traits,
  };
}

/**
 * Project heya roster with calculated ages.
 */
export function projectHeyaRosterWithAge(
  world: WorldState,
  heyaId: string
): Array<{ rikishi: UIRikishi; age: number }> {
  const heya = world.heyas.get(heyaId);
  if (!heya) return [];

  const result: Array<{ rikishi: UIRikishi; age: number }> = [];
  // getHeyaRoster is memoized per world+week and already dedupes/resolves.
  for (const r of getHeyaRoster(world, heyaId)) {
    result.push({
      rikishi: projectRikishi(r, world),
      age: r.birthYear && world.year ? world.year - r.birthYear : 0,
    });
  }
  return result;
}

/** One basho's aggregated results for a stable's current roster. */
export interface StableBashoFormRow {
  /** Display label, e.g. "Hatsu 2025". */
  basho: string;
  wins: number;
  losses: number;
  /** Roster members who recorded a kachi-koshi this basho. */
  kachiKoshi: number;
  /** Roster members with a recorded snapshot this basho. */
  rikishi: number;
}

/**
 * Aggregate the current roster's recorded basho results (careerHistory
 * snapshots, capped at 6 by the engine) into per-basho W-L + kachi-koshi
 * totals, chronological. Kachi-koshi uses the engine's own per-rank
 * threshold check (isKachiKoshi) on each snapshot's recorded rank.
 */
export function projectStableBashoForm(world: WorldState, heyaId: string): StableBashoFormRow[] {
  const buckets = new Map<
    string,
    {
      year: number;
      month: number;
      bashoName: string;
      wins: number;
      losses: number;
      kachiKoshi: number;
      rikishi: number;
    }
  >();

  for (const r of getHeyaRoster(world, heyaId)) {
    for (const snap of r.careerHistory ?? []) {
      const key = snap.bashoId || `${snap.bashoName}-${snap.year}`;
      let b = buckets.get(key);
      if (!b) {
        b = {
          year: snap.year,
          month: snap.month,
          bashoName: snap.bashoName,
          wins: 0,
          losses: 0,
          kachiKoshi: 0,
          rikishi: 0,
        };
        buckets.set(key, b);
      }
      b.wins += snap.wins;
      b.losses += snap.losses;
      b.rikishi += 1;
      if (isKachiKoshi(snap.wins, snap.losses, snap.rank)) b.kachiKoshi += 1;
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-6)
    .map((b) => ({
      basho: `${b.bashoName.charAt(0).toUpperCase()}${b.bashoName.slice(1)} ${b.year}`,
      wins: b.wins,
      losses: b.losses,
      kachiKoshi: b.kachiKoshi,
      rikishi: b.rikishi,
    }));
}
