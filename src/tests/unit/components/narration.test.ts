import { describe, it, expect } from "vitest";
import { getNarrationLines } from "@/components/game/boutReplay/boutCanvas/narration";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";

function makeUIRikishi(id: string, shikona: string): UIRikishi {
  return {
    id,
    shikona,
  } as unknown as UIRikishi;
}

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
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
  };
}

describe("getNarrationLines", () => {
  it("returns pbpLines text when pbpLines is populated", () => {
    const east = makeUIRikishi("r-east", "Asanoyama");
    const west = makeUIRikishi("r-west", "Terunofuji");
    const result = makeBoutResult({
      pbpLines: [
        { text: "Opening line", id: "1", phase: "opening" },
        { text: "Finish line", id: "2", phase: "finish" },
      ],
    });

    const lines = getNarrationLines(result, east, west);
    expect(lines).toEqual(["Opening line", "Finish line"]);
  });

  it("returns hardcoded fallback when pbpLines is undefined (fusensho)", () => {
    const east = makeUIRikishi("r-east", "Asanoyama");
    const west = makeUIRikishi("r-west", "Terunofuji");
    const result = makeBoutResult({
      pbpLines: undefined,
      kimarite: "fusensho",
      kimariteName: "Fusensho",
    });

    const lines = getNarrationLines(result, east, west);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.includes("Asanoyama"))).toBe(true);
  });

  it("does not reference result.narrative or result.pbp", () => {
    const east = makeUIRikishi("r-east", "Asanoyama");
    const west = makeUIRikishi("r-west", "Terunofuji");
    const result = makeBoutResult({
      pbpLines: [{ text: "Test line", id: "1", phase: "opening" }],
    });

    // These fields should not exist on BoutResult anymore
    expect((result as unknown as Record<string, unknown>).narrative).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).pbp).toBeUndefined();

    const lines = getNarrationLines(result, east, west);
    expect(lines).toEqual(["Test line"]);
  });

  it("filters out pbpLines with empty or short text (length <= 2)", () => {
    const east = makeUIRikishi("r-east", "Asanoyama");
    const west = makeUIRikishi("r-west", "Terunofuji");
    const result = makeBoutResult({
      pbpLines: [
        { text: "Valid line", id: "1", phase: "opening" },
        { text: "", id: "2", phase: "opening" },
        { text: "ab", id: "3", phase: "opening" },
        { text: "Another valid line", id: "4", phase: "finish" },
      ],
    });

    const lines = getNarrationLines(result, east, west);
    expect(lines).toEqual(["Valid line", "Another valid line"]);
  });

  it("returns fallback when pbpLines is an empty array", () => {
    const east = makeUIRikishi("r-east", "Asanoyama");
    const west = makeUIRikishi("r-west", "Terunofuji");
    const result = makeBoutResult({ pbpLines: [] });

    const lines = getNarrationLines(result, east, west);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.includes("Asanoyama"))).toBe(true);
  });

  it("returns fallback when pbpLines is undefined (fusensho)", () => {
    const east = makeUIRikishi("r-east", "Asanoyama");
    const west = makeUIRikishi("r-west", "Terunofuji");
    const result = makeBoutResult({
      pbpLines: undefined,
      kimarite: "fusensho",
      kimariteName: "Fusensho",
    });

    const lines = getNarrationLines(result, east, west);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.includes("Asanoyama"))).toBe(true);
  });
});
