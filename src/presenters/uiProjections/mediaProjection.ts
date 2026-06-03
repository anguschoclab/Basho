/**
 * mediaProjection.ts
 *
 * Media-related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import type { MediaState } from "../../engine/types/media";
import { projectRikishi } from "../rikishiUI";

/**
 * Project a list of recent headlines for the Media Page.
 */
export function projectMediaUIDigest(world: WorldState) {
  const mediaState = (world.mediaState || {
    headlines: [],
    mediaHeat: {},
    heyaPressure: {},
    mediaHeatHistory: {},
  }) as MediaState;
  const headlines = [...(mediaState.headlines || [])].sort(
    (a, b) => b.impact - a.impact || b.week - a.week
  );

  // ⚡ Bolt Optimization: Replace Object.entries().map().filter() with a for...in loop
  // to avoid O(N) array allocations from Map/Tuple conversions and multiple iterations
  const mediaHeat = mediaState.mediaHeat || {};
  const hotRikishiRaw = [];
  for (const id in mediaHeat) {
    const rikishi = world.rikishi.get(id);
    if (rikishi) {
      hotRikishiRaw.push({
        id,
        heat: mediaHeat[id] as number,
        rikishi: projectRikishi(rikishi, world),
        history: mediaState.mediaHeatHistory?.[id] ?? [],
      });
    }
  }
  const hotRikishi = hotRikishiRaw.sort((a, b) => b.heat - a.heat).slice(0, 10);

  const heyaPressure = mediaState.heyaPressure || {};
  const pressuredHeyaRaw = [];
  for (const id in heyaPressure) {
    const heya = world.heyas.get(id);
    if (heya) {
      pressuredHeyaRaw.push({
        id,
        pressure: heyaPressure[id] as number,
        heya,
      });
    }
  }
  const pressuredHeya = pressuredHeyaRaw.sort((a, b) => b.pressure - a.pressure).slice(0, 8);

  return {
    headlines,
    hotRikishi,
    pressuredHeya,
    currentWeek: world.week,
  };
}
