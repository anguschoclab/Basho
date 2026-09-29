/**
 * recapBanzukeRevealProjections.ts
 *
 * Builds the reveal entries for the post-basho BanzukeReveal overlay:
 * compares the just-published banzuke (world.currentBanzuke) against the
 * snapshot the basho was fought on — indexed under the previous basho key
 * in historyIndex.banzukeByBasho — and maps each rank change to a display
 * row.
 */

import type { WorldState } from "../../engine/types/world";
import type { BashoResult } from "../../engine/types/basho";
import { compareBanzuke, formatRankPosition, RANK_HIERARCHY, makeBashoKey } from "../engineAccess";
import { getRikishiMap } from "../worldAccess";

/** One row of the reveal sequence — a rikishi's old → new position. */
export interface BanzukeRevealEntry {
  id: string;
  shikona: string;
  oldRank: string;
  newRank: string;
  change: "up" | "down" | "none" | "new" | "division_change";
}

/**
 * Map banzuke changes to reveal rows, most significant first (compareBanzuke
 * sorts sanyaku changes ahead of lower-division moves). Cross-division moves
 * at the same tier display as "division_change" rather than "none".
 */
export function buildBanzukeRevealEntries(
  world: WorldState | null | undefined,
  lastBasho: BashoResult | null | undefined,
  maxEntries = 20
): BanzukeRevealEntry[] {
  if (!world || !lastBasho) return [];
  const currentBanzuke = world.currentBanzuke;
  const historyIndex = world.historyIndex;
  if (!currentBanzuke || !historyIndex) return [];

  const bashoNumber = lastBasho.bashoNumber ?? 1;
  const prevYear = bashoNumber === 1 ? lastBasho.year - 1 : lastBasho.year;
  const prevBashoNum = bashoNumber === 1 ? 6 : bashoNumber - 1;
  const previousSnapshot = historyIndex.banzukeByBasho[makeBashoKey(prevYear, prevBashoNum)];

  const rikishiMap = getRikishiMap(world);
  const changes = compareBanzuke(currentBanzuke, previousSnapshot || null, rikishiMap);

  const entries: BanzukeRevealEntry[] = [];
  for (const change of changes) {
    if (entries.length >= maxEntries) break;
    const rikishi = rikishiMap.get(change.rikishiId);
    if (!rikishi) continue;

    let displayChange: BanzukeRevealEntry["change"] = change.change;
    if (change.oldPosition && change.newPosition) {
      const oldDivision = RANK_HIERARCHY[change.oldPosition.rank].division;
      const newDivision = RANK_HIERARCHY[change.newPosition.rank].division;
      if (oldDivision !== newDivision) {
        displayChange = "division_change";
      }
    }

    entries.push({
      id: change.rikishiId,
      shikona: rikishi.shikona,
      oldRank: change.oldPosition ? formatRankPosition(change.oldPosition) : "New Entry",
      newRank: formatRankPosition(change.newPosition),
      change: displayChange,
    });
  }
  return entries;
}
