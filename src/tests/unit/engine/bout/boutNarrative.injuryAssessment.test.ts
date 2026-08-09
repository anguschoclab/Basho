 
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
    inBoutInjury: null,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

describe("post-bout injury assessment narrative (6.3)", () => {
  it("post-bout injury assessment when inBoutInjury is non-null", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", shikona: "EastRiki" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", shikona: "WestRiki" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult({
      inBoutInjury: { rikishiId: "r2", area: "knee", severity: "moderate", triggerEvent: "landing" },
    });

    generateBoutNarrative(result, east, west, undefined, 7, "injury-assess-seed", world);
    const lines = getLines(result);
    const injuryLines = lines.filter(
      (l) => l.phase === "post_bout" && hasTag(l, "injury") && l.text.toLowerCase().includes("westriki")
    );

    expect(injuryLines.length).toBeGreaterThanOrEqual(1);
  });

  it("no injury assessment when inBoutInjury is null", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult({ inBoutInjury: null });

    generateBoutNarrative(result, east, west, undefined, 7, "no-injury-seed", world);
    const lines = getLines(result);
    // Filter to post_bout injury lines that mention assessment (not pre-bout injury mentions)
    const assessmentLines = lines.filter(
      (l) => l.phase === "post_bout" && hasTag(l, "injury")
    );

    expect(assessmentLines.length).toBe(0);
  });

  it("serious severity produces assessment text", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", shikona: "EastRiki" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", shikona: "WestRiki" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult({
      inBoutInjury: { rikishiId: "r2", area: "shoulder", severity: "serious", triggerEvent: "throw" },
    });

    generateBoutNarrative(result, east, west, undefined, 7, "serious-injury-seed", world);
    const lines = getLines(result);
    const injuryLines = lines.filter(
      (l) => l.phase === "post_bout" && hasTag(l, "injury") && l.text.toLowerCase().includes("westriki")
    );

    expect(injuryLines.length).toBeGreaterThan(0);
    expect(injuryLines[0].text.toLowerCase()).toContain("shoulder");
  });

  it("injured rikishi identified correctly (east/winner)", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", shikona: "EastRiki" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", shikona: "WestRiki" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2025 } as unknown as WorldState;
    const result = makeBoutResult({
      winner: "east",
      inBoutInjury: { rikishiId: "r1", area: "ankle", severity: "minor", triggerEvent: "pivot" },
    });

    generateBoutNarrative(result, east, west, undefined, 7, "east-injury-seed", world);
    const lines = getLines(result);
    const injuryLines = lines.filter(
      (l) => l.phase === "post_bout" && hasTag(l, "injury") && l.text.toLowerCase().includes("eastriki")
    );

    expect(injuryLines.length).toBeGreaterThanOrEqual(1);
  });
});
