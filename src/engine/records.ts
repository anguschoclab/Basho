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

  const len = list.length;
  // fast path bailout. Lists are capped at 10 items.
  if (len === 10 && value <= list[9].value) {
    return;
  }

  let existingIndex = -1;
  // Backwards search: existing rikishi making incremental improvements are more likely to be found at higher indices
  for (let i = len - 1; i >= 0; i--) {
    if (list[i].rikishiId === rikishi.id) {
      existingIndex = i;
      break;
    }
  }
  
  if (existingIndex !== -1) {
    if (value <= list[existingIndex].value) {
      return;
    }
    // Update existing item in place
    const item = list[existingIndex];
    item.value = value;
    item.achievedDate.year = year;
    item.achievedDate.month = month;

    // Bubble up avoiding object swap allocation overhead
    let curr = existingIndex;
    while (curr > 0 && list[curr - 1].value < value) {
      list[curr] = list[curr - 1];
      curr--;
    }
    list[curr] = item;
    return;
  }

  // Find insertion point
  let insertAt = 0;
  while (insertAt < len && value <= list[insertAt].value) {
    insertAt++;
  }
  
  const newItem = {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona,
    value,
    achievedDate: { year, month }
  };

  if (len < 10) {
    list.push(newItem);
    // Shift elements down to make room
    for (let i = len; i > insertAt; i--) {
      list[i] = list[i - 1];
    }
    list[insertAt] = newItem;
  } else {
    // Shift elements down, dropping the last one
    for (let i = 9; i > insertAt; i--) {
      list[i] = list[i - 1];
    }
    list[insertAt] = newItem;
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
 * Removes a rikishi from an active record list.
 */
function removeActiveRecord(list: RecordEntry[], rikishiId: Id) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].rikishiId === rikishiId) {
      list.splice(i, 1);
      break; // Lists only contain each rikishi once
    }
  }
}

/**
 * Called when a Rikishi retires (Intai).
 */
export function onRikishiRetired(world: WorldState, rikishiId: Id) {
  const records = ensureRecordsState(world);
  
  // ⚡ Bolt: Use manual shift/pop to remove from active lists to avoid O(N) allocation overhead of .filter()
  removeActiveRecord(records.active.careerWins, rikishiId);
  removeActiveRecord(records.active.makuuchiWins, rikishiId);
  removeActiveRecord(records.active.yusho, rikishiId);
  removeActiveRecord(records.active.consecutiveYusho, rikishiId);
  removeActiveRecord(records.active.kinboshi, rikishiId);
}
