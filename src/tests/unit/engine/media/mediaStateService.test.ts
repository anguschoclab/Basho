import { describe, it, expect } from "vitest";
import {
  processWeeklyMediaBoundary,
  snapshotMediaHeatForBasho,
  createDefaultMediaState,
} from "@/engine/systems/media/MediaStateService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld } from "../utils";
import type { MediaState } from "@/engine/types/media";
import type { WorldState } from "@/engine/types/world";

function makeMockMediaState(overrides: Partial<MediaState> = {}): MediaState {
  return {
    ...createDefaultMediaState(),
    ...overrides,
  };
}

describe("processWeeklyMediaBoundary", () => {
  it("decays all heat values and removes zeroed entries", () => {
    const mediaState = makeMockMediaState({
      mediaHeat: { r1: 80, r2: 5, r3: 50 },
      heyaPressure: { h1: 10 },
    });
    const world = makeMockWorld({ mediaState } as Partial<WorldState>);

    const impact = processWeeklyMediaBoundary(world);
    const updated = resolveImpacts(world, [impact]);

    // 80 >= 70 (HIGH) → decay 4 → 76
    expect(updated.mediaState!.mediaHeat["r1"]).toBe(76);
    // 5 < 40 (LOW) → decay 2 → 3
    expect(updated.mediaState!.mediaHeat["r2"]).toBe(3);
    // 50 >= 40 (MEDIUM) → decay 3 → 47
    expect(updated.mediaState!.mediaHeat["r3"]).toBe(47);
  });

  it("decays all pressure values and removes zeroed entries", () => {
    const mediaState = makeMockMediaState({
      mediaHeat: {},
      heyaPressure: { h1: 10, h2: 2, h3: 50 },
    });
    const world = makeMockWorld({ mediaState } as Partial<WorldState>);

    const impact = processWeeklyMediaBoundary(world);
    const updated = resolveImpacts(world, [impact]);

    // All decay by 3 (PRESSURE_DECAY_RATE)
    expect(updated.mediaState!.heyaPressure["h1"]).toBe(7);
    // 2 - 3 = -1 → clamped to 0 → removed
    expect(updated.mediaState!.heyaPressure["h2"]).toBeUndefined();
    expect(updated.mediaState!.heyaPressure["h3"]).toBe(47);
  });

  it("returns empty impact when mediaState is missing", () => {
    const world = makeMockWorld();
    world.mediaState = undefined as unknown as MediaState;

    const impact = processWeeklyMediaBoundary(world);
    expect(impact.worldFields).toBeUndefined();
  });

  it("preserves non-zero values after decay", () => {
    const mediaState = makeMockMediaState({
      mediaHeat: { r1: 100, r2: 70, r3: 40, r4: 39 },
      heyaPressure: {},
    });
    const world = makeMockWorld({ mediaState } as Partial<WorldState>);

    const impact = processWeeklyMediaBoundary(world);
    const updated = resolveImpacts(world, [impact]);

    // All should survive (100→96, 70→66, 40→37, 39→37)
    expect(updated.mediaState!.mediaHeat["r1"]).toBe(96);
    expect(updated.mediaState!.mediaHeat["r2"]).toBe(66);
    expect(updated.mediaState!.mediaHeat["r3"]).toBe(37);
    expect(updated.mediaState!.mediaHeat["r4"]).toBe(37);
  });
});

describe("snapshotMediaHeatForBasho", () => {
  it("creates history entry for new basho", () => {
    const state = makeMockMediaState({
      mediaHeat: { r1: 50, r2: 30 },
      mediaHeatHistory: {},
    });

    const result = snapshotMediaHeatForBasho(state, "hatsu");

    expect(result.mediaHeatHistory["r1"]).toHaveLength(1);
    expect(result.mediaHeatHistory["r1"][0]).toEqual({ basho: "hatsu", heat: 50 });
    expect(result.mediaHeatHistory["r2"]).toHaveLength(1);
    expect(result.mediaHeatHistory["r2"][0]).toEqual({ basho: "hatsu", heat: 30 });
  });

  it("updates existing entry for same basho", () => {
    const state = makeMockMediaState({
      mediaHeat: { r1: 60 },
      mediaHeatHistory: {
        r1: [{ basho: "hatsu", heat: 40 }],
      },
    });

    const result = snapshotMediaHeatForBasho(state, "hatsu");

    expect(result.mediaHeatHistory["r1"]).toHaveLength(1);
    expect(result.mediaHeatHistory["r1"][0]).toEqual({ basho: "hatsu", heat: 60 });
  });

  it("keeps only last 10 snapshots", () => {
    const existingHistory = Array.from({ length: 12 }, (_, i) => ({
      basho: `basho${i}`,
      heat: i * 10,
    }));
    const state = makeMockMediaState({
      mediaHeat: { r1: 99 },
      mediaHeatHistory: {
        r1: existingHistory,
      },
    });

    const result = snapshotMediaHeatForBasho(state, "new_basho");

    expect(result.mediaHeatHistory["r1"]).toHaveLength(10);
    // 12 + 1 = 13, slice(-10) trims first 3, so first kept is basho3
    expect(result.mediaHeatHistory["r1"][9]).toEqual({ basho: "new_basho", heat: 99 });
    expect(result.mediaHeatHistory["r1"][0]).toEqual({ basho: "basho3", heat: 30 });
  });
});
