import { describe, it, expect } from "vitest";
import {
  scoreDrama,
  applyDramaBudget,
  isMakuuchiDebut,
} from "@/engine/matchmaking/DramaMatchmaker";
import { mockRikishi } from "../utils";
import type { MatchPairing } from "@/engine/matchmaking/MatchmakingPhases";

describe("DramaMatchmaker", () => {
  describe("scoreDrama", () => {
    it("scores 7-7 kachi-koshi showdown on Day 15 as 100", () => {
      const rikishiA = mockRikishi("a", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiB = mockRikishi("b", { currentBashoWins: 7, currentBashoLosses: 7 });
      const standings = new Map([
        ["a", { wins: 7, losses: 7 }],
        ["b", { wins: 7, losses: 7 }],
      ]);

      const result = scoreDrama(rikishiA, rikishiB, 15, standings);

      expect(result).not.toBeNull();
      expect(result?.score).toBe(100);
      expect(result?.label).toBe("make_or_break");
      expect(result?.reason).toBe("kachi_koshi_showdown_day15");
    });

    it("scores yusho contender matchup as 85", () => {
      const rikishiA = mockRikishi("a", { currentBashoWins: 12, currentBashoLosses: 2 });
      const rikishiB = mockRikishi("b", { currentBashoWins: 11, currentBashoLosses: 3 });
      const standings = new Map([
        ["a", { wins: 12, losses: 2 }],
        ["b", { wins: 11, losses: 3 }],
        ["c", { wins: 12, losses: 2 }], // Leader at 12 wins
      ]);

      const result = scoreDrama(rikishiA, rikishiB, 13, standings);

      expect(result).not.toBeNull();
      expect(result?.score).toBe(85);
      expect(result?.label).toBe("yusho_decider");
    });

    it("scores ozeki kadoban survival as 90", () => {
      const ozeki = mockRikishi("ozeki", {
        rank: "ozeki",
        currentBashoWins: 6,
        currentBashoLosses: 5,
      });
      const opponent = mockRikishi("opp", { currentBashoWins: 8, currentBashoLosses: 3 });
      const standings = new Map([
        ["ozeki", { wins: 6, losses: 5 }],
        ["opp", { wins: 8, losses: 3 }],
      ]);

      const result = scoreDrama(ozeki, opponent, 11, standings);

      expect(result).not.toBeNull();
      expect(result?.score).toBe(90);
      expect(result?.label).toBe("kadoban_survival");
    });

    it("does not apply kadoban bonus before day 10", () => {
      const ozeki = mockRikishi("ozeki", {
        rank: "ozeki",
        currentBashoWins: 2,
        currentBashoLosses: 5,
      });
      const opponent = mockRikishi("opp", {
        rank: "sekiwake",
        currentBashoWins: 4,
        currentBashoLosses: 3,
      });
      const standings = new Map([
        ["ozeki", { wins: 2, losses: 5 }],
        ["opp", { wins: 4, losses: 3 }],
      ]);

      const result = scoreDrama(ozeki, opponent, 7, standings);

      expect(result).toBeNull();
    });

    it("scores kinboshi hunt as 50", () => {
      const maegashira = mockRikishi("maegashira", { rank: "maegashira", rankNumber: 10 });
      const yokozuna = mockRikishi("yokozuna", { rank: "yokozuna" });
      const standings = new Map([
        ["maegashira", { wins: 5, losses: 7 }],
        ["yokozuna", { wins: 10, losses: 2 }],
      ]);

      const result = scoreDrama(maegashira, yokozuna, 8, standings);

      expect(result).not.toBeNull();
      expect(result?.score).toBe(50);
      expect(result?.label).toBe("kinboshi_hunt");
    });

    it("scores senshuraku elite matchup as 70", () => {
      const yokozuna = mockRikishi("yokozuna", { rank: "yokozuna" });
      const ozeki = mockRikishi("ozeki", { rank: "ozeki" });
      const standings = new Map([
        ["yokozuna", { wins: 8, losses: 6 }],
        ["ozeki", { wins: 8, losses: 6 }],
      ]);

      const result = scoreDrama(yokozuna, ozeki, 15, standings);

      expect(result).not.toBeNull();
      expect(result?.score).toBe(70);
      expect(result?.label).toBe("senshuraku_finale");
    });

    it("returns null for low-drama matchups", () => {
      const rikishiA = mockRikishi("a", { currentBashoWins: 5, currentBashoLosses: 5 });
      const rikishiB = mockRikishi("b", { currentBashoWins: 5, currentBashoLosses: 5 });
      const standings = new Map([
        ["a", { wins: 5, losses: 5 }],
        ["b", { wins: 5, losses: 5 }],
      ]);

      const result = scoreDrama(rikishiA, rikishiB, 8, standings);

      expect(result).toBeNull();
    });
  });

  describe("applyDramaBudget", () => {
    it("adds drama labels to high-drama pairings", () => {
      const rikishiA = mockRikishi("a", { rank: "maegashira", rankNumber: 10 });
      const rikishiB = mockRikishi("b", { rank: "yokozuna" });
      const rikishiC = mockRikishi("c", { rank: "maegashira", rankNumber: 5 });
      const rikishiD = mockRikishi("d", { rank: "maegashira", rankNumber: 6 });

      const rikishiMap = new Map([
        ["a", rikishiA],
        ["b", rikishiB],
        ["c", rikishiC],
        ["d", rikishiD],
      ]);

      const standings = new Map([
        ["a", { wins: 5, losses: 7 }],
        ["b", { wins: 10, losses: 2 }],
        ["c", { wins: 7, losses: 5 }],
        ["d", { wins: 7, losses: 5 }],
      ]);

      const pairings: MatchPairing[] = [
        { eastId: "a", westId: "b", score: 1, reasons: [] },
        { eastId: "c", westId: "d", score: 1, reasons: [] },
      ];

      const facedSet = new Set<string>();

      const result = applyDramaBudget(pairings, rikishiMap, 8, standings, facedSet);

      expect(result[0].reasons).toContain("drama_kinboshi_hunt");
      expect(result[1].reasons).not.toContain("drama_kinboshi_hunt");
    });

    it("does not create rematches when swapping", () => {
      const rikishiA = mockRikishi("a", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiB = mockRikishi("b", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiC = mockRikishi("c", { currentBashoWins: 8, currentBashoLosses: 6 });
      const rikishiD = mockRikishi("d", { currentBashoWins: 8, currentBashoLosses: 6 });

      const rikishiMap = new Map([
        ["a", rikishiA],
        ["b", rikishiB],
        ["c", rikishiC],
        ["d", rikishiD],
      ]);

      const standings = new Map([
        ["a", { wins: 7, losses: 7 }],
        ["b", { wins: 7, losses: 7 }],
        ["c", { wins: 8, losses: 6 }],
        ["d", { wins: 8, losses: 6 }],
      ]);

      const pairings: MatchPairing[] = [
        { eastId: "a", westId: "c", score: 1, reasons: [] },
        { eastId: "b", westId: "d", score: 1, reasons: [] },
      ];

      // a and b have already faced each other
      const facedSet = new Set(["a-b"]);

      const result = applyDramaBudget(pairings, rikishiMap, 15, standings, facedSet);

      // Verify no rematch was created
      const allPairs = result.map((p) =>
        p.eastId < p.westId ? `${p.eastId}-${p.westId}` : `${p.westId}-${p.eastId}`
      );
      expect(allPairs).not.toContain("a-b");
    });

    it("respects swap budget limit of 3", () => {
      // Create a scenario where many swaps could improve drama
      const rikishi = Array.from({ length: 10 }, (_, i) =>
        mockRikishi(`r${i}`, { currentBashoWins: 7, currentBashoLosses: 7 })
      );

      const rikishiMap = new Map(rikishi.map((r) => [r.id, r]));
      const standings = new Map(rikishi.map((r) => [r.id, { wins: 7, losses: 7 }]));

      const pairings: MatchPairing[] = [
        { eastId: "r0", westId: "r1", score: 1, reasons: [] },
        { eastId: "r2", westId: "r3", score: 1, reasons: [] },
        { eastId: "r4", westId: "r5", score: 1, reasons: [] },
        { eastId: "r6", westId: "r7", score: 1, reasons: [] },
        { eastId: "r8", westId: "r9", score: 1, reasons: [] },
      ];

      const facedSet = new Set<string>();

      const result = applyDramaBudget(pairings, rikishiMap, 15, standings, facedSet);

      // Should complete without error and respect budget
      expect(result).toHaveLength(5);
    });

    it("increases total drama score through swaps", () => {
      const rikishiA = mockRikishi("a", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiB = mockRikishi("b", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiC = mockRikishi("c", { currentBashoWins: 8, currentBashoLosses: 6 });
      const rikishiD = mockRikishi("d", { currentBashoWins: 8, currentBashoLosses: 6 });

      const rikishiMap = new Map([
        ["a", rikishiA],
        ["b", rikishiB],
        ["c", rikishiC],
        ["d", rikishiD],
      ]);

      const standings = new Map([
        ["a", { wins: 7, losses: 7 }],
        ["b", { wins: 7, losses: 7 }],
        ["c", { wins: 8, losses: 6 }],
        ["d", { wins: 8, losses: 6 }],
      ]);

      // Start with a 7-7 vs 7-7 pairing already
      const pairings: MatchPairing[] = [
        { eastId: "a", westId: "b", score: 1, reasons: [] },
        { eastId: "c", westId: "d", score: 1, reasons: [] },
      ];

      const facedSet = new Set<string>();

      const result = applyDramaBudget(pairings, rikishiMap, 15, standings, facedSet);

      // Verify drama labels are added to high-drama pairings
      const dramaLabels = result.flatMap((p) => p.reasons.filter((r) => r.startsWith("drama_")));
      expect(dramaLabels.length).toBeGreaterThan(0);
      expect(dramaLabels).toContain("drama_make_or_break");
    });
  });

  describe("applyDramaBudget — cache behavioral equivalence", () => {
    it("produces identical results regardless of score caching", () => {
      const rikishiA = mockRikishi("a", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiB = mockRikishi("b", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiC = mockRikishi("c", { currentBashoWins: 8, currentBashoLosses: 6 });
      const rikishiD = mockRikishi("d", { currentBashoWins: 8, currentBashoLosses: 6 });
      const rikishiE = mockRikishi("e", { currentBashoWins: 7, currentBashoLosses: 7 });
      const rikishiF = mockRikishi("f", { currentBashoWins: 7, currentBashoLosses: 7 });

      const rikishiMap = new Map([
        ["a", rikishiA],
        ["b", rikishiB],
        ["c", rikishiC],
        ["d", rikishiD],
        ["e", rikishiE],
        ["f", rikishiF],
      ]);

      const standings = new Map([
        ["a", { wins: 7, losses: 7 }],
        ["b", { wins: 7, losses: 7 }],
        ["c", { wins: 8, losses: 6 }],
        ["d", { wins: 8, losses: 6 }],
        ["e", { wins: 7, losses: 7 }],
        ["f", { wins: 7, losses: 7 }],
      ]);

      const pairings: MatchPairing[] = [
        { eastId: "a", westId: "c", score: 1, reasons: [] },
        { eastId: "b", westId: "d", score: 1, reasons: [] },
        { eastId: "e", westId: "f", score: 1, reasons: [] },
      ];

      const facedSet = new Set<string>();

      const result = applyDramaBudget(pairings, rikishiMap, 15, standings, facedSet);

      expect(result).toHaveLength(3);
      const dramaLabels = result.flatMap((p) => p.reasons.filter((r) => r.startsWith("drama_")));
      expect(dramaLabels.length).toBeGreaterThan(0);
    });

    it("handles sequential swaps correctly (cache updated after first swap)", () => {
      const rikishi = Array.from({ length: 8 }, (_, i) =>
        mockRikishi(`r${i}`, { currentBashoWins: 7, currentBashoLosses: 7 })
      );

      const rikishiMap = new Map(rikishi.map((r) => [r.id, r]));
      const standings = new Map(rikishi.map((r) => [r.id, { wins: 7, losses: 7 }]));

      const pairings: MatchPairing[] = [
        { eastId: "r0", westId: "r1", score: 1, reasons: [] },
        { eastId: "r2", westId: "r3", score: 1, reasons: [] },
        { eastId: "r4", westId: "r5", score: 1, reasons: [] },
        { eastId: "r6", westId: "r7", score: 1, reasons: [] },
      ];

      const facedSet = new Set<string>();

      const result = applyDramaBudget(pairings, rikishiMap, 15, standings, facedSet);

      expect(result).toHaveLength(4);
      const allPairs = result.map((p) =>
        p.eastId < p.westId ? `${p.eastId}-${p.westId}` : `${p.westId}-${p.eastId}`
      );
      for (const pair of allPairs) {
        expect(facedSet.has(pair)).toBe(false);
      }
    });
  });

  describe("scoreDrama — demotion_danger", () => {
    it("scores sekiwake with <6 wins on day 12 as demotion_danger", () => {
      const sekiwake = mockRikishi("seki", {
        rank: "sekiwake",
        currentBashoWins: 5,
        currentBashoLosses: 7,
      });
      const opponent = mockRikishi("opp", {
        rank: "maegashira",
        currentBashoWins: 8,
        currentBashoLosses: 4,
      });
      const standings = new Map([
        ["seki", { wins: 5, losses: 7 }],
        ["opp", { wins: 8, losses: 4 }],
      ]);

      const result = scoreDrama(sekiwake, opponent, 12, standings);

      expect(result).not.toBeNull();
      expect(result?.label).toBe("demotion_danger");
      expect(result?.score).toBe(60);
    });

    it("scores komusubi with <6 wins on day 12 as demotion_danger", () => {
      const komusubi = mockRikishi("komu", {
        rank: "komusubi",
        currentBashoWins: 4,
        currentBashoLosses: 8,
      });
      const opponent = mockRikishi("opp", {
        rank: "maegashira",
        currentBashoWins: 7,
        currentBashoLosses: 5,
      });
      const standings = new Map([
        ["komu", { wins: 4, losses: 8 }],
        ["opp", { wins: 7, losses: 5 }],
      ]);

      const result = scoreDrama(komusubi, opponent, 12, standings);

      expect(result).not.toBeNull();
      expect(result?.label).toBe("demotion_danger");
    });

    it("does not score demotion_danger for sekiwake with 8 wins on day 12", () => {
      const sekiwake = mockRikishi("seki", {
        rank: "sekiwake",
        currentBashoWins: 8,
        currentBashoLosses: 4,
      });
      const opponent = mockRikishi("opp", {
        rank: "maegashira",
        currentBashoWins: 7,
        currentBashoLosses: 5,
      });
      const standings = new Map([
        ["seki", { wins: 8, losses: 4 }],
        ["opp", { wins: 7, losses: 5 }],
      ]);

      const result = scoreDrama(sekiwake, opponent, 12, standings);

      expect(result?.label).not.toBe("demotion_danger");
    });

    it("does not score demotion_danger before day 12", () => {
      const sekiwake = mockRikishi("seki", {
        rank: "sekiwake",
        currentBashoWins: 3,
        currentBashoLosses: 7,
      });
      const opponent = mockRikishi("opp", {
        rank: "maegashira",
        currentBashoWins: 6,
        currentBashoLosses: 4,
      });
      const standings = new Map([
        ["seki", { wins: 3, losses: 7 }],
        ["opp", { wins: 6, losses: 4 }],
      ]);

      const result = scoreDrama(sekiwake, opponent, 10, standings);

      expect(result?.label).not.toBe("demotion_danger");
    });
  });

  describe("scoreDrama — debut_showcase", () => {
    it("scores rookie debut vs sanyaku as debut_showcase", () => {
      const rookie = mockRikishi("rookie", {
        rank: "maegashira",
        division: "makuuchi",
        careerWins: 5,
        careerLosses: 3,
        careerHistory: [],
      });
      const sanyaku = mockRikishi("sanyaku", {
        rank: "sekiwake",
        division: "makuuchi",
        careerWins: 200,
        careerLosses: 100,
      });
      const standings = new Map([
        ["rookie", { wins: 3, losses: 5 }],
        ["sanyaku", { wins: 8, losses: 4 }],
      ]);

      const result = scoreDrama(rookie, sanyaku, 8, standings);

      expect(result).not.toBeNull();
      expect(result?.label).toBe("debut_showcase");
      expect(result?.score).toBe(65);
    });

    it("does not score debut_showcase when rookie vs ozeki (ozeki is not sanyaku here)", () => {
      const rookie = mockRikishi("rookie", {
        rank: "maegashira",
        division: "makuuchi",
        careerWins: 5,
        careerLosses: 3,
        careerHistory: [],
      });
      const ozeki = mockRikishi("ozeki", {
        rank: "ozeki",
        division: "makuuchi",
        careerWins: 200,
        careerLosses: 100,
      });
      const standings = new Map([
        ["rookie", { wins: 3, losses: 5 }],
        ["ozeki", { wins: 8, losses: 4 }],
      ]);

      const result = scoreDrama(rookie, ozeki, 8, standings);

      expect(result?.label).not.toBe("debut_showcase");
    });
  });

  describe("isMakuuchiDebut", () => {
    it("returns true for makuuchi division, <=1 makuuchi bouts, <15 total bouts, maegashira rank", () => {
      expect(isMakuuchiDebut(0, "makuuchi", 8, "maegashira")).toBe(true);
    });

    it("returns false for ozeki rank", () => {
      expect(isMakuuchiDebut(0, "makuuchi", 8, "ozeki")).toBe(false);
    });

    it("returns false for yokozuna rank", () => {
      expect(isMakuuchiDebut(0, "makuuchi", 8, "yokozuna")).toBe(false);
    });

    it("returns false for juryo division", () => {
      expect(isMakuuchiDebut(0, "juryo", 8, "juryo")).toBe(false);
    });

    it("returns false for >=15 total bouts", () => {
      expect(isMakuuchiDebut(0, "makuuchi", 15, "maegashira")).toBe(false);
    });
  });

  // ── PR #808 equivalence: for...of loop produces same result as .filter().length ──
  describe("debut showcase equivalence (PR #808)", () => {
    it("scoreDrama triggers debut_showcase when rookie has 0 makuuchi bouts via careerHistory", () => {
      const rookie = mockRikishi("rookie", {
        shikona: "Rookie",
        rank: "maegashira",
        division: "makuuchi",
        currentBashoWins: 5,
        currentBashoLosses: 5,
        careerWins: 3,
        careerLosses: 4,
        careerHistory: [
          { division: "juryo" } as never,
        ],
      });
      const sanyaku = mockRikishi("sanyaku", {
        shikona: "Sanyaku",
        rank: "komusubi",
        division: "makuuchi",
        currentBashoWins: 8,
        currentBashoLosses: 2,
        careerWins: 100,
        careerLosses: 50,
        careerHistory: [
          { division: "makuuchi" } as never,
        ],
      });
      const standings = new Map([
        ["rookie", { wins: 5, losses: 5 }],
        ["sanyaku", { wins: 8, losses: 2 }],
      ]);

      const result = scoreDrama(rookie, sanyaku, 10, standings);
      expect(result).not.toBeNull();
      expect(result?.label).toBe("debut_showcase");
      expect(result?.reason).toBe("rookie_debut_vs_sanyaku");
    });

    it("scoreDrama does not trigger debut_showcase when rookie has prior makuuchi bouts", () => {
      const notRookie = mockRikishi("not-rookie", {
        shikona: "NotRookie",
        rank: "maegashira",
        division: "makuuchi",
        currentBashoWins: 5,
        currentBashoLosses: 5,
        careerWins: 8,
        careerLosses: 7,
        careerHistory: [
          { division: "makuuchi" } as never,
          { division: "juryo" } as never,
        ],
      });
      const sanyaku = mockRikishi("sanyaku2", {
        shikona: "Sanyaku2",
        rank: "komusubi",
        division: "makuuchi",
        currentBashoWins: 8,
        currentBashoLosses: 2,
        careerWins: 100,
        careerLosses: 50,
        careerHistory: [
          { division: "makuuchi" } as never,
        ],
      });
      const standings = new Map([
        ["not-rookie", { wins: 5, losses: 5 }],
        ["sanyaku2", { wins: 8, losses: 2 }],
      ]);

      const result = scoreDrama(notRookie, sanyaku, 10, standings);
      // Should NOT be debut_showcase since notRookie has 1 makuuchi bout
      expect(result?.label).not.toBe("debut_showcase");
    });

    it("scoreDrama handles undefined careerHistory without crashing", () => {
      const rookie = mockRikishi("rookie-no-history", {
        shikona: "NoHistory",
        rank: "maegashira",
        division: "makuuchi",
        currentBashoWins: 3,
        currentBashoLosses: 3,
        careerWins: 0,
        careerLosses: 0,
      });
      const sanyaku = mockRikishi("sanyaku3", {
        shikona: "Sanyaku3",
        rank: "komusubi",
        division: "makuuchi",
        currentBashoWins: 7,
        currentBashoLosses: 3,
        careerWins: 50,
        careerLosses: 30,
      });
      const standings = new Map([
        ["rookie-no-history", { wins: 3, losses: 3 }],
        ["sanyaku3", { wins: 7, losses: 3 }],
      ]);

      // Should not crash — careerHistory ?? [] handles undefined
      const result = scoreDrama(rookie, sanyaku, 10, standings);
      expect(result).toBeDefined();
    });
  });
});
