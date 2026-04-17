/**
 * heyaProjections.ts
 *
 * Projections for heya data with oyakata and roster information.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "../../engine/types/world";
import type { HeyaDataUI } from "../types/uiDigest";
import { projectRikishi } from "../rikishiUI";
import type { UIRikishi } from "../rikishiUI";

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

  return (heya.rikishiIds ?? [])
    .map((id: string) => {
      const r = world.rikishi.get(id);
      if (!r) return null;
      return {
        rikishi: projectRikishi(r, world),
        age: r.birthYear && world.year ? world.year - r.birthYear : 0,
      };
    })
    .filter(Boolean) as Array<{ rikishi: UIRikishi; age: number }>;
}
