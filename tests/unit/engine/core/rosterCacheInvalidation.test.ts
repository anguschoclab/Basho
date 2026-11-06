/**
 * V17-D04 — roster query memoization must be invalidated whenever a
 * roster-affecting impact resolves. The WeakMap cache is keyed by world
 * object + week, so a world that remains referenced after an impact pass
 * (or is mutated in place by a non-canonical caller) must not serve a
 * roster computed before the roster change.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getHeyaRoster, clearQueryCaches } from "@/engine/core/queries";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function worldWithRoster(): { world: WorldState; heya: { id: string; rikishiIds: string[] } } {
  const heya = { id: "h1", rikishiIds: ["r1"] };
  const world = {
    heyas: new Map([["h1", heya]]),
    rikishi: new Map<string, Rikishi>([
      ["r1", { id: "r1", heyaId: "h1" } as unknown as Rikishi],
      ["r2", { id: "r2", heyaId: "h1" } as unknown as Rikishi],
    ]),
    year: 2020,
    week: 5,
  } as unknown as WorldState;
  return { world, heya };
}

describe("roster cache invalidation on impact resolution (V17-D04)", () => {
  beforeEach(() => clearQueryCaches());

  it("heyaUpdates touching rikishiIds invalidate the roster cache", () => {
    const { world, heya } = worldWithRoster();
    // Warm the cache on this exact world object.
    expect(getHeyaRoster(world, "h1")).toHaveLength(1);

    // A roster impact resolves on a NEW world (normal flow).
    const impact = createImpactBuilder("test")
      .updateHeya("h1", { rikishiIds: ["r1", "r2"] })
      .build();
    resolveImpacts(world, [impact]);

    // In-place mutation on the still-referenced old world (non-canonical
    // caller — e.g. a service that pokes the shared map). Without the
    // invalidation guard, the stale cache on `world` serves the old roster.
    heya.rikishiIds = ["r1", "r2"];
    expect(getHeyaRoster(world, "h1").map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("non-roster impacts do not invalidate the cache", () => {
    const { world } = worldWithRoster();
    expect(getHeyaRoster(world, "h1")).toHaveLength(1);
    const impact = createImpactBuilder("test").updateHeya("h1", { funds: 1 }).build();
    resolveImpacts(world, [impact]);
    // Cache untouched — same stale-free result without a recompute.
    expect(getHeyaRoster(world, "h1")).toHaveLength(1);
  });
});
