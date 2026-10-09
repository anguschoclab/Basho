/**
 * Semantic pin for the divergent `calculateKachiNokori` duplicate pair.
 *
 * Phase 3 deletes `src/engine/bout/kachiNokori.ts` (dead module) in favor of
 * `KachiNokoriService` (wired via CompetitionService/MochikyukinService/phase05).
 *
 * PINNED SEMANTICS (verified 2026-10-08):
 * - Scalar output is IDENTICAL on all inputs: both return max(0, wins - 8).
 *   The bout variant's (losses, absences) params affect nothing — the
 *   `totalBouts === 0` guard can only fire when wins < 8 anyway.
 * - `getKachiNokoriForRikishi` (service-only) adds sekitori gating:
 *   non-makuuchi/juryo divisions always return 0.
 *
 * These tests must keep passing after the deletion; the surviving
 * implementation must satisfy every assertion here.
 */
import { describe, it, expect } from "vitest";
import {
  calculateKachiNokori as calculateKachiNokoriBout,
  hasKachiKoshi,
  isMakeKoshiConfirmed,
} from "@/engine/bout/kachiNokori";
import {
  calculateKachiNokori as calculateKachiNokoriService,
  getKachiNokoriForRikishi,
} from "@/engine/systems/economy/KachiNokoriService";
import { mockRikishi } from "../utils";

describe("calculateKachiNokori — duplicate-pair equivalence pin", () => {
  const cases: Array<[wins: number, losses: number, absences: number]> = [
    [0, 0, 0],
    [0, 15, 0],
    [7, 8, 0],
    [8, 7, 0],
    [8, 0, 7],
    [9, 6, 0],
    [10, 3, 2],
    [15, 0, 0],
    [5, 8, 2],
  ];

  for (const [wins, losses, absences] of cases) {
    it(`returns identical scalar for wins=${wins} losses=${losses} absences=${absences}`, () => {
      expect(calculateKachiNokoriBout(wins, losses, absences)).toBe(
        calculateKachiNokoriService(wins),
      );
      expect(calculateKachiNokoriService(wins)).toBe(Math.max(0, wins - 8));
    });
  }
});

describe("calculateKachiNokori — bout-variant auxiliary fns (pre-deletion pin)", () => {
  it("hasKachiKoshi threshold is 8", () => {
    expect(hasKachiKoshi(7)).toBe(false);
    expect(hasKachiKoshi(8)).toBe(true);
    expect(hasKachiKoshi(15)).toBe(true);
  });

  it("isMakeKoshiConfirmed at 8 losses+absences", () => {
    expect(isMakeKoshiConfirmed(7)).toBe(false);
    expect(isMakeKoshiConfirmed(8)).toBe(true);
    expect(isMakeKoshiConfirmed(6, 2)).toBe(true);
  });
});

describe("getKachiNokoriForRikishi — sekitori gating (service-only)", () => {
  for (const [division, wins, expected] of [
    ["makuuchi", 10, 2],
    ["juryo", 9, 1],
    ["juryo", 8, 0],
    ["makushita", 15, 0],
    ["sandanme", 12, 0],
    ["jonidan", 12, 0],
    ["jonokuchi", 12, 0],
  ] as const) {
    it(`${division} with ${wins} wins -> ${expected}`, () => {
      const r = mockRikishi("r1", { division, currentBashoWins: wins });
      expect(getKachiNokoriForRikishi(r)).toBe(expected);
    });
  }
});
