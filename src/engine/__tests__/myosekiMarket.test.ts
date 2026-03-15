import { describe, it, expect, beforeEach } from "bun:test";
import { generateMyosekiMarket, buyMyoseki, leaseMyoseki, tickMyosekiMarket } from "../myosekiMarket";
import type { Oyakata } from "../types/oyakata";
import type { WorldState } from "../types/world";

describe("Myoseki Market", () => {
  let mockOyakataMap: Map<string, Oyakata>;
  let mockWorld: WorldState;

  beforeEach(() => {
    mockOyakataMap = new Map();
    // Create a few oyakata
    for (let i = 0; i < 5; i++) {
      mockOyakataMap.set(`oyakata_${i}`, {
        id: `oyakata_${i}`,
        heyaId: `heya_${i}`,
        name: `Oyakata ${i}`,
        age: 45,
        archetype: "traditionalist",
        traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
        yearsInCharge: 5
      });
    }

    const market = generateMyosekiMarket("test-seed", mockOyakataMap);

    mockWorld = {
      id: "world_1",
      seed: "test-seed",
      year: 2025,
      week: 1,
      dayIndexGlobal: 0,
      cyclePhase: "interim",
      heyas: new Map([
        ["heya_0", {
            id: "heya_0",
            name: "Test Heya",
            oyakataId: "oyakata_0",
            rikishiIds: [],
            statureBand: "established",
            prestigeBand: "respected",
            facilitiesBand: "adequate",
            koenkaiBand: "moderate",
            runwayBand: "comfortable",
            reputation: 50,
            funds: 500_000_000,
            scandalScore: 0,
            governanceStatus: "good_standing",
            facilities: { training: 10, recovery: 10, nutrition: 10 },
            riskIndicators: { financial: false, governance: false, rivalry: false }
        }]
      ]),
      rikishi: new Map(),
      oyakata: mockOyakataMap,
      history: [],
      events: { version: "1.0.0", log: [], dedupe: {} },
      myosekiMarket: market,
      calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 }
    };
  });

  it("should initialize exactly 105 stocks", () => {
    const market = mockWorld.myosekiMarket!;
    expect(Object.keys(market.stocks).length).toBe(105);

    // First 5 should be held by Oyakata
    expect(market.stocks["myo_0"].status).toBe("held");
    expect(market.stocks["myo_0"].ownerId).toBe("oyakata_0");

    // The rest should be available
    expect(market.stocks["myo_5"].status).toBe("available");
    expect(market.stocks["myo_5"].ownerId).toBe("JSA");
    expect(market.stocks["myo_5"].askingPrice).toBeGreaterThan(0);
  });

  it("should allow buying a myoseki if funds are sufficient", () => {
    const heya = mockWorld.heyas.get("heya_0")!;
    const initialFunds = heya.funds;
    const market = mockWorld.myosekiMarket!;

    const targetStock = market.stocks["myo_5"]; // Available stock
    const price = targetStock.askingPrice!;

    const success = buyMyoseki(mockWorld, "oyakata_0", "heya_0", "myo_5");

    expect(success).toBe(true);
    expect(heya.funds).toBe(initialFunds - price);
    expect(targetStock.status).toBe("held");
    expect(targetStock.ownerId).toBe("oyakata_0");
    expect(targetStock.askingPrice).toBeUndefined();

    expect(market.history.length).toBe(1);
    expect(market.history[0].type).toBe("sale");
  });

  it("should block buying if funds are insufficient", () => {
    const heya = mockWorld.heyas.get("heya_0")!;
    heya.funds = 10; // Make them poor
    const targetStock = mockWorld.myosekiMarket!.stocks["myo_5"];

    const success = buyMyoseki(mockWorld, "oyakata_0", "heya_0", "myo_5");

    expect(success).toBe(false);
    expect(heya.funds).toBe(10);
    expect(targetStock.status).toBe("available");
  });

  it("should allow leasing an available stock", () => {
    const targetStock = mockWorld.myosekiMarket!.stocks["myo_5"];

    const success = leaseMyoseki(mockWorld, "oyakata_0", "myo_5");

    expect(success).toBe(true);
    expect(targetStock.status).toBe("leased");
    expect(targetStock.holderId).toBe("oyakata_0");
    expect(targetStock.leaseFee).toBeGreaterThan(0);

    expect(mockWorld.myosekiMarket!.history.length).toBe(1);
    expect(mockWorld.myosekiMarket!.history[0].type).toBe("lease");
  });

  it("should process lease fees during tick", () => {
    const targetStock = mockWorld.myosekiMarket!.stocks["myo_5"];
    leaseMyoseki(mockWorld, "oyakata_0", "myo_5"); // Lease it to oyakata_0

    const heya = mockWorld.heyas.get("heya_0")!;
    const initialFunds = heya.funds;
    const fee = Math.floor(targetStock.leaseFee! / 52); // Approximate weekly fee calculated in tick

    tickMyosekiMarket(mockWorld);

    expect(heya.funds).toBeLessThanOrEqual(initialFunds - fee); // Less than or equal to handle rounding gracefully
  });
});
