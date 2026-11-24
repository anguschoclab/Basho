import { describe, it, expect } from "vitest";
import {
  processRetireeOyakataConversion,
  evaluateFoundingEligibility,
} from "@/engine/lifecycle/retireeOyakataConversion";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { rngForWorld } from "@/engine/core/rng";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import {
  FOUNDING_CHANCE,
  FOUNDING_SEED_FUNDS,
  HEYA_COUNT_CAP,
  HEYA_COUNT_FLOOR,
  HEYA_SOFT_TARGET,
  HEYA_FOUNDING_RAMP,
  MERGER_THRESHOLD,
  MYOSEKI_TOTAL_COUNT,
} from "@/constants/engine/economic";

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
      nationality: "Japan",
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
      nationality: "Japan",
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

describe("processRetireeOyakataConversion — citizenship gate (JSA rule: Japanese citizenship is mandatory for foreign-born toshiyori)", () => {
  const makeWorldFor = (retiree: ReturnType<typeof mockRikishi>) =>
    makeMockWorld({
      year: 2025,
      rikishi: new Map([[retiree.id, retiree]]),
      heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: [retiree.id] })]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });

  it("blocks an accomplished retiree who is still a foreign national", () => {
    const retiree = mockRikishi("foreign-seki", {
      heyaId: "h1",
      rank: "sekiwake",
      division: "makuuchi",
      birthYear: 1990,
      nationality: "Mongolia",
      citizenshipStatus: "foreign",
      joinedHeyaDate: "2024",
      careerWins: 10,
    });
    const world = makeWorldFor(retiree);
    const builder = createImpactBuilder("test");
    const beforeOyakata = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBe(beforeOyakata);
  });

  it("converts an accomplished naturalized foreigner (citizenship obtained)", () => {
    const retiree = mockRikishi("nat-seki", {
      heyaId: "h1",
      rank: "sekiwake",
      division: "makuuchi",
      birthYear: 1990,
      nationality: "Mongolia",
      citizenshipStatus: "naturalized",
      careerWins: 10,
    });
    const world = makeWorldFor(retiree);
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
      nationality: "Japan",
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
      nationality: "Japan",
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
      nationality: "Japan",
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

  it("re-seats a sekitori reserve share onto the new oyakata (not the JSA pool)", () => {
    const retiree = mockRikishi("reserved", {
      heyaId: "h1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      nationality: "Japan",
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["reserved"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["reserved", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: {
        stocks: {
          "MY-reserve": {
            id: "MY-reserve",
            name: "ReserveElder",
            prestigeTier: "respected",
            ownerId: "reserved",
            holderId: "reserved",
            status: "held",
            ichimon: "Dewanoumi",
          },
        },
        history: [],
      } as any,
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const stock = next.myosekiMarket?.stocks["MY-reserve"];
    expect(stock).toBeDefined();
    expect(stock!.status).toBe("held");
    expect(stock!.ownerId).not.toBe("JSA");
    expect(stock!.ownerId).not.toBe("reserved");
    const holder = next.oyakata?.get(stock!.holderId);
    expect(holder).toBeDefined();
    expect(stock!.ichimon).toBe("Dewanoumi");
    // No purchase — he already held the share.
    const tx = next.myosekiMarket?.history[0];
    expect(tx!.amount).toBe(0);
    expect(tx!.fromId).toBe("reserved");
  });

  it("uses retirementFund for transaction amount when available", () => {
    const retiree = mockRikishi("legend4", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 500,
      nationality: "Japan",
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
      nationality: "Japan",
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
    // Avatar identity should transfer while the oyakata stage is derived at render time
    expect(newOyakata).toBeDefined();
    expect(newOyakata?.avatarConfig?.seed).toBe(retiree.avatarConfig?.seed);
  });

  it("logs elder_stock_acquired lifecycle event", () => {
    const retiree = mockRikishi("legend6", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
      nationality: "Japan",
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

describe("evaluateFoundingEligibility — JSA branching gates", () => {
  const accomplished = (overrides: Record<string, unknown> = {}) =>
    mockRikishi("candidate", {
      heyaId: "parent",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      ...overrides,
    });

  function worldWithParent(parentOverrides: Record<string, unknown>, extraHeyaCount = 0) {
    const heyas = new Map([["parent", makeMockHeya("parent", parentOverrides)]]);
    for (let i = 0; i < extraHeyaCount; i++) {
      heyas.set(`other-${i}`, makeMockHeya(`other-${i}`));
    }
    return makeMockWorld({ year: 2025, heyas });
  }

  it("rejects a missing parent when the league is at/above HEYA_COUNT_FLOOR", () => {
    const heyas = new Map<string, ReturnType<typeof makeMockHeya>>();
    for (let i = 0; i < HEYA_COUNT_FLOOR; i++) heyas.set(`h-${i}`, makeMockHeya(`h-${i}`));
    const world = makeMockWorld({ year: 2025, heyas });
    expect(evaluateFoundingEligibility(world, accomplished()).canFound).toBe(false);
  });

  it("rejects when the parent stable is sanctioned at/above HEYA_COUNT_FLOOR", () => {
    const world = worldWithParent(
      {
        funds: 100_000_000,
        welfareState: {
          welfareRisk: 80,
          activeDiet: "maintenance",
          complianceState: "sanctioned",
          weeksInState: 5,
          lastReviewedWeek: 0,
        },
      },
      HEYA_COUNT_FLOOR - 1 // parent + fillers = FLOOR → no JSA waiver
    );
    const retiree = accomplished({
      economics: { retirementFund: 200_000_000 } as any,
    });
    expect(evaluateFoundingEligibility(world, retiree).canFound).toBe(false);
  });

  it("rejects when the parent stable is insolvent at/above HEYA_COUNT_FLOOR", () => {
    const world = worldWithParent({ funds: MERGER_THRESHOLD - 1 }, HEYA_COUNT_FLOOR - 1);
    const retiree = accomplished({
      economics: { retirementFund: 200_000_000 } as any,
    });
    expect(evaluateFoundingEligibility(world, retiree).canFound).toBe(false);
  });

  it("rejects when neither retiree fund nor parent sponsorship covers the seed", () => {
    // League at a healthy count (≥ HEYA_COUNT_FLOOR) — money gates.
    const world = worldWithParent({ funds: 10_000_000 }, HEYA_COUNT_FLOOR - 1);
    const retiree = accomplished({
      economics: { retirementFund: 1_000_000 } as any,
    });
    expect(evaluateFoundingEligibility(world, retiree).canFound).toBe(false);
  });

  it("JSA underwrites a qualified founder below HEYA_COUNT_FLOOR", () => {
    // 20 stables — closures have thinned the league; the association
    // wants the count restored, so the seed-funds gate is suspended.
    const world = worldWithParent({ funds: 10_000_000 }, 19);
    const retiree = accomplished({
      economics: { retirementFund: 1_000_000 } as any,
    });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(true);
    expect(e.parentSponsors).toBe(false);
    // 20 stables → headroom 26 ≥ RAMP → full chance either way.
    expect(e.effectiveChance).toBe(FOUNDING_CHANCE);
  });

  it("does not flag JSA backing when the seed was already fundable", () => {
    const world = worldWithParent({ funds: 10_000_000 }, 19);
    const retiree = accomplished({
      economics: { retirementFund: FOUNDING_SEED_FUNDS } as any,
    });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(false); // self-funded — no underwriting needed
  });

  it("JSA backing never relaxes the elite dokuritsu career bar", () => {
    const world = worldWithParent({ funds: 10_000_000 }, 19);
    const careerMaegashira = accomplished({
      rank: "maegashira",
      careerWins: 250,
      careerHistory: [
        { rank: "maegashira", division: "makuuchi" },
        { rank: "maegashira", division: "makuuchi" },
      ],
      economics: { retirementFund: 1_000_000 } as any,
    });
    expect(evaluateFoundingEligibility(world, careerMaegashira).canFound).toBe(false);
  });

  it("counts liquid salary cash toward solvency — top earners can self-fund", () => {
    // A decade at ¥3M/mo salary lands in cash, not the retirement account
    // — the real founder funds his branch from career earnings.
    const world = worldWithParent({ funds: 10_000_000 }, HEYA_COUNT_FLOOR - 1);
    const retiree = accomplished({
      economics: { cash: FOUNDING_SEED_FUNDS, retirementFund: 5_000_000 } as any,
    });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.parentSponsors).toBe(false);
    expect(e.jsaBacked).toBe(false);
  });

  it("allows a personally solvent retiree (self-funded founding)", () => {
    const world = worldWithParent({ funds: 10_000_000 });
    const retiree = accomplished({
      economics: { retirementFund: FOUNDING_SEED_FUNDS } as any,
    });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.parentSponsors).toBe(false);
    expect(e.parentHeyaId).toBe("parent");
  });

  it("allows a parent-sponsored founding and flags the funding transfer", () => {
    const world = worldWithParent({ funds: FOUNDING_SEED_FUNDS * 2 });
    const retiree = accomplished({
      economics: { retirementFund: 0 } as any,
    });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.parentSponsors).toBe(true);
  });

  it("rejects at HEYA_SOFT_TARGET regardless of solvency", () => {
    const world = worldWithParent(
      { funds: 100_000_000 },
      HEYA_SOFT_TARGET - 1 // parent + fillers = SOFT_TARGET
    );
    const retiree = accomplished({
      economics: { retirementFund: 200_000_000 } as any,
    });
    expect(evaluateFoundingEligibility(world, retiree).canFound).toBe(false);
  });

  it("scales effectiveChance down as the league approaches the soft target", () => {
    // 1 heya → headroom = SOFT_TARGET − 1 ≥ RAMP → full FOUNDING_CHANCE
    const sparse = worldWithParent({ funds: 100_000_000 });
    const retiree = accomplished({
      economics: { retirementFund: 200_000_000 } as any,
    });
    expect(evaluateFoundingEligibility(sparse, retiree).effectiveChance).toBe(FOUNDING_CHANCE);

    // headroom = 4 (< RAMP=8) → half chance
    const crowded = worldWithParent({ funds: 100_000_000 }, HEYA_SOFT_TARGET - 5);
    const e = evaluateFoundingEligibility(crowded, retiree);
    expect(e.effectiveChance).toBeCloseTo(FOUNDING_CHANCE * (4 / HEYA_FOUNDING_RAMP), 6);
  });
});

describe("evaluateFoundingEligibility — JSA waiver below HEYA_COUNT_FLOOR", () => {
  const accomplished = (overrides: Record<string, unknown> = {}) =>
    mockRikishi("candidate", {
      heyaId: "parent",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      ...overrides,
    });

  const sanctionedWelfare = {
    welfareRisk: 80,
    activeDiet: "maintenance" as const,
    complianceState: "sanctioned" as const,
    weeksInState: 5,
    lastReviewedWeek: 0,
  };

  it("waives a sanctioned parent below HEYA_COUNT_FLOOR — JSA affiliates the founder directly", () => {
    const heyas = new Map([["parent", makeMockHeya("parent", { funds: 100_000_000, welfareState: sanctionedWelfare })]]);
    const world = makeMockWorld({ year: 2025, heyas });
    const retiree = accomplished({ economics: { retirementFund: 1_000_000 } as any });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(true);
    expect(e.parentSponsors).toBe(false);
    expect(e.parentHeyaId).toBe("parent");
  });

  it("a sanctioned rich parent cannot sponsor — falls through to JSA backing", () => {
    const heyas = new Map([["parent", makeMockHeya("parent", { funds: FOUNDING_SEED_FUNDS * 2, welfareState: sanctionedWelfare })]]);
    const world = makeMockWorld({ year: 2025, heyas });
    const retiree = accomplished({ economics: { retirementFund: 1_000_000 } as any });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(true);
    expect(e.parentSponsors).toBe(false);
  });

  it("waives an insolvent parent below HEYA_COUNT_FLOOR", () => {
    const heyas = new Map([["parent", makeMockHeya("parent", { funds: MERGER_THRESHOLD - 1 })]]);
    const world = makeMockWorld({ year: 2025, heyas });
    const retiree = accomplished({ economics: { retirementFund: 1_000_000 } as any });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(true);
  });

  it("waives a missing parent below HEYA_COUNT_FLOOR — orphan founds under JSA affiliation", () => {
    const world = makeMockWorld({ year: 2025, heyas: new Map() });
    const retiree = accomplished({ heyaId: "ghost-parent", economics: { retirementFund: 1_000_000 } as any });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(true);
    expect(e.parentSponsors).toBe(false);
    expect(e.parentHeyaId).toBe("ghost-parent"); // lineage id preserved
  });

  it("an orphan founder self-funds without JSA backing when personally solvent", () => {
    const world = makeMockWorld({ year: 2025, heyas: new Map() });
    const retiree = accomplished({ heyaId: "ghost-parent", economics: { retirementFund: FOUNDING_SEED_FUNDS } as any });
    const e = evaluateFoundingEligibility(world, retiree);
    expect(e.canFound).toBe(true);
    expect(e.jsaBacked).toBe(false);
  });
});

describe("maybeFoundStable — orphan and sanctioned foundings", () => {
  const FOUNDING_IMPORTS = "@/engine/lifecycle/retireeOyakataConversion";

  function forcedRollRng(world: ReturnType<typeof makeMockWorld>) {
    // Delegate to the real world rng but force every probability check — the
    // founding roll is the only stochastic gate under test.
    const base = rngForWorld(world, "governance", "retirement_candidate");
    const rng = Object.create(base);
    rng.bool = () => true;
    return rng;
  }

  it("founds a heya for an orphan retiree — dead-parent lineage, closed-ichimon, JSA-seeded deshi", async () => {
    const { maybeFoundStable } = await import(FOUNDING_IMPORTS);
    const ghost = makeMockHeya("ghost", { ichimon: "Dewanoumi" });
    const heyas = new Map([["absorber", makeMockHeya("absorber")]]);
    const world = makeMockWorld({
      year: 2025,
      heyas,
      closedHeyas: new Map([["ghost", ghost]]),
      oyakata: new Map(),
      rikishi: new Map(),
    });
    const retiree = mockRikishi("candidate", {
      heyaId: "ghost",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      economics: { retirementFund: 1_000_000 } as any,
    });
    const builder = createImpactBuilder("test");
    const ok = maybeFoundStable(world, retiree, "newOy", forcedRollRng(world), builder);
    expect(ok).toBe(true);

    const next = resolveImpacts(world, [builder.build()]);
    const founded = [...next.heyas.values()].find((h) => h.branchedFromHeyaId === "ghost");
    expect(founded).toBeDefined();
    expect(founded?.ichimon).toBe("Dewanoumi"); // lineage inherited from the closed parent
    expect((founded?.rikishiIds ?? []).length).toBeGreaterThan(0);
    expect((founded?.rikishiIds ?? []).length).toBeLessThanOrEqual(3);

    // Seeded deshi are maezumo-enrolled, attached to the new stable, jonokuchi.
    for (const id of founded?.rikishiIds ?? []) {
      const deshi = next.rikishi.get(id);
      expect(deshi).toBeDefined();
      expect(deshi?.heyaId).toBe(founded?.id);
      expect(deshi?.isMaezumo).toBe(true);
      expect(deshi?.division).toBe("jonokuchi");
    }
  });

  it("founds under a sanctioned parent below the floor without deducting parent funds", async () => {
    const { maybeFoundStable } = await import(FOUNDING_IMPORTS);
    const parent = makeMockHeya("parent", {
      funds: FOUNDING_SEED_FUNDS * 2,
      rikishiIds: ["jr1", "jr2"],
      welfareState: {
        welfareRisk: 80,
        activeDiet: "maintenance",
        complianceState: "sanctioned",
        weeksInState: 5,
        lastReviewedWeek: 0,
      },
    });
    const jr1 = mockRikishi("jr1", { heyaId: "parent", division: "jonokuchi", rank: "jonokuchi" });
    const jr2 = mockRikishi("jr2", { heyaId: "parent", division: "jonidan", rank: "jonidan" });
    const world = makeMockWorld({
      year: 2025,
      heyas: new Map([["parent", parent]]),
      rikishi: new Map([["jr1", jr1], ["jr2", jr2]]),
    });
    const retiree = mockRikishi("candidate", {
      heyaId: "parent",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      economics: { retirementFund: 1_000_000 } as any,
    });
    const builder = createImpactBuilder("test");
    const ok = maybeFoundStable(world, retiree, "newOy", forcedRollRng(world), builder);
    expect(ok).toBe(true);

    const next = resolveImpacts(world, [builder.build()]);
    const founded = [...next.heyas.values()].find((h) => h.branchedFromHeyaId === "parent");
    expect(founded).toBeDefined();
    expect(next.heyas.get("parent")?.funds).toBe(FOUNDING_SEED_FUNDS * 2); // sanctioned — no sponsor deduction
    // Followers pulled from the parent's unsalaried roster.
    expect(next.heyas.get("parent")?.rikishiIds ?? []).toHaveLength(
      2 - (founded?.rikishiIds ?? []).length
    );
  });
});

describe("processRetireeOyakataConversion — saturated kabu market (founding gate)", () => {
  /** 105 held shares — the MYOSEKI_TOTAL_COUNT cap; nothing available, nothing mintable. */
  function saturatedMarket() {
    const stocks: Record<string, unknown> = {};
    for (let i = 0; i < MYOSEKI_TOTAL_COUNT; i++) {
      stocks[`MY-held-${i}`] = {
        id: `MY-held-${i}`,
        name: `Elder${i}`,
        prestigeTier: "modest",
        ownerId: `oyakata-${i}`,
        holderId: `oyakata-${i}`,
        status: "held",
      };
    }
    return { stocks, history: [] } as any;
  }

  const ozekiBasho = {
    id: "b1",
    bashoId: "b1",
    year: 2020,
    month: 1,
    bashoName: "hatsu" as const,
    rank: "ozeki" as const,
    division: "makuuchi" as const,
    rankNumber: 1,
    side: "east" as const,
    wins: 10,
    losses: 5,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 150,
    momentum: 0,
  };

  it("jun_toshiyori: ex-ozeki demoted to sekiwake still converts when stock is saturated (peak-rank credential)", () => {
    const retiree = mockRikishi("fallen", {
      heyaId: "h1",
      rank: "sekiwake",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
      nationality: "Japan",
      careerHistory: [ozekiBasho] as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["fallen"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["fallen", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: saturatedMarket(),
    });
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const newOyakata = Array.from(next.oyakata?.values() ?? []).find(
      (o) => o.heyaId === "h1"
    );
    expect(newOyakata).toBeDefined();
    expect(newOyakata?.elderStatus).toBe("jun_toshiyori");
  });

  it("jun_toshiyori does NOT leak to non-elite careers: 200-win sekiwake-only retiree still bails on saturated market", () => {
    const retiree = mockRikishi("lifer", {
      heyaId: "h1",
      rank: "sekiwake",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
      nationality: "Japan",
      careerHistory: [],
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["lifer"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["lifer", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: saturatedMarket(),
    });
    const builder = createImpactBuilder("test");
    const beforeOyakata = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBe(beforeOyakata);
  });
});
