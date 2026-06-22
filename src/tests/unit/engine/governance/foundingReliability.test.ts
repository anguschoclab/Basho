/**
 * Test: Founding reliability with exhausted myoseki market
 *
 * The bug: Object.values(world.myosekiMarket.stocks).find(s => s.status === "available")
 * returns undefined when the fixed pool is fully held, so the whole `if (availableStock)`
 * block is skipped — no oyakata conversion, no founding, ever, over a 25-year sim.
 *
 * The fix: mint a fresh merit stock when none is available, so an accomplished retiree
 * always gets an elder name (models JSA merit-elder-name issuance).
 */

import { describe, it, expect } from "vitest";
import { runRetirements } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("founding reliability with exhausted myoseki", () => {
  it(
    "an accomplished retiree founds a stable / becomes oyakata even when no myoseki stock is available",
    () => {
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
      //    convert to an oyakata — this is the precondition the merit-mint fix unblocks.
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
    }
  );
});
