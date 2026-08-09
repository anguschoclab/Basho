import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-birthday",
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

// hatsu basho month = 1 (January)
const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — birthday narrative (T19)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T19.1: birthMonth matches basho month → birthday line with tag", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      birthMonth: 1,
      birthDay: 10,
      currentBashoWins: 5,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", {
      shikona: "Beta",
      currentBashoWins: 3,
      currentBashoLosses: 5,
    });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 10, "seed-birthday-1", world);
    const birthdayLines = getPreBoutLines(result).filter((l) => l.tags?.includes("birthday"));
    expect(birthdayLines.length).toBeGreaterThan(0);
  });

  it("T19.3: birthMonth doesn't match → no birthday line", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      birthMonth: 6,
      birthDay: 10,
      currentBashoWins: 5,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", {
      shikona: "Beta",
      currentBashoWins: 3,
      currentBashoLosses: 5,
    });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 10, "seed-birthday-no", world);
    const birthdayLines = getPreBoutLines(result).filter((l) => l.tags?.includes("birthday"));
    expect(birthdayLines.length).toBe(0);
  });

  it("T19.4: birthMonth/birthDay undefined → no birthday line, no error", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
    });
    delete (east as any).birthMonth;
    delete (east as any).birthDay;
    const west = mockRikishi("r-west", {
      shikona: "Beta",
      currentBashoWins: 3,
      currentBashoLosses: 5,
    });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 10, "seed-birthday-undef", world);
    }).not.toThrow();
    const birthdayLines = getPreBoutLines(result).filter((l) => l.tags?.includes("birthday"));
    expect(birthdayLines.length).toBe(0);
  });

  it("T19.7: no [MISSING:] tokens in birthday lines", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      birthMonth: 1,
      birthDay: 10,
      currentBashoWins: 5,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", {
      shikona: "Beta",
      currentBashoWins: 3,
      currentBashoLosses: 5,
    });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 10, "seed-birthday-missing", world);
    for (const line of getPreBoutLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
