/**
 * kimarite.test.ts
 *
 * Pins for calculateMostFrequentKimarite / toKimariteDTO:
 * wins-only tally, raw win counts, non-technique filtering (fusensho,
 * empty), percentage shares over technique-wins, and DTO plumbing.
 */
import { describe, it, expect } from "vitest";
import {
  calculateMostFrequentKimarite,
  toKimariteDTO,
} from "@/presenters/rikishi/transformers/kimarite";
import { mockRikishi } from "@tests/unit/engine/utils";
import { SeededRNG } from "@/engine/core/rng";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchResultLog } from "@/engine/types/records";

function bout(win: boolean, kimarite: string): MatchResultLog {
  return { opponentId: "opp", win, kimarite, bashoId: "hatsu-2025", day: 1, year: 2025 };
}

describe("calculateMostFrequentKimarite", () => {
  it("returns [] for empty or absent history", () => {
    expect(calculateMostFrequentKimarite([])).toEqual([]);
    expect(calculateMostFrequentKimarite(undefined as unknown as MatchResultLog[])).toEqual([]);
  });

  it("counts wins per kimarite and exposes raw counts", () => {
    const entries = calculateMostFrequentKimarite([
      bout(true, "yorikiri"),
      bout(true, "oshidashi"),
      bout(true, "yorikiri"),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ kimarite: "yorikiri", percentage: 67, wins: 2 });
    expect(entries[1]).toEqual({ kimarite: "oshidashi", percentage: 33, wins: 1 });
  });

  it("ignores losses entirely", () => {
    const entries = calculateMostFrequentKimarite([
      bout(false, "yorikiri"),
      bout(false, "oshidashi"),
    ]);
    expect(entries).toEqual([]);
  });

  it("excludes fusensho and empty kimarite from counts and denominators", () => {
    const entries = calculateMostFrequentKimarite([
      bout(true, "yorikiri"),
      bout(true, "fusensho"),
      bout(true, ""),
    ]);
    expect(entries).toEqual([{ kimarite: "yorikiri", percentage: 100, wins: 1 }]);
  });

  it("sorts by wins descending with deterministic tiebreak", () => {
    const entries = calculateMostFrequentKimarite([
      bout(true, "oshidashi"),
      bout(true, "yorikiri"),
      bout(true, "hatakikomi"),
    ]);
    expect(entries.map((e) => e.kimarite)).toEqual(["hatakikomi", "oshidashi", "yorikiri"]);
  });
});

describe("toKimariteDTO", () => {
  it("carries wins through to the detailed DTO", () => {
    const r = mockRikishi("k1", {
      history: [bout(true, "yorikiri"), bout(true, "yorikiri")],
    }) as Rikishi;
    const dto = toKimariteDTO(r, new SeededRNG("t"));
    expect(dto.favoredKimariteDetailed).toEqual([
      { kimarite: "yorikiri", percentage: 100, wins: 2 },
    ]);
    expect(dto.favoredKimarite).toEqual(["yorikiri (100%)"]);
    expect(typeof dto.favoredKimariteDisplay).toBe("string");
  });
});
