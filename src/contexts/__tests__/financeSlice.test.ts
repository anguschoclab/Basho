import { describe, it, expect } from "vitest";
import { financeSlice } from "../financeSlice";
import { GameState, GameAction } from "../gameTypes";
import { WorldState } from "@/engine/types/world";

describe("Finance Slice", () => {
  it("should handle UPGRADE_HEYA action", () => {
    const mockWorld: Partial<WorldState> = {
      seed: "test-seed",
      heyas: new Map([
        ["heya-1", {
          id: "heya-1",
          name: "Test Heya",
          funds: 10000000,
          facilities: { training: 10, recovery: 10, nutrition: 10 },
          facilitiesBand: "minimal"
        } as any]
      ]),
      rikishi: new Map(),
      oyakata: new Map(),
    };

    const initialState: Partial<GameState> = {
      world: mockWorld as WorldState,
    };

    const action: GameAction = {
      type: "UPGRADE_HEYA",
      heyaId: "heya-1",
      axis: "training",
      points: 10
    };

    const newState = financeSlice(initialState as GameState, action);

    expect(newState.world).toBeDefined();
    const upgradedHeya = newState.world?.heyas.get("heya-1");
    expect(upgradedHeya?.facilities.training).toBe(20);
    expect(upgradedHeya?.funds).toBeLessThan(10000000);
  });

  it("should handle RECRUIT_STAFF action", () => {
    const mockWorld: Partial<WorldState> = {
      seed: "test-seed",
      heyas: new Map([
        ["heya-1", {
          id: "heya-1",
          funds: 1000000,
          staffIds: []
        } as any]
      ]),
      staff: new Map(),
      rikishi: new Map(),
      oyakata: new Map(),
    };

    const initialState: Partial<GameState> = {
      world: mockWorld as WorldState,
    };

    const action: GameAction = {
      type: "RECRUIT_STAFF",
      heyaId: "heya-1",
      role: "scout"
    };

    const newState = financeSlice(initialState as GameState, action);

    expect(newState.world).toBeDefined();
    const heya = newState.world?.heyas.get("heya-1");
    expect(heya?.staffIds?.length).toBe(1);
    expect(heya?.funds).toBe(500000);
  });
});
