/**
 * kinboshiLedger.ts
 * =================
 * Derives when each kinboshi was earned from the canonical `world.awardLog`
 * so the Almanac can date "Giant Slayers" entries instead of omitting dates.
 */

import type { WorldState } from "../../engine/types/world";
import type { BashoName } from "../../engine/types/basho";
import type { Id } from "../../engine/types/common";
import { BASHO_CALENDAR } from "../../engine/calendar";

export interface KinboshiLedgerEntry {
  winnerId: Id;
  opponentId?: Id;
  bashoName: BashoName;
  year: number;
  day?: number;
  month: number;
}

const BASHO_MONTHS: Record<string, number> = {
  hatsu: 1,
  haru: 3,
  natsu: 5,
  nagoya: 7,
  aki: 9,
  kyushu: 11,
};

function bashoMonth(name: BashoName): number {
  return BASHO_CALENDAR[name]?.month ?? BASHO_MONTHS[String(name)] ?? 0;
}

/** All kinboshi ledger entries, oldest → newest. */
export function selectKinboshiLedger(world: WorldState): KinboshiLedgerEntry[] {
  return (world.awardLog ?? [])
    .filter((e) => e.type === "kinboshi")
    .map((e) => ({
      winnerId: e.winnerId,
      opponentId: e.opponentId,
      bashoName: e.bashoName,
      year: e.year,
      day: e.day,
      month: bashoMonth(e.bashoName),
    }));
}

/** Most recent kinboshi date per winnerId — for the Almanac's giant slayers list. */
export function selectLatestKinboshiDates(
  world: WorldState
): Map<Id, { year: number; month: number }> {
  const map = new Map<Id, { year: number; month: number }>();
  for (const e of selectKinboshiLedger(world)) {
    map.set(e.winnerId, { year: e.year, month: e.month });
  }
  return map;
}
