import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { makeMockWorld } from "../utils";

/**
 * P4.14: ImpactResolver performance tests.
 * Verifies that batched impact resolution produces the same result
 * as sequential resolution.
 */

describe("P2.7: ImpactResolver batched resolution", () => {
  it("resolving 10 impacts in one resolveImpacts call equals sequential resolution", () => {
    const world1 = makeMockWorld({ dayIndexGlobal: 0 });
    const world2 = makeMockWorld({ dayIndexGlobal: 0 });

    // Create 10 impacts that update dayIndexGlobal
    const impacts = Array.from({ length: 10 }, (_, i) =>
      createImpactBuilder(`test-${i}`)
        .updateWorldField("dayIndexGlobal", i + 1)
        .build()
    );

    // Batch resolution
    const batchResult = resolveImpacts(world1, impacts);

    // Sequential resolution
    let sequentialResult = world2;
    for (const impact of impacts) {
      sequentialResult = resolveImpacts(sequentialResult, [impact]);
    }

    // Both should produce the same final dayIndexGlobal
    expect(batchResult.dayIndexGlobal).toBe(sequentialResult.dayIndexGlobal);
  });

  it("resolveImpacts with empty array returns world unchanged", () => {
    const world = makeMockWorld({ dayIndexGlobal: 42 });
    const result = resolveImpacts(world, []);
    expect(result.dayIndexGlobal).toBe(42);
  });

  it("resolveImpacts preserves world entity maps", () => {
    const world = makeMockWorld();
    const impact = createImpactBuilder("test")
      .updateWorldField("dayIndexGlobal", 99)
      .build();

    const result = resolveImpacts(world, [impact]);

    expect(result.heyas).toBeDefined();
    expect(result.rikishi).toBeDefined();
    expect(result.dayIndexGlobal).toBe(99);
  });
});
