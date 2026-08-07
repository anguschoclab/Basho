import { describe, it, expect } from "vitest";
import { spawnFinanceAgent, type FinanceAgentContext } from "@/engine/agents/FinanceAgent";
import { makeMockWorld } from "../utils";
import type { Oyakata } from "@/engine/types/oyakata";
import type { MyosekiStock } from "@/engine/types/myoseki";

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "oy-1",
    heyaId: "h1",
    name: "Test Oyakata",
    shikona: "Test Shikona",
    age: 55,
    archetype: "scientist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
    ...overrides,
  } as Oyakata;
}

function makeCtx(overrides: Partial<FinanceAgentContext> = {}): FinanceAgentContext {
  return {
    oyakata: makeOyakata(),
    world: makeMockWorld(),
    runwayBand: "comfortable",
    funds: 500_000_000,
    monthlyBurn: 10_000_000,
    ...overrides,
  };
}

function makeStock(id: string, overrides: Partial<MyosekiStock> = {}): MyosekiStock {
  return {
    id,
    name: `Stock-${id}`,
    prestigeTier: "respected",
    ownerId: "JSA",
    holderId: "JSA",
    status: "available",
    askingPrice: 100_000_000,
    ...overrides,
  };
}

describe("spawnFinanceAgent", () => {
  it("returns conservative risk level when runway is desperate", () => {
    const result = spawnFinanceAgent(makeCtx({ runwayBand: "desperate" }));
    expect(result.riskLevel).toBe("conservative");
  });

  it("returns conservative risk level when runway is critical", () => {
    const result = spawnFinanceAgent(makeCtx({ runwayBand: "critical" }));
    expect(result.riskLevel).toBe("conservative");
  });

  it("returns aggressive risk level when risk-taker + ambitious + comfortable runway", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 80, patience: 50, risk: 80, tradition: 30, compassion: 50 },
    });
    const result = spawnFinanceAgent(makeCtx({ oyakata, runwayBand: "comfortable" }));
    expect(result.riskLevel).toBe("aggressive");
  });

  it("returns conservative when traditionalist", () => {
    const oyakata = makeOyakata({
      archetype: "traditionalist",
      traits: { ambition: 30, patience: 50, risk: 30, tradition: 80, compassion: 50 },
    });
    const result = spawnFinanceAgent(makeCtx({ oyakata, runwayBand: "comfortable" }));
    expect(result.riskLevel).toBe("conservative");
  });

  it("does not buy myoseki when conservative", () => {
    const world = makeMockWorld({
      myosekiMarket: { stocks: { s1: makeStock("s1") }, history: [] },
    });
    const result = spawnFinanceAgent(
      makeCtx({ world, runwayBand: "desperate" })
    );
    expect(result.shouldBuyMyoseki).toBe(false);
  });

  it("buys myoseki when ambitious with comfortable runway and affordable stock", () => {
    const stock = makeStock("s1", { askingPrice: 50_000_000, prestigeTier: "elite" });
    const world = makeMockWorld({
      myosekiMarket: { stocks: { s1: stock }, history: [] },
    });
    const oyakata = makeOyakata({
      traits: { ambition: 80, patience: 50, risk: 50, tradition: 30, compassion: 50 },
    });
    const result = spawnFinanceAgent(
      makeCtx({ oyakata, world, runwayBand: "comfortable", funds: 500_000_000, monthlyBurn: 10_000_000 })
    );
    expect(result.shouldBuyMyoseki).toBe(true);
    expect(result.myosekiId).toBe("s1");
  });

  it("returns myosekiId from first prioritized stock when buying", () => {
    const elite = makeStock("elite", { askingPrice: 40_000_000, prestigeTier: "elite" });
    const modest = makeStock("modest", { askingPrice: 30_000_000, prestigeTier: "modest" });
    const world = makeMockWorld({
      myosekiMarket: { stocks: { elite, modest }, history: [] },
    });
    const oyakata = makeOyakata({
      traits: { ambition: 80, patience: 50, risk: 50, tradition: 30, compassion: 50 },
    });
    const result = spawnFinanceAgent(
      makeCtx({ oyakata, world, runwayBand: "comfortable", funds: 500_000_000, monthlyBurn: 10_000_000 })
    );
    expect(result.shouldBuyMyoseki).toBe(true);
    expect(result.myosekiId).toBe("elite");
  });

  it("returns moderate risk level for neutral archetype with comfortable runway", () => {
    const result = spawnFinanceAgent(makeCtx({ runwayBand: "comfortable" }));
    expect(result.riskLevel).toBe("moderate");
  });

  it("does not buy when no affordable stocks (all above 50% of funds)", () => {
    const expensive = makeStock("s1", { askingPrice: 300_000_000 });
    const world = makeMockWorld({
      myosekiMarket: { stocks: { s1: expensive }, history: [] },
    });
    const oyakata = makeOyakata({
      traits: { ambition: 80, patience: 50, risk: 50, tradition: 30, compassion: 50 },
    });
    const result = spawnFinanceAgent(
      makeCtx({ oyakata, world, runwayBand: "comfortable", funds: 500_000_000, monthlyBurn: 10_000_000 })
    );
    expect(result.shouldBuyMyoseki).toBe(false);
  });

  it("invests in facilities when runway > 12 months and ambitious", () => {
    const oyakata = makeOyakata({
      archetype: "scientist",
      traits: { ambition: 80, patience: 50, risk: 50, tradition: 30, compassion: 50 },
    });
    const result = spawnFinanceAgent(
      makeCtx({ oyakata, runwayBand: "comfortable", funds: 500_000_000, monthlyBurn: 10_000_000 })
    );
    expect(result.shouldInvestInFacilities).toBe(true);
    expect(result.facilityType).toBe("recovery");
  });

  it("builds reserves when runway < 6 months", () => {
    const result = spawnFinanceAgent(
      makeCtx({ runwayBand: "comfortable", funds: 30_000_000, monthlyBurn: 10_000_000 })
    );
    expect(result.shouldBuildReserves).toBe(true);
    expect(result.reserveTarget).toBe(60_000_000);
  });

  it("reasoning array is non-empty and contains risk level summary", () => {
    const result = spawnFinanceAgent(makeCtx());
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.reasoning.some((r) => r.includes("risk level"))).toBe(true);
  });
});
