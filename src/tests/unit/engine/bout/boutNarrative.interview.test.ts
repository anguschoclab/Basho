import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "../utils";
import { makeBoutResult, makeBoutWorld } from "@/tests/helpers/boutTestHelpers";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { PressPersona } from "@/engine/types/media";

 

function getInterviewLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "interview");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — post-bout interview (T13)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T13.7: interview always generates at least 1 line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-interview-1-1", world);
    const interviewLines = getInterviewLines(result);
    expect(interviewLines.length).toBeGreaterThan(0);
  });

  it("T13.9: deterministic — same seed → same interview text", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const r1 = makeBoutResult();
    const r2 = makeBoutResult();
    generateBoutNarrative(r1, east, west, BASHO, 8, "seed-interview-det-6", world);
    generateBoutNarrative(r2, east, west, BASHO, 8, "seed-interview-det-6", world);
    expect(getInterviewLines(r1).map((l) => l.text)).toEqual(getInterviewLines(r2).map((l) => l.text));
  });

  it("T13.10: no [MISSING:] tokens in interview lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-interview-missing", world);
    for (const line of getInterviewLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });

  it("T21.1: stoic persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "stoic" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-interview-stoic-8", world);
    const interviewLines = getInterviewLines(result);
    expect(interviewLines.length).toBeGreaterThan(0);
  });

  it("T21.2: villain persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "villain" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-interview-villain-2", world);
    const interviewLines = getInterviewLines(result);
    expect(interviewLines.length).toBeGreaterThan(0);
  });

  it("T21.4: firebrand persona → interview line generated", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      pressPersona: "firebrand" as PressPersona,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-interview-firebrand-9", world);
    const interviewLines = getInterviewLines(result);
    expect(interviewLines.length).toBeGreaterThan(0);
  });

  it("T21.14: pressPersona undefined → defaults to neutral, no error", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    delete (east as any).pressPersona;
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-interview-nopersona", world);
    }).not.toThrow();
    expect(getInterviewLines(result).length).toBeGreaterThan(0);
  });
});
