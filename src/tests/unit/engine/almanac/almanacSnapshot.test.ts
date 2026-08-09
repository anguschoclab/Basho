import { describe, it, expect, beforeEach } from "vitest";
import { buildAlmanacSnapshot } from "@/engine/almanac/snapshot";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { MovementEvent } from "@/engine/types/banzuke";

describe("buildAlmanacSnapshot (enriched)", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
    const basho = makeMockBasho({ bashoName: "hatsu", year: 2025 });
    world.currentBasho = basho;
  });

  it("returns null when no currentBasho", () => {
    world.currentBasho = undefined;
    expect(buildAlmanacSnapshot(world)).toBeNull();
  });

  it("populates promotions from banzuke update events", () => {
    const r1 = mockRikishi("r1", { shikona: "PromotedRikishi" });
    world.rikishi.set("r1", r1);
    const movements: MovementEvent[] = [
      {
        rikishiId: "r1",
        from: "maegashira",
        to: "komusubi",
        description: "Promoted",
        kind: "promotion",
      },
    ];
    const snapshot = buildAlmanacSnapshot(world, movements);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.promotions.length).toBeGreaterThan(0);
    expect(snapshot!.promotions[0].rikishiId).toBe("r1");
  });

  it("populates demotions from banzuke update events", () => {
    const r2 = mockRikishi("r2", { shikona: "DemotedRikishi" });
    world.rikishi.set("r2", r2);
    const movements: MovementEvent[] = [
      {
        rikishiId: "r2",
        from: "komusubi",
        to: "maegashira",
        description: "Demoted",
        kind: "demotion",
      },
    ];
    const snapshot = buildAlmanacSnapshot(world, movements);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.demotions.length).toBeGreaterThan(0);
    expect(snapshot!.demotions[0].rikishiId).toBe("r2");
  });

  it("populates retirements from retirement events", () => {
    const r3 = mockRikishi("r3", { shikona: "RetiringRikishi", isRetired: true });
    world.rikishi.set("r3", r3);
    const movements: MovementEvent[] = [
      {
        rikishiId: "r3",
        from: "maegashira",
        to: "retired",
        description: "Retired",
        kind: "status",
      },
    ];
    const snapshot = buildAlmanacSnapshot(world, movements);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.retirements.length).toBeGreaterThan(0);
    expect(snapshot!.retirements[0].rikishiId).toBe("r3");
  });

  it("leaves arrays empty when no movements occurred", () => {
    const snapshot = buildAlmanacSnapshot(world);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.promotions).toEqual([]);
    expect(snapshot!.demotions).toEqual([]);
    expect(snapshot!.retirements).toEqual([]);
  });

  it("includes rikishiId and shikona in promotion entries", () => {
    const r1 = mockRikishi("r1", { shikona: "PromotedStar" });
    world.rikishi.set("r1", r1);
    const movements: MovementEvent[] = [
      {
        rikishiId: "r1",
        from: "maegashira",
        to: "sekiwake",
        description: "Promoted",
        kind: "promotion",
      },
    ];
    const snapshot = buildAlmanacSnapshot(world, movements);
    expect(snapshot!.promotions[0].shikona).toBe("PromotedStar");
  });

  it("includes newRank in promotion entries", () => {
    const r1 = mockRikishi("r1", { shikona: "PromotedStar" });
    world.rikishi.set("r1", r1);
    const movements: MovementEvent[] = [
      {
        rikishiId: "r1",
        from: "maegashira",
        to: "sekiwake",
        description: "Promoted",
        kind: "promotion",
      },
    ];
    const snapshot = buildAlmanacSnapshot(world, movements);
    expect(snapshot!.promotions[0].newRank).toBeDefined();
  });
});
