/**
 * rikishiProjection.ts
 *
 * Rikishi-related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { projectRikishi } from "../rikishi";
import type { UIRikishi } from "../rikishi";

/**
 * Project rikishi with heya data for ceremony components.
 * Used by: HoFInductionCeremony, TournamentCeremony, HoFTimeline
 */
interface RikishiWithHeyaResult {
  rikishi: UIRikishi;
  heyaName: string;
  isPlayerRikishi: boolean;
}

export function projectRikishiWithHeya(
  world: WorldState,
  rikishiId: string
): RikishiWithHeyaResult | null {
  const rikishi = world.rikishi.get(rikishiId);
  if (!rikishi) return null;

  const heya = rikishi.heyaId ? world.heyas.get(rikishi.heyaId) : null;
  return {
    rikishi: projectRikishi(rikishi, world),
    heyaName: heya?.name ?? "Unknown Stable",
    isPlayerRikishi: rikishi.heyaId === world.playerHeyaId,
  };
}
