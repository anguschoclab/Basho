import { describe, it, expect } from "vitest";
import { selectMakuuchiStandings } from "@/presenters/selectors";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function makeWorld(rikishiWins: number): WorldState {
  const rikishi = {
    id: "r1",
    division: "makuuchi",
  } as unknown as Rikishi;
  const juryo = {
    id: "r2",
    division: "juryo",
  } as unknown as Rikishi;
  return {
    rikishi: new Map([
      ["r1", rikishi],
      ["r2", juryo],
    ]),
    currentBasho: {
      standings: new Map([
        ["r1", { wins: rikishiWins, losses: 15 - rikishiWins }],
        ["r2", { wins: 5, losses: 10 }],
      ]),
    },
  } as unknown as WorldState;
}

describe("selectMakuuchiStandings memoization", () => {
  it("returns the same array instance for repeated calls with the same world reference", () => {
    const world = makeWorld(10);
    const first = selectMakuuchiStandings(world);
    const second = selectMakuuchiStandings(world);
    expect(second).toBe(first);
  });

  it("returns a fresh result when called with a different world object", () => {
    const worldA = makeWorld(10);
    const worldB = makeWorld(11);
    const resultA = selectMakuuchiStandings(worldA);
    const resultB = selectMakuuchiStandings(worldB);
    expect(resultB).not.toBe(resultA);
    expect(resultB[0].wins).toBe(11);
  });

  it("excludes non-makuuchi rikishi and handles missing standings", () => {
    const world = makeWorld(10);
    const results = selectMakuuchiStandings(world);
    expect(results).toHaveLength(1);
    expect(results[0].rikishi.id).toBe("r1");
  });

  it("returns empty array when no basho is active", () => {
    const world = { rikishi: new Map(), currentBasho: null } as unknown as WorldState;
    expect(selectMakuuchiStandings(world)).toEqual([]);
  });
});
