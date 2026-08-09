/**
 * HistoryService.ts
 * =================
 * Manages all-time records, hall of fame persistence, and historical stable archives.
 * (Phase 3: Global Circuit & Rivalry Dynamics)
 */

import { WorldState } from "../../types/world";
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import type { RecordEntry, WorldRecords } from "../../types/records";

export const HistoryService = {
  /**
   * Evaluates and updates the world's all-time records based on a rikishi's state.
   * Called during retirement or at the end of a basho year.
   */
  updateAllTimeRecords(world: WorldState, rikishi: Rikishi): StateImpact {
    const builder = createImpactBuilder("updateAllTimeRecords");
    const records = world.records || this.createEmptyRecords();

    let changed = false;
    const currentYear = world.year ?? DEFAULT_START_YEAR;
    const currentMonth = world.calendar?.month ?? 1;

    const checkRecord = (list: RecordEntry[], value: number, limit: number = 5): boolean => {
      if (list.length < limit || value > list[list.length - 1].value) {
        list.push({
          rikishiId: rikishi.id,
          shikona: rikishi.shikona,
          value,
          achievedDate: { year: currentYear, month: currentMonth },
        });
        list.sort((a, b) => b.value - a.value);
        if (list.length > limit) list.pop();
        return true;
      }
      return false;
    };

    // 1. Career Wins
    if (checkRecord(records.allTime.careerWins, rikishi.careerWins ?? 0)) changed = true;

    // 2. Yusho Count
    if (checkRecord(records.allTime.yusho, rikishi.careerRecord?.yusho ?? 0)) changed = true;

    // 3. Kinboshi Earned
    const kinboshi = rikishi.stats?.achievements?.kinboshiEarned ?? 0;
    if (kinboshi > 0 && checkRecord(records.allTime.kinboshi, kinboshi)) changed = true;

    if (changed) {
      builder.updateWorldField("records", records);
      builder.logEvent(
        "RECORD_BROKEN",
        "narrative",
        {
          rikishiName: rikishi.shikona,
          incident: `A new entry has been added to the All-Time Record books for ${rikishi.shikona}.`,
        },
        { importance: "notable" }
      );
    }

    return builder.build();
  },

  /**
   * Generates a "Chronicler's Report" for the year end.
   */
  generateYearlySummary(world: WorldState): string {
    const records = world.records;
    if (!records) return "The annals are empty for this year.";

    const topWrestler = records.allTime.careerWins[0];
    return `As the year ${world.year} concludes, ${topWrestler?.shikona ?? "unknown"} stands as the current pinnacle of career achievement with ${topWrestler?.value ?? 0} wins.`;
  },

  createEmptyRecords(): WorldRecords {
    return {
      allTime: {
        careerWins: [],
        makuuchiWins: [],
        yusho: [],
        consecutiveYusho: [],
        kinboshi: [],
      },
      active: {
        careerWins: [],
        makuuchiWins: [],
        yusho: [],
        consecutiveYusho: [],
        kinboshi: [],
      },
    };
  },
};
