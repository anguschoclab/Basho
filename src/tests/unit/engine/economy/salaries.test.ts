import { describe, it, expect, beforeEach } from "vitest";
import { processHeyaEconomics } from "@/engine/tick/phases/monthly/economics/salaries";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder, ImpactBuilder } from "@/engine/core/ImpactBuilder";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("processHeyaEconomics", () => {
  let world: WorldState;
  let builder: ImpactBuilder;

  beforeEach(() => {
    world = MockFactory.createWorld();
    builder = createImpactBuilder("test");
  });

  it("should process sekitori and non-sekitori salaries and overhead correctly", () => {
    const heya = MockFactory.createHeya("heya-1", {
      funds: 10000000,
      rikishiIds: ["r-sekitori", "r-non-sekitori"]
    });

    // Rank "yokozuna" from RANK_HIERARCHY
    const sekitori = MockFactory.createRikishi("r-sekitori", {
        rank: "yokozuna",
        economics: {
            cash: 1000,
            retirementFund: 0,
            careerKenshoWon: 0,
            kinboshiCount: 0,
            totalEarnings: 1000,
            currentBashoEarnings: 0,
            popularity: 50,
        }
    });

    const nonSekitori = MockFactory.createRikishi("r-non-sekitori", {
        rank: "makushita"
    });

    world.rikishi.set("r-sekitori", sekitori);
    world.rikishi.set("r-non-sekitori", nonSekitori);

    const rikishiMap = world.rikishi;
    const heyaUpdates: any = { funds: heya.funds };

    const totalBurn = processHeyaEconomics(world, heya, rikishiMap, heyaUpdates, builder);

    // We expect the impact builder's rikishiUpdates to have been modified
    const impact = builder.build() as any;

    expect(impact.entities?.rikishiUpdates).toBeDefined();
    expect(impact.entities.rikishiUpdates.has("r-sekitori")).toBe(true);

    const rUpdate = impact.entities.rikishiUpdates.get("r-sekitori");
    expect(rUpdate?.economics?.cash).toBeGreaterThan(1000);
    expect(rUpdate?.economics?.totalEarnings).toBeGreaterThan(1000);

    expect(heyaUpdates.funds).toBeLessThan(10000000);
    expect(totalBurn).toBeGreaterThan(0);
  });
});
