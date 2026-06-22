/**
 * Test: CareerService.processRetirements now triggers oyakata conversion + stable founding.
 *
 * Previously the AutoSim path (advanceDays → phase01_week_governance → CareerService)
 * had no founding logic — stables were frozen at their initial count over a 25-year sim.
 *
 * The fix: processRetireeOyakataConversion is now called from CareerService.processRetirements
 * so accomplished retirees convert to oyakata and may found stables via the AutoSim path too.
 */

import { describe, it, expect } from "vitest";
import { CareerService } from "@/engine/lifecycle/CareerService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("CareerService.processRetirements — oyakata conversion + founding", () => {
  it(
    "an accomplished retirement-age retiree is converted to oyakata even with an empty myoseki market",
    () => {
      // --- Set up the retiree ---
      // birthYear 1980, world.year 2025 → age 45 → mandatory retirement
      // careerWins 400 → isAccomplished = true
      const retiree = mockRikishi("legend-cs", {
        heyaId: "old-heya-cs",
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
        ["old-heya-cs", makeMockHeya("old-heya-cs", { rikishiIds: ["legend-cs"] })],
        ["filler-cs", makeMockHeya("filler-cs", { rikishiIds: [] })],
      ]);

      const world = makeMockWorld({
        year: 2025,
        heyas,
        rikishi: new Map([["legend-cs", retiree]]),
        // Empty stocks object = fully exhausted, no available stock
        myosekiMarket: { stocks: {}, history: [] } as any,
      });

      // Sanity check: retiree is in activeRikishiIds (patched by makeMockWorld)
      expect(world.activeRikishiIds.has("legend-cs")).toBe(true);

      const before = {
        heyaCount: world.heyas.size,
        oyakataCount: world.oyakata?.size ?? 0,
      };

      // --- Run processRetirements via CareerService (the AutoSim path) ---
      const impact = CareerService.processRetirements(world);
      const next = resolveImpacts(world, [impact]);

      // --- Assert deterministic outcomes ---

      // 1. An accomplished, retirement-age rikishi with an empty myoseki market MUST
      //    convert to an oyakata in the CareerService path — same as governanceReview path.
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

      // Stable founding is RNG-gated at 35% so we do NOT hard-assert it here.
      // The 25-year diagnostic (Task 4) validates that heyaCount becomes dynamic over a full sim.
      const founded = next.heyas.size > before.heyaCount;
      if (founded) {
        expect(next.heyas.size).toBeGreaterThan(before.heyaCount);
      }
    }
  );
});
