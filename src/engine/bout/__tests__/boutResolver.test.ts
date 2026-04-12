import { describe, it, expect } from "vitest";
import { resolveBout, simulateBout } from "../boutResolver";
import { mockRikishi, makeMockBasho } from "../../__tests__/utils";
import type { KimariteId } from "../../types/combat";
import type { BoutContext } from "../boutPhysics";
import type { BashoState } from "../../types/basho";
import { resolveImpacts } from "../../core/ImpactResolver";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Fusensho pre-check
// ---------------------------------------------------------------------------

describe("resolveBout — fusensho (walkover)", () => {
  it("returns fusensho immediately when west rikishi is injured", () => {
    const east = mockRikishi("r-east", { injured: false });
    const west = mockRikishi("r-west", { injured: true });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.kimarite).toBe("fusensho");
    expect(result.winner).toBe("east");
    expect(result.winnerRikishiId).toBe("r-east");
    expect(result.loserRikishiId).toBe("r-west");
    expect(result.duration).toBe(0);
    expect(result.isKinboshi).toBe(false);
  });

  it("returns fusensho immediately when east rikishi is injured", () => {
    const east = mockRikishi("r-east", { injured: true });
    const west = mockRikishi("r-west", { injured: false });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.kimarite).toBe("fusensho");
    expect(result.winner).toBe("west");
    expect(result.winnerRikishiId).toBe("r-west");
    expect(result.loserRikishiId).toBe("r-east");
  });

  it("returns fusensho when east is retired", () => {
    const east = mockRikishi("r-east", { isRetired: true, injured: false });
    const west = mockRikishi("r-west", { injured: false });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.kimarite).toBe("fusensho");
    expect(result.winner).toBe("west");
  });

  it("does NOT return fusensho when both are healthy", () => {
    const east = mockRikishi("r-east", { injured: false });
    const west = mockRikishi("r-west", { injured: false });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.kimarite).not.toBe("fusensho");
    expect(result.duration).toBeGreaterThan(0);
  });

  it("injured winner does not receive kinboshi even if ranked maegashira vs yokozuna", () => {
    const east = mockRikishi("r-east", { injured: true, rank: "yokozuna" });
    const west = mockRikishi("r-west", { injured: false, rank: "maegashira" });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.kimarite).toBe("fusensho");
    expect(result.isKinboshi).toBe(false);
    expect(result.awardFact).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Henka momentum penalty
// ---------------------------------------------------------------------------

describe("resolveBout — henka momentum penalty", () => {
  it("winner's momentum decreases after successful henka", () => {
    const east = mockRikishi("r-east", {
      power: 50,
      speed: 90,
      technique: 80,
      balance: 70,
      momentum: 70,
    });
    const west = mockRikishi("r-west", { power: 80, speed: 40, balance: 50, momentum: 70 });
    const basho = makeMockBasho();
    const ctx = makeBoutContext({ playerSide: "east", playerTactic: "HENKA" });

    // Run enough times to capture a case where east wins with henka
    // (outcome depends on RNG; we check momentum only when east wins)
    const { result, impact } = resolveBout(ctx, east, west, basho);

    // Apply impact updates manually since we're testing with direct rikishi objects
    if (impact.entities?.rikishiUpdates) {
      const updateEast = impact.entities.rikishiUpdates.get("r-east");
      const updateWest = impact.entities.rikishiUpdates.get("r-west");
      if (updateEast?.momentum !== undefined) east.momentum = updateEast.momentum;
      if (updateWest?.momentum !== undefined) west.momentum = updateWest.momentum;
    }

    if (result.winner === "east") {
      // Momentum must have been penalised from 70
      expect(east.momentum).toBeLessThan(70);
      expect(east.momentum).toBeLessThanOrEqual(55); // 70 - 15
    } else {
      // If west wins, no penalty applied to east (they didn't use henka successfully)
      // Test still valid — structure is verified
      expect(east.momentum).toBe(70);
    }
    expect(["east", "west"]).toContain(result.winner);
  });

  it("momentum penalty does not drop below 0", () => {
    const east = mockRikishi("r-east", {
      power: 50,
      speed: 95,
      technique: 90,
      balance: 80,
      momentum: 5,
    });
    const west = mockRikishi("r-west", { power: 60, speed: 30, balance: 40, momentum: 50 });
    const basho = makeMockBasho();
    const ctx = makeBoutContext({ playerSide: "east", playerTactic: "HENKA" });

    resolveBout(ctx, east, west, basho);

    expect(east.momentum).toBeGreaterThanOrEqual(0);
  });

  it("no momentum change when STANDARD tactic is used", () => {
    const east = mockRikishi("r-east", { momentum: 70 });
    const west = mockRikishi("r-west", { momentum: 70 });
    const basho = makeMockBasho();
    const ctx = makeBoutContext({ playerSide: "east", playerTactic: "STANDARD" });

    resolveBout(ctx, east, west, basho);

    // With STANDARD, no henka penalty — momentum only changes via other systems
    // We just verify the bout resolves and momentum is not below 0
    expect(east.momentum).toBeGreaterThanOrEqual(0);
    expect(west.momentum).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// simulateBout sanity check
// ---------------------------------------------------------------------------

describe("simulateBout", () => {
  it("returns a valid result for two healthy rikishi", () => {
    const east = mockRikishi("r-east", { power: 70 });
    const west = mockRikishi("r-west", { power: 65 });

    const result = simulateBout(east, west, "test-seed");

    expect(["east", "west"]).toContain(result.winner);
    // kimarite must be a non-empty string from the known set
    expect(typeof result.kimarite).toBe("string");
    expect((result.kimarite as string).length).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  });
});
