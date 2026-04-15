import { describe, it, expect } from "vitest";
import { KIMARITE_STRATEGIES_V2 } from "../kimariteStrategy";
import type { FinalBoutState, SpatialBoutContext } from "../../types/kimariteStrategy";

describe("kimariteStrategiesV2", () => {
  it("exports KIMARITE_STRATEGIES_V2", () => {
    expect(KIMARITE_STRATEGIES_V2).toBeDefined();
    expect(Array.isArray(KIMARITE_STRATEGIES_V2)).toBe(true);
    expect(KIMARITE_STRATEGIES_V2.length).toBeGreaterThan(0);
  });

  it("V2 strategies have required fields", () => {
    KIMARITE_STRATEGIES_V2.forEach((strategy) => {
      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.japaneseName).toBeDefined();
      expect(strategy.category).toBeDefined();
      expect(strategy.weight).toBeGreaterThan(0);
      expect(strategy.condition).toBeInstanceOf(Function);
    });
  });

  it("condition functions accept SpatialBoutContext", () => {
    const winner: FinalBoutState = {
      grip: "uwate",
      style: "yotsu",
      power: 70,
      balanceResistance: 65,
      forwardMomentum: 5,
      offensiveOutput: 10,
      balance: 50,
      stamina: 0.8,
      edgeDistance: 3,
      cogOffset: 0.05,
      distanceFromCenter: 3.5,
      gripDepth: "deep",
      torque: 25,
      leadFootX: 3.0,
      momentumX: 2.0,
      gripClass: "uwate",
    };

    const loser: FinalBoutState = {
      grip: "none",
      style: "oshi",
      power: 55,
      balanceResistance: 45,
      forwardMomentum: 2,
      offensiveOutput: 5,
      balance: 20,
      stamina: 0.5,
      edgeDistance: 2,
      cogOffset: 0.15,
      distanceFromCenter: 2.5,
      gripDepth: "standard",
      torque: 10,
      leadFootX: 2.5,
      momentumX: 1.0,
      gripClass: "outside",
    };

    const spatialCtx: SpatialBoutContext = {
      edgeDistance: 2,
      eastLeadFoot: 3.0,
      westLeadFoot: 2.5,
      eastCoGOffset: 0.05,
      westCoGOffset: 0.15,
      eastMomentumX: 2.0,
      westMomentumX: 1.0,
      eastGrip: "uwate",
      westGrip: "outside",
    };

    // Test that at least one strategy can be evaluated with SpatialBoutContext
    const yorikiri = KIMARITE_STRATEGIES_V2.find((s) => s.id === "yorikiri");
    expect(yorikiri).toBeDefined();
    if (yorikiri) {
      // Should not throw
      expect(() => yorikiri.condition(winner, loser, spatialCtx)).not.toThrow();
    }
  });

  it("condition functions accept legacy context", () => {
    const winner: FinalBoutState = {
      grip: "uwate",
      style: "yotsu",
      power: 70,
      balanceResistance: 65,
      forwardMomentum: 5,
      offensiveOutput: 10,
      balance: 50,
      stamina: 0.8,
      edgeDistance: 3,
    };

    const loser: FinalBoutState = {
      grip: "none",
      style: "oshi",
      power: 55,
      balanceResistance: 45,
      forwardMomentum: 2,
      offensiveOutput: 5,
      balance: 20,
      stamina: 0.5,
      edgeDistance: 2,
    };

    const legacyCtx = { edgeDistance: 2 };

    // Test that strategies still work with legacy context
    const yorikiri = KIMARITE_STRATEGIES_V2.find((s) => s.id === "yorikiri");
    expect(yorikiri).toBeDefined();
    if (yorikiri) {
      expect(() => yorikiri.condition(winner, loser, legacyCtx)).not.toThrow();
    }
  });

  it("spatial fields are optional in FinalBoutState", () => {
    const minimalState: FinalBoutState = {
      grip: "none",
      style: "oshi",
      power: 50,
      balanceResistance: 50,
      forwardMomentum: 0,
      offensiveOutput: 0,
      balance: 0,
      stamina: 0.5,
      edgeDistance: 5,
    };

    const ctx = { edgeDistance: 5 };

    // Test that strategies work with minimal state (no spatial fields)
    const oshidashi = KIMARITE_STRATEGIES_V2.find((s) => s.id === "oshidashi");
    expect(oshidashi).toBeDefined();
    if (oshidashi) {
      expect(() => oshidashi.condition(minimalState, minimalState, ctx)).not.toThrow();
    }
  });
});
