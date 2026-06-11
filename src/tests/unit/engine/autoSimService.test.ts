import { describe, it, expect } from "vitest";
import { checkStopCondition } from "@/engine/simulation/AutoSimService";
import type { AutoSimConfig, StopCondition } from "@/engine/simulation/AutoSimService";
import type { BashoSimResult } from "@/engine/types/basho";
import { MockFactory } from "../../helpers/utils/MockFactory";
import { ChronicleService } from "@/engine/simulation/ChronicleService";

describe("checkStopCondition", () => {
  const chronicle = ChronicleService.createEmptyReport();

  const createMockConfig = (overrides: Partial<AutoSimConfig> = {}): AutoSimConfig => ({
    duration: { type: "days", count: 15 },
    stopConditions: [],
    verbosity: "standard",
    delegationPolicy: "balanced",
    observerMode: false,
    playerHeyaId: "player-heya",
    ...overrides,
  });

  const createMockBashoResult = (overrides: Partial<BashoSimResult> = {}): BashoSimResult => ({
    bashoName: "hatsu",
    year: 2025,
    yushoWinner: { id: "yusho-winner", shikona: "Winner", wins: 15, losses: 0 },
    junYusho: [],
    standings: new Map(),
    keyBouts: [],
    injuries: [],
    promotions: [],
    demotions: [],
    ...overrides,
  });

  describe("yokozunaPromotion", () => {
    it("returns true when there is a yokozuna promotion", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig();
      const bashoResult = createMockBashoResult({
        promotions: [{ rikishiId: "r1", from: "ozeki", to: "yokozuna", side: "east" }],
      });

      expect(checkStopCondition("yokozunaPromotion", bashoResult, world, config, chronicle)).toBe(
        true
      );
    });

    it("returns false when there is no yokozuna promotion", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig();
      const bashoResult = createMockBashoResult({
        promotions: [{ rikishiId: "r1", from: "sekiwake", to: "ozeki", side: "east" }],
      });

      expect(checkStopCondition("yokozunaPromotion", bashoResult, world, config, chronicle)).toBe(
        false
      );
    });
  });

  describe("ozekiPromotion", () => {
    it("returns true when there is an ozeki promotion", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig();
      const bashoResult = createMockBashoResult({
        promotions: [{ rikishiId: "r1", from: "sekiwake", to: "ozeki", side: "east" }],
      });

      expect(checkStopCondition("ozekiPromotion", bashoResult, world, config, chronicle)).toBe(
        true
      );
    });

    it("returns false when there is no ozeki promotion", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig();
      const bashoResult = createMockBashoResult({
        promotions: [{ rikishiId: "r1", from: "komusubi", to: "sekiwake", side: "east" }],
      });

      expect(checkStopCondition("ozekiPromotion", bashoResult, world, config, chronicle)).toBe(
        false
      );
    });
  });

  describe("yusho", () => {
    it("returns true when player's rikishi wins yusho", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig({
        playerHeyaId: "player-heya",
        observerMode: false,
      });
      const bashoResult = createMockBashoResult({
        yushoWinner: {
          id: "player-rikishi",
          shikona: "Winner",
          wins: 15,
          losses: 0,
        },
      });
      world.rikishi.set(
        "player-rikishi",
        MockFactory.createRikishi("player-rikishi", { heyaId: "player-heya" })
      );

      expect(checkStopCondition("yusho", bashoResult, world, config, chronicle)).toBe(true);
    });

    it("returns false when another heya's rikishi wins yusho", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig({
        playerHeyaId: "player-heya",
        observerMode: false,
      });
      const bashoResult = createMockBashoResult({
        yushoWinner: {
          id: "other-rikishi",
          shikona: "Winner",
          wins: 15,
          losses: 0,
        },
      });
      world.rikishi.set(
        "other-rikishi",
        MockFactory.createRikishi("other-rikishi", { heyaId: "other-heya" })
      );

      expect(checkStopCondition("yusho", bashoResult, world, config, chronicle)).toBe(false);
    });

    it("returns false in observer mode even if player rikishi wins", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig({
        playerHeyaId: "player-heya",
        observerMode: true,
      });
      const bashoResult = createMockBashoResult({
        yushoWinner: {
          id: "player-rikishi",
          shikona: "Winner",
          wins: 15,
          losses: 0,
        },
      });
      world.rikishi.set(
        "player-rikishi",
        MockFactory.createRikishi("player-rikishi", { heyaId: "player-heya" })
      );

      expect(checkStopCondition("yusho", bashoResult, world, config, chronicle)).toBe(false);
    });
  });

  describe("stableInsolvency", () => {
    it("returns true when player heya is desperate", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig({
        playerHeyaId: "player-heya",
        observerMode: false,
      });
      const bashoResult = createMockBashoResult();
      world.heyas.set(
        "player-heya",
        MockFactory.createHeya("player-heya", { runwayBand: "desperate" })
      );

      expect(checkStopCondition("stableInsolvency", bashoResult, world, config, chronicle)).toBe(
        true
      );
    });

    it("returns false when player heya is not desperate", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig({
        playerHeyaId: "player-heya",
        observerMode: false,
      });
      const bashoResult = createMockBashoResult();
      world.heyas.set("player-heya", MockFactory.createHeya("player-heya", { runwayBand: "safe" }));

      expect(checkStopCondition("stableInsolvency", bashoResult, world, config, chronicle)).toBe(
        false
      );
    });

    it("returns false in observer mode", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig({
        playerHeyaId: "player-heya",
        observerMode: true,
      });
      const bashoResult = createMockBashoResult();
      world.heyas.set(
        "player-heya",
        MockFactory.createHeya("player-heya", { runwayBand: "desperate" })
      );

      expect(checkStopCondition("stableInsolvency", bashoResult, world, config, chronicle)).toBe(
        false
      );
    });
  });

  describe("scandal", () => {
    it("returns true when there is a major scandal in the current year", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      world.scandals = [{ severity: "major", year: 2025 }];
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(checkStopCondition("scandal", bashoResult, world, config, chronicle)).toBe(true);
    });

    it("returns true when there is a scandal in the event log", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      world.eventLog = [{ type: "scandal" }];
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(checkStopCondition("scandal", bashoResult, world, config, chronicle)).toBe(true);
    });

    it("returns false when there are no major scandals in the current year or event log", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      world.scandals = [
        { severity: "minor", year: 2025 },
        { severity: "major", year: 2024 },
      ];
      world.eventLog = [{ type: "injury" }];
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(checkStopCondition("scandal", bashoResult, world, config, chronicle)).toBe(false);
    });
  });

  describe("retirementOfStar", () => {
    it("returns true when a star (tier <= 4) retires", () => {
      const world = MockFactory.createWorld();
      world.retirements = [{ rikishiId: "star-rikishi" }];
      // yokozuna is tier 1
      world.rikishi.set(
        "star-rikishi",
        MockFactory.createRikishi("star-rikishi", { rank: "yokozuna" })
      );
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(checkStopCondition("retirementOfStar", bashoResult, world, config, chronicle)).toBe(
        true
      );
    });

    it("returns false when a non-star retires", () => {
      const world = MockFactory.createWorld();
      world.retirements = [{ rikishiId: "normal-rikishi" }];
      // maegashira is tier 5
      world.rikishi.set(
        "normal-rikishi",
        MockFactory.createRikishi("normal-rikishi", { rank: "maegashira" })
      );
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(checkStopCondition("retirementOfStar", bashoResult, world, config, chronicle)).toBe(
        false
      );
    });

    it("returns false when no one retires", () => {
      const world = MockFactory.createWorld();
      world.retirements = [];
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(checkStopCondition("retirementOfStar", bashoResult, world, config, chronicle)).toBe(
        false
      );
    });
  });

  describe("default", () => {
    it("returns false for unknown conditions", () => {
      const world = MockFactory.createWorld();
      const config = createMockConfig();
      const bashoResult = createMockBashoResult();

      expect(
        checkStopCondition("never" as StopCondition, bashoResult, world, config, chronicle)
      ).toBe(false);
    });
  });
});
