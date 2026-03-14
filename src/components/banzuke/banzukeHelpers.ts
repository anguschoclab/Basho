import type { UIRosterEntry } from "@/engine/uiModels";
import type { BanzukeSnapshot } from "@/engine/types";
import { rankScore } from "./RankChangeIndicator";

/** Defines the structure for rank row. */
export interface RankRow {
  rankLabel: string;
  rankKey: string;
  east: UIRosterEntry | null;
  west: UIRosterEntry | null;
  rankTier: string;
}

const RANK_TIER: Record<string, number> = {
  yokozuna: 1, ozeki: 2, sekiwake: 3, komusubi: 4,
  maegashira: 5, juryo: 6, makushita: 7,
  sandanme: 8, jonidan: 9, jonokuchi: 10,
};

/**
 * Build rank rows.
 *  * @param entries - The Entries.
 *  * @param division - The Division.
 *  * @param searchQuery - The Search query.
 *  * @returns The result.
 */
export function buildRankRows(entries: UIRosterEntry[], division: string, searchQuery: string): RankRow[] {
  const divEntries = entries.filter(e => e.division === division);
  const groups = new Map<string, { east: UIRosterEntry | null; west: UIRosterEntry | null }>();

  for (const e of divEntries) {
    const key = `${e.rank}_${e.rankNumber ?? 1}`;
    if (!groups.has(key)) groups.set(key, { east: null, west: null });
    const g = groups.get(key)!;
    if (e.side === "east") g.east = e;
    else g.west = e;
  }

  const q = searchQuery.toLowerCase().trim();

  return Array.from(groups.entries())
    .map(([key, { east, west }]) => {
      const sample = east || west;
      const rank = sample?.rank ?? "unknown";
      const rankNumber = sample?.rankNumber ?? 1;
      const isSanyaku = ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(rank);
      const rankLabel = isSanyaku
        ? rank.charAt(0).toUpperCase() + rank.slice(1)
        : `${rank.charAt(0).toUpperCase() + rank.slice(1)} #${rankNumber}`;
      return { rankLabel, rankKey: key, east, west, rankTier: rank, _tier: RANK_TIER[rank] ?? 99, _num: rankNumber };
    })
    .filter(row => {
      if (!q) return true;
      return row.east?.shikona?.toLowerCase().includes(q) || row.west?.shikona?.toLowerCase().includes(q);
    })
    .sort((a, b) => a._tier - b._tier || a._num - b._num);
}

/**
 * Build prev rank map.
 *  * @param history - The History.
 *  * @returns The result.
 */
export function buildPrevRankMap(history: { nextBanzuke?: BanzukeSnapshot }[]): Map<string, { rank: string; rankNumber?: number; side?: string; score: number }> {
  const map = new Map<string, { rank: string; rankNumber?: number; side?: string; score: number }>();
  for (let i = history.length - 1; i >= 0; i--) {
    const banzuke = history[i].nextBanzuke;
    if (!banzuke) continue;
    for (const div of Object.values(banzuke.divisions)) {
      for (const assignment of div.assignments) {
        const pos = assignment.position;
        map.set(assignment.rikishiId, {
          rank: pos.rank,
          rankNumber: (pos as any).rankNumber,
          side: pos.side,
          score: rankScore(pos.rank, (pos as any).rankNumber, pos.side),
        });
      }
    }
    break;
  }
  return map;
}

/** CSS class for rank-tinted row backgrounds */
export function rankRowClass(rank: string): string {
  switch (rank) {
    case "yokozuna": return "bg-[hsl(var(--gold)/0.08)] border-l-2 border-l-gold";
    case "ozeki": return "bg-[hsl(var(--silver)/0.06)] border-l-2 border-l-silver";
    case "sekiwake":
    case "komusubi": return "bg-[hsl(var(--bronze)/0.05)] border-l-2 border-l-bronze";
    default: return "";
  }
}
