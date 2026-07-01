 
import { describe, it, expect } from "vitest";
import { runGovernanceReview } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../../utils";
import { HEYA_FLOOR } from "@/constants/engine/economic";

describe("heya floor — prevent runaway collapse", () => {
  it("blocks mergers when heya count is at or below HEYA_FLOOR", () => {
    const world = makeMockWorld();

    // Create exactly HEYA_FLOOR heyas, each with 3+ rikishi to avoid low-roster merger.
    // One of them is deeply in debt to trigger financial merger.
    for (let i = 0; i < HEYA_FLOOR; i++) {
      const isDebt = i === 0;
      const heya = makeMockHeya(`heya-${i}`, {
        funds: isDebt ? -20_000_000 : 10_000_000,
        runwayBand: isDebt ? "desperate" : "secure",
        rikishiIds: [`r${i}-1`, `r${i}-2`, `r${i}-3`],
      });
      world.heyas.set(`heya-${i}`, heya);
      world.rikishi.set(`r${i}-1`, mockRikishi(`r${i}-1`, { heyaId: `heya-${i}` }));
      world.rikishi.set(`r${i}-2`, mockRikishi(`r${i}-2`, { heyaId: `heya-${i}` }));
      world.rikishi.set(`r${i}-3`, mockRikishi(`r${i}-3`, { heyaId: `heya-${i}` }));
    }

    // Player is one of the heyas (not the debt one)
    world.playerHeyaId = "heya-1";

    const initialHeyaCount = world.heyas.size;
    expect(initialHeyaCount).toBe(HEYA_FLOOR);

    const impact = runGovernanceReview(world);
    const newWorld = resolveImpacts(world, [impact]);

    // No heya should be removed despite debt because we're at the floor
    expect(newWorld.heyas.size).toBe(initialHeyaCount);
    expect(newWorld.heyas.has("heya-0")).toBe(true);
  });

  it("allows mergers when heya count is above HEYA_FLOOR", () => {
    const world = makeMockWorld();

    // Create HEYA_FLOOR + 2 heyas
    for (let i = 0; i < HEYA_FLOOR + 2; i++) {
      const isDebt = i === 0;
      const heya = makeMockHeya(`heya-${i}`, {
        funds: isDebt ? -20_000_000 : 10_000_000,
        runwayBand: isDebt ? "desperate" : "secure",
        rikishiIds: [`r${i}-1`, `r${i}-2`, `r${i}-3`],
      });
      world.heyas.set(`heya-${i}`, heya);
      world.rikishi.set(`r${i}-1`, mockRikishi(`r${i}-1`, { heyaId: `heya-${i}` }));
      world.rikishi.set(`r${i}-2`, mockRikishi(`r${i}-2`, { heyaId: `heya-${i}` }));
      world.rikishi.set(`r${i}-3`, mockRikishi(`r${i}-3`, { heyaId: `heya-${i}` }));
    }

    world.playerHeyaId = "heya-1";

    const initialHeyaCount = world.heyas.size;
    expect(initialHeyaCount).toBe(HEYA_FLOOR + 2);

    const impact = runGovernanceReview(world);
    const newWorld = resolveImpacts(world, [impact]);

    // The debt heya should be merged away
    expect(newWorld.heyas.size).toBe(initialHeyaCount - 1);
    expect(newWorld.heyas.has("heya-0")).toBe(false);
  });
});
