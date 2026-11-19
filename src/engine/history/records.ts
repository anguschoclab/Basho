import type { WorldState } from "@/engine/types/world";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { createDefaultRecords, type RecordBoards, type RecordEntry } from "@/engine/types/records";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getRikishi } from "@/engine/core/queries";

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
    // Clone the entry before updating — the copied leaderboard arrays still
    // alias the input world's RecordEntry objects, so in-place writes would
    // leak into the pre-resolution world.
    const item = { ...list[existingIndex], value };
    if (item.achievedDate) {
      item.achievedDate = { ...item.achievedDate, year, month };
    }

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

  const records = world.records || createDefaultRecords();

  const year = world.year ?? DEFAULT_START_YEAR;
  const month = world.calendar?.month ?? 1;

  // Create deep copies of leaderboards to avoid mutating
  const copyBoards = (b: RecordBoards): RecordBoards => ({
    careerWins: [...b.careerWins],
    makuuchiWins: [...b.makuuchiWins],
    yusho: [...b.yusho],
    consecutiveYusho: [...b.consecutiveYusho],
    kinboshi: [...b.kinboshi],
    // Boards added in W F may be absent on old saves — default to empty.
    careerBouts: [...(b.careerBouts ?? [])],
    makuuchiBouts: [...(b.makuuchiBouts ?? [])],
    consecutiveAppearances: [...(b.consecutiveAppearances ?? [])],
    kinboshiConceded: [...(b.kinboshiConceded ?? [])],
  });
  const updatedRecords = {
    allTime: copyBoards(records.allTime),
    active: copyBoards(records.active),
  };

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    // Maezumo fillers are evaluation participants — never board-eligible.
    if (!rikishi || rikishi.isMaezumo) continue;
    updateRikishiBoards(updatedRecords, rikishi, year, month);
  }

  builder.updateWorldField("records", updatedRecords);

  return builder.build();
}

/** Push one rikishi's qualifying values onto every board of both scopes. */
function updateRikishiBoards(
  updatedRecords: { allTime: RecordBoards; active: RecordBoards },
  rikishi: Rikishi,
  year: number,
  month: number
): void {
  const both = (board: keyof RecordBoards, value: number | undefined) => {
    updateLeaderboard(updatedRecords.allTime[board], rikishi, value ?? 0, year, month);
    updateLeaderboard(updatedRecords.active[board], rikishi, value ?? 0, year, month);
  };

  both("careerWins", rikishi.careerWins);
  if (rikishi.division === "makuuchi") both("makuuchiWins", rikishi.makuuchiWins);
  both("yusho", rikishi.careerRecord?.yusho);
  both("consecutiveYusho", rikishi.consecutiveYusho);
  both("kinboshi", rikishi.stats?.achievements?.kinboshiEarned);

  // W F appearance/durability boards
  both(
    "careerBouts",
    (rikishi.careerWins ?? 0) + (rikishi.careerLosses ?? 0) + (rikishi.careerAbsences ?? 0)
  );
  both(
    "makuuchiBouts",
    (rikishi.divisionRecords?.makuuchi?.wins ?? 0) +
      (rikishi.divisionRecords?.makuuchi?.losses ?? 0)
  );
  both("consecutiveAppearances", rikishi.consecutiveBashoFought);
  both("kinboshiConceded", rikishi.stats?.achievements?.kinboshiConceded);
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

  const records = world.records || createDefaultRecords();

  // Create deep copies of active leaderboards to avoid mutating
  const copyBoards = (b: RecordBoards): RecordBoards => ({
    careerWins: [...b.careerWins],
    makuuchiWins: [...b.makuuchiWins],
    yusho: [...b.yusho],
    consecutiveYusho: [...b.consecutiveYusho],
    kinboshi: [...b.kinboshi],
    // Boards added in W F may be absent on old saves — default to empty.
    careerBouts: [...(b.careerBouts ?? [])],
    makuuchiBouts: [...(b.makuuchiBouts ?? [])],
    consecutiveAppearances: [...(b.consecutiveAppearances ?? [])],
    kinboshiConceded: [...(b.kinboshiConceded ?? [])],
  });
  const updatedRecords = {
    allTime: copyBoards(records.allTime),
    active: copyBoards(records.active),
  };

  // Use manual shift/pop to remove from active lists to avoid O(N) allocation overhead of .filter()
  for (const board of [
    updatedRecords.active.careerWins,
    updatedRecords.active.makuuchiWins,
    updatedRecords.active.yusho,
    updatedRecords.active.consecutiveYusho,
    updatedRecords.active.kinboshi,
    updatedRecords.active.careerBouts,
    updatedRecords.active.makuuchiBouts,
    updatedRecords.active.consecutiveAppearances,
    updatedRecords.active.kinboshiConceded,
  ]) {
    removeActiveRecord(board, rikishiId);
  }

  builder.updateWorldField("records", updatedRecords);

  return builder.build();
}

/**
 * Backfill for saves predating `Rikishi.consecutiveBashoFought`: count the
 * trailing careerHistory snapshots with zero absences. Capped by the
 * history window (last 6 basho), so long streaks undercount on load —
 * the live counter takes over from the next publish.
 */
export function computeConsecutiveBashoFought(careerHistory: CareerSnapshot[] | undefined): number {
  if (!careerHistory?.length) return 0;
  let streak = 0;
  for (let i = careerHistory.length - 1; i >= 0; i--) {
    if ((careerHistory[i].absences ?? 0) > 0) break;
    streak++;
  }
  return streak;
}
