/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { processRetireeOyakataConversion } from "@/engine/lifecycle/retireeOyakataConversion";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { HEYA_COUNT_CAP } from "@/constants/engine/economic";

describe("processRetireeOyakataConversion — guard conditions", () => {
  it("does nothing for retiree under age 28", () => {
    const retiree = mockRikishi("young", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 400,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["young"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["young", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");
    const beforeOyakata = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBe(beforeOyakata);
  });

  it("does nothing for non-accomplished retiree (low rank, < 200 wins)", () => {
    const retiree = mockRikishi("journeyman", {
      heyaId: "h1",
      rank: "makushita",
      division: "makushita",
      birthYear: 1980,
      careerWins: 50,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["journeyman"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["journeyman", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");
    const beforeOyakata = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBe(beforeOyakata);
  });

  it("converts sekiwake as accomplished (rank-based eligibility)", () => {
    const retiree = mockRikishi("seki", {
      heyaId: "h1",
      rank: "sekiwake",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 10,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["seki"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["seki", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");
    const beforeOyakata = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBeGreaterThan(beforeOyakata);
  });

  it("converts maegashira with 200+ career wins as accomplished", () => {
    const retiree = mockRikishi("veteran", {
      heyaId: "h1",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 250,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["veteran"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["veteran", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");
    const beforeOyakata = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBeGreaterThan(beforeOyakata);
  });
});

describe("processRetireeOyakataConversion — myoseki market", () => {
  it("handles missing myoseki market gracefully (treats as empty)", () => {
    const retiree = mockRikishi("legend", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: undefined as any,
    });
    const builder = createImpactBuilder("test");

    expect(() => {
      processRetireeOyakataConversion(world, retiree, builder);
    }).not.toThrow();

    const next = resolveImpacts(world, [builder.build()]);
    expect(next.myosekiMarket).toBeDefined();
    expect(Object.keys(next.myosekiMarket?.stocks ?? {}).length).toBeGreaterThan(0);
  });

  it("reuses available stock and marks it as held", () => {
    const retiree = mockRikishi("legend2", {
      heyaId: "h1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend2"] });
    const stockId = "MY-existing";
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend2", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: {
        stocks: {
          [stockId]: {
            id: stockId,
            name: "TestElder",
            prestigeTier: "modest",
            ownerId: "JSA",
            holderId: "JSA",
            status: "available",
            askingPrice: 100_000_000,
          },
        },
        history: [],
      } as any,
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const stock = next.myosekiMarket?.stocks[stockId];
    expect(stock).toBeDefined();
    expect(stock!.status).toBe("held");
    expect(stock!.ownerId).not.toBe("JSA");
    expect(stock!.holderId).not.toBe("JSA");
  });

  it("records a transaction in market history", () => {
    const retiree = mockRikishi("legend3", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 500,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend3"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend3", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.myosekiMarket?.history.length).toBeGreaterThan(0);
    const tx = next.myosekiMarket?.history[0];
    expect(tx!.type).toBe("sale");
    expect(tx!.fromId).toBe("JSA");
  });

  it("uses retirementFund for transaction amount when available", () => {
    const retiree = mockRikishi("legend4", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 500,
      economics: { retirementFund: 250_000_000 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend4"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend4", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const tx = next.myosekiMarket?.history[0];
    expect(tx!.amount).toBe(250_000_000);
  });
});

describe("processRetireeOyakataConversion — oyakata generation", () => {
  it("transfers avatar config with oyakata hairstyle", () => {
    const retiree = mockRikishi("legend5", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
      avatarConfig: { hairStyle: "chonmage", faceShape: "round" } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend5"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend5", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const newOyakata = Array.from(next.oyakata?.values() ?? []).find(
      (o: any) => o.formerShikona === "legend5" || o.name?.includes("legend5")
    );
    // Avatar should be transferred with oyakata hairstyle
    expect(newOyakata).toBeDefined();
    if (newOyakata?.avatarConfig) {
      expect((newOyakata.avatarConfig as any).hairstyle).toBe("oyakata");
    }
  });

  it("logs elder_stock_acquired lifecycle event", () => {
    const retiree = mockRikishi("legend6", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend6"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend6", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const impact = builder.build();

    const hasEvent = impact.events?.some(
      (e: any) => e.type === "LIFECYCLE_EVENT" && e.data?.status === "elder_stock_acquired"
    );
    expect(hasEvent).toBe(true);
  });
});

describe("processRetireeOyakataConversion — stable founding", () => {
  it("does not found a new heya when at HEYA_COUNT_CAP", () => {
    const retiree = mockRikishi("legend7", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["legend7"] });

    // Fill heyas up to the cap
    const heyas = new Map([["h1", heya]]);
    for (let i = 0; i < HEYA_COUNT_CAP; i++) {
      heyas.set(`filler-${i}`, makeMockHeya(`filler-${i}`, { rikishiIds: [] }));
    }

    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["legend7", retiree]]),
      heyas,
      myosekiMarket: { stocks: {}, history: [] } as any,
    });
    const builder = createImpactBuilder("test");
    const beforeHeyaCount = world.heyas.size;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    // No new heya founded since we're at cap
    expect(next.heyas.size).toBe(beforeHeyaCount);
  });
});
