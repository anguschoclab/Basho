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

      // --- Assert: oyakata conversion OR stable founding happened ---
      // Oyakata conversion is the deterministic precondition; founding is RNG-gated (35%).
      const founded = next.heyas.size > before.heyaCount;
      const oyakataConverted = (next.oyakata?.size ?? 0) > before.oyakataCount;

      expect(
        founded || oyakataConverted,
        `Expected either a new heya (was ${before.heyaCount}, now ${next.heyas.size}) ` +
          `or a new oyakata (was ${before.oyakataCount}, now ${next.oyakata?.size ?? 0})`
      ).toBe(true);
    }
  );
});
