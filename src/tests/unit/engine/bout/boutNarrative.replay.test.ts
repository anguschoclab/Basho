import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "../utils";
import { makeBoutWorld } from "@/tests/helpers/boutTestHelpers";
import type { BoutResult, BashoName } from "@/engine/types/basho";

 

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-replay",
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
    excitementScore: 75,
    log: [
      { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
      { phase: "engagement", data: { tick: 2, family: "push", intensity: 2 } },
      { phase: "edge_crisis", data: { tick: 5, rikishiId: "r-west", type: "approach" } },
      { phase: "edge_crisis", data: { tick: 6, rikishiId: "r-west", type: "recovery" } },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    ...overrides,
  } as unknown as BoutResult;
}

function getReplayLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "replay");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — replay analysis (T12)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T12.1: dramatic bout with excitement > 50 → replay line generated", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeBoutWorld(east, west);
    // Day 13+ → voiceStyle = "dramatic"
    const result = makeBoutResult({ excitementScore: 75 });
    generateBoutNarrative(result, east, west, BASHO, 13, "seed-replay-1", world);
    const replayLines = getReplayLines(result);
    expect(replayLines.length).toBeGreaterThan(0);
  });

  it("T12.2: low excitement → no replay line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult({ excitementScore: 20 });
    generateBoutNarrative(result, east, west, BASHO, 13, "seed-replay-low", world);
    const replayLines = getReplayLines(result);
    expect(replayLines.length).toBe(0);
  });

  it("T12.3: undefined excitement → no replay line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha" });
    const west = mockRikishi("r-west", { shikona: "Beta" });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();
    delete (result as any).excitementScore;
    generateBoutNarrative(result, east, west, BASHO, 13, "seed-replay-undef", world);
    const replayLines = getReplayLines(result);
    expect(replayLines.length).toBe(0);
  });

  it("T12.5: replay line has phase 'replay'", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult({ excitementScore: 80 });
    generateBoutNarrative(result, east, west, BASHO, 13, "seed-replay-phase", world);
    const replayLines = getReplayLines(result);
    expect(replayLines.length).toBeGreaterThan(0);
    expect(replayLines[0].phase).toBe("replay");
  });

  it("T12.6: no [MISSING:] tokens in replay lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult({ excitementScore: 70 });
    generateBoutNarrative(result, east, west, BASHO, 13, "seed-replay-missing", world);
    for (const line of getReplayLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
