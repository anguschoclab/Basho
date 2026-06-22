import { describe, it, expect } from "vitest";
import { financeSlice } from "@/contexts/financeSlice";
import { GameState, GameAction } from "@/contexts/gameTypes";
import { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { FacilityId } from "@/engine/types/infrastructure";

describe("Finance Slice", () => {
  it("should handle BUILD_INFRASTRUCTURE action", () => {
    const mockWorld: Partial<WorldState> = {
      seed: "test-seed",
      heyas: new Map([
        [
          "heya-1",
          {
            id: "heya-1",
            name: "Test Heya",
            funds: 10_000_000,
            facilities: { training: 10, recovery: 10, nutrition: 10 },
            facilitiesBand: "minimal",
            activeConstructions: [],
          } as unknown as Heya,
        ],
      ]),
      rikishi: new Map(),
      oyakata: new Map(),
    };

    const initialState: Partial<GameState> = {
      world: mockWorld as WorldState,
    };

    const action: GameAction = {
      type: "BUILD_INFRASTRUCTURE",
      heyaId: "heya-1",
      facilityId: "dojo" as FacilityId,
    };

    const newState = financeSlice(initialState as GameState, action);
    expect(newState.world).toBeDefined();
  });

  it("should return unchanged state when world is null", () => {
    const initialState: Partial<GameState> = { world: null };
    const action: GameAction = {
      type: "BUILD_INFRASTRUCTURE",
      heyaId: "heya-1",
      facilityId: "dojo" as FacilityId,
    };
    const newState = financeSlice(initialState as GameState, action);
    expect(newState).toBe(initialState);
  });
});
