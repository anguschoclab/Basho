import { describe, it, expect } from "vitest";
import { applyBoutToPairState } from "@/engine/systems/narrative/RivalryHeatService";
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

describe("RivalryHeatService — lastKimarite and lastWinnerId tracking", () => {
  it("applyBoutToPairState sets lastKimarite from bout args", () => {
    const pair = makePair();
    const rng = new SeededRNG("test-kim-1");

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
      kimarite: "yorikiri",
      winnerId: "r-a",
    });

    expect(next.lastKimarite).toBe("yorikiri");
  });

  it("applyBoutToPairState sets lastWinnerId to winner", () => {
    const pair = makePair();
    const rng = new SeededRNG("test-win-1");

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
      kimarite: "yorikiri",
      winnerId: "r-a",
    });

    expect(next.lastWinnerId).toBe("r-a");
  });

  it("applyBoutToPairState sets lastWinnerId to bId when b wins", () => {
    const pair = makePair();
    const rng = new SeededRNG("test-win-b");

    const next = applyBoutToPairState(pair, {
      rng,
      isWinForA: false,
      isLossForA: true,
      isKinboshi: false,
      isTitleStakes: false,
      closeness01: 0.5,
      domination01: 0.3,
      isUpset: false,
      week: 10,
      kimarite: "uwatenage",
      winnerId: "r-b",
    });

    expect(next.lastWinnerId).toBe("r-b");
    expect(next.lastKimarite).toBe("uwatenage");
  });

  it("subsequent bouts overwrite lastKimarite and lastWinnerId", () => {
    const pair = makePair();
    const rng1 = new SeededRNG("test-seq-1");
    const rng2 = new SeededRNG("test-seq-2");

    const first = applyBoutToPairState(pair, {
      rng: rng1,
      isWinForA: true,
      isLossForA: false,
      isKinboshi: false,
      isTitleStakes: false,
      closeness01: 0.5,
      domination01: 0.3,
      isUpset: false,
      week: 10,
      kimarite: "yorikiri",
      winnerId: "r-a",
    });

    expect(first.lastKimarite).toBe("yorikiri");
    expect(first.lastWinnerId).toBe("r-a");

    const second = applyBoutToPairState(first, {
      rng: rng2,
      isWinForA: false,
      isLossForA: true,
      isKinboshi: false,
      isTitleStakes: false,
      closeness01: 0.6,
      domination01: 0.2,
      isUpset: true,
      week: 15,
      kimarite: "shitatenage",
      winnerId: "r-b",
    });

    expect(second.lastKimarite).toBe("shitatenage");
    expect(second.lastWinnerId).toBe("r-b");
  });

  it("lastKimarite undefined when not passed in args", () => {
    const pair = makePair({ lastKimarite: undefined, lastWinnerId: undefined });
    const rng = new SeededRNG("test-no-kim");

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

    expect(next.lastKimarite).toBeUndefined();
    expect(next.lastWinnerId).toBeUndefined();
  });

  it("preserves lastKimarite from previous state when not overwritten", () => {
    const pair = makePair({ lastKimarite: "oshidashi", lastWinnerId: "r-a" });
    const rng = new SeededRNG("test-preserve");

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
      // No kimarite or winnerId passed
    });

    // Should preserve from pair since args.kimarite is undefined
    expect(next.lastKimarite).toBe("oshidashi");
    expect(next.lastWinnerId).toBe("r-a");
  });
});
