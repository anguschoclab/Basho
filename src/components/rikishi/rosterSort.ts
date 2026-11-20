/**
 * rosterSort.ts
 *
 * Sorting for RosterList — rank-first ordering plus generic
 * compareBy accessors for other sort keys.
 */

import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { UIRikishi } from "@/presenters/uiModels";
import { rankSeniority } from "@/constants/engine/rankDisplay";

/** Sorts the roster by the selected key/order (rank uses division order). */
export function sortRoster(
  rikishiList: UIRikishi[],
  sortKey: string,
  sortOrder: SortDirection
): UIRikishi[] {
  if (sortKey === "rank") {
    const result = [...rikishiList].sort((a, b) => {
      const rankA = a.rank ? rankSeniority(a.rank.toLowerCase()) : 99;
      const rankB = b.rank ? rankSeniority(b.rank.toLowerCase()) : 99;
      if (rankA !== rankB) return rankA - rankB;
      return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
    });
    return sortOrder === "desc" ? result.reverse() : result;
  }
  const accessor: Record<string, (r: UIRikishi) => string | number | undefined> = {
    shikona: (r) => r.shikona,
    winPercentage: (r) => r.winPercentage,
    streak: (r) => r.streak,
    condition: (r) => r.condition,
  };
  const fn = accessor[sortKey];
  if (!fn) return rikishiList;
  return [...rikishiList].sort((a, b) => compareBy(a, b, fn, sortOrder));
}
