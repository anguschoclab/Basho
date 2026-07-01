import { describe, it, expect } from "vitest";
import { makeMockWorld } from "../utils";
import { processYearlyEraDrift } from "@/engine/systems/meta/EraDriftService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { KIMARITE_REGISTRY } from "@/engine/kimarite";

describe("EraDriftService tactical-family grouping", () => {
  it("correctly groups kimarite stats by tactical family and shifts tone", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 100, yorikiri: 80, hatakikomi: 40 },
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);

    expect(after.meta?.tone).toBe("explosive");
    expect(after.meta?.drift).toBeDefined();
    for (const k of KIMARITE_REGISTRY) {
      expect(after.meta?.drift[k.id]).toBeDefined();
    }
  });

  it("skips unknown kimarite IDs in stats without crashing", () => {
    const world = makeMockWorld({
      globalKimariteStats: { fake_move: 999, oshidashi: 100 },
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);

    expect(after.meta?.tone).toBe("explosive");
    expect(after.meta?.drift).toBeDefined();
  });

  it("produces higher drift for dominant family vs non-dominant", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 200, yorikiri: 10, hatakikomi: 5 },
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);

    const drift = after.meta?.drift ?? {};
    const pushDrift = drift["oshidashi"] ?? 0;
    const beltDrift = drift["yorikiri"] ?? 0;
    expect(pushDrift).toBeGreaterThan(beltDrift);
  });

  it("returns early when total moves below threshold", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 1 },
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);

    expect(after.meta?.tone).toBe("classic");
  });
});
