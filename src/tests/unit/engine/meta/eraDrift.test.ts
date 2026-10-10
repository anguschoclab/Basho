import { describe, it, expect } from "vitest";
import { makeMockWorld } from "../utils";
import { processYearlyEraDrift } from "@/engine/systems/meta/EraDriftService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { KIMARITE_REGISTRY } from "@/engine/kimarite";
import { buildMediaDigest } from "@/engine/systems/media/MediaPreBashoService";

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

  it("WS7 — writes a gazette headline when the era tone changes", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 100, yorikiri: 80, hatakikomi: 40 },
      // meta.tone starts undefined → resolved tone "explosive" is a change.
      mediaState: {
        heyaPressure: {},
        mediaHeat: {},
        headlines: [],
        pressConferenceActive: false,
      } as never,
    });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);

    const metaHeadline = (after.mediaState?.headlines ?? []).find((h) => h.tags?.includes("meta"));
    expect(metaHeadline).toBeDefined();
    expect(metaHeadline!.title.length).toBeGreaterThan(0);

    // The headline must flow into the weekly gazette digest.
    const digest = buildMediaDigest(after);
    expect(digest.weeklyGazette).toContain(metaHeadline!.title);
  });
});
