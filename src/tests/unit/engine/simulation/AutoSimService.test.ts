import { describe, it, expect } from "vitest";
import { checkStopCondition, type AutoSimConfig } from "../AutoSimService";
import { makeMockWorld, mockRikishi, makeMockBasho, makeMockHeya } from "../utils";
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

  it("should return true for majorInjury when player's rikishi is seriously injured this basho", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("star-1", {
      shikona: "Injured One",
      heyaId: "player-heya",
      injured: true,
      injuryStatus: { type: "tear", severity: "serious", weeksRemaining: 4 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({ injuries: ["Injured One"] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return true for majorInjury on a long layoff even if not 'serious'", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("star-1", {
      shikona: "Long Layoff",
      heyaId: "player-heya",
      injured: true,
      injuryStatus: { type: "strain", severity: "moderate", weeksRemaining: 8 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({ injuries: ["Long Layoff"] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return false for majorInjury on a minor short injury", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("star-1", {
      shikona: "Minor Knock",
      heyaId: "player-heya",
      injured: true,
      injuryStatus: { type: "contusion", severity: "minor", weeksRemaining: 2 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({ injuries: ["Minor Knock"] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return false for majorInjury when the injured rikishi belongs to another heya", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("other-1", {
      shikona: "Rival Wrestler",
      heyaId: "other-heya",
      injured: true,
      injuryStatus: { type: "tear", severity: "serious", weeksRemaining: 6 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({ injuries: ["Rival Wrestler"] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return true for majorInjury in observer mode when a star is seriously injured", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("star-1", {
      shikona: "Star Ozeki",
      rank: "ozeki", // tier <= 4
      injured: true,
      injuryStatus: { type: "fracture", severity: "serious", weeksRemaining: 5 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ observerMode: true, playerHeyaId: undefined });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({ injuries: ["Star Ozeki"] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(true);
  });

  it("should return false for majorInjury in observer mode when a non-star is injured", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("juryo-1", {
      shikona: "Juryo Hopeful",
      rank: "juryo", // tier > 4
      injured: true,
      injuryStatus: { type: "fracture", severity: "serious", weeksRemaining: 5 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ observerMode: true, playerHeyaId: undefined });
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult({ injuries: ["Juryo Hopeful"] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return false for majorInjury when a serious injury was not sustained this basho", () => {
    const world = makeMockWorld() as any;
    const rikishi = mockRikishi("star-1", {
      shikona: "Carried Over",
      heyaId: "player-heya",
      injured: true,
      injuryStatus: { type: "tear", severity: "serious", weeksRemaining: 6 },
    });
    world.rikishi.set(rikishi.id, rikishi);

    const config = createMockConfig({ playerHeyaId: "player-heya" });
    const chronicle = createMockChronicle();
    // Not present in bashoResult.injuries -> injury predates this basho.
    const bashoResult = createMockBashoResult({ injuries: [] });

    expect(checkStopCondition("majorInjury", bashoResult, world, config, chronicle)).toBe(false);
  });

  it("should return false for unknown conditions", () => {
    const world = makeMockWorld();
    const config = createMockConfig();
    const chronicle = createMockChronicle();
    const bashoResult = createMockBashoResult();

    expect(checkStopCondition("never" as any, bashoResult, world, config, chronicle)).toBe(false);
  });
});
