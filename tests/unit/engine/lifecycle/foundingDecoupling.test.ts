import { describe, it, expect } from "vitest";
import { processRetireeOyakataConversion } from "@/engine/lifecycle/retireeOyakataConversion";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { MYOSEKI_TOTAL_COUNT } from "@/constants/engine/economic";

/**
 * WS-17 — founding decoupling. Verified structural bug: `maybeFoundStable`
 * sits behind the `elderStatus == null` early-return, so at a saturated
 * kabu market (100% in the 25-yr diagnostic) career-eligible veterans who
 * lack a Y/O peak can never be evaluated for branching — `founded=0`
 * forever. The founder's provisional elder license should follow the
 * founding career bar, not kabu availability.
 */

/** 105 held shares — nothing available, nothing mintable. */
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
  return { stocks, history: [] } as never;
}

/** N makuuchi basho entries — enough to clear the 60-basho founding bar. */
function makuuchiCareer(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    bashoId: `b${i}`,
    year: 2000 + Math.floor(i / 6),
    month: (i % 6) * 2,
    bashoName: "hatsu" as const,
    rank: "maegashira" as const,
    division: "makuuchi" as const,
    rankNumber: 10,
    side: "east" as const,
    wins: 7,
    losses: 8,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 150,
    momentum: 0,
  }));
}

function eligibleVeteran(id: string) {
  return mockRikishi(id, {
    heyaId: "h1",
    rank: "maegashira",
    division: "makuuchi",
    birthYear: 1980,
    careerWins: 430,
    nationality: "Japan",
    careerHistory: makuuchiCareer(65) as never,
    economics: { retirementFund: 250_000_000 } as never,
  });
}

function worldFor(retiree: ReturnType<typeof mockRikishi>) {
  const heya = makeMockHeya("h1", { rikishiIds: [retiree.id], funds: 50_000_000 });
  return makeMockWorld({
    year: 2025,
    rikishi: new Map([[retiree.id, retiree]]),
    heyas: new Map([["h1", heya]]),
    myosekiMarket: saturatedMarket(),
  });
}

describe("founding decoupling — saturated kabu no longer blocks the branch eval", () => {
  it("career-eligible veteran (≥60 makuuchi basho, no Y/O peak, no stock) converts to oyakata with jun_toshiyori provisional license", () => {
    const retiree = eligibleVeteran("vet-1");
    const world = worldFor(retiree);
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const oyakata = Array.from(next.oyakata?.values() ?? []).find((o) => o.heyaId === "h1");
    expect(oyakata).toBeDefined();
    expect(oyakata?.elderStatus).toBe("jun_toshiyori");
    expect(oyakata?.elderExpiryYear).toBeDefined();
  });

  it("the branch roll actually fires — at least one of N eligible veterans founds a stable", () => {
    let founded = 0;
    for (let i = 0; i < 30; i++) {
      const retiree = eligibleVeteran(`vet-${i}`);
      const world = worldFor(retiree);
      const builder = createImpactBuilder("test");
      const heyasBefore = world.heyas.size;

      processRetireeOyakataConversion(world, retiree, builder);
      const next = resolveImpacts(world, [builder.build()]);
      if (next.heyas.size > heyasBefore) founded++;
    }
    // 35% roll over 30 independent streams — deterministically >0 unless
    // the eval is structurally unreachable (the bug being fixed).
    expect(founded).toBeGreaterThan(0);
  });

  it("below-bar veteran (10 makuuchi basho, no peak) still produces nothing at saturation", () => {
    const retiree = mockRikishi("short-timer", {
      heyaId: "h1",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 430,
      nationality: "Japan",
      careerHistory: makuuchiCareer(10) as never,
      economics: { retirementFund: 250_000_000 } as never,
    });
    const world = worldFor(retiree);
    const builder = createImpactBuilder("test");
    const before = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.oyakata?.size ?? 0).toBe(before);
    expect(next.heyas.size).toBe(1);
  });

  it("insolvent parent still blocks founding (career bar met, eval fails)", () => {
    const retiree = eligibleVeteran("vet-poor");
    const heya = makeMockHeya("h1", { rikishiIds: [retiree.id], funds: -20_000_000 });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([[retiree.id, retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: saturatedMarket(),
    });
    const builder = createImpactBuilder("test");
    const before = world.oyakata?.size ?? 0;

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(next.heyas.size).toBe(1);
    expect(next.oyakata?.size ?? 0).toBe(before);
  });

  it("myoseki count never exceeds the 105 cap under the new path", () => {
    const retiree = eligibleVeteran("vet-cap");
    const world = worldFor(retiree);
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    expect(Object.keys(next.myosekiMarket?.stocks ?? {}).length).toBeLessThanOrEqual(
      MYOSEKI_TOTAL_COUNT
    );
  });

  it("with a free share, an eligible veteran still takes toshiyori (stock path wins over provisional)", () => {
    const retiree = eligibleVeteran("vet-stock");
    const world = worldFor(retiree);
    world.myosekiMarket = {
      stocks: {
        "MY-free": {
          id: "MY-free",
          name: "FreeShare",
          prestigeTier: "modest",
          ownerId: "JSA",
          holderId: "JSA",
          status: "available",
        },
      },
      history: [],
    } as never;
    const builder = createImpactBuilder("test");

    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);

    const oyakata = Array.from(next.oyakata?.values() ?? []).find((o) => o.heyaId === "h1");
    expect(oyakata?.elderStatus).toBe("toshiyori");
    expect(oyakata?.elderExpiryYear).toBeUndefined();
  });
});
