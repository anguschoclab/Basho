 
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine, PbpTag } from "@/engine/bout/boutNarrative";
import { mockRikishi, makeMockHeya } from "../utils";
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
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

describe("heya style pre-bout narrative (5.3)", () => {
  it("heya style line when trainingPhilosophy.signatureStyle set", () => {
    const heya = makeMockHeya("h1", {
      trainingPhilosophy: {
        focusBias: "power",
        intensityBias: "moderate",
        recruitmentBias: "domestic",
        signatureStyle: "oshi",
      },
    });
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", heyaId: "h1" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", heyaId: "h2" });
    const world = {
      rikishi: new Map([["r1", east], ["r2", west]]),
      heyas: new Map([["h1", heya]]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "heya-style-seed", world);
    const lines = getLines(result);
    const heyaStyleLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "heya_style"));

    expect(heyaStyleLines.length).toBeGreaterThanOrEqual(1);
  });

  it("no heya style line when no trainingPhilosophy", () => {
    const heya = makeMockHeya("h1");
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", heyaId: "h1" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", heyaId: "h2" });
    const world = {
      rikishi: new Map([["r1", east], ["r2", west]]),
      heyas: new Map([["h1", heya]]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-heya-style-seed", world);
    const lines = getLines(result);
    const heyaStyleLines = lines.filter((l) => hasTag(l, "heya_style"));

    expect(heyaStyleLines.length).toBe(0);
  });

  it("falls back to focusBias when no signatureStyle", () => {
    const heya = makeMockHeya("h1", {
      trainingPhilosophy: {
        focusBias: "technique",
        intensityBias: "moderate",
        recruitmentBias: "domestic",
      },
    });
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", heyaId: "h1" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", heyaId: "h2" });
    const world = {
      rikishi: new Map([["r1", east], ["r2", west]]),
      heyas: new Map([["h1", heya]]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "fallback-heya-seed", world);
    const lines = getLines(result);
    const heyaStyleLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "heya_style"));

    expect(heyaStyleLines.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates when both rikishi from same heya", () => {
    const heya = makeMockHeya("h1", {
      trainingPhilosophy: {
        focusBias: "power",
        intensityBias: "moderate",
        recruitmentBias: "domestic",
        signatureStyle: "yotsu",
      },
    });
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", heyaId: "h1" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", heyaId: "h1" });
    const world = {
      rikishi: new Map([["r1", east], ["r2", west]]),
      heyas: new Map([["h1", heya]]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "same-heya-seed", world);
    const lines = getLines(result);
    const heyaStyleLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "heya_style"));

    expect(heyaStyleLines.length).toBe(1);
  });

  it("two lines when different heya with different styles", () => {
    const heya1 = makeMockHeya("h1", {
      trainingPhilosophy: {
        focusBias: "power",
        intensityBias: "moderate",
        recruitmentBias: "domestic",
        signatureStyle: "oshi",
      },
    });
    const heya2 = makeMockHeya("h2", {
      trainingPhilosophy: {
        focusBias: "technique",
        intensityBias: "moderate",
        recruitmentBias: "domestic",
        signatureStyle: "yotsu",
      },
    });
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", heyaId: "h1" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", heyaId: "h2" });
    const world = {
      rikishi: new Map([["r1", east], ["r2", west]]),
      heyas: new Map([["h1", heya1], ["h2", heya2]]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "diff-heya-seed", world);
    const lines = getLines(result);
    const heyaStyleLines = lines.filter((l) => l.phase === "pre_bout" && hasTag(l, "heya_style"));

    expect(heyaStyleLines.length).toBe(2);
  });
});
