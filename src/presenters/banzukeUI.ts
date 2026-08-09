import { UIRosterEntry, rankScore } from "./rikishi";
import { isSanyakuRank, getRankDisplayEntry } from "@/constants/engine/rankDisplay";

export interface UIRankRow {
  rankLabel: string;
  rankKey: string;
  rankTierClass: string;
  rankTitleJa: string;
  isSanyaku: boolean;
  east: UIRosterEntry | null;
  west: UIRosterEntry | null;
}

/**
 * Build a map of rikishi IDs to their rank scores from the most recent banzuke snapshot
 */
export function buildPrevRankScores(
  history: {
    nextBanzuke?: {
      divisions?: Record<
        string,
        {
          assignments: Array<{
            rikishiId: string;
            position: { rank: string; rankNumber?: number; side: string };
          }>;
        }
      >;
    };
  }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = history.length - 1; i >= 0; i--) {
    const banzuke = history[i].nextBanzuke;
    if (!banzuke) continue;
    const divisions = banzuke.divisions || {};
    for (const key in divisions) {
      if (!Object.prototype.hasOwnProperty.call(divisions, key)) continue;
      const div = divisions[key];
      for (const assignment of div.assignments) {
        const pos = assignment.position;
        map.set(assignment.rikishiId, rankScore(pos.rank, pos.rankNumber, pos.side));
      }
    }
    break;
  }
  return map;
}

/**
 * CSS class for rank-tinted row backgrounds
 */
function rankRowClass(rank: string): string {
  switch (rank) {
    case "yokozuna":
      return "bg-[hsl(var(--gold)/0.08)] border-l-2 border-l-gold";
    case "ozeki":
      return "bg-[hsl(var(--silver)/0.06)] border-l-2 border-l-silver";
    case "sekiwake":
    case "komusubi":
      return "bg-[hsl(var(--bronze)/0.05)] border-l-2 border-l-bronze";
    default:
      return "";
  }
}

/**
 * Group individual roster entries into banzuke rows (East vs West slots)
 */
export function buildBanzukeRows(
  entries: UIRosterEntry[],
  division: string,
  searchQuery: string
): UIRankRow[] {
  const groups = new Map<string, { east: UIRosterEntry | null; west: UIRosterEntry | null }>();

  for (const e of entries) {
    if (e.division !== division) continue;
    const key = `${e.rank}_${e.rankNumber ?? 1}`;
    if (!groups.has(key)) groups.set(key, { east: null, west: null });
    const g = groups.get(key);
    if (!g) continue;
    if (e.side === "east") g.east = e;
    else g.west = e;
  }

  const q = searchQuery.toLowerCase().trim();
  const result: (UIRankRow & { _tier: number; _num: number })[] = [];

  for (const [key, { east, west }] of groups) {
    if (q) {
      const eastMatch = east?.shikona?.toLowerCase().includes(q);
      const westMatch = west?.shikona?.toLowerCase().includes(q);
      if (!eastMatch && !westMatch) continue;
    }

    const sample = east || west;
    const rank = sample?.rank ?? "unknown";
    const rankNumber = sample?.rankNumber ?? 1;
    const isSanyaku = isSanyakuRank(rank);
    const entry = getRankDisplayEntry(rank);
    const baseLabel = entry?.en ?? rank.charAt(0).toUpperCase() + rank.slice(1);
    const rankLabel = isSanyaku ? baseLabel : `${baseLabel} #${rankNumber}`;

    // Calculate Japanese title
    const side = (sample?.side ?? "east") as "east" | "west";
    const rankTitleJa =
      rank === "maegashira" ||
      rank === "juryo" ||
      rank === "makushita" ||
      rank === "sandanme" ||
      rank === "jonidan" ||
      rank === "jonokuchi"
        ? `${baseLabel.charAt(0)}#${rankNumber}${side === "east" ? "東" : "西"}`
        : `${baseLabel}${side === "east" ? "東" : "西"}`;

    result.push({
      rankLabel,
      rankKey: key,
      rankTierClass: rankRowClass(rank),
      rankTitleJa,
      isSanyaku,
      east,
      west,
      _tier: getRankDisplayEntry(rank)?.tier ?? 99,
      _num: rankNumber,
    });
  }

  return result.sort((a, b) => a._tier - b._tier || a._num - b._num);
}
