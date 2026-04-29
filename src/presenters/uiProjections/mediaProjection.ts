/**
 * mediaProjection.ts
 *
 * Media-related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { buildMediaDigest } from "../../engine/systems/media/MediaService";
import type { MediaState } from "../../engine/types/media";
import { projectRikishi } from "../rikishiUI";

/**
 * Project a list of recent headlines for the Media Page.
 */
export function projectMediaUIDigest(world: WorldState) {
  const mediaState = world.mediaState || buildMediaDigest(world);
  const headlines = [...(mediaState.headlines || [])].sort(
    (a, b) => b.impact - a.impact || b.week - a.week
  );

  const hotRikishi = Object.entries(mediaState.mediaHeat || {})
    .map(([id, heat]) => {
      const rikishi = world.rikishi.get(id);
      return {
        id,
        heat: heat as number,
        rikishi: rikishi ? projectRikishi(rikishi, world) : null,
        history: mediaState.mediaHeatHistory?.[id] ?? [],
      };
    })
    .filter((x) => x.rikishi)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 10);

  const pressuredHeya = Object.entries(mediaState.heyaPressure || {})
    .map(([id, pressure]) => ({
      id,
      pressure: pressure as number,
      heya: world.heyas.get(id),
    }))
    .filter((x) => x.heya)
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 8);

  return {
    headlines,
    hotRikishi,
    pressuredHeya,
    currentWeek: world.week,
  };
}
