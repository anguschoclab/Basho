import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";
import type { WorldState } from "@/engine/types/world";
import { toRankPosition } from "@/engine/types/banzuke";

function makeWorld(n: number) {
  const banzuke: BanzukeEntry[] = [];
  const perf = new Map<string, BashoPerformance>();
  for (let i = 0; i < n; i++) {
    const id = `RK${i}`;
    banzuke.push({
      rikishiId: id,
      division: "jonokuchi",
      position: toRankPosition({
        rank: "jonokuchi",
        rankNumber: i + 1,
        side: i % 2 ? "west" : "east",
      }),
    });
    perf.set(id, {
      rikishiId: id,
      wins: 7,
      losses: 0,
      absences: 0,
      yusho: false,
      junYusho: false,
      specialPrizes: 0,
    });
  }
  return {
    world: { rikishi: new Map(), heyas: new Map() } as unknown as WorldState,
    banzuke,
    perf,
  };
}

describe("updateBanzuke division capacity", () => {
  it("assigns a slot to EVERY active rikishi", () => {
    const { world, banzuke, perf } = makeWorld(800);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    expect(result.newBanzuke.length).toBe(800);
    expect(new Set(result.newBanzuke.map((e) => e.rikishiId)).size).toBe(800);
  });

  it("does not pile everyone into jonokuchi", () => {
    const { world, banzuke, perf } = makeWorld(800);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    expect(result.newBanzuke.filter((e) => e.division === "jonokuchi").length / 800).toBeLessThan(
      0.4
    );
  });

  it("makushita division size is exactly 120", () => {
    const { world, banzuke, perf } = makeWorld(800);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    const makushitaCount = result.newBanzuke.filter((e) => e.division === "makushita").length;
    expect(makushitaCount).toBe(120);
  });

  it("makushita is 120 even with small population", () => {
    const { world, banzuke, perf } = makeWorld(300);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    const makushitaCount = result.newBanzuke.filter((e) => e.division === "makushita").length;
    expect(makushitaCount).toBe(120);
  });

  it("jonidan is the largest lower division", () => {
    const { world, banzuke, perf } = makeWorld(800);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    const jonidan = result.newBanzuke.filter((e) => e.division === "jonidan").length;
    const sandanme = result.newBanzuke.filter((e) => e.division === "sandanme").length;
    const jonokuchi = result.newBanzuke.filter((e) => e.division === "jonokuchi").length;
    expect(jonidan).toBeGreaterThan(sandanme);
    expect(jonidan).toBeGreaterThan(jonokuchi);
  });

  it("jonokuchi is the smallest lower division (<= 90 with ~500 total)", () => {
    const { world, banzuke, perf } = makeWorld(500);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    const jonokuchi = result.newBanzuke.filter((e) => e.division === "jonokuchi").length;
    const makushita = result.newBanzuke.filter((e) => e.division === "makushita").length;
    const sandanme = result.newBanzuke.filter((e) => e.division === "sandanme").length;
    const jonidan = result.newBanzuke.filter((e) => e.division === "jonidan").length;
    expect(jonokuchi).toBeLessThanOrEqual(90);
    expect(jonokuchi).toBeLessThan(makushita);
    expect(jonokuchi).toBeLessThan(sandanme);
    expect(jonokuchi).toBeLessThan(jonidan);
  });
});
