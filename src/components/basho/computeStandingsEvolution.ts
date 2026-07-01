import type { BoutResult } from "@/engine/types/basho";

type ChartDataPoint = { day: number } & Record<string, number>;

interface StandingsEvolutionInput {
  day: number;
  results?: BoutResult[][];
  standings: Map<string, { wins: number; losses: number }>;
}

interface RikishiRef {
  id: string;
  shikona: string;
  rank: string;
  rankNumber?: number;
}

export function computeStandingsEvolution(
  basho: StandingsEvolutionInput,
  rikishiMap: Map<string, RikishiRef>,
  maxLines: number = 8
): { data: ChartDataPoint[]; topIds: string[] } {
  if (!basho.results || basho.results.length === 0 || basho.day < 2) {
    return { data: [], topIds: [] };
  }

  const standingsEntries = Array.from(basho.standings.entries());
  const sorted = standingsEntries.sort((a, b) => b[1].wins - a[1].wins).slice(0, maxLines);
  const topIds = sorted.map(([id]) => id);
  const topIdSet = new Set(topIds);

  const cumulative: Record<string, number> = {};
  topIds.forEach((id) => (cumulative[id] = 0));

  const daysToShow = Math.min(basho.day, 15);
  const chartData: ChartDataPoint[] = [];

  for (let d = 0; d < daysToShow; d++) {
    const dayResults = basho.results[d] ?? [];
    for (const bout of dayResults) {
      if (topIdSet.has(bout.winnerRikishiId)) {
        cumulative[bout.winnerRikishiId] = (cumulative[bout.winnerRikishiId] ?? 0) + 1;
      }
    }

    const point: ChartDataPoint = { day: d + 1 };
    for (const id of topIds) {
      const rikishi = rikishiMap.get(id);
      const label = rikishi?.shikona ?? id;
      point[label] = cumulative[id] ?? 0;
    }
    chartData.push(point);
  }

  return { data: chartData, topIds };
}
