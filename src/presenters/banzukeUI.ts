import { UIRosterEntry, rankScore } from "./rikishiUI";
import { BardEngine } from "../engine/narrative/BardEngine";
import { SeededRNG } from "../engine/rng";

export interface UIRankRow {
  rankLabel: string;
  rankKey: string;
  rankTierClass: string;
  east: UIRosterEntry | null;
  west: UIRosterEntry | null;
}

const RANK_TIER: Record<string, number> = {
  yokozuna: 1, ozeki: 2, sekiwake: 3, komusubi: 4,
  maegashira: 5, juryo: 6, makushita: 7,
  sandanme: 8, jonidan: 9, jonokuchi: 10,
};

/**
 * Build a map of rikishi IDs to their rank scores from the most recent banzuke snapshot
 */
export function buildPrevRankScores(history: { nextBanzuke?: any }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = history.length - 1; i >= 0; i--) {
    const banzuke = history[i].nextBanzuke;
    if (!banzuke) continue;
    for (const div of Object.values(banzuke.divisions as Record<string, any>)) {
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
    case "yokozuna": return "bg-[hsl(var(--gold)/0.08)] border-l-2 border-l-gold";
    case "ozeki": return "bg-[hsl(var(--silver)/0.06)] border-l-2 border-l-silver";
    case "sekiwake":
    case "komusubi": return "bg-[hsl(var(--bronze)/0.05)] border-l-2 border-l-bronze";
    default: return "";
  }
}

/**
 * Group individual roster entries into banzuke rows (East vs West slots)
 */
export function buildBanzukeRows(entries: UIRosterEntry[], division: string, searchQuery: string): UIRankRow[] {
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
    const isSanyaku = rank === "yokozuna" || rank === "ozeki" || rank === "sekiwake" || rank === "komusubi";
    const rng = new SeededRNG(key + "_" + division);
    const baseLabel = BardEngine.resolve(rng, `system.descriptors.ranks.${rank}`).text;
    const rankLabel = isSanyaku ? baseLabel : `${baseLabel} #${rankNumber}`;

    result.push({
      rankLabel,
      rankKey: key,
      rankTierClass: rankRowClass(rank),
      east,
      west,
      _tier: RANK_TIER[rank] ?? 99,
      _num: rankNumber,
    });
  }

  return result.sort((a, b) => a._tier - b._tier || a._num - b._num);
}
