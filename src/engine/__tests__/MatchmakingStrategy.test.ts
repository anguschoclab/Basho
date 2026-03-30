import { describe, it, expect } from "vitest";
import { mockRikishi } from "./utils";
import { StandardMatchmaking } from "../MatchmakingStrategy";
import type { BashoState } from "../types/basho";

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

describe("StandardMatchmaking", () => {
  it("should generate candidate pairs for a given division", () => {
    const basho = mockBasho();
    const rikishi = [
      mockRikishi("r1", { division: "makuuchi", heyaId: "heya1" }),
      mockRikishi("r2", { division: "makuuchi", heyaId: "heya2" }),
      mockRikishi("r3", { division: "makuuchi", heyaId: "heya3" }),
      mockRikishi("r4", { division: "makuuchi", heyaId: "heya4" }),
    ];

    const strategy = new StandardMatchmaking();
    const pairs = strategy.generatePairs(basho, rikishi, { seed: "test-seed", division: "makuuchi" });

    // Since it tests every combination, it should return multiple possible pairings (r1/r2, r1/r3, r1/r4, etc.)
    expect(pairs.length).toBeGreaterThan(0);
    // Best score pair should be first
    for (let i = 1; i < pairs.length; i++) {
        expect(pairs[i - 1].score).toBeGreaterThanOrEqual(pairs[i].score);
    }
  });

  it("should be deterministic for the same seed", () => {
    const basho = mockBasho();
    const rikishi = [
      mockRikishi("r1", { division: "makuuchi", heyaId: "heya1" }),
      mockRikishi("r2", { division: "makuuchi", heyaId: "heya2" }),
      mockRikishi("r3", { division: "makuuchi", heyaId: "heya3" }),
      mockRikishi("r4", { division: "makuuchi", heyaId: "heya4" }),
    ];

    const strategy = new StandardMatchmaking();
    const pairs1 = strategy.generatePairs(basho, rikishi, { seed: "deterministic-seed", division: "makuuchi" });
    const pairs2 = strategy.generatePairs(basho, rikishi, { seed: "deterministic-seed", division: "makuuchi" });

    expect(pairs1.length).toBe(pairs2.length);
    for (let i = 0; i < pairs1.length; i++) {
      expect(pairs1[i].eastId).toBe(pairs2[i].eastId);
      expect(pairs1[i].westId).toBe(pairs2[i].westId);
      expect(pairs1[i].score).toBe(pairs2[i].score);
    }
  });

  it("should exclude injured rikishi from generation", () => {
    const basho = mockBasho();
    const rikishi = [
      mockRikishi("r1", { division: "makuuchi", heyaId: "heya1" }),
      mockRikishi("r2", { division: "makuuchi", heyaId: "heya2", injured: true } as any),
      mockRikishi("r3", { division: "makuuchi", heyaId: "heya3" }),
    ];

    const strategy = new StandardMatchmaking();
    const pairs = strategy.generatePairs(basho, rikishi, { seed: "test-seed", division: "makuuchi" });

    // r2 should not be in any pairing
    const allIds = pairs.flatMap(p => [p.eastId, p.westId]);
    expect(allIds).not.toContain("r2");
  });

  it("should explicitly block same-heya pairings within StandardMatchmaking", () => {
    const basho = mockBasho();
    const rikishi = [
      mockRikishi("r1", { division: "makuuchi", heyaId: "same-heya" }),
      mockRikishi("r2", { division: "makuuchi", heyaId: "same-heya" }),
    ];

    const strategy = new StandardMatchmaking();
    const pairs = strategy.generatePairs(basho, rikishi, { seed: "test-seed", division: "makuuchi" });

    // Since they are from the same heya and only 2 rikishi exist, no pairs can be formed
    expect(pairs.length).toBe(0);
  });
});
