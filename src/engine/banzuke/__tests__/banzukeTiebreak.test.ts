import { describe, expect, it } from "vitest";
import { resolveBanzukeTie, type BanzukeCandidate } from "../banzukeHelpers";
import type { WorldState } from "../../types/world";
import type { BashoPerformance } from "../../types/banzuke";
import type { Rikishi } from "../../types/rikishi";

describe("resolveBanzukeTie", () => {
  const mockBashoPerfA: BashoPerformance = {
    rikishiId: "R1",
    wins: 8,
    losses: 7,
    opponentAvgTier: 5, // Medium SOS
  };

  const mockBashoPerfB: BashoPerformance = {
    rikishiId: "R2",
    wins: 8,
    losses: 7,
    opponentAvgTier: 7, // Easier SOS
  };

  const perfMap = new Map<string, BashoPerformance>([
    ["R1", mockBashoPerfA],
    ["R2", mockBashoPerfB],
  ]);

  const mockRikishiA = {
    id: "R1",
    h2h: { R2: { wins: 5, losses: 2 } },
  } as unknown as Rikishi;

  const mockRikishiB = {
    id: "R2",
    h2h: { R1: { wins: 2, losses: 5 } },
  } as unknown as Rikishi;

  const mockWorld = {
    rikishi: new Map([
      ["R1", mockRikishiA],
      ["R2", mockRikishiB],
    ]),
  } as unknown as WorldState;

  it("Level 1: should favor the rikishi with lower oldKey (more senior starting position)", () => {
    const candA: BanzukeCandidate = {
      entry: {
        rikishiId: "R1",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "east" },
      },
      oldKey: 5000, // Senior
      desiredKey: 7000,
      eligibleBestTier: 5,
    };
    const candB: BanzukeCandidate = {
      entry: {
        rikishiId: "R2",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "west" },
      },
      oldKey: 5001, // Junior
      desiredKey: 7000,
      eligibleBestTier: 5,
    };

    const result = resolveBanzukeTie(candA, candB, mockWorld, perfMap);
    expect(result).toBeLessThan(0); // A wins
  });

  it("Level 2: should favor the rikishi with a superior career H2H record", () => {
    const candA: BanzukeCandidate = {
      entry: {
        rikishiId: "R1",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "east" },
      },
      oldKey: 5000,
      desiredKey: 7000,
      eligibleBestTier: 5,
    };
    const candB: BanzukeCandidate = {
      entry: {
        rikishiId: "R2",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "west" },
      },
      oldKey: 5000, // Ties on Seniority
      desiredKey: 7000,
      eligibleBestTier: 5,
    };

    // A has 5-2 lead over B in H2H
    const result = resolveBanzukeTie(candA, candB, mockWorld, perfMap);
    expect(result).toBeLessThan(0); // A wins
  });

  it("Level 3: should favor the rikishi with a harder SOS (lower avg opponent tier value)", () => {
    // Modify H2H to be a tie
    const neutralH2HWorld = {
      rikishi: new Map([
        ["R1", { id: "R1", h2h: { R2: { wins: 3, losses: 3 } } } as unknown as Rikishi],
        ["R2", { id: "R2", h2h: { R1: { wins: 3, losses: 3 } } } as unknown as Rikishi],
      ]),
    } as unknown as WorldState;

    const candA: BanzukeCandidate = {
      entry: {
        rikishiId: "R1",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "east" },
      },
      oldKey: 5000,
      desiredKey: 7000,
      eligibleBestTier: 5,
    };
    const candB: BanzukeCandidate = {
      entry: {
        rikishiId: "R2",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "west" },
      },
      oldKey: 5000,
      desiredKey: 7000,
      eligibleBestTier: 5,
    };

    // R1 SOS: 5, R2 SOS: 7. R1 (A) is harder.
    const result = resolveBanzukeTie(candA, candB, neutralH2HWorld, perfMap);
    expect(result).toBeLessThan(0); // A wins
  });

  it("Level 4: should fallback to a stable ID comparison if all other levels tie", () => {
    const deadTieWorld = {
      rikishi: new Map([
        ["R1", { id: "R1", h2h: { R2: { wins: 3, losses: 3 } } } as unknown as Rikishi],
        ["R2", { id: "R2", h2h: { R1: { wins: 3, losses: 3 } } } as unknown as Rikishi],
      ]),
    } as unknown as WorldState;

    const identicalPerfMap = new Map<string, BashoPerformance>([
      ["R1", { rikishiId: "R1", wins: 8, losses: 7, opponentAvgTier: 5 }],
      ["R2", { rikishiId: "R2", wins: 8, losses: 7, opponentAvgTier: 5 }],
    ]);

    const candA: BanzukeCandidate = {
      entry: {
        rikishiId: "A_ID",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "east" },
      },
      oldKey: 5000,
      desiredKey: 7000,
      eligibleBestTier: 5,
    };
    const candB: BanzukeCandidate = {
      entry: {
        rikishiId: "B_ID",
        division: "makuuchi",
        position: { rank: "maegashira", rankNumber: 1, side: "west" },
      },
      oldKey: 5000,
      desiredKey: 7000,
      eligibleBestTier: 5,
    };

    const result = resolveBanzukeTie(candA, candB, deadTieWorld, identicalPerfMap);
    expect(result).toBeLessThan(0); // 'A_ID' < 'B_ID'
  });
});
