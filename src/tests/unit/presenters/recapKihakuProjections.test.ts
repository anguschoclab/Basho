import { describe, it, expect } from "vitest";
import { selectTopKihakuPerformers } from "@/presenters/projections/recapKihakuProjections";
import type { WorldState } from "@/engine/types/world";

function makeWorld(rikishi: any[]): WorldState {
  return {
    seed: "test",
    year: 2026,
    heyas: new Map([
      ["h1", { id: "h1", name: "Test Heya" }],
    ]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: rikishi.map((r) => r.id),
    playerHeyaId: "h1",
  } as any;
}

describe("selectTopKihakuPerformers", () => {
  it("returns empty array when no rikishi have kihaku scores", () => {
    const world = makeWorld([{ id: "r1", shikona: "A", heyaId: "h1", isRetired: false }]);
    expect(selectTopKihakuPerformers(world)).toEqual([]);
  });

  it("returns top performers sorted by score descending", () => {
    const world = makeWorld([
      { id: "r1", shikona: "Low", heyaId: "h1", isRetired: false, kihakuIsenScore: 40 },
      { id: "r2", shikona: "High", heyaId: "h1", isRetired: false, kihakuIsenScore: 85 },
      { id: "r3", shikona: "Mid", heyaId: "h1", isRetired: false, kihakuIsenScore: 60 },
    ]);
    const result = selectTopKihakuPerformers(world);
    expect(result).toHaveLength(3);
    expect(result[0].shikona).toBe("High");
    expect(result[0].kihakuIsenScore).toBe(85);
    expect(result[1].shikona).toBe("Mid");
    expect(result[2].shikona).toBe("Low");
  });

  it("limits to 5 performers", () => {
    const rikishi = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      shikona: `R${i}`,
      heyaId: "h1",
      isRetired: false,
      kihakuIsenScore: 50 + i,
    }));
    const world = makeWorld(rikishi);
    const result = selectTopKihakuPerformers(world);
    expect(result).toHaveLength(5);
    expect(result[0].kihakuIsenScore).toBe(59);
  });

  it("excludes retired rikishi", () => {
    const world = makeWorld([
      { id: "r1", shikona: "Active", heyaId: "h1", isRetired: false, kihakuIsenScore: 80 },
      { id: "r2", shikona: "Retired", heyaId: "h1", isRetired: true, kihakuIsenScore: 90 },
    ]);
    const result = selectTopKihakuPerformers(world);
    expect(result).toHaveLength(1);
    expect(result[0].shikona).toBe("Active");
  });

  it("includes label for each performer", () => {
    const world = makeWorld([
      { id: "r1", shikona: "Blazing", heyaId: "h1", isRetired: false, kihakuIsenScore: 85 },
    ]);
    const result = selectTopKihakuPerformers(world);
    expect(result[0].label).toBe("Blazing Spirit");
  });
});
