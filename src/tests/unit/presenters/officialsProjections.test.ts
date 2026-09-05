import { describe, it, expect } from "vitest";
import { projectOfficials } from "@/presenters/officialsProjections";
import type { WorldState } from "@/engine/types/world";
import type { Gyoji, Shimpan } from "@/engine/types/gyoji";

function makeWorld(gyojiPool?: Gyoji[], shimpanPool?: Shimpan[]): WorldState {
  return {
    seed: "test",
    year: 2024,
    heyas: new Map(),
    rikishi: new Map(),
    gyojiPool,
    shimpanPool,
  } as any;
}

describe("projectOfficials", () => {
  it("returns empty arrays when pools are missing", () => {
    const result = projectOfficials(makeWorld());
    expect(result.gyoji).toEqual([]);
    expect(result.shimpan).toEqual([]);
    expect(result.topGyoji).toBeNull();
  });

  it("projects gyoji with rank labels", () => {
    const gyoji: Gyoji[] = [
      { id: "g1", name: "Kimura Shonosuke", rank: "tate", accuracy: 85, yearsActive: 10, boutsOfficiated: 100, callsReversed: 5 },
    ];
    const result = projectOfficials(makeWorld(gyoji));
    expect(result.gyoji).toHaveLength(1);
    expect(result.gyoji[0].rankLabel).toBe("Tate-gyoji");
    expect(result.gyoji[0].reversalRate).toBeCloseTo(0.05);
  });

  it("sorts gyoji by accuracy descending", () => {
    const gyoji: Gyoji[] = [
      { id: "g1", name: "Low", rank: "makushita", accuracy: 50, yearsActive: 1, boutsOfficiated: 0, callsReversed: 0 },
      { id: "g2", name: "High", rank: "tate", accuracy: 90, yearsActive: 10, boutsOfficiated: 50, callsReversed: 2 },
    ];
    const result = projectOfficials(makeWorld(gyoji));
    expect(result.gyoji[0].name).toBe("High");
    expect(result.topGyoji?.name).toBe("High");
  });

  it("computes total bouts officiated and reversals", () => {
    const gyoji: Gyoji[] = [
      { id: "g1", name: "A", rank: "tate", accuracy: 80, yearsActive: 5, boutsOfficiated: 100, callsReversed: 3 },
      { id: "g2", name: "B", rank: "juryo", accuracy: 60, yearsActive: 2, boutsOfficiated: 50, callsReversed: 7 },
    ];
    const result = projectOfficials(makeWorld(gyoji));
    expect(result.totalBoutsOfficiated).toBe(150);
    expect(result.totalReversals).toBe(10);
  });

  it("projects shimpan with consultations", () => {
    const shimpan: Shimpan[] = [
      { id: "s1", name: "Iwai", accuracy: 75, yearsActive: 10, consultations: 5 },
    ];
    const result = projectOfficials(makeWorld(undefined, shimpan));
    expect(result.shimpan).toHaveLength(1);
    expect(result.shimpan[0].consultations).toBe(5);
  });

  it("handles zero bouts officiated (reversalRate = 0)", () => {
    const gyoji: Gyoji[] = [
      { id: "g1", name: "New", rank: "makushita", accuracy: 55, yearsActive: 0, boutsOfficiated: 0, callsReversed: 0 },
    ];
    const result = projectOfficials(makeWorld(gyoji));
    expect(result.gyoji[0].reversalRate).toBe(0);
  });
});
