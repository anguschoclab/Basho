import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { ChronicleReport, ChampionEntry, ChronicleRecordEntry } from "../types/records";
import { stableTieBreak } from "../utils/sort";
import { getRikishi, getRikishiAnywhere, isRetiredRikishiSummaryEntry } from "../queries";

/**
 * Chronicle Service handles historical data aggregation and era detection.
 */
export const ChronicleService = {
  /**
   * Create an empty chronicle report.
   */
  createEmptyReport(): ChronicleReport {
    return {
      topChampions: [],
      biggestScandals: [],
      greatestRivalries: [],
      eraLabels: [],
      recordsBroken: [],
      highlights: [],
    };
  },

  /**
   * Build the final chronicle report from simulation data.
   */
  finalizeReport(
    world: WorldState,
    report: ChronicleReport,
    championCounts: Map<string, number>,
    startYear: number
  ): ChronicleReport {
    const championsList: ChampionEntry[] = [];

    for (const [id, count] of championCounts.entries()) {
      const rikishi = getRikishi(world, id);
      championsList.push({
        rikishiId: id,
        shikona: rikishi?.shikona || "Unknown",
        yushoCount: count,
        bestRank: rikishi?.rank || "unknown",
      });
    }

    report.topChampions = championsList
      .sort((a, b) => b.yushoCount - a.yushoCount || stableTieBreak(a.rikishiId, b.rikishiId))
      .slice(0, 10);

    // Era label heuristic
    const simulatedYears = world.year - startYear;
    if (simulatedYears >= 1) {
      const topChamp = report.topChampions[0];
      if (topChamp && topChamp.yushoCount >= 3) {
        report.eraLabels.push(`The ${topChamp.shikona} Era (${startYear}-${world.year})`);
      }
    }

    // Biggest scandals — discipline events reporting scandals at
    // major/critical severity, most recent last.
    report.biggestScandals = (world.events?.log ?? [])
      .filter(
        (e) =>
          e.category === "discipline" &&
          e.data?.incident === "scandal_reported" &&
          (e.data?.status === "major" || e.data?.status === "critical")
      )
      .map((e) => e.title)
      .slice(-10);

    // Greatest rivalries — dedupe h2h pairs (A→B and B→A collapse into one
    // pair keyed by sorted ids), rank by total bouts contested.
    const pairTotals = new Map<string, { a: string; b: string; total: number }>();
    const allEntries: Rikishi[] = [
      ...world.rikishi.values(),
      ...[...(world.historicalRikishi?.values() ?? [])].filter(
        (e): e is Rikishi => !isRetiredRikishiSummaryEntry(e)
      ),
    ];
    for (const r of allEntries) {
      for (const [oppId, rec] of Object.entries(r.h2h ?? {})) {
        const total = rec.wins + rec.losses;
        const [a, b] = r.id < oppId ? [r.id, oppId] : [oppId, r.id];
        const key = `${a}|${b}`;
        const existing = pairTotals.get(key);
        // Each side's record counts the same bouts — keep the max, not the sum.
        if (!existing || total > existing.total) {
          pairTotals.set(key, { a, b, total });
        }
      }
    }
    report.greatestRivalries = [...pairTotals.values()]
      .sort((x, y) => y.total - x.total || stableTieBreak(x.a, y.a))
      .slice(0, 10)
      .map(({ a, b, total }) => ({
        eastId: a,
        westId: b,
        eastName: getRikishiAnywhere(world, a)?.shikona ?? "Unknown",
        westName: getRikishiAnywhere(world, b)?.shikona ?? "Unknown",
        meetingCount: total,
        description: `${total} career meetings`,
      }));

    return report;
  },

  /**
   * Add a highlight to the report.
   */
  addHighlight(report: ChronicleReport, highlight: string): void {
    report.highlights.push(highlight);
  },

  /**
   * Record a record-breaking event.
   */
  addRecord(report: ChronicleReport, record: ChronicleRecordEntry): void {
    report.recordsBroken.push(record);
  },
};
