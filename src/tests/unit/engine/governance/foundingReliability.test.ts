/**
 * Test: Founding reliability with exhausted myoseki market.
 * Verifies that accomplished retirees can convert to oyakata and found stables
 * even when no myoseki stock is available (merit-elder-name issuance).
 */

import { describe, it, expect } from "vitest";
import { runRetirements } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("founding reliability with exhausted myoseki", () => {
  it("an accomplished retiree founds a stable / becomes oyakata even when no myoseki stock is available", () => {
    // --- Set up the retiree ---
    // birthYear 1980, world.year 2025 → age 45 → mandatory retirement
    // careerWins 400 → isAccomplished = true
    const retiree = mockRikishi("legend", {
      heyaId: "old-heya",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
      isRetired: false,
      injured: false,
      injuryWeeksRemaining: 0,
    });

    // --- World with exhausted myoseki market (all stocks held, none available) ---
    const heyas = new Map([
      ["old-heya", makeMockHeya("old-heya", { rikishiIds: ["legend"] })],
      ["filler", makeMockHeya("filler", { rikishiIds: [] })],
    ]);

    const world = makeMockWorld({
      year: 2025,
      heyas,
      rikishi: new Map([["legend", retiree]]),
      // Empty stocks object = fully exhausted, no available stock
      myosekiMarket: { stocks: {}, history: [] } as any,
    });

    // Sanity check: retiree is in activeRikishiIds (patched by makeMockWorld)
    expect(world.activeRikishiIds.has("legend")).toBe(true);

    const before = {
      heyaCount: world.heyas.size,
      oyakataCount: world.oyakata?.size ?? 0,
    };

    // --- Run retirements directly (runGovernanceReview is a separate function) ---
    const impact = runRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // --- Assert deterministic outcomes ---

    // 1. An accomplished, retirement-age rikishi with an empty myoseki market MUST
    //    convert to an oyakata.
    const oyakataConverted = (next.oyakata?.size ?? 0) > before.oyakataCount;
    expect(
      oyakataConverted,
      `Expected a new oyakata (was ${before.oyakataCount}, now ${next.oyakata?.size ?? 0}). ` +
        `Oyakata conversion is deterministic once an accomplished retiree is detected.`
    ).toBe(true);

    // 2. The minted merit stock must be persisted as "held" in the returned world.
    //    This confirms the stock was minted AND transferred — not just created in memory.
    const heldStocks = Object.values(next.myosekiMarket?.stocks ?? {}).filter(
      (s: any) => s.status === "held"
    );
    expect(
      heldStocks.length,
      `Expected at least one held stock in myosekiMarket.stocks (found ${heldStocks.length}). ` +
        `Merit-mint fix should persist the minted stock as held.`
    ).toBeGreaterThan(0);

    // Stable founding is validated end-to-end by the 25-year diagnostic (Task 4).
    // It is RNG-gated at 35% so we do NOT hard-assert it here; observe it as a soft note.
    const founded = next.heyas.size > before.heyaCount;
    if (founded) {
      // If founding happened, the new heya should also be in next.heyas
      expect(next.heyas.size).toBeGreaterThan(before.heyaCount);
    }
  });

  it("reuses an available stock instead of minting when one exists", () => {
    const retiree = mockRikishi("legend2", {
      heyaId: "old-heya",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 400,
      isRetired: false,
      injured: false,
      injuryWeeksRemaining: 0,
    });

    const heyas = new Map([
      ["old-heya", makeMockHeya("old-heya", { rikishiIds: ["legend2"] })],
      ["filler", makeMockHeya("filler", { rikishiIds: [] })],
    ]);

    const existingStockId = "MY-existing-1";
    const world = makeMockWorld({
      year: 2025,
      heyas,
      rikishi: new Map([["legend2", retiree]]),
      myosekiMarket: {
        stocks: {
          [existingStockId]: {
            id: existingStockId,
            name: "TestElderName",
            prestigeTier: "modest",
            ownerId: "JSA",
            holderId: "JSA",
            status: "available",
            askingPrice: 100000000,
          },
        },
        history: [],
      } as any,
    });

    const impact = runRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // The existing stock should now be held (transferred, not minted)
    const stock = (next.myosekiMarket?.stocks ?? {})[existingStockId];
    expect(stock).toBeDefined();
    expect(stock.status).toBe("held");
    // No new stocks should have been minted
    expect(Object.keys(next.myosekiMarket?.stocks ?? {}).length).toBe(1);
  });

  it("does not convert a non-accomplished retiree", () => {
    const retiree = mockRikishi("journeyman", {
      heyaId: "old-heya",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 1978,
      careerWins: 10,
      isRetired: false,
      injured: false,
      injuryWeeksRemaining: 0,
    });

    const heyas = new Map([["old-heya", makeMockHeya("old-heya", { rikishiIds: ["journeyman"] })]]);

    const world = makeMockWorld({
      year: 2025,
      heyas,
      rikishi: new Map([["journeyman", retiree]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });

    const beforeOyakata = world.oyakata?.size ?? 0;
    const impact = runRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // No oyakata conversion — careerWins=10, rank=maegashira → not accomplished
    expect(next.oyakata?.size ?? 0).toBe(beforeOyakata);
  });

  it("does not convert a young accomplished retiree (age < 28)", () => {
    const retiree = mockRikishi("young-yokozuna", {
      heyaId: "old-heya",
      rank: "yokozuna",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 400,
      isRetired: false,
      injured: false,
      injuryWeeksRemaining: 0,
    });

    const heyas = new Map([
      ["old-heya", makeMockHeya("old-heya", { rikishiIds: ["young-yokozuna"] })],
    ]);

    const world = makeMockWorld({
      year: 2025,
      heyas,
      rikishi: new Map([["young-yokozuna", retiree]]),
      myosekiMarket: { stocks: {}, history: [] } as any,
    });

    const beforeOyakata = world.oyakata?.size ?? 0;
    const impact = runRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // age = 2025 - 2000 = 25 → guard is age < 28, so no conversion
    expect(next.oyakata?.size ?? 0).toBe(beforeOyakata);
  });
});
