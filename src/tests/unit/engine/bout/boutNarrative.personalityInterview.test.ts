import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { PressPersona } from "@/engine/types/media";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-personality",
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

function getInterviewLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "interview");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — personality-driven interviews (T21)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T21.1: stoic persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "stoic" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-stoic-2", world);
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.2: villain persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "villain" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-villain-2", world);
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.3: celebrity persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "celebrity" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-celebrity-5", world);
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.4: firebrand persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "firebrand" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-firebrand", world);
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.5: neutral persona + no traits → falls back to neutral template", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "neutral" as PressPersona,
      personalityTraits: [],
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-neutral-6", world);
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.14: pressPersona undefined → defaults to neutral, no error", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    delete (east as any).pressPersona;
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-undef-2", world);
    }).not.toThrow();
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.15: personalityTraits empty → no modifier lines, base persona answers used", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "neutral" as PressPersona,
      personalityTraits: [],
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-notraits", world);
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });

  it("T21.16: deterministic — same seed → same interview text", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "stoic" as PressPersona,
      personalityTraits: ["calm", "humble"],
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const r1 = makeBoutResult();
    const r2 = makeBoutResult();
    generateBoutNarrative(r1, east, west, BASHO, 8, "seed-pers-det", world);
    generateBoutNarrative(r2, east, west, BASHO, 8, "seed-pers-det", world);
    expect(getInterviewLines(r1).map((l) => l.text)).toEqual(getInterviewLines(r2).map((l) => l.text));
  });

  it("T21.18: no [MISSING:] tokens in interview lines", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "celebrity" as PressPersona,
      personalityTraits: ["witty", "humble"],
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-pers-missing", world);
    for (const line of getInterviewLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
