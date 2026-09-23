import { describe, it, expect } from "vitest";
import { deriveTone, applyBoutToPairState, getRivalryBoutModifiers } from "@/engine/systems/narrative/RivalryHeatService";
import { SeededRNG } from "@/engine/rng";
import type { RivalryPairState } from "@/constants/engine/rivalry";

function makePair(overrides: Partial<RivalryPairState> = {}): RivalryPairState {
  return {
    key: "r-a|r-b",
    aId: "r-a",
    bId: "r-b",
    heat: 30,
    meetings: 2,
    lastMetWeek: 5,
    aWins: 1,
    bWins: 1,
    closeness: 40,
    spite: 10,
    tone: "respect",
    triggers: {},
    sameHeya: false,
    ...overrides,
  } as RivalryPairState;
}

describe("RivalryHeatService.deriveTone", () => {
  it("determines sameHeya respect regardless of spite/heat if under threshold", () => {
    const pair = makePair({ heat: 20, spite: 10, sameHeya: true });
    expect(deriveTone(pair)).toBe("respect");
  });
  it("determines bad_blood", () => {
    const pair = makePair({ heat: 80, spite: 80 });
    expect(deriveTone(pair)).toBe("bad_blood");
  });
  it("determines grudge", () => {
    const pair = makePair({ heat: 50, spite: 60 });
    expect(deriveTone(pair)).toBe("grudge");
  });
  it("determines respect when close", () => {
    const pair = makePair({ closeness: 70, heat: 60, spite: 10 });
    expect(deriveTone(pair)).toBe("respect");
  });
  it("determines unstable", () => {
    const pair = makePair({ closeness: 50, spite: 40, heat: 60 });
    expect(deriveTone(pair)).toBe("unstable");
  });
  it("determines public_hype", () => {
    const pair = makePair({ meetings: 10, heat: 70, spite: 10 });
    expect(deriveTone(pair)).toBe("public_hype");
  });
});

describe("RivalryHeatService.applyBoutToPairState", () => {
  it("updates win counts and meetings", () => {
    const pair = makePair({ aWins: 1, bWins: 1, meetings: 2 });
    const rng = new SeededRNG("test");
    const next = applyBoutToPairState(pair, {
      rng,
      isWinForA: true,
      isLossForA: false,
      isKinboshi: false,
      isTitleStakes: false,
      closeness01: 0.5,
      domination01: 0.3,
      isUpset: false,
      week: 10,
    });
    expect(next.aWins).toBe(2);
    expect(next.bWins).toBe(1);
    expect(next.meetings).toBe(3);
  });
  it("applies bonuses for upset, kinboshi, title stakes, high stakes, and close finish", () => {
    const pair = makePair({ heat: 0, closeness: 0, spite: 0 });
    const rng = new SeededRNG("test-bonuses");
    const next = applyBoutToPairState(pair, {
      rng,
      isWinForA: false,
      isLossForA: true,
      isKinboshi: true,
      isTitleStakes: true,
      closeness01: 0.9,
      domination01: 0.9,
      isUpset: true,
      week: 15,
      isFinalDay: true,
      isYushoRace: true,
    });
    expect(next.heat).toBeGreaterThan(0);
    expect(next.closeness).toBeGreaterThan(0);
    expect(next.spite).toBeGreaterThan(0);
    expect(next.triggers.close_finish).toBeDefined();
    expect(next.triggers.upset).toBeDefined();
    expect(next.triggers.kinboshi).toBeDefined();
    expect(next.triggers.title_stakes).toBeDefined();
  });
});

describe("RivalryHeatService.getRivalryBoutModifiers", () => {
  it("returns tension calculated from heat (r-a < r-b)", () => {
    const pair = makePair({ key: "r-a|r-b", heat: 80 });
    const tensionObj = getRivalryBoutModifiers({
      state: { version: "1", pairs: { "r-a|r-b": pair } } as any,
      aId: "r-a",
      bId: "r-b",
    });
    expect(tensionObj.tension).toBe(0.8);
  });

  it("returns tension calculated from heat (r-b < r-a) handling reverse key", () => {
    const pair = makePair({ key: "r-a|r-b", heat: 80 });
    const tensionObj = getRivalryBoutModifiers({
      state: { version: "1", pairs: { "r-a|r-b": pair } } as any,
      aId: "r-b",
      bId: "r-a",
    });
    expect(tensionObj.tension).toBe(0.8);
  });

  it("returns zero tension if rivalry doesn't exist", () => {
    const tensionObj = getRivalryBoutModifiers({
      state: { version: "1", pairs: {} } as any,
      aId: "r-a",
      bId: "r-b",
    });
    expect(tensionObj.tension).toBe(0);
  });
});
