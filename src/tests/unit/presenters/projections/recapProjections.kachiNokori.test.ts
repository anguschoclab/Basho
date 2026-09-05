/**
 * recapProjections.kachiNokori.test.ts — tests kachi-nokori win margin projection.
 * Plan Feature 5 Test-First Protocol item 1.
 */
import { describe, it, expect } from "vitest";
import { selectKachiNokoriLeaders } from "@/presenters/projections/recapKachiNokoriProjections";
import type { WorldState } from "@/engine/types/world";

function makeWorld(rikishi: any[]): WorldState {
  return {
    seed: "kachi-test",
    year: 2026,
    heyas: new Map([["h1", { id: "h1", name: "Test" }]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: rikishi.map((r) => r.id),
    playerHeyaId: "h1",
  } as any;
}

describe("selectKachiNokoriLeaders", () => {
  it("returns empty array when no rikishi have basho records", () => {
    const world = makeWorld([{ id: "r1", shikona: "A", heyaId: "h1", isRetired: false }]);
    expect(selectKachiNokoriLeaders(world)).toEqual([]);
  });

  it("returns leaders sorted by kachi-nokori descending", () => {
    const world = makeWorld([
      { id: "r1", shikona: "Low", heyaId: "h1", isRetired: false, bashoRecord: { wins: 8, losses: 7 } },
      { id: "r2", shikona: "High", heyaId: "h1", isRetired: false, bashoRecord: { wins: 14, losses: 1 } },
    ]);
    const result = selectKachiNokoriLeaders(world);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].shikona).toBe("High");
    expect(result[0].wins).toBe(14);
  });
});
