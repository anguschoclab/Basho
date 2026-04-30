import { describe, it, expect } from "vitest";
import { checkStopCondition, type AutoSimConfig } from "../AutoSimService";
import { makeMockWorld, mockRikishi, makeMockBasho, makeMockHeya } from "../../__tests__/utils";
import type { BashoSimResult } from "../../types/basho";
import type { ChronicleReport } from "../../types/records";

describe("checkStopCondition", () => {
  const createMockConfig = (overrides?: Partial<AutoSimConfig>): AutoSimConfig => ({
    duration: { type: "years", count: 10 },
    stopConditions: ["yusho"],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: false,
    playerHeyaId: "player-heya",
    ...overrides,
  });

  const createMockBashoResult = (overrides?: Partial<BashoSimResult>): BashoSimResult => ({
    bashoName: "hatsu",
    year: 2025,
    yushoWinner: { id: "winner-id", shikona: "Winner", wins: 15, losses: 0 },
    junYusho: [],
    standings: [] as any,
    keyBouts: [],
    injuries: [],
    promotions: [],
    demotions: [],
    ...overrides,
  });

  const createMockChronicle = (): ChronicleReport =>
    ({
      yearCreated: 2025,
      yearFinished: 2025,
      yushoWinners: [],
      promotionsYokozuna: [],
      promotionsOzeki: [],
      scandals: [],
      majorInjuries: [],
      retirements: [],
      playerEvents: [],
      heyaEvents: [],
    }) as unknown as ChronicleReport;

  it("should return true for yokozunaPromotion when a yokozuna promotion occurs", () => {
    const world = makeMockWorld();
    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      promotions: [{ rikishiId: "r1", from: "ozeki", to: "yokozuna", description: "" }],
    });

    expect(checkStopCondition("yokozunaPromotion", bashoResult, world, config, chronicle)).toBe(
      true
    );
  });

  it("should return false for yokozunaPromotion when no yokozuna promotion occurs", () => {
    const world = makeMockWorld();
    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      promotions: [{ rikishiId: "r1", from: "sekiwake", to: "ozeki", description: "" }],
    });

    expect(checkStopCondition("yokozunaPromotion", bashoResult, world, config, chronicle)).toBe(
      false
    );
  });

  it("should return true for ozekiPromotion when an ozeki promotion occurs", () => {
    const world = makeMockWorld();
    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      promotions: [{ rikishiId: "r1", from: "sekiwake", to: "ozeki", description: "" }],
    });

    expect(checkStopCondition("ozekiPromotion", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return false for ozekiPromotion when no ozeki promotion occurs", () => {
    const world = makeMockWorld();
    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      promotions: [{ rikishiId: "r1", from: "ozeki", to: "yokozuna", description: "" }],
    });

    expect(checkStopCondition("ozekiPromotion", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return true for yusho when player's rikishi wins", () => {
    const world = makeMockWorld();
    const rikishi = mockRikishi("winner-id", { heyaId: "player-heya" });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      yushoWinner: { id: "winner-id", shikona: "Winner", wins: 15, losses: 0 },
    });

    expect(checkStopCondition("yusho", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return false for yusho when another heya's rikishi wins", () => {
    const world = makeMockWorld();
    const rikishi = mockRikishi("winner-id", { heyaId: "other-heya" });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      yushoWinner: { id: "winner-id", shikona: "Winner", wins: 15, losses: 0 },
    });

    expect(checkStopCondition("yusho", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return false for yusho in observer mode", () => {
    const world = makeMockWorld();
    const rikishi = mockRikishi("winner-id", { heyaId: "player-heya" });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({
      observerMode: true,
      playerHeyaId: "player-heya",
    });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({
      yushoWinner: { id: "winner-id", shikona: "Winner", wins: 15, losses: 0 },
    });

    expect(checkStopCondition("yusho", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return true for stableInsolvency when player's heya is desperate", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("player-heya", { runwayBand: "desperate" });
    world.heyas.set(heya.id, heya);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("stableInsolvency", bashoResult, world, config, chronicle)).toBe(
      true
    );
  });

  it("should return false for stableInsolvency when player's heya is not desperate", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("player-heya", { runwayBand: "comfortable" });
    world.heyas.set(heya.id, heya);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("stableInsolvency", bashoResult, world, config, chronicle)).toBe(
      false
    );
  });

  it("should return true for scandal when a major scandal occurs in current year", () => {
    const world = makeMockWorld({ year: 2025 }) as any;
    world.scandals = [{ severity: "major", year: 2025 }];

    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("scandal", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return true for scandal when eventLog has scandal", () => {
    const world = makeMockWorld({ year: 2025 }) as any;
    world.scandals = [];
    world.eventLog = [{ type: "scandal" }];

    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("scandal", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return false for scandal when no major scandal in current year", () => {
    const world = makeMockWorld({ year: 2025 }) as any;
    world.scandals = [
      { severity: "major", year: 2024 },
      { severity: "minor", year: 2025 },
    ];
    world.eventLog = [{ type: "other_event" }];

    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("scandal", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return true for retirementOfStar when a star (tier <= 4) retires", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("star-1", { rank: "sekiwake" }); // tier 3
    world.rikishi.set(rikishi.id, rikishi);
    world.retirements = [{ rikishiId: "star-1" }];

    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("retirementOfStar", bashoResult, world, config, chronicle)).toBe(
      true
    );
  });

  it("should return false for retirementOfStar when a non-star retires", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("non-star-1", { rank: "juryo" }); // tier > 4
    world.rikishi.set(rikishi.id, rikishi);
    world.retirements = [{ rikishiId: "non-star-1" }];

    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("retirementOfStar", bashoResult, world, config, chronicle)).toBe(
      false
    );
  });

  it("should return false for unknown conditions", () => {
    const world = makeMockWorld();
    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("never" as any, bashoResult, world, config, chronicle)).toBe(false);
  });
});
