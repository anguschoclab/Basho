/**
 * retirementPerks.test.ts — JSA elder-status + retirement-payment rules.
 *
 * - Myoseki pool is fixed at 105; merit minting may NOT exceed it.
 * - When stock is exhausted, credential-tier retirees (sanyaku+) still get
 *   elder life via jun-toshiyori (temporary) or ichidai-toshiyori (great
 *   yokozuna, one-generation, non-transferable); others cannot convert.
 * - Intai-kin: a lump-sum retirement payment keyed by rank at retirement.
 */
import { describe, it, expect } from "vitest";
import { processRetireeOyakataConversion } from "@/engine/lifecycle/retireeOyakataConversion";
import { retireRikishiFully } from "@/engine/lifecycle/processRetirements";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { MYOSEKI_TOTAL_COUNT } from "@/constants/engine/economic";
import {
  INTAI_KIN_YOKOZUNA,
  INTAI_KIN_LOWER,
} from "@/constants/engine/economic";

const exhaustedMarket = () => ({
  stocks: Object.fromEntries(
    Array.from({ length: MYOSEKI_TOTAL_COUNT }, (_, i) => [
      `my-${i}`,
      {
        id: `my-${i}`,
        name: `Stock ${i}`,
        prestigeTier: "modest" as const,
        ownerId: `o-${i}`,
        holderId: `o-${i}`,
        status: "held" as const,
      },
    ])
  ),
  history: [],
});

describe("myoseki 105-cap", () => {
  it("no merit mint beyond 105 — a non-credential retiree cannot convert when stock is exhausted", () => {
    const retiree = mockRikishi("vet", {
      heyaId: "h1",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      nationality: "Japan",
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["vet"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["vet", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: exhaustedMarket() as never,
    });
    const builder = createImpactBuilder("test");
    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);
    // No mint: stock count stays 105, and no oyakata is created.
    expect(Object.keys(next.myosekiMarket!.stocks)).toHaveLength(MYOSEKI_TOTAL_COUNT);
    expect([...(next.oyakata?.values() ?? [])]).toHaveLength(0);
  });
});

describe("jun-toshiyori / ichidai-toshiyori (stock exhausted)", () => {
  it("an ozeki retiree gets jun-toshiyori elder status without stock", () => {
    const retiree = mockRikishi("oz", {
      heyaId: "h1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 500,
      nationality: "Japan",
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["oz"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["oz", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: exhaustedMarket() as never,
    });
    const builder = createImpactBuilder("test");
    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);
    const oyakata = [...(next.oyakata?.values() ?? [])];
    expect(oyakata).toHaveLength(1);
    expect(oyakata[0].elderStatus).toBe("jun_toshiyori");
    expect(Object.keys(next.myosekiMarket!.stocks)).toHaveLength(MYOSEKI_TOTAL_COUNT);
  });

  it("a great yokozuna (20+ yusho) gets ichidai-toshiyori status", () => {
    const careerHistory = Array.from({ length: 22 }, () => ({ isYusho: true }));
    const retiree = mockRikishi("yz", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 900,
      nationality: "Japan",
      careerHistory: careerHistory as never,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["yz"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["yz", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: exhaustedMarket() as never,
    });
    const builder = createImpactBuilder("test");
    processRetireeOyakataConversion(world, retiree, builder);
    const next = resolveImpacts(world, [builder.build()]);
    const oyakata = [...(next.oyakata?.values() ?? [])];
    expect(oyakata).toHaveLength(1);
    expect(oyakata[0].elderStatus).toBe("ichidai_toshiyori");
  });
});

describe("intai-kin retirement payment", () => {
  it("a retiring yokozuna receives the top intai-kin payment", () => {
    const retiree = mockRikishi("yz2", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1990,
      careerWins: 100,
      economics: { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 } as never,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["yz2"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["yz2", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as never,
    });
    const builder = createImpactBuilder("test");
    retireRikishiFully(world, retiree, "Age", builder);
    const next = resolveImpacts(world, [builder.build()]);
    const retired = next.historicalRikishi?.get("yz2") ?? next.rikishi.get("yz2");
    expect(retired?.economics?.cash).toBe(INTAI_KIN_YOKOZUNA);
  });

  it("a lower-division retiree receives the smallest intai-kin payment", () => {
    const retiree = mockRikishi("ld", {
      heyaId: "h1",
      rank: "jonidan",
      division: "jonidan",
      birthYear: 1990,
      careerWins: 30,
      economics: { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 } as never,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["ld"] });
    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([["ld", retiree]]),
      heyas: new Map([["h1", heya]]),
      myosekiMarket: { stocks: {}, history: [] } as never,
    });
    const builder = createImpactBuilder("test");
    retireRikishiFully(world, retiree, "Age", builder);
    const next = resolveImpacts(world, [builder.build()]);
    const retired = next.historicalRikishi?.get("ld") ?? next.rikishi.get("ld");
    expect(retired?.economics?.cash).toBe(INTAI_KIN_LOWER);
  });
});
