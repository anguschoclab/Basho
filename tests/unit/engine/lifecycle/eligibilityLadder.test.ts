/**
 * Spec (RED) — three-tier elder eligibility ladder.
 *
 * Real JSA bars:
 *   standard coach  → 1 sanyaku OR 20 makuuchi OR 30 sekitori basho
 *   inherit a heya  → 12 makuuchi OR 20 sekitori basho (LOWER than coach)
 *   branch/found    → Y/O peak OR 25 sanyaku OR 60 makuuchi basho (HIGHER)
 * Plus: jun-toshiyori grace is Yokozuna(5yr)/Ōzeki(3yr) ONLY post-2006 —
 * K/S get nothing; ichidai-toshiyori was abolished.
 *
 * Current code: flat `isAccomplished` for everything (Y/O/S or 200 wins),
 * `findEligibleSuccessors` gates on bare isSekitori (inverted — too loose
 * for juniors, `makuuchiWins>0` too strict for juryo-lifer alumni), and
 * `evaluateFoundingEligibility` has NO career gate — a career-sekiwake
 * can found a stable today.
 */
import { describe, it, expect } from "vitest";
import { evaluateFoundingEligibility } from "@/engine/lifecycle/retireeOyakataConversion";
import { processRetireeOyakataConversion } from "@/engine/lifecycle/retireeOyakataConversion";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { MyosekiStock } from "@/engine/types/myoseki";

function foundingWorld(retiree: Rikishi): WorldState {
  const world = MockFactory.createWorld({ year: 2026 });
  world.heyas.set(
    "heya-p",
    MockFactory.createHeya("heya-p", { funds: 500_000_000, rikishiIds: [retiree.id] })
  );
  world.rikishi.set(retiree.id, retiree);
  return world;
}

describe("branch-out gate (highest tier)", () => {
  it("a career-sekiwake without elite credentials cannot found a stable", () => {
    const retiree = MockFactory.createRikishi({
      id: "ret1",
      heyaId: "heya-p",
      rank: "sekiwake",
      birthYear: 1990,
      isRetired: true,
      economics: { cash: 0, retirementFund: 500_000_000 },
    } as Partial<Rikishi>);
    const world = foundingWorld(retiree);
    const eligibility = evaluateFoundingEligibility(world, retiree);
    // Real rule: founding needs Y/O peak, 25 sanyaku basho, or 60 makuuchi
    // basho. A flat "accomplished" check is not enough.
    expect(eligibility.canFound).toBe(false);
  });
});

describe("jun-toshiyori grace — post-2006 Ōzeki-only", () => {
  function exhaustedMarket(): { stocks: Record<string, MyosekiStock>; history: never[] } {
    const stocks: Record<string, MyosekiStock> = {};
    for (let i = 0; i < 105; i++) {
      stocks[`s${i}`] = {
        id: `s${i}`,
        name: `Stock ${i}`,
        prestigeTier: "modest",
        ownerId: `owner-${i}`,
        holderId: `owner-${i}`,
        status: "held",
      } as MyosekiStock;
    }
    return { stocks, history: [] };
  }

  it("a sekiwake retiree with exhausted stock gets NO jun-toshiyori — he simply retires", () => {
    const retiree = MockFactory.createRikishi({
      id: "seki",
      heyaId: "heya-p",
      rank: "sekiwake",
      birthYear: 1990,
      isRetired: true,
      careerHistory: [],
    });
    const world = foundingWorld(retiree);
    world.myosekiMarket = exhaustedMarket();
    const builder = createImpactBuilder("test");
    processRetireeOyakataConversion(world, retiree, builder);
    const impact = builder.build();
    // Post-2006 rule: jun-toshiyori is Yokozuna/Ōzeki only. A sekiwake with
    // no stock simply leaves — no temporary elder status.
    expect(impact.collections?.oyakataToAdd ?? []).toHaveLength(0);
  });
});
