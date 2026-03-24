import type { WorldState } from "./types/world";
import type { RecordEntry, WorldRecords } from "./types/records";
import type { Id } from "./types/common";
import type { Rikishi } from "./types/rikishi";

/**
 * Ensures the records state is initialized.
 */
export function ensureRecordsState(world: WorldState): WorldRecords {
  if (!world.records) {
    world.records = {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }
    };
  }
  return world.records;
}

/**
 * Updates a specific leaderboard with a new entry if it qualifies for the Top 10.
 */
function updateLeaderboard(list: RecordEntry[], rikishi: Rikishi, value: number, year: number, month: number) {
  // If rikishi already in list, update value if higher
  const existingIndex = list.findIndex(e => e.rikishiId === rikishi.id);
  if (existingIndex !== -1) {
    if (value > list[existingIndex].value) {
      list[existingIndex].value = value;
      list[existingIndex].shikona = rikishi.shikona;
      list[existingIndex].achievedDate = { year, month };
    }
  } else {
    // New entry
    list.push({
      rikishiId: rikishi.id,
      shikona: rikishi.shikona,
      value,
      achievedDate: { year, month }
    });
  }

  // Sort descending
  list.sort((a, b) => b.value - a.value);

  // Keep Top 10
  if (list.length > 10) {
    list.pop();
  }
}

/**
 * Called at the end of every tournament to incrementally update records.
 */
export function onBashoEnded(world: WorldState) {
  const records = ensureRecordsState(world);
  const year = world.calendar.year;
  const month = world.calendar.month;

  for (const rikishi of world.rikishi.values()) {
    // 1. Career Wins
    updateLeaderboard(records.allTime.careerWins, rikishi, rikishi.careerWins, year, month);
    if (!rikishi.isRetired) {
      updateLeaderboard(records.active.careerWins, rikishi, rikishi.careerWins, year, month);
    }

    // 2. Makuuchi Wins
    if (rikishi.division === "makuuchi") {
      updateLeaderboard(records.allTime.makuuchiWins, rikishi, rikishi.makuuchiWins, year, month);
      if (!rikishi.isRetired) {
        updateLeaderboard(records.active.makuuchiWins, rikishi, rikishi.makuuchiWins, year, month);
      }
    }

    // 3. Yusho
    if (rikishi.careerRecord?.yusho) {
      updateLeaderboard(records.allTime.yusho, rikishi, rikishi.careerRecord.yusho, year, month);
      if (!rikishi.isRetired) {
        updateLeaderboard(records.active.yusho, rikishi, rikishi.careerRecord.yusho, year, month);
      }
    }

    // 4. Consecutive Yusho
    if (rikishi.consecutiveYusho) {
      updateLeaderboard(records.allTime.consecutiveYusho, rikishi, rikishi.consecutiveYusho, year, month);
      if (!rikishi.isRetired) {
        updateLeaderboard(records.active.consecutiveYusho, rikishi, rikishi.consecutiveYusho, year, month);
      }
    }

    // 5. Kinboshi
    if (rikishi.economics?.kinboshiCount) {
      updateLeaderboard(records.allTime.kinboshi, rikishi, rikishi.economics.kinboshiCount, year, month);
      if (!rikishi.isRetired) {
        updateLeaderboard(records.active.kinboshi, rikishi, rikishi.economics.kinboshiCount, year, month);
      }
    }
  }
}

/**
 * Called when a Rikishi retires (Intai).
 */
export function onRikishiRetired(world: WorldState, rikishiId: Id) {
  const records = ensureRecordsState(world);
  
  // Remove from all active lists
  records.active.careerWins = records.active.careerWins.filter(e => e.rikishiId !== rikishiId);
  records.active.makuuchiWins = records.active.makuuchiWins.filter(e => e.rikishiId !== rikishiId);
  records.active.yusho = records.active.yusho.filter(e => e.rikishiId !== rikishiId);
  records.active.consecutiveYusho = records.active.consecutiveYusho.filter(e => e.rikishiId !== rikishiId);
  records.active.kinboshi = records.active.kinboshi.filter(e => e.rikishiId !== rikishiId);
}
