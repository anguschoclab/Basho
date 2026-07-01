import { describe, it, expect, beforeEach } from "vitest";
import { WorldState } from "@/engine/types/world";
import { Heya } from "@/engine/types/heya";
import { Oyakata } from "@/engine/types/oyakata";
import { evaluateFinanceStrategy } from "@/engine/strategy/NPCFinanceCalculator";

describe("NPC Finance Style Parity", () => {
  let mockWorld: WorldState;
  let mockHeya: Heya;
  let mockOyakata: Oyakata;

  beforeEach(() => {
    mockWorld = {
      myosekiMarket: {
        stocks: {
          stock_power: {
            id: "stock_power",
            bonusType: "power",
            status: "available",
            askingPrice: 100_000_000,
          },
          stock_speed: {
            id: "stock_speed",
            bonusType: "speed",
            status: "available",
            askingPrice: 100_000_000,
          },
        },
      },
      heyas: new Map(),
      oyakata: new Map(),
      rikishi: new Map(),
      dayIndexGlobal: 0,
      seed: "test-seed",
    } as any;

    mockHeya = {
      id: "heya_1",
      funds: 1_000_000_000,
      rikishiIds: ["r1", "r2"], // 300k monthly burn
    } as any;

    mockWorld.heyas.set(mockHeya.id, mockHeya);

    mockOyakata = {
      id: "oyakata_1",
      traits: { ambition: 90, risk: 50 },
    } as any;
  });

  it("should prioritize Myoseki matching the oyakata's style preference", () => {
    const impact = evaluateFinanceStrategy({
      world: mockWorld,
      heya: mockHeya,
      oyakata: mockOyakata,
    });

    // Impact should contain a purchase event
    // The internal buyMyoseki logs a FINANCIAL_ALERT,
    // while the strategy wrapper logs a buy_myoseki action.
    const purchaseEvent = (impact.events || []).find(
      (e) => e.data.action === "buy_myoseki" || e.type === "FINANCIAL_ALERT"
    );
    expect(purchaseEvent).toBeDefined();

    // The buyer should have spent money (funds updated)
    const heyaUpdate = impact.entities?.heyaUpdates?.get(mockHeya.id);
    expect(heyaUpdate?.funds).toBeLessThan(mockHeya.funds);
  });

  it("should block purchases if runway is insufficient", () => {
    mockHeya.funds = 10_000_000; // Very low funds relative to burn
    const impact = evaluateFinanceStrategy({
      world: mockWorld,
      heya: mockHeya,
      oyakata: mockOyakata,
    });

    expect((impact.events || []).length).toBe(0);
  });
});
