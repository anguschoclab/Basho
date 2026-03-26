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
 * Uses sorted insertion to maintain order efficiently.
 */
function updateLeaderboard(list: RecordEntry[], rikishi: Rikishi, value: number, year: number, month: number) {
  if (value <= 0) return;

  const existingIndex = list.findIndex(e => e.rikishiId === rikishi.id);
  
  // If already in list
  if (existingIndex !== -1) {
    // Only update if current value is strictly better
    if (value > list[existingIndex].value) {
      list.splice(existingIndex, 1); // remove and re-insert to maintain sort
    } else {
      return; // No improvement, do nothing
    }
  }

  // Find insertion point (descending order)
  const insertAt = list.findIndex(e => value > e.value);
  
  if (insertAt === -1) {
    // If list not full, add to end
    if (list.length < 10) {
      list.push({
        rikishiId: rikishi.id,
        shikona: rikishi.shikona,
        value,
        achievedDate: { year, month }
      });
    }
  } else {
    // Insert at specific position
    list.splice(insertAt, 0, {
      rikishiId: rikishi.id,
      shikona: rikishi.shikona,
      value,
      achievedDate: { year, month }
    });
    
    // Trim if over capacity
    if (list.length > 10) {
      list.pop();
    }
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
