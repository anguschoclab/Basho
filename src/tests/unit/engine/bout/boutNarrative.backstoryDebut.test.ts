/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine, PbpTag } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { CareerSnapshot } from "@/engine/types/history";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-1",
    day: 7,
    eastId: "r1",
    westId: "r2",
    winner: "east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    duration: 8,
    log: [],
    upset: false,
    kenshoEnvelopes: 0,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

function makeCareerHistory(division: string): CareerSnapshot[] {
  return [
    {
      id: "snap-1",
      bashoId: "basho-1",
      year: 2025,
      month: 1,
      bashoName: "hatsu",
      rank: "maegashira",
      division: division as CareerSnapshot["division"],
      rankNumber: 10,
      side: "east",
      wins: 8,
      losses: 7,
      absences: 0,
      isYusho: false,
      isJunYusho: false,
      specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
      weight: 120,
      momentum: 0,
    },
  ];
}

describe("backstory debut narrative (5.2)", () => {
  it("debut backstory line when makuuchiCount === 0 and backstory set", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerHistory: [],
      backstory: "Hailing from Osaka, a determined wrestler.",
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", careerHistory: makeCareerHistory("makuuchi") });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "debut-seed", world);
    const lines = getLines(result);
    const debutLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "debut"));

    expect(debutLines.length).toBeGreaterThanOrEqual(1);
  });

  it("no debut backstory when makuuchiCount > 0", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerHistory: makeCareerHistory("makuuchi"),
      backstory: "Hailing from Osaka.",
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", careerHistory: makeCareerHistory("makuuchi") });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-debut-seed", world);
    const lines = getLines(result);
    const debutLines = lines.filter((l) => hasTag(l, "debut"));

    expect(debutLines.length).toBe(0);
  });

  it("no debut backstory when backstory not set", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerHistory: [],
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", careerHistory: makeCareerHistory("makuuchi") });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-backstory-seed", world);
    const lines = getLines(result);
    const debutLines = lines.filter((l) => hasTag(l, "debut"));

    expect(debutLines.length).toBe(0);
  });

  it("backstory text interpolated in debut line", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerHistory: [],
      backstory: "A unique origin story",
      shikona: "DebutRiki",
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", careerHistory: makeCareerHistory("makuuchi") });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "interp-debut-seed", world);
    const lines = getLines(result);
    const debutLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "debut"));

    expect(debutLines.length).toBeGreaterThan(0);
    expect(debutLines[0].text).toContain("A unique origin story");
  });
});
