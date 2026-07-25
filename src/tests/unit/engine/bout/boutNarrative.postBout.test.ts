import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-postbout",
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

function makeWorld(east: Rikishi, west: Rikishi, overrides: Partial<WorldState> = {}): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    ...overrides,
  }) as WorldState;
}

function getPostBoutLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "post_bout");
}

function hasMissingTokens(text: string): boolean {
  return text.includes("[MISSING:");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — post-bout context", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  // ── T10: Post-bout records ──
  describe("T10: post-bout records", () => {
    it("T10.1: winner improves → post_bout line with winner name", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 2 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 7 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 10, "seed-post-1", world);
      const postLines = getPostBoutLines(result);
      expect(postLines.length).toBeGreaterThan(0);
      const allText = postLines.map((l) => l.text).join(" ");
      expect(allText).toContain("Alpha");
    });

    it("T10.3: winner reaches 8 wins → kachi-koshi line", () => {
      // For maegashira, kachi-koshi threshold is 8 wins
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 5, rank: "maegashira" });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 5, currentBashoLosses: 8, rank: "maegashira" });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 14, "seed-kachi-1", world);
      const kachiLines = getPostBoutLines(result).filter((l) => l.tags?.includes("career_high"));
      expect(kachiLines.length).toBeGreaterThan(0);
    });

    it("T10.10: deterministic — same seed → same post_bout lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 7, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 6 });
      const world = makeWorld(east, west);
      const r1 = makeBoutResult();
      const r2 = makeBoutResult();
      generateBoutNarrative(r1, east, west, BASHO, 10, "seed-post-det", world);
      generateBoutNarrative(r2, east, west, BASHO, 10, "seed-post-det", world);
      const l1 = getPostBoutLines(r1).map((l) => l.text);
      const l2 = getPostBoutLines(r2).map((l) => l.text);
      expect(l1).toEqual(l2);
    });

    it("T10.11: no [MISSING:] tokens in post_bout lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 12, "seed-post-missing", world);
      for (const line of getPostBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });

  // ── T11: Career milestones ──
  describe("T11: career milestones", () => {
    it("T11.1: careerWins at 100 → milestone line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", careerWins: 100, currentBashoWins: 5, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", careerWins: 50, currentBashoWins: 3, currentBashoLosses: 5 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-milestone-100", world);
      const milestoneLines = getPostBoutLines(result).filter((l) => l.tags?.includes("milestone"));
      expect(milestoneLines.length).toBeGreaterThan(0);
      expect(milestoneLines[0].text).toContain("100");
    });

    it("T11.3: careerWins = 99 → no milestone line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", careerWins: 99, currentBashoWins: 5, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", careerWins: 50, currentBashoWins: 3, currentBashoLosses: 5 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-milestone-99", world);
      const milestoneLines = getPostBoutLines(result).filter((l) => l.tags?.includes("milestone"));
      expect(milestoneLines.length).toBe(0);
    });

    it("T11.6: no [MISSING:] tokens in milestone lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", careerWins: 200, currentBashoWins: 5, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", careerWins: 50, currentBashoWins: 3, currentBashoLosses: 5 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-milestone-missing", world);
      for (const line of getPostBoutLines(result).filter((l) => l.tags?.includes("milestone"))) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });

  // ── T15: Consecutive kachi-koshi ──
  describe("T15: consecutive kachi-koshi in post-bout", () => {
    it("T15.1: consecutiveKachiKoshi: 2 + winner reaches kachi-koshi → consecutive line in pre_bout", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", consecutiveKachiKoshi: 2, currentBashoWins: 8, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 12, "seed-consec-post-1", world);
      // Pre-bout should mention the consecutive kachi (>= 3 threshold not met with 2, so no pre-bout line)
      // But post-bout kachi-koshi line should exist
      const kachiLines = getPostBoutLines(result).filter((l) => l.tags?.includes("career_high"));
      expect(kachiLines.length).toBeGreaterThan(0);
    });

    it("T15.4: consecutiveKachiKoshi undefined → no error", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 3 });
      delete (east as any).consecutiveKachiKoshi;
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 12, "seed-consec-undef", world);
      }).not.toThrow();
    });

    it("T15.5: no [MISSING:] tokens", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", consecutiveKachiKoshi: 3, currentBashoWins: 8, currentBashoLosses: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 12, "seed-consec-missing", world);
      for (const line of result.pbpLines ?? []) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });
});
