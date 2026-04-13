import { describe, it, expect } from "vitest";
import { applyBoutResult } from "../boutResultApplier";
import { WorldState } from "../../types/world";
import { BashoName, BoutResult } from "../../types/basho";
import { Rikishi } from "../../types/rikishi";
import { MatchSchedule } from "../../types/basho";

describe("boutResultApplier", () => {
  describe("Per-Bout Career Record Updates", () => {
    it("should increment careerWins for winner", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 100,
              careerLosses: 50,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
          [
            "west",
            {
              id: "west",
              shikona: "West Rikishi",
              careerWins: 80,
              careerLosses: 70,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "makuuchi",
              rank: "maegashira",
              side: "west",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
        ]),
        heyas: new Map([
          [
            "test-heya",
            { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: 0, losses: 0 }],
            ["west", { wins: 0, losses: 0 }],
          ]),
          isActive: true,
        },
      };

      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };

      const result: BoutResult = {
        boutId: "test-bout",
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "oshidashi",
        kimariteName: "Oshidashi",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 5.2,
        upset: false,
        isKinboshi: false,
        log: [],
        kenshoEnvelopes: 0,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      expect(impact.entities?.rikishiUpdates).toBeDefined();
      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates!.get("east");
      expect(eastUpdate?.careerWins).toBe(101); // 100 + 1
    });

    it("should increment careerLosses for loser", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 100,
              careerLosses: 50,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
          [
            "west",
            {
              id: "west",
              shikona: "West Rikishi",
              careerWins: 80,
              careerLosses: 70,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "makuuchi",
              rank: "maegashira",
              side: "west",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
        ]),
        heyas: new Map([
          [
            "test-heya",
            { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: 0, losses: 0 }],
            ["west", { wins: 0, losses: 0 }],
          ]),
          isActive: true,
        },
      };

      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };

      const result: BoutResult = {
        boutId: "test-bout",
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "oshidashi",
        kimariteName: "Oshidashi",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 5.2,
        upset: false,
        isKinboshi: false,
        log: [],
        kenshoEnvelopes: 0,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const westUpdate = rikishiUpdates!.get("west");
      expect(westUpdate?.careerLosses).toBe(71); // 70 + 1
    });

    it("should increment makuuchiWins when winner is in makuuchi division", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 100,
              careerLosses: 50,
              makuuchiWins: 10,
              divisionRecords: {
                makuuchi: { wins: 10, losses: 5 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "makuuchi",
              rank: "maegashira",
              side: "east",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
          [
            "west",
            {
              id: "west",
              shikona: "West Rikishi",
              careerWins: 80,
              careerLosses: 70,
              makuuchiWins: 5,
              divisionRecords: {
                makuuchi: { wins: 5, losses: 10 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "makuuchi",
              rank: "maegashira",
              side: "west",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
        ]),
        heyas: new Map([
          [
            "test-heya",
            { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: 0, losses: 0 }],
            ["west", { wins: 0, losses: 0 }],
          ]),
          isActive: true,
        },
      };

      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };

      const result: BoutResult = {
        boutId: "test-bout",
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "oshidashi",
        kimariteName: "Oshidashi",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 5.2,
        upset: false,
        isKinboshi: false,
        log: [],
        kenshoEnvelopes: 0,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates!.get("east");
      expect(eastUpdate?.makuuchiWins).toBe(11); // 10 + 1
    });

    it("should NOT increment makuuchiWins when winner is NOT in makuuchi division", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 100,
              careerLosses: 50,
              makuuchiWins: 10,
              divisionRecords: {
                makuuchi: { wins: 10, losses: 5 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "juryo",
              rank: "juryo",
              side: "east",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
          [
            "west",
            {
              id: "west",
              shikona: "West Rikishi",
              careerWins: 80,
              careerLosses: 70,
              makuuchiWins: 5,
              divisionRecords: {
                makuuchi: { wins: 5, losses: 10 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "juryo",
              rank: "juryo",
              side: "west",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
        ]),
        heyas: new Map([
          [
            "test-heya",
            { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: 0, losses: 0 }],
            ["west", { wins: 0, losses: 0 }],
          ]),
          isActive: true,
        },
      };

      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };

      const result: BoutResult = {
        boutId: "test-bout",
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "oshidashi",
        kimariteName: "Oshidashi",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 5.2,
        upset: false,
        isKinboshi: false,
        log: [],
        kenshoEnvelopes: 0,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates!.get("east");
      expect(eastUpdate?.makuuchiWins).toBeUndefined(); // Should not update makuuchiWins
    });

    it("should increment division-specific records for winner's current division", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 100,
              careerLosses: 50,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 10, losses: 5 },
                juryo: { wins: 20, losses: 10 },
                makushita: { wins: 30, losses: 15 },
                sandanme: { wins: 40, losses: 20 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "juryo",
              rank: "juryo",
              side: "east",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
          [
            "west",
            {
              id: "west",
              shikona: "West Rikishi",
              careerWins: 80,
              careerLosses: 70,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "juryo",
              rank: "juryo",
              side: "west",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
        ]),
        heyas: new Map([
          [
            "test-heya",
            { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: 0, losses: 0 }],
            ["west", { wins: 0, losses: 0 }],
          ]),
          isActive: true,
        },
      };

      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };

      const result: BoutResult = {
        boutId: "test-bout",
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "oshidashi",
        kimariteName: "Oshidashi",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 5.2,
        upset: false,
        isKinboshi: false,
        log: [],
        kenshoEnvelopes: 0,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates!.get("east");
      expect(eastUpdate?.divisionRecords?.juryo.wins).toBe(21); // 20 + 1
      expect(eastUpdate?.divisionRecords?.juryo.losses).toBe(10); // unchanged
    });

    it("should increment division-specific records for loser's current division", () => {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 100,
              careerLosses: 50,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 0, losses: 0 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "juryo",
              rank: "juryo",
              side: "east",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
          [
            "west",
            {
              id: "west",
              shikona: "West Rikishi",
              careerWins: 80,
              careerLosses: 70,
              makuuchiWins: 0,
              divisionRecords: {
                makuuchi: { wins: 0, losses: 0 },
                juryo: { wins: 15, losses: 25 },
                makushita: { wins: 0, losses: 0 },
                sandanme: { wins: 0, losses: 0 },
                jonidan: { wins: 0, losses: 0 },
                jonokuchi: { wins: 0, losses: 0 },
              },
              division: "juryo",
              rank: "juryo",
              side: "west",
              stats: { achievements: undefined },
              heyaId: "test-heya",
            } as Rikishi,
          ],
        ]),
        heyas: new Map([
          [
            "test-heya",
            { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: 0, losses: 0 }],
            ["west", { wins: 0, losses: 0 }],
          ]),
          isActive: true,
        },
      };

      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };

      const result: BoutResult = {
        boutId: "test-bout",
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "oshidashi",
        kimariteName: "Oshidashi",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 5.2,
        upset: false,
        isKinboshi: false,
        log: [],
        kenshoEnvelopes: 0,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const westUpdate = rikishiUpdates!.get("west");
      expect(westUpdate?.divisionRecords?.juryo.wins).toBe(15); // unchanged
      expect(westUpdate?.divisionRecords?.juryo.losses).toBe(26); // 25 + 1
    });
  });
});
