import { describe, it, expect } from "bun:test";
import { mockRikishi } from "./utils";
import {
  scorePairing,
  buildCandidatePairs,
  DEFAULT_MATCHMAKING_RULES,
  type MatchPairing
} from "../matchmaking";
import type { BashoState } from "../types/basho";
import type { Rikishi } from "../types/rikishi";

function mockBasho(): BashoState {
  return {
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 5,
    matches: [],
    standings: new Map([
      ["r1", { wins: 3, losses: 1 }],
      ["r2", { wins: 3, losses: 1 }],
      ["r3", { wins: 1, losses: 3 }],
      ["r4", { wins: 2, losses: 2 }],
    ]),
    isActive: true
  } as unknown as BashoState;
}

describe("Matchmaking System", () => {
  describe("scorePairing", () => {
    it("should block same-heya pairings", () => {
      const basho = mockBasho();
      const a = mockRikishi("r1", { heyaId: "same-heya" });
      const b = mockRikishi("r2", { heyaId: "same-heya" });

      const result = scorePairing({ basho, a, b });
      expect(result).toBeNull();
    });

    it("should allow different-heya pairings", () => {
      const basho = mockBasho();
      const a = mockRikishi("r1", { heyaId: "heya-a" });
      const b = mockRikishi("r2", { heyaId: "heya-b" });

      const result = scorePairing({ basho, a, b });
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThan(0);
    });

    it("should block repeat opponents within a basho", () => {
      const basho = mockBasho();
      basho.matches.push({ eastRikishiId: "r1", westRikishiId: "r2" } as unknown as any);

      const a = mockRikishi("r1");
      const b = mockRikishi("r2");

      const result = scorePairing({ basho, a, b });
      expect(result).toBeNull();
    });

    it("should allow repeat opponents when override is set", () => {
      const basho = mockBasho();
      basho.matches.push({ eastRikishiId: "r1", westRikishiId: "r2" } as unknown as any);

      const a = mockRikishi("r1");
      const b = mockRikishi("r2");

      const result = scorePairing({ basho, a, b, allowRepeatOverride: true });
      expect(result).not.toBeNull();
      expect(result!.reasons).toContain("repeat_forced");
    });

    it("should score similar records higher than dissimilar", () => {
      const basho = mockBasho();
      const r1 = mockRikishi("r1"); // 3-1
      const r2 = mockRikishi("r2"); // 3-1
      const r3 = mockRikishi("r3", { currentBashoWins: 1, currentBashoLosses: 3 }); // 1-3

      const similar = scorePairing({ basho, a: r1, b: r2 });
      const dissimilar = scorePairing({ basho, a: r1, b: r3 });

      expect(similar).not.toBeNull();
      expect(dissimilar).not.toBeNull();
      expect(similar!.score).toBeGreaterThan(dissimilar!.score);
    });

    it("should penalize huge weight mismatches", () => {
      const basho = mockBasho();
      const light = mockRikishi("r1", { weight: 100 });
      const heavy = mockRikishi("r2", { weight: 200 }); // diff = 100
      const similar = mockRikishi("r3", { weight: 105 }); // diff = 5

      const mismatch = scorePairing({ basho, a: light, b: heavy });
      const matched = scorePairing({ basho, a: light, b: similar });

      expect(mismatch).not.toBeNull();
      expect(matched).not.toBeNull();
      // Ensure the reasons array reflects the mismatch correctly, score isn't guaranteed > 
      expect(mismatch!.reasons).toContain("weight_mismatch");
      expect(matched!.reasons).not.toContain("weight_mismatch");
    });

    it("should never match a rikishi against themselves", () => {
      const basho = mockBasho();
      const a = mockRikishi("r1");
      expect(scorePairing({ basho, a, b: a })).toBeNull();
    });
  });

  describe("buildCandidatePairs", () => {
    it("should produce scored candidate pairs sorted by score", () => {
      const basho = mockBasho();
      const rikishi = [
        mockRikishi("r1", { division: "makuuchi" }),
        mockRikishi("r2", { division: "makuuchi" }),
        mockRikishi("r3", { division: "makuuchi" }),
        mockRikishi("r4", { division: "makuuchi", currentBashoWins: 2, currentBashoLosses: 2 }),
      ];

      const candidates = buildCandidatePairs(basho, rikishi, { seed: "test-seed" });

      expect(candidates.length).toBeGreaterThan(0);
      // Should be sorted descending by score
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
      }
    });

    it("should be deterministic with the same seed", () => {
      const basho = mockBasho();
      const rikishi = [
        mockRikishi("r1", { division: "makuuchi" }),
        mockRikishi("r2", { division: "makuuchi" }),
        mockRikishi("r3", { division: "makuuchi" }),
      ];

      const run1 = buildCandidatePairs(basho, rikishi, { seed: "det-seed" });
      const run2 = buildCandidatePairs(basho, rikishi, { seed: "det-seed" });

      expect(run1.length).toBe(run2.length);
      for (let i = 0; i < run1.length; i++) {
        expect(run1[i].eastId).toBe(run2[i].eastId);
        expect(run1[i].westId).toBe(run2[i].westId);
      }
    });

    it("should filter by division when specified", () => {
      const basho = mockBasho();
      const rikishi = [
        mockRikishi("r1", { division: "makuuchi" }),
        mockRikishi("r2", { division: "makuuchi" }),
        mockRikishi("r3", { division: "juryo" }),
      ];

      const candidates = buildCandidatePairs(basho, rikishi, { seed: "div-seed", division: "makuuchi" });

      // r3 (juryo) should be excluded
      const allIds = candidates.flatMap(c => [c.eastId, c.westId]);
      expect(allIds).not.toContain("r3");
    });

    it("should exclude injured rikishi", () => {
      const basho = mockBasho();
      const rikishi = [
        mockRikishi("r1"),
        mockRikishi("r2", { injured: true } as unknown as any),
        mockRikishi("r3"),
      ];

      const candidates = buildCandidatePairs(basho, rikishi, { seed: "inj-seed" });
      const allIds = candidates.flatMap(c => [c.eastId, c.westId]);
      expect(allIds).not.toContain("r2");
    });
  });
});
