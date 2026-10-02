import { describe, it, expect } from "vitest";
import { makeMockWorld } from "../../utils";
import { processYearlyEraDrift } from "@/engine/systems/meta/EraDriftService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

describe("EraDriftService kimarite reset", () => {
  it("wipes globalKimariteStats at the year boundary (root cause of empty topKimarite)", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 500, yorikiri: 300 },
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);
    expect(after.globalKimariteStats).toEqual({});
  });

  it("preserves allTimeKimariteStats across the year boundary", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 500, yorikiri: 300 },
      allTimeKimariteStats: { oshidashi: 4000, yorikiri: 2400, tsutaezori: 2 },
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);
    expect(after.globalKimariteStats).toEqual({});
    expect(after.allTimeKimariteStats).toEqual({ oshidashi: 4000, yorikiri: 2400, tsutaezori: 2 });
  });
});
