import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { WorldState } from "@/engine/types/world";
import { AwardLogEntry, BashoName, BoutResult } from "@/engine/types/basho";
import { Rikishi } from "@/engine/types/rikishi";
import { MatchSchedule } from "@/engine/types/basho";

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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      expect(impact.entities?.rikishiUpdates).toBeDefined();
      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates?.get("east");
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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const westUpdate = rikishiUpdates?.get("west");
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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates?.get("east");
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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates?.get("east");
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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const eastUpdate = rikishiUpdates?.get("east");
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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      const impact = applyBoutResult(world as WorldState, match, result);

      const rikishiUpdates = impact.entities?.rikishiUpdates;
      expect(rikishiUpdates).toBeDefined();
      const westUpdate = rikishiUpdates?.get("west");
      expect(westUpdate?.divisionRecords?.juryo.wins).toBe(15); // unchanged
      expect(westUpdate?.divisionRecords?.juryo.losses).toBe(26); // 25 + 1
    });
  });

  describe("currentBashoWins / currentBashoLosses / currentBashoRecord (Bug 2)", () => {
    function makeWorldForBout(opts?: {
      winnerWins?: number;
      winnerLosses?: number;
      loserWins?: number;
      loserLosses?: number;
    }): { world: Partial<WorldState>; match: MatchSchedule; result: BoutResult } {
      const world: Partial<WorldState> = {
        rikishi: new Map([
          [
            "east",
            {
              id: "east",
              shikona: "East Rikishi",
              careerWins: 10,
              careerLosses: 5,
              currentBashoWins: opts?.winnerWins ?? 0,
              currentBashoLosses: opts?.winnerLosses ?? 0,
              currentBashoRecord: { wins: opts?.winnerWins ?? 0, losses: opts?.winnerLosses ?? 0 },
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
              careerWins: 8,
              careerLosses: 7,
              currentBashoWins: opts?.loserWins ?? 0,
              currentBashoLosses: opts?.loserLosses ?? 0,
              currentBashoRecord: { wins: opts?.loserWins ?? 0, losses: opts?.loserLosses ?? 0 },
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
            {
              id: "test-heya",
              name: "Test Heya",
              rikishiIds: ["east", "west"],
            } as unknown as import("@/engine/types/heya").Heya,
          ],
        ]),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
        currentBasho: {
          id: "test-basho",
          year: 2025,
          currentDay: 1,
          day: 1,
          bashoName: "hatsu" as BashoName,
          bashoNumber: 1,
          matches: [],
          standings: new Map([
            ["east", { wins: opts?.winnerWins ?? 0, losses: opts?.winnerLosses ?? 0 }],
            ["west", { wins: opts?.loserWins ?? 0, losses: opts?.loserLosses ?? 0 }],
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
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
      };

      return { world, match, result };
    }

    it("Test 1.1: should increment currentBashoWins on winner", () => {
      const { world, match, result } = makeWorldForBout({ winnerWins: 3, loserLosses: 2 });
      const impact = applyBoutResult(world as WorldState, match, result);
      const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
      expect(eastUpdate?.currentBashoWins).toBe(4);
    });

    it("Test 1.2: should increment currentBashoLosses on loser", () => {
      const { world, match, result } = makeWorldForBout({ winnerWins: 3, loserLosses: 2 });
      const impact = applyBoutResult(world as WorldState, match, result);
      const westUpdate = impact.entities?.rikishiUpdates?.get("west");
      expect(westUpdate?.currentBashoLosses).toBe(3);
    });

    it("Test 1.3: should set currentBashoRecord on winner with correct wins/losses", () => {
      const { world, match, result } = makeWorldForBout({ winnerWins: 5, winnerLosses: 2 });
      const impact = applyBoutResult(world as WorldState, match, result);
      const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
      expect(eastUpdate?.currentBashoRecord).toEqual({ wins: 6, losses: 2 });
    });

    it("Test 1.4: should set currentBashoRecord on loser with correct wins/losses", () => {
      const { world, match, result } = makeWorldForBout({ loserWins: 3, loserLosses: 4 });
      const impact = applyBoutResult(world as WorldState, match, result);
      const westUpdate = impact.entities?.rikishiUpdates?.get("west");
      expect(westUpdate?.currentBashoRecord).toEqual({ wins: 3, losses: 5 });
    });

    it("Test 1.5: should increment careerWins on winner (existing test confirms, regression)", () => {
      const { world, match, result } = makeWorldForBout();
      const impact = applyBoutResult(world as WorldState, match, result);
      const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
      expect(eastUpdate?.careerWins).toBe(11);
    });

    it("Test 1.6: should increment careerLosses on loser (existing test confirms, regression)", () => {
      const { world, match, result } = makeWorldForBout();
      const impact = applyBoutResult(world as WorldState, match, result);
      const westUpdate = impact.entities?.rikishiUpdates?.get("west");
      expect(westUpdate?.careerLosses).toBe(8);
    });

    it("Test 1.7: should update standings Map with winner wins+1", () => {
      const { world, match, result } = makeWorldForBout({ winnerWins: 4, loserLosses: 3 });
      const impact = applyBoutResult(world as WorldState, match, result);
      const standings = impact.metadata?.updatedStandings as Map<
        string,
        { wins: number; losses: number }
      >;
      expect(standings).toBeDefined();
      expect(standings.get("east")?.wins).toBe(5);
    });

    it("Test 1.8: should update standings Map with loser losses+1", () => {
      const { world, match, result } = makeWorldForBout({ winnerWins: 4, loserLosses: 3 });
      const impact = applyBoutResult(world as WorldState, match, result);
      const standings = impact.metadata?.updatedStandings as Map<
        string,
        { wins: number; losses: number }
      >;
      expect(standings).toBeDefined();
      expect(standings.get("west")?.losses).toBe(4);
    });

    it("Test 1.9: should store updatedStandings in metadata", () => {
      const { world, match, result } = makeWorldForBout();
      const impact = applyBoutResult(world as WorldState, match, result);
      expect(impact.metadata?.updatedStandings).toBeDefined();
      expect(impact.metadata?.updatedStandings).toBeInstanceOf(Map);
    });

    it("Test 1.10: should handle missing currentBasho gracefully", () => {
      const { match, result } = makeWorldForBout();
      const worldNoBasho: Partial<WorldState> = {
        rikishi: new Map(),
        heyas: new Map(),
        calendar: { currentWeek: 1, month: 1, currentDay: 1 },
      };
      const impact = applyBoutResult(worldNoBasho as WorldState, match, result);
      expect(impact.entities?.rikishiUpdates).toBeUndefined();
    });

    it("Test 1.11: should handle missing rikishi gracefully", () => {
      const { world, match, result } = makeWorldForBout();
      const worldNoRikishi: Partial<WorldState> = {
        ...world,
        rikishi: new Map(),
      };
      const impact = applyBoutResult(worldNoRikishi as WorldState, match, result);
      expect(impact.entities?.rikishiUpdates).toBeUndefined();
    });

    it("Test 1.12: should increment divisionRecords for winner", () => {
      const { world, match, result } = makeWorldForBout();
      const impact = applyBoutResult(world as WorldState, match, result);
      const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
      expect(eastUpdate?.divisionRecords?.makuuchi.wins).toBe(1);
    });

    it("Test 1.13: should increment divisionRecords for loser", () => {
      const { world, match, result } = makeWorldForBout();
      const impact = applyBoutResult(world as WorldState, match, result);
      const westUpdate = impact.entities?.rikishiUpdates?.get("west");
      expect(westUpdate?.divisionRecords?.makuuchi.losses).toBe(1);
    });

    it("Test 1.14: should award kinboshi achievement when result.awards contains kinboshi", () => {
      const { world, match, result } = makeWorldForBout();
      result.awardFact = "kinboshi";
      result.isKinboshi = true;
      result.awards = [
        { type: "kinboshi", winnerId: "east", loserId: "west", day: 1, boutId: "test-bout" },
      ];
      const impact = applyBoutResult(world as WorldState, match, result);
      const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
      const westUpdate = impact.entities?.rikishiUpdates?.get("west");
      expect(eastUpdate?.stats?.achievements?.kinboshiEarned).toBe(1);
      expect(westUpdate?.stats?.achievements?.kinboshiConceded).toBe(1);
    });

    it("Test 1.15: should award ginboshi achievement when result.awards contains ginboshi", () => {
      const { world, match, result } = makeWorldForBout();
      result.awardFact = "ginboshi";
      result.awards = [
        { type: "ginboshi", winnerId: "east", loserId: "west", day: 1, boutId: "test-bout" },
      ];
      const impact = applyBoutResult(world as WorldState, match, result);
      const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
      const westUpdate = impact.entities?.rikishiUpdates?.get("west");
      expect(eastUpdate?.stats?.achievements?.ginboshiEarned).toBe(1);
      expect(westUpdate?.stats?.achievements?.ginboshiConceded).toBe(1);
    });
  });
});

describe("boutResultApplier — kinboshi award side-effects", () => {
  // Compact fixture: east maegashira beats west yokozuna, awards already
  // stamped on the result by the resolver (detection is pure — the applier
  // owns every world/rikishi side-effect).
  function makeKinboshiBout() {
    const world: Partial<WorldState> = {
      rikishi: new Map([
        [
          "east",
          {
            id: "east",
            shikona: "Underdog",
            careerWins: 10,
            careerLosses: 5,
            division: "makuuchi",
            rank: "maegashira",
            side: "east",
            divisionRecords: { makuuchi: { wins: 0, losses: 0 } },
            stats: { achievements: undefined },
            heyaId: "test-heya",
          } as Rikishi,
        ],
        [
          "west",
          {
            id: "west",
            shikona: "Grand Champion",
            careerWins: 200,
            careerLosses: 40,
            division: "makuuchi",
            rank: "yokozuna",
            side: "west",
            divisionRecords: { makuuchi: { wins: 0, losses: 0 } },
            stats: { achievements: undefined },
            heyaId: "test-heya",
          } as Rikishi,
        ],
      ]),
      heyas: new Map([
        [
          "test-heya",
          {
            id: "test-heya",
            name: "Test Heya",
            rikishiIds: ["east", "west"],
          } as unknown as import("@/engine/types/heya").Heya,
        ],
      ]),
      calendar: { currentWeek: 1, month: 1, currentDay: 1 },
      currentBasho: {
        id: "test-basho",
        year: 2025,
        day: 1,
        bashoName: "hatsu" as BashoName,
        bashoNumber: 1,
        matches: [],
        standings: new Map(),
        isActive: true,
      },
      awardLog: [],
    };

    const match: MatchSchedule = {
      boutId: "kin-bout",
      day: 1,
      eastRikishiId: "east",
      westRikishiId: "west",
    };

    const result: BoutResult = {
      boutId: "kin-bout",
      winner: "east",
      winnerRikishiId: "east",
      loserRikishiId: "west",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 4.0,
      upset: true,
      isKinboshi: true,
      awardFact: "kinboshi",
      awards: [{ type: "kinboshi", winnerId: "east", loserId: "west", day: 1, boutId: "kin-bout" }],
      log: [],
      kenshoEnvelopes: 30,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
      day: 1,
    };

    return { world, match, result };
  }

  it("writes kinboshiThisBasho in the SAME currentBasho update as boutMetrics (no stale clobber)", () => {
    const { world, match, result } = makeKinboshiBout();
    const impact = applyBoutResult(world as WorldState, match, result);

    const bashoUpdate = impact.worldFields?.currentBasho as
      | { kinboshiThisBasho?: Record<string, number>; boutMetrics?: Record<string, unknown> }
      | undefined;
    expect(bashoUpdate).toBeDefined();
    expect(bashoUpdate!.kinboshiThisBasho?.["east"]).toBe(1);
    expect(bashoUpdate!.boutMetrics?.["east"]).toBeDefined();
  });

  it("increments winner and loser achievements exactly once each", () => {
    const { world, match, result } = makeKinboshiBout();
    const impact = applyBoutResult(world as WorldState, match, result);
    const updates = impact.entities?.rikishiUpdates;
    expect(updates?.get("east")?.stats?.achievements?.kinboshiEarned).toBe(1);
    expect(updates?.get("west")?.stats?.achievements?.kinboshiConceded).toBe(1);
    expect(updates?.get("east")?.economics?.kinboshiCount).toBe(1);
  });

  it("appends a kinboshi AwardLogEntry with bout provenance", () => {
    const { world, match, result } = makeKinboshiBout();
    const impact = applyBoutResult(world as WorldState, match, result);
    const appends = impact.arrayAppends?.filter((a) => a.field === "awardLog") ?? [];
    const entries = appends.flatMap((a) => a.items as AwardLogEntry[]);
    const kin = entries.find((e) => e.type === "kinboshi");
    expect(kin).toBeDefined();
    expect(kin).toMatchObject({
      winnerId: "east",
      opponentId: "west",
      boutId: "kin-bout",
      day: 1,
      bashoName: "hatsu",
      year: 2025,
    });
  });

  it("does NOT write kinboshiThisBasho or awardLog for a plain bout", () => {
    const { world, match, result } = makeKinboshiBout();
    result.awards = [];
    result.isKinboshi = false;
    result.awardFact = undefined;
    const impact = applyBoutResult(world as WorldState, match, result);
    const bashoUpdate = impact.worldFields?.currentBasho as
      { kinboshiThisBasho?: Record<string, number> } | undefined;
    expect(bashoUpdate?.kinboshiThisBasho ?? {}).toEqual({});
    const appends = impact.arrayAppends?.filter((a) => a.field === "awardLog") ?? [];
    expect(appends.flatMap((a) => a.items)).toHaveLength(0);
  });
});
