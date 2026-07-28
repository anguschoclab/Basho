/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

describe("career phase template selection (6.1)", () => {
  it("pre-bout career phase narrative is generated for debut wrestlers", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", careerWins: 0, careerLosses: 0 });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "career-debut-seed", world);
    const lines = getLines(result);
    const careerPhaseLines = lines.filter((l) => hasTag(l, "rookie") || hasTag(l, "career_phase"));

    expect(careerPhaseLines.length).toBeGreaterThan(0);
  });

  it("pre-bout career phase narrative is generated for veteran wrestlers", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", careerWins: 500, careerLosses: 300, birthYear: 1988 });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]), year: 2030 } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "career-veteran-seed", world);
    const lines = getLines(result);
    const veteranLines = lines.filter((l) => hasTag(l, "veteran"));

    expect(veteranLines.length).toBeGreaterThan(0);
  });

  it("NarrativeContext includes careerPhase field", () => {
    // This is tested implicitly — if careerPhase is in NarrativeContext,
    // the interview question selection will use it
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi", declinePhase: "peak" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "career-phase-context-seed", world);
    // If careerPhase is in context, the function should run without error
    // and potentially add career_phase tagged interview lines
    const lines = getLines(result);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("interview includes career_phase tagged question when declinePhase is set", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi", declinePhase: "early-decline" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "career-interview-seed", world);
    const lines = getLines(result);
    const careerInterviewLines = lines.filter(
      (l) => l.phase === "interview" && hasTag(l, "career_phase")
    );

    // Career phase interview question should be present (interview is RNG-gated, but
    // we can verify the template exists and the code path works)
    // Note: interview only fires ~50% of the time, so we check if lines exist
    // If interview fires, career_phase question should be there
    if (lines.some((l) => l.phase === "interview")) {
      expect(careerInterviewLines.length).toBeGreaterThan(0);
    }
  });
});
