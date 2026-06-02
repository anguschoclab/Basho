import type { WorldState } from "./types/world";
import type { RecordEntry, WorldRecords } from "./types/records";
import type { Id } from "./types/common";
import type { Rikishi } from "./types/rikishi";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

/**
 * Ensures the records state is initialized.
 * Returns StateImpact describing records initialization instead of mutating state directly.
 */
export function ensureRecordsState(world: WorldState): StateImpact {
  const builder = createImpactBuilder("ensureRecordsState");

  if (!world.records) {
    const records = {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    };
    builder.updateWorldField("records", records);
  }

  return builder.build();
}

/**
 * Updates a specific leaderboard with a new entry if it qualifies for the Top 10.
 * Uses sorted insertion to maintain order efficiently.
 */
function updateLeaderboard(
  list: RecordEntry[],
  rikishi: Rikishi,
  value: number,
  year: number,
  month: number
) {
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
    achievedDate: { year, month },
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
 * Returns StateImpact describing records updates instead of mutating state directly.
 */
export function onBashoEnded(world: WorldState): StateImpact {
  const builder = createImpactBuilder("onBashoEnded");

  const records = world.records || {
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
  };

  const year = world.calendar.year;
  const month = world.calendar.month;

  // Create deep copies of leaderboards to avoid mutating
  const updatedRecords = {
    allTime: {
      careerWins: [...records.allTime.careerWins],
      makuuchiWins: [...records.allTime.makuuchiWins],
      yusho: [...records.allTime.yusho],
      consecutiveYusho: [...records.allTime.consecutiveYusho],
      kinboshi: [...records.allTime.kinboshi],
    },
    active: {
      careerWins: [...records.active.careerWins],
      makuuchiWins: [...records.active.makuuchiWins],
      yusho: [...records.active.yusho],
      consecutiveYusho: [...records.active.consecutiveYusho],
      kinboshi: [...records.active.kinboshi],
    },
  };

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = world.rikishi.get(rikishiId);
    if (!rikishi) continue;
    // 1. Career Wins
    updateLeaderboard(updatedRecords.allTime.careerWins, rikishi, rikishi.careerWins, year, month);
    updateLeaderboard(updatedRecords.active.careerWins, rikishi, rikishi.careerWins, year, month);

    // 2. Makuuchi Wins
    if (rikishi.division === "makuuchi") {
      updateLeaderboard(
        updatedRecords.allTime.makuuchiWins,
        rikishi,
        rikishi.makuuchiWins,
        year,
        month
      );
      updateLeaderboard(
        updatedRecords.active.makuuchiWins,
        rikishi,
        rikishi.makuuchiWins,
        year,
        month
      );
    }

    // 3. Yusho
    if (rikishi.careerRecord?.yusho) {
      updateLeaderboard(
        updatedRecords.allTime.yusho,
        rikishi,
        rikishi.careerRecord.yusho,
        year,
        month
      );
      updateLeaderboard(
        updatedRecords.active.yusho,
        rikishi,
        rikishi.careerRecord.yusho,
        year,
        month
      );
    }

    // 4. Consecutive Yusho
    if (rikishi.careerRecord?.consecutiveYusho) {
      updateLeaderboard(
        updatedRecords.allTime.consecutiveYusho,
        rikishi,
        rikishi.careerRecord.consecutiveYusho,
        year,
        month
      );
      updateLeaderboard(
        updatedRecords.active.consecutiveYusho,
        rikishi,
        rikishi.careerRecord.consecutiveYusho,
        year,
        month
      );
    }

    // 5. Kinboshi
    if (rikishi.careerRecord?.kinboshiCount) {
      updateLeaderboard(
        updatedRecords.allTime.kinboshi,
        rikishi,
        rikishi.careerRecord.kinboshiCount,
        year,
        month
      );
      updateLeaderboard(
        updatedRecords.active.kinboshi,
        rikishi,
        rikishi.careerRecord.kinboshiCount,
        year,
        month
      );
    }
  }

  builder.updateWorldField("records", updatedRecords);

  return builder.build();
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
 * Returns StateImpact describing record updates instead of mutating state directly.
 */
export function onRikishiRetired(world: WorldState, rikishiId: Id): StateImpact {
  const builder = createImpactBuilder("onRikishiRetired");

  const records = world.records || {
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
  };

  // Create deep copies of active leaderboards to avoid mutating
  const updatedRecords = {
    allTime: {
      careerWins: [...records.allTime.careerWins],
      makuuchiWins: [...records.allTime.makuuchiWins],
      yusho: [...records.allTime.yusho],
      consecutiveYusho: [...records.allTime.consecutiveYusho],
      kinboshi: [...records.allTime.kinboshi],
    },
    active: {
      careerWins: [...records.active.careerWins],
      makuuchiWins: [...records.active.makuuchiWins],
      yusho: [...records.active.yusho],
      consecutiveYusho: [...records.active.consecutiveYusho],
      kinboshi: [...records.active.kinboshi],
    },
  };

  // ⚡ Bolt: Use manual shift/pop to remove from active lists to avoid O(N) allocation overhead of .filter()
  removeActiveRecord(updatedRecords.active.careerWins, rikishiId);
  removeActiveRecord(updatedRecords.active.makuuchiWins, rikishiId);
  removeActiveRecord(updatedRecords.active.yusho, rikishiId);
  removeActiveRecord(updatedRecords.active.consecutiveYusho, rikishiId);
  removeActiveRecord(updatedRecords.active.kinboshi, rikishiId);

  builder.updateWorldField("records", updatedRecords);

  return builder.build();
}
