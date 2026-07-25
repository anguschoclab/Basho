import { describe, it, expect } from "vitest";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { selectMakuuchiStandings } from "@/presenters/selectors";

function mkRikishi(id: string, division: string): Rikishi {
  return {
    id,
    shikona: id,
    rank: "maegashira",
    rankNumber: 1,
    side: "east",
    division,
    style: "oshi",
    isRetired: false,
  } as unknown as Rikishi;
}

function mkWorld(
  rikishi: Rikishi[],
  standings: Map<string, { wins: number; losses: number }>
): WorldState {
  const rMap = new Map<string, Rikishi>();
  for (const r of rikishi) rMap.set(r.id, r);
  return {
    rikishi: rMap,
    currentBasho: {
      day: 5,
      standings,
      matches: [],
    },
  } as unknown as WorldState;
}

describe("selectMakuuchiStandings", () => {
  it("returns entries sorted by wins desc, then losses asc", () => {
    const world = mkWorld(
      [
        mkRikishi("a", "makuuchi"),
        mkRikishi("b", "makuuchi"),
        mkRikishi("c", "makuuchi"),
      ],
      new Map([
        ["a", { wins: 5, losses: 2 }],
        ["b", { wins: 7, losses: 0 }],
        ["c", { wins: 5, losses: 1 }],
      ])
    );
    const result = selectMakuuchiStandings(world);
    expect(result[0].rikishi.id).toBe("b");
    expect(result[1].rikishi.id).toBe("c");
    expect(result[2].rikishi.id).toBe("a");
  });

  it("filters to makuuchi division only", () => {
    const world = mkWorld(
      [
        mkRikishi("a", "makuuchi"),
        mkRikishi("b", "juryo"),
        mkRikishi("c", "makushita"),
      ],
      new Map([
        ["a", { wins: 3, losses: 0 }],
        ["b", { wins: 10, losses: 0 }],
        ["c", { wins: 10, losses: 0 }],
      ])
    );
    const result = selectMakuuchiStandings(world);
    expect(result).toHaveLength(1);
    expect(result[0].rikishi.id).toBe("a");
  });

  it("returns empty array when no currentBasho", () => {
    const world = {
      rikishi: new Map(),
      currentBasho: null,
    } as unknown as WorldState;
    expect(selectMakuuchiStandings(world)).toEqual([]);
  });

  it("returns empty array when no standings map", () => {
    const world = {
      rikishi: new Map(),
      currentBasho: { day: 1, standings: undefined, matches: [] },
    } as unknown as WorldState;
    expect(selectMakuuchiStandings(world)).toEqual([]);
  });

  it("handles rikishi with 0 wins and 0 losses", () => {
    const world = mkWorld(
      [mkRikishi("a", "makuuchi")],
      new Map([["a", { wins: 0, losses: 0 }]])
    );
    const result = selectMakuuchiStandings(world);
    expect(result).toHaveLength(1);
    expect(result[0].wins).toBe(0);
    expect(result[0].losses).toBe(0);
  });

  it("includes rikishi object in each entry", () => {
    const world = mkWorld(
      [mkRikishi("a", "makuuchi")],
      new Map([["a", { wins: 3, losses: 1 }]])
    );
    const result = selectMakuuchiStandings(world);
    expect(result[0].rikishi).toBeDefined();
    expect(result[0].rikishi.id).toBe("a");
  });

  it("defaults to 0 wins/losses when standings entry missing", () => {
    const world = mkWorld(
      [mkRikishi("a", "makuuchi")],
      new Map()
    );
    const result = selectMakuuchiStandings(world);
    expect(result).toHaveLength(1);
    expect(result[0].wins).toBe(0);
    expect(result[0].losses).toBe(0);
  });
});
