import { describe, it, expect, beforeEach } from "vitest";
import { getHeyaRoster, clearQueryCaches } from "@/engine/queries";
import { EntityCollection } from "@/engine/core/EntityCollection";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function makeWorld(heyas: Map<string, any>, rikishi: Map<string, Rikishi>): WorldState {
  return {
    heyas,
    rikishi,
    year: 2020,
    week: 1,
  } as unknown as WorldState;
}

describe("getHeyaRoster", () => {
  beforeEach(() => clearQueryCaches());

  it("returns rikishi for that heya", () => {
    const heyas = new Map([["h1", { id: "h1", rikishiIds: ["r1", "r2"] }]]);
    const rikishi = new Map([
      ["r1", { id: "r1", heyaId: "h1", isRetired: false } as unknown as Rikishi],
      ["r2", { id: "r2", heyaId: "h1", isRetired: false } as unknown as Rikishi],
    ]);
    const world = makeWorld(heyas, rikishi);
    const roster = getHeyaRoster(world, "h1");
    expect(roster).toHaveLength(2);
    expect(roster.map((r) => r.id)).toContain("r1");
    expect(roster.map((r) => r.id)).toContain("r2");
  });

  it("excludes retired rikishi when using EntityCollection", () => {
    const heyas = new Map([["h1", { id: "h1", rikishiIds: ["r1", "r2"] }]]);
    const rikishi = new Map([
      ["r1", { id: "r1", heyaId: "h1", isRetired: false } as unknown as Rikishi],
      ["r2", { id: "r2", heyaId: "h1", isRetired: true } as unknown as Rikishi],
    ]);
    const world = makeWorld(heyas, rikishi);
    const roster = EntityCollection.getHeyaRoster(world, "h1");
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe("r1");
  });

  it("returns empty array for missing heya", () => {
    const world = makeWorld(new Map(), new Map());
    expect(getHeyaRoster(world, "nonexistent")).toEqual([]);
  });

  it("returns empty array for heya with no rikishi", () => {
    const heyas = new Map([["h1", { id: "h1", rikishiIds: [] }]]);
    const world = makeWorld(heyas, new Map());
    expect(getHeyaRoster(world, "h1")).toEqual([]);
  });

  it("EntityCollection.getHeyaRoster delegates to queries.getHeyaRoster (same result)", () => {
    const heyas = new Map([["h1", { id: "h1", rikishiIds: ["r1", "r2"] }]]);
    const rikishi = new Map([
      ["r1", { id: "r1", heyaId: "h1", isRetired: false } as unknown as Rikishi],
      ["r2", { id: "r2", heyaId: "h1", isRetired: false } as unknown as Rikishi],
    ]);
    const world = makeWorld(heyas, rikishi);
    const fromQueries = getHeyaRoster(world, "h1");
    const fromEntity = EntityCollection.getHeyaRoster(world, "h1");
    expect(fromEntity.map((r) => r.id).sort()).toEqual(fromQueries.map((r) => r.id).sort());
  });

  it("queries.getHeyaRoster includes retired (EntityCollection filters them)", () => {
    const heyas = new Map([["h1", { id: "h1", rikishiIds: ["r1", "r2"] }]]);
    const rikishi = new Map([
      ["r1", { id: "r1", heyaId: "h1", isRetired: false } as unknown as Rikishi],
      ["r2", { id: "r2", heyaId: "h1", isRetired: true } as unknown as Rikishi],
    ]);
    const world = makeWorld(heyas, rikishi);
    const fromQueries = getHeyaRoster(world, "h1");
    expect(fromQueries).toHaveLength(2);
    const fromEntity = EntityCollection.getHeyaRoster(world, "h1");
    expect(fromEntity).toHaveLength(1);
  });
});
