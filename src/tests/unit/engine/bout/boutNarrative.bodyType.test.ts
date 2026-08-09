import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine, PbpTag } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

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
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

describe("body type pre-bout narrative (5.1)", () => {
  it("body type line present when bodyType set on both rikishi", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", bodyType: "tower" });
    const west = mockRikishi("r2", {
      rank: "maegashira",
      division: "makuuchi",
      bodyType: "barrel",
    });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "body-type-seed", world);
    const lines = getLines(result);
    const bodyTypeLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "body_type"));

    expect(bodyTypeLines.length).toBeGreaterThanOrEqual(1);
  });

  it("body type line absent when bodyType not set", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-body-type-seed", world);
    const lines = getLines(result);
    const bodyTypeLines = lines.filter((l) => hasTag(l, "body_type"));

    expect(bodyTypeLines.length).toBe(0);
  });

  it("only one body type line when only one rikishi has bodyType", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      bodyType: "compact",
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "one-body-type-seed", world);
    const lines = getLines(result);
    const bodyTypeLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "body_type"));

    expect(bodyTypeLines.length).toBe(1);
  });

  it("template interpolates shikona", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      bodyType: "lanky",
      shikona: "TestShikona",
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "interp-body-type-seed", world);
    const lines = getLines(result);
    const bodyTypeLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "body_type"));

    expect(bodyTypeLines.length).toBeGreaterThan(0);
    expect(bodyTypeLines[0].text).toContain("TestShikona");
  });
});
