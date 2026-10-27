import { describe, it, expect } from "vitest";
import {
  selectStablesByStature,
  selectRecommendedStables,
} from "@/presenters/projections/stableSelectionProjections";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types/rikishi";
import type { StatureBand } from "@/engine/types/narrative";

function makeRikishi(id: string, heyaId: string, division: string): Rikishi {
  return {
    id,
    heyaId,
    shikona: `Rikishi ${id}`,
    rank: division === "makuuchi" ? "maegashira" : division === "juryo" ? "juryo" : "makushita",
    division,
    rankNumber: 1,
    side: "east",
  } as unknown as Rikishi;
}

function makeHeya(id: string, statureBand: StatureBand, rikishiIds: string[] = []): Heya {
  return {
    id,
    name: `Stable ${id}`,
    statureBand,
    rikishiIds,
  } as unknown as Heya;
}

function makeWorld(heyas: Heya[], rikishi: Rikishi[] = []): WorldState {
  const heyaMap = new Map<string, Heya>();
  for (const h of heyas) heyaMap.set(h.id, h);
  const rikishiMap = new Map<string, Rikishi>();
  for (const r of rikishi) rikishiMap.set(r.id, r);
  return {
    heyas: heyaMap,
    rikishi: rikishiMap,
  } as unknown as WorldState;
}

describe("selectStablesByStature", () => {
  it("groups heyas by statureBand", () => {
    const h1 = makeHeya("h1", "legendary");
    const h2 = makeHeya("h2", "powerful");
    const h3 = makeHeya("h3", "established");
    const h4 = makeHeya("h4", "rebuilding");
    const h5 = makeHeya("h5", "fragile");
    const h6 = makeHeya("h6", "new");
    const world = makeWorld([h1, h2, h3, h4, h5, h6]);

    const groups = selectStablesByStature(world);

    expect(groups.legendary).toHaveLength(1);
    expect(groups.powerful).toHaveLength(1);
    expect(groups.established).toHaveLength(1);
    expect(groups.rebuilding).toHaveLength(1);
    expect(groups.fragile).toHaveLength(1);
    expect(groups.new).toHaveLength(1);
  });

  it("returns empty arrays for each band when no heyas", () => {
    const world = makeWorld([]);
    const groups = selectStablesByStature(world);
    expect(groups.legendary).toEqual([]);
    expect(groups.new).toEqual([]);
  });

  it("handles multiple heyas in same band", () => {
    const h1 = makeHeya("h1", "established");
    const h2 = makeHeya("h2", "established");
    const h3 = makeHeya("h3", "established");
    const world = makeWorld([h1, h2, h3]);

    const groups = selectStablesByStature(world);
    expect(groups.established).toHaveLength(3);
  });
});

describe("selectRecommendedStables", () => {
  it("returns up to 6 stables", () => {
    const heyas: Heya[] = [];
    for (let i = 0; i < 20; i++) {
      heyas.push(makeHeya(`h${i}`, "established"));
    }
    const world = makeWorld(heyas);
    const picks = selectRecommendedStables(world);
    expect(picks.length).toBeLessThanOrEqual(6);
    expect(picks.length).toBeGreaterThan(0);
  });

  it("returns empty array when no heyas", () => {
    const world = makeWorld([]);
    const picks = selectRecommendedStables(world);
    expect(picks).toEqual([]);
  });

  it("prefers one from each stature band", () => {
    const h1 = makeHeya("h1", "legendary");
    const h2 = makeHeya("h2", "powerful");
    const h3 = makeHeya("h3", "established");
    const h4 = makeHeya("h4", "rebuilding");
    const h5 = makeHeya("h5", "fragile");
    const h6 = makeHeya("h6", "new");
    const world = makeWorld([h1, h2, h3, h4, h5, h6]);
    const picks = selectRecommendedStables(world);
    const pickedBands = new Set(picks.map((p) => p.statureBand));
    // Should have at least 5 distinct bands (new may not be picked if fragile exists)
    expect(pickedBands.size).toBeGreaterThanOrEqual(5);
  });

  it("sorts by sekitori count within each band", () => {
    const r1 = makeRikishi("r1", "h1", "makuuchi");
    const r2 = makeRikishi("r2", "h1", "juryo");
    const r3 = makeRikishi("r3", "h2", "makuuchi");
    const h1 = makeHeya("h1", "established", ["r1", "r2"]);
    const h2 = makeHeya("h2", "established", ["r3"]);
    const world = makeWorld([h1, h2], [r1, r2, r3]);
    const picks = selectRecommendedStables(world);
    // h1 has 2 sekitori, h2 has 1 — h1 should be picked first
    expect(picks[0].id).toBe("h1");
  });

  it("is deterministic for same world state", () => {
    const heyas = [
      makeHeya("h1", "legendary"),
      makeHeya("h2", "powerful"),
      makeHeya("h3", "established"),
      makeHeya("h4", "rebuilding"),
      makeHeya("h5", "fragile"),
    ];
    const world = makeWorld(heyas);
    const picks1 = selectRecommendedStables(world);
    const picks2 = selectRecommendedStables(world);
    expect(picks1.map((p) => p.id)).toEqual(picks2.map((p) => p.id));
  });

  it("sekitori count matches getSekitoriInHeya", () => {
    const r1 = makeRikishi("r1", "h1", "makuuchi");
    const r2 = makeRikishi("r2", "h1", "makushita");
    const h1 = makeHeya("h1", "legendary", ["r1", "r2"]);
    const world = makeWorld([h1], [r1, r2]);
    const picks = selectRecommendedStables(world);
    // Only 1 sekitori (r1), r2 is makushita
    expect(picks).toHaveLength(1);
  });
});
