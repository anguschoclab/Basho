/**
 * rosterSort.ts
 *
 * Sorting for RosterList — rank-first ordering plus generic
 * compareBy accessors for other sort keys.
 */

import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { UIRikishi } from "@/presenters/uiModels";

const RANK_ORDER: Record<string, number> = {
  yokozuna: 0,
  ozeki: 1,
  sekiwake: 2,
  komusubi: 3,
  maegashira: 4,
  juryo: 5,
  makushita: 6,
  sandanme: 7,
  jonidan: 8,
  jonokuchi: 9,
};

/** Sorts the roster by the selected key/order (rank uses division order). */
export function sortRoster(
  rikishiList: UIRikishi[],
  sortKey: string,
  sortOrder: SortDirection
): UIRikishi[] {
  if (sortKey === "rank") {
    const result = [...rikishiList].sort((a, b) => {
      const rankA = RANK_ORDER[a.rank?.toLowerCase() ?? ""] ?? 99;
      const rankB = RANK_ORDER[b.rank?.toLowerCase() ?? ""] ?? 99;
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
