 
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine } from "@/engine/bout/boutNarrative";
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

function makeWorld(east: ReturnType<typeof mockRikishi>, west: ReturnType<typeof mockRikishi>): WorldState {
  return { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function findKenshoLines(lines: PbpLine[]): PbpLine[] {
  return lines.filter((l) => l.tags.includes("kensho"));
}

describe("kensho narrative (7.3)", () => {
  it("pre-bout narrative mentions kensho when kenshoEnvelopes > 3", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "sekiwake", division: "makuuchi" });
    const world = makeWorld(east, west);
    const result = makeBoutResult({
      kenshoEnvelopes: 5,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
      kenshoBanners: [
        { bannerId: "b1", boutId: "test-bout-1", sponsorId: "s1", tier: "T4", displayName: "Test Sponsor", ceremonyStyleTag: "premium" },
        { bannerId: "b2", boutId: "test-bout-1", sponsorId: "s2", tier: "T4", displayName: "Test Sponsor 2", ceremonyStyleTag: "premium" },
        { bannerId: "b3", boutId: "test-bout-1", sponsorId: "s3", tier: "T3", displayName: "Test Sponsor 3", ceremonyStyleTag: "classic" },
        { bannerId: "b4", boutId: "test-bout-1", sponsorId: "s4", tier: "T3", displayName: "Test Sponsor 4", ceremonyStyleTag: "classic" },
      ],
    });

    generateBoutNarrative(result, east, west, undefined, 7, "kensho-prebout-seed", world);
    const lines = getLines(result);
    const kenshoLines = findKenshoLines(lines);

    const preBoutKensho = kenshoLines.filter((l) => l.phase === "pre_bout");
    expect(preBoutKensho.length).toBeGreaterThan(0);
  });

  it("post-bout narrative references kensho for upset winners", () => {
    const east = mockRikishi("r1", { rank: "maegashira" as never, division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = makeWorld(east, west);
    const result = makeBoutResult({
      kenshoEnvelopes: 3,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
      upset: true,
      winner: "east",
    });

    generateBoutNarrative(result, east, west, undefined, 7, "kensho-upset-seed", world);
    const lines = getLines(result);
    const kenshoLines = findKenshoLines(lines);

    const postBoutKensho = kenshoLines.filter((l) => l.phase === "post_bout");
    expect(postBoutKensho.length).toBeGreaterThan(0);

    const hasUpsetKensho = postBoutKensho.some((l) =>
      l.text.includes("upset") || l.text.includes("stun") || l.text.includes("shock") || l.text.includes("underdog")
    );
    expect(hasUpsetKensho).toBe(true);
  });

  it("no kensho narrative when kenshoEnvelopes = 0", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = makeWorld(east, west);
    const result = makeBoutResult({ kenshoEnvelopes: 0 });

    generateBoutNarrative(result, east, west, undefined, 7, "kensho-zero-seed", world);
    const lines = getLines(result);
    const kenshoLines = findKenshoLines(lines);

    expect(kenshoLines.length).toBe(0);
  });

  it("no pre-bout kensho when kenshoEnvelopes <= 3", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = makeWorld(east, west);
    const result = makeBoutResult({ kenshoEnvelopes: 3 });

    generateBoutNarrative(result, east, west, undefined, 7, "kensho-low-seed", world);
    const lines = getLines(result);
    const preBoutKensho = lines.filter((l) => l.phase === "pre_bout" && l.tags.includes("kensho"));

    expect(preBoutKensho.length).toBe(0);
  });
});
