import { describe, it, expect } from "vitest";
import { runCareerJournalUpdates } from "../RegistryService";
import { WorldState } from "../../types/world";
import { BashoResult } from "../../types/basho";

describe("RegistryService", () => {
  describe("runCareerJournalUpdates", () => {
    it("should NOT update careerWins/careerLosses (deprecated behavior)", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "rikishi-1",
            {
              id: "rikishi-1",
              shikona: "Test Rikishi",
              careerWins: 100,
              careerLosses: 50,
              currentBashoWins: 8,
              currentBashoLosses: 7,
              momentum: 0,
              careerRecord: { wins: 100, losses: 50, yusho: 0 },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
            } as any,
          ],
        ]),
        history: [
          {
            id: "basho-1",
            year: 2025,
            bashoNumber: 1,
            bashoName: "hatsu",
            yusho: "rikishi-1",
            junYusho: [],
            playoffMatches: [],
            prizes: {
              yushoAmount: 10000000,
              junYushoAmount: 2000000,
              specialPrizes: 2000000,
            },
          },
        ],
      };

      const impact = runCareerJournalUpdates(world as WorldState);

      // Career wins/losses should NOT be updated (deprecated)
      const rikishiUpdate = impact.entities?.rikishiUpdates?.get("rikishi-1");
      expect(rikishiUpdate?.careerWins).toBeUndefined(); // Should not update
      expect(rikishiUpdate?.careerLosses).toBeUndefined(); // Should not update
    });

    it("should update careerRecord helper with current career values", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "rikishi-1",
            {
              id: "rikishi-1",
              shikona: "Test Rikishi",
              careerWins: 100,
              careerLosses: 50,
              currentBashoWins: 8,
              currentBashoLosses: 7,
              momentum: 0,
              careerRecord: { wins: 100, losses: 50, yusho: 0 },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
            } as any,
          ],
        ]),
        history: [
          {
            id: "basho-1",
            year: 2025,
            bashoNumber: 1,
            bashoName: "hatsu",
            yusho: "rikishi-1",
            junYusho: [],
            playoffMatches: [],
            prizes: {
              yushoAmount: 10000000,
              junYushoAmount: 2000000,
              specialPrizes: 2000000,
            },
          },
        ],
      };

      const impact = runCareerJournalUpdates(world as WorldState);

      const rikishiUpdate = impact.entities?.rikishiUpdates?.get("rikishi-1");
      expect(rikishiUpdate?.careerRecord).toBeDefined();
      expect(rikishiUpdate?.careerRecord?.wins).toBe(100); // Current career value
      expect(rikishiUpdate?.careerRecord?.losses).toBe(50); // Current career value
    });

    it("should update yusho count when rikishi won yusho", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "rikishi-1",
            {
              id: "rikishi-1",
              shikona: "Test Rikishi",
              careerWins: 100,
              careerLosses: 50,
              currentBashoWins: 8,
              currentBashoLosses: 7,
              momentum: 0,
              careerRecord: { wins: 100, losses: 50, yusho: 2 },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
            } as any,
          ],
        ]),
        history: [
          {
            id: "basho-1",
            year: 2025,
            bashoNumber: 1,
            bashoName: "hatsu",
            yusho: "rikishi-1",
            junYusho: [],
            playoffMatches: [],
            prizes: {
              yushoAmount: 10000000,
              junYushoAmount: 2000000,
              specialPrizes: 2000000,
            },
          },
        ],
      };

      const impact = runCareerJournalUpdates(world as WorldState);

      const rikishiUpdate = impact.entities?.rikishiUpdates?.get("rikishi-1");
      expect(rikishiUpdate?.careerRecord?.yusho).toBe(3); // 2 + 1
    });

    it("should NOT update yusho count when rikishi did not win yusho", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "rikishi-1",
            {
              id: "rikishi-1",
              shikona: "Test Rikishi",
              careerWins: 100,
              careerLosses: 50,
              currentBashoWins: 8,
              currentBashoLosses: 7,
              momentum: 0,
              careerRecord: { wins: 100, losses: 50, yusho: 2 },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
            } as any,
          ],
        ]),
        history: [
          {
            id: "basho-1",
            year: 2025,
            bashoNumber: 1,
            bashoName: "hatsu",
            yusho: "other-rikishi",
            junYusho: [],
            playoffMatches: [],
            prizes: {
              yushoAmount: 10000000,
              junYushoAmount: 2000000,
              specialPrizes: 2000000,
            },
          },
        ],
      };

      const impact = runCareerJournalUpdates(world as WorldState);

      const rikishiUpdate = impact.entities?.rikishiUpdates?.get("rikishi-1");
      expect(rikishiUpdate?.careerRecord?.yusho).toBe(2); // Unchanged
    });

    it("should update momentum based on basho performance", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "rikishi-1",
            {
              id: "rikishi-1",
              shikona: "Test Rikishi",
              careerWins: 100,
              careerLosses: 50,
              currentBashoWins: 12,
              currentBashoLosses: 3,
              momentum: 0,
              careerRecord: { wins: 100, losses: 50, yusho: 0 },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
            } as any,
          ],
        ]),
        history: [
          {
            id: "basho-1",
            year: 2025,
            bashoNumber: 1,
            bashoName: "hatsu",
            yusho: "rikishi-1",
            junYusho: [],
            playoffMatches: [],
            prizes: {
              yushoAmount: 10000000,
              junYushoAmount: 2000000,
              specialPrizes: 2000000,
            },
          },
        ],
      };

      const impact = runCareerJournalUpdates(world as WorldState);

      const rikishiUpdate = impact.entities?.rikishiUpdates?.get("rikishi-1");
      expect(rikishiUpdate?.momentum).toBeDefined();
      expect(rikishiUpdate?.momentum).toBeGreaterThan(0); // Should increase with 12-3 record
    });

    it("should decrease momentum for poor performance", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "rikishi-1",
            {
              id: "rikishi-1",
              shikona: "Test Rikishi",
              careerWins: 100,
              careerLosses: 50,
              currentBashoWins: 3,
              currentBashoLosses: 12,
              momentum: 0,
              careerRecord: { wins: 100, losses: 50, yusho: 0 },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
            } as any,
          ],
        ]),
        history: [
          {
            id: "basho-1",
            year: 2025,
            bashoNumber: 1,
            bashoName: "hatsu",
            yusho: "other-rikishi",
            junYusho: [],
            playoffMatches: [],
            prizes: {
              yushoAmount: 10000000,
              junYushoAmount: 2000000,
              specialPrizes: 2000000,
            },
          },
        ],
      };

      const impact = runCareerJournalUpdates(world as WorldState);

      const rikishiUpdate = impact.entities?.rikishiUpdates?.get("rikishi-1");
      expect(rikishiUpdate?.momentum).toBeDefined();
      expect(rikishiUpdate?.momentum).toBeLessThan(0); // Should decrease with 3-12 record
    });
  });
});
