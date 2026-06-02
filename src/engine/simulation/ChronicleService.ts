import type { WorldState } from "../types/world";
import type { ChronicleReport, ChampionEntry, ChronicleRecordEntry } from "../types/records";
import { stableTieBreak } from "../utils/sort";
import { getRikishi } from "../queries";

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
