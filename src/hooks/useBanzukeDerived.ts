/**
 * useBanzukeDerived.ts
 *
 * Derived data for BanzukePage — banzuke digest, rank pyramid counts,
 * yokozuna candidates, and per-division filtered/sorted rows.
 */

import { useMemo } from "react";
import type { Division } from "@/engine/types/banzuke";
import { projectBanzukeUIDigest } from "@/presenters/uiDigest";
import { getYokozunaCandidates } from "@/presenters/projections/promotionProjections";
import type { UIRankRow } from "@/presenters/banzukeUI";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { WorldState } from "@/presenters/uiDigest";

export const DIVISION_KEYS: Division[] = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

const banzukeAccessor: Record<string, (r: UIRankRow) => string | number | undefined> = {
  rank: (r) => r.rankKey,
  shikona: (r) => r.east?.shikona ?? r.west?.shikona ?? "",
};

export function useBanzukeDerived(
  world: WorldState | null,
  searchQuery: string,
  sortKey: string,
  sortOrder: SortDirection
) {
  const banzukeDigest = useMemo(() => {
    if (!world) return null;
    return projectBanzukeUIDigest(world);
  }, [world]);

  const pyramidData = useMemo(() => {
    if (!banzukeDigest) return [];
    const counts: Record<string, number> = {
      Yokozuna: 0,
      Ozeki: 0,
      Sekiwake: 0,
      Komusubi: 0,
      "Maegashira 1-8": 0,
      "Maegashira 9-15": 0,
      Juryo: banzukeDigest.divisionCounts["juryo"] ?? 0,
      Makushita: banzukeDigest.divisionCounts["makushita"] ?? 0,
    };
    const makuuchi = banzukeDigest.divisionMap.get("makuuchi");
    if (makuuchi) {
      for (const row of makuuchi.rows) {
        const sample = row.east ?? row.west;
        if (!sample) continue;
        const rank = sample.rank;
        const num = sample.rankNumber ?? 0;
        const inc = (row.east ? 1 : 0) + (row.west ? 1 : 0);
        if (rank === "yokozuna") counts.Yokozuna += inc;
        else if (rank === "ozeki") counts.Ozeki += inc;
        else if (rank === "sekiwake") counts.Sekiwake += inc;
        else if (rank === "komusubi") counts.Komusubi += inc;
        else if (rank === "maegashira" && num <= 8) counts["Maegashira 1-8"] += inc;
        else if (rank === "maegashira" && num > 8) counts["Maegashira 9-15"] += inc;
      }
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([rank, count]) => ({ rank, count }));
  }, [banzukeDigest]);

  const yokozunaCandidates = useMemo(() => (world ? getYokozunaCandidates(world) : []), [world]);

  const normalizedSearchQuery = useMemo(() => searchQuery.toLowerCase().trim(), [searchQuery]);

  const filteredRowsByDivision = useMemo(() => {
    if (!banzukeDigest) return new Map<string, UIRankRow[]>();
    const map = new Map<string, UIRankRow[]>();
    for (const div of DIVISION_KEYS) {
      const divData = banzukeDigest.divisionMap.get(div);
      let rows = divData?.rows ?? [];
      if (normalizedSearchQuery) {
        rows = rows.filter(
          (r: UIRankRow) =>
            r.east?.shikona?.toLowerCase().includes(normalizedSearchQuery) ||
            r.west?.shikona?.toLowerCase().includes(normalizedSearchQuery)
        );
      }
      const fn = banzukeAccessor[sortKey];
      if (fn && sortKey !== "rank") {
        rows = [...rows].sort((a, b) => compareBy(a, b, fn, sortOrder));
      }
      map.set(div, rows);
    }
    return map;
  }, [banzukeDigest, normalizedSearchQuery, sortKey, sortOrder]);

  return { banzukeDigest, pyramidData, yokozunaCandidates, filteredRowsByDivision };
}
