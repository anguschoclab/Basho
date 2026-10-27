import { describe, it, expect } from "vitest";
import { DefaultRetirementStrategy } from "@/engine/npc/strategy/npcRetirementStrategy";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
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
      calendar: { currentWeek: 1 },
      seed: "test-npc-year",
    });
    world.rikishi.set("r45", r);

    const impact = DefaultRetirementStrategy.evaluateRetirements(world, heya, mockOyakata());
    const resolved = resolveImpacts(world, [impact]);
    const retired = resolved.historicalRikishi.get("r45") as Rikishi | undefined;

    expect(retired?.isRetired).toBe(true);
    expect(retired?.retirementYear).toBe(2050);
  });

  it("NPC retirements emit the full unified bookkeeping (events + records cleanup)", () => {
    const r = mockRikishi("r45", { birthYear: 2005, rank: "maegashira", power: 60 });
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r45"] });
    const world = makeMockWorld({
      year: 2050,
      calendar: { currentWeek: 1 },
      seed: "test-npc-bookkeeping",
    });
    world.rikishi.set("r45", r);
    world.records = {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: {
        careerWins: [{ rikishiId: "r45", shikona: "R45", value: 100, achievedDate: { year: 2040, month: 1 } }],
        makuuchiWins: [],
        yusho: [],
        consecutiveYusho: [],
        kinboshi: [],
      },
    };

    const impact = DefaultRetirementStrategy.evaluateRetirements(world, heya, mockOyakata());

    // Canonical career event + bard-feed event both emitted
    const eventTypes = (impact.events ?? []).map((e) => e.type);
    expect(eventTypes).toContain("LIFECYCLE_EVENT");
    expect(eventTypes).toContain("RETIREMENT_ANNOUNCED");

    // onRikishiRetired removes the retiree from active leaderboards
    const resolved = resolveImpacts(world, [impact]);
    expect(
      resolved.records?.active?.careerWins?.some((e) => e.rikishiId === "r45")
    ).toBeFalsy();
  });

  it("force-retire rule never targets rikishi under age 28", () => {
    // 16 rikishi all age 20 (born 2030 at world.year 2050), heya full at 16
    const ids: string[] = [];
    const world = makeMockWorld({
      year: 2050,
      calendar: { currentWeek: 1 },
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
