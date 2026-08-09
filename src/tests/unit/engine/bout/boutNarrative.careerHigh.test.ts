import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-careerhigh",
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
  };
}

function makeWorld(east: Rikishi, west: Rikishi): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
  }) as WorldState;
}

function getPreBoutLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "pre_bout");
}

function makeCareerSnap(rank: string, rankNumber: number): CareerSnapshot {
  return {
    id: `snap-${rank}-${rankNumber}`,
    bashoId: "hatsu-2024",
    year: 2024,
    month: 1,
    bashoName: "hatsu",
    rank: rank as any,
    division: "makuuchi",
    rankNumber,
    side: "east",
    wins: 8,
    losses: 7,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 140,
    momentum: 0,
  } as CareerSnapshot;
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — career-high rank (T8)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T8.3: empty careerHistory → no career_high line, no error", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", careerHistory: [] });
    const west = mockRikishi("r-west", { shikona: "Beta", careerHistory: [] });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-ch-empty", world);
    }).not.toThrow();
    const careerHighLines = getPreBoutLines(result).filter((l) => l.tags?.includes("career_high"));
    expect(careerHighLines.length).toBe(0);
  });

  it("T8.5: no [MISSING:] tokens when careerHistory present", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      rank: "sekiwake",
      rankNumber: 3,
      careerHistory: [makeCareerSnap("maegashira", 5), makeCareerSnap("komusubi", 4)],
    });
    const west = mockRikishi("r-west", { shikona: "Beta" });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 5, "seed-ch-missing", world);
    for (const line of getPreBoutLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
