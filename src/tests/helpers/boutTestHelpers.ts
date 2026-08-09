 
/**
 * Shared helpers for bout narrative tests.
 * Eliminates duplicated makeBoutResult/makeMinimalBoutResult/makeWorld definitions
 * across 37+ test files in src/tests/unit/engine/bout/.
 */
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { makeMockWorld } from "@/tests/unit/engine/utils";

/**
 * Full BoutResult mock with log entries (tachiai + finish phases).
 * Used by boutNarrative.*.test.ts files that need phase-tagged log data.
 */
export function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 8.5,
    upset: false,
    isKinboshi: false,
    log: [
      { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as unknown as BoutResult;
}

/**
 * Minimal BoutResult mock without log entries.
 * Used by tests that only need the result shape, not phase data.
 */
export function makeMinimalBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 8.5,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as unknown as BoutResult;
}

/**
 * World with two rikishi (east/west) for bout narrative tests.
 * Optionally includes a currentBasho with standings.
 */
export function makeBoutWorld(
  east: Rikishi,
  west: Rikishi,
  overrides: Partial<WorldState> = {}
): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    ...overrides,
  }) as WorldState;
}
