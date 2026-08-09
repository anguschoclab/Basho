import { describe, it, expect } from "vitest";
import { DefaultRetirementStrategy } from "@/engine/npcRetirementStrategy";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../utils";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";

function mockOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "oyakata-1",
    heyaId: "heya-1",
    name: "Test Oyakata",
    shikona: "Test Shikona",
    age: 55,
    archetype: "traditionalist",
    traits: { ambition: 30, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
    ...overrides,
  } as Oyakata;
}

describe("npcRetirementStrategy — year source and force-retire guard", () => {
  it("stamps retirementYear from world.year (2050), not calendar.year (2026)", () => {
    // Rikishi born 2005 => age 45 at world.year 2050 => mandatory retirement
    const r = mockRikishi("r45", { birthYear: 2005, rank: "maegashira", power: 60 });
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r45"] });
    const world = makeMockWorld({
      year: 2050,
      calendar: { currentWeek: 1, },
      seed: "test-npc-year",
    });
    world.rikishi.set("r45", r);

    const impact = DefaultRetirementStrategy.evaluateRetirements(world, heya, mockOyakata());
    const resolved = resolveImpacts(world, [impact]);
    const retired = resolved.historicalRikishi.get("r45") as Rikishi | undefined;

    expect(retired?.isRetired).toBe(true);
    expect(retired?.retirementYear).toBe(2050);
  });

  it("force-retire rule never targets rikishi under age 28", () => {
    // 16 rikishi all age 20 (born 2030 at world.year 2050), heya full at 16
    const ids: string[] = [];
    const world = makeMockWorld({
      year: 2050,
      calendar: { currentWeek: 1, },
      seed: "test-npc-force",
    });
    for (let i = 0; i < 16; i++) {
      const id = `young_${i}`;
      ids.push(id);
      world.rikishi.set(id, mockRikishi(id, { birthYear: 2030, rank: "jonokuchi", power: 30 }));
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    const oyakata = mockOyakata({
      traits: { ambition: 80, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    });

    const impact = DefaultRetirementStrategy.evaluateRetirements(world, heya, oyakata);
    const resolved = resolveImpacts(world, [impact]);

    // No rikishi under 28 should be retired
    for (const id of ids) {
      const r = resolved.rikishi.get(id) as Rikishi | undefined;
      expect(r?.isRetired).toBeFalsy();
    }
  });
});
