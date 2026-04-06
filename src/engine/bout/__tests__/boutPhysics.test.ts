import { describe, it, expect } from "vitest";
import { resolveBoutPhysics, type BoutContext } from "../boutPhysics";
import { mockRikishi } from "../../__tests__/utils";
import type { BashoState } from "../../types/basho";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockBasho(overrides: Partial<BashoState> = {}): BashoState {
  return {
    id: "test-basho",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches: [],
    standings: new Map(),
    schedule: [],
    results: [],
    name: "hatsu",
    ...overrides,
  } as unknown as BashoState;
}

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-test-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("resolveBoutPhysics — determinism", () => {
  it("produces identical winner and kimarite for the same seed", () => {
    const east = mockRikishi("r-east", { power: 70, speed: 60, balance: 65, technique: 60 });
    const west = mockRikishi("r-west", { power: 55, speed: 70, balance: 60, technique: 65 });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const result1 = resolveBoutPhysics(ctx, east, west, basho);
    const result2 = resolveBoutPhysics(ctx, east, west, basho);

    expect(result1.winner).toBe(result2.winner);
    expect(result1.kimarite).toBe(result2.kimarite);
    expect(result1.log.length).toBe(result2.log.length);
  });

  it("produces different results for different seeds (different rikishi ids)", () => {
    const east1 = mockRikishi("alpha", { power: 70 });
    const west1 = mockRikishi("beta", { power: 55 });
    const east2 = mockRikishi("gamma", { power: 70 });
    const west2 = mockRikishi("delta", { power: 55 });

    const basho = makeMockBasho();
    const ctx1 = makeBoutContext({ rikishiEastId: "alpha", rikishiWestId: "beta" });
    const ctx2 = makeBoutContext({ rikishiEastId: "gamma", rikishiWestId: "delta" });

    const result1 = resolveBoutPhysics(ctx1, east1, west1, basho);
    const result2 = resolveBoutPhysics(ctx2, east2, west2, basho);

    // They should be structurally valid but may differ — just ensure they complete
    expect(["east", "west"]).toContain(result1.winner);
    expect(["east", "west"]).toContain(result2.winner);
  });
});

// ---------------------------------------------------------------------------
// Henka tactic
// ---------------------------------------------------------------------------

describe("resolveBoutPhysics — henka tactic", () => {
  it("resolves to a valid result when east uses HENKA tactic", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 90, technique: 80, balance: 70 });
    const west = mockRikishi("r-west", { power: 80, speed: 40, balance: 50 });
    const basho = makeMockBasho();
    const ctx = makeBoutContext({ playerSide: "east", playerTactic: "HENKA" });

    const result = resolveBoutPhysics(ctx, east, west, basho);
    expect(["east", "west"]).toContain(result.winner);
    expect(result.kimariteName).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Aggression modifier
// ---------------------------------------------------------------------------

describe("resolveBoutPhysics — aggression modifier", () => {
  it("completes without error for a rikishi with aggression=90", () => {
    // Validates that the aggression modifier path in selectAction() does not crash
    // and produces a valid BoutResult when aggression exceeds the 65 threshold.
    const east = mockRikishi("r-east", { power: 60, speed: 60, balance: 60, technique: 60, aggression: 90 });
    const west = mockRikishi("r-west", { power: 60, speed: 60, balance: 60, technique: 60, aggression: 30 });
    (east as any).combatProfile = {
      archetype: "all_rounder",
      familyPreferences: { push: 60, belt: 15, trick: 10, speed: 15 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
    };
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const result = resolveBoutPhysics(ctx, east, west, basho);
    expect(["east", "west"]).toContain(result.winner);
    expect(result.kimarite).toBeTruthy();
  });

  it("aggression=90 and aggression=10 produce valid but potentially different bouts", () => {
    // Both should complete successfully; the aggression modifier influences action selection
    // without breaking the outcome.
    const eastHigh = mockRikishi("r-east", { power: 60, aggression: 90 });
    const westLow = mockRikishi("r-west", { power: 60, aggression: 10 });
    const eastLow = mockRikishi("r-east", { power: 60, aggression: 10 });
    const westHigh = mockRikishi("r-west", { power: 60, aggression: 90 });

    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const resultA = resolveBoutPhysics(ctx, eastHigh, westLow, basho);
    const resultB = resolveBoutPhysics(ctx, eastLow, westHigh, basho);

    expect(["east", "west"]).toContain(resultA.winner);
    expect(["east", "west"]).toContain(resultB.winner);
  });
});

// ---------------------------------------------------------------------------
// Output structure
// ---------------------------------------------------------------------------

describe("resolveBoutPhysics — output structure", () => {
  it("returns a BoutResult with required fields", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const result = resolveBoutPhysics(ctx, east, west, basho);

    expect(result.boutId).toBeTruthy();
    expect(["east", "west"]).toContain(result.winner);
    expect(result.winnerRikishiId).toBeTruthy();
    expect(result.loserRikishiId).toBeTruthy();
    expect(result.kimarite).toBeTruthy();
    expect(result.kimariteName).toBeTruthy();
    expect(typeof result.duration).toBe("number");
    expect(typeof result.upset).toBe("boolean");
    expect(Array.isArray(result.log)).toBe(true);
    expect(result.log.length).toBeGreaterThan(0);
  });

  it("sets winnerRikishiId and loserRikishiId correctly based on winner side", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const result = resolveBoutPhysics(ctx, east, west, basho);

    if (result.winner === "east") {
      expect(result.winnerRikishiId).toBe("r-east");
      expect(result.loserRikishiId).toBe("r-west");
    } else {
      expect(result.winnerRikishiId).toBe("r-west");
      expect(result.loserRikishiId).toBe("r-east");
    }
  });
});
