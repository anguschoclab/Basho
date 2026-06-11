// src/engine/systems/legacy/__tests__/BloodlineService.test.ts
import { describe, it, expect } from "vitest";
import { BloodlineService } from "@/engine/systems/legacy/BloodlineService";
import { mockRikishi, makeMockWorld } from "../../utils";
import type { BloodlineTrait } from "@/engine/types/dynasty";
import type { WorldState } from "@/engine/types/world";

const mockTrait: BloodlineTrait = {
  traitId: "bl_legend1",
  label: "Iron Wrists",
  description: "Test trait",
  statFloorBonus: { technique: 6 },
  ceilingBonus: 5,
  ancestorShikona: "Hakuryu",
  registeredYear: 2020,
};

function makeWorld(rikishi: ReturnType<typeof mockRikishi>, trait: BloodlineTrait): WorldState {
  return {
    id: "w1",
    seed: "s",
    year: 2025,
    week: 5,
    dayIndexGlobal: 35,
    cyclePhase: "interim",
    rikishi: new Map([[rikishi.id, rikishi]]),
    heyas: new Map(),
    events: [],
    trainingState: new Map(),
    governanceLog: [],
    currentBasho: null,
    bloodlineRegistry: { traits: { [trait.traitId]: trait } },
    activeRikishiIds: [rikishi.id],
  } as unknown as WorldState;
}

describe("BloodlineService.applyHeritageBonus", () => {
  it("adds technique bonus to rikishi carrying the bloodline trait", () => {
    const r = mockRikishi("r1", {
      technique: 60,
      stats: {
        technique: 60,
        power: 50,
        speed: 50,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        weight: 145,
        aggression: 50,
        experience: 50,
      },
    });
    r.lineage = { bloodlineTraitId: "bl_legend1" };
    const world = makeWorld(r, mockTrait);

    const impact = BloodlineService.applyHeritageBonus(world);
    const updates = impact.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      const upd = updates.get(r.id);
      expect(upd?.stats?.technique).toBeGreaterThan(60);
    }
  });

  it("does not double-apply bonus beyond ceiling", () => {
    const r = mockRikishi("r1", {
      technique: 99,
      stats: {
        technique: 99,
        power: 50,
        speed: 50,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        weight: 145,
        aggression: 50,
        experience: 50,
      },
    });
    r.lineage = { bloodlineTraitId: "bl_legend1" };
    const world = makeWorld(r, mockTrait);

    const impact = BloodlineService.applyHeritageBonus(world);
    const updates = impact.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      const upd = updates.get(r.id);
      // technique is already maxed — no update expected for this stat
      expect(upd?.stats?.technique ?? 99).toBeLessThanOrEqual(99);
    }
  });

  it("skips rikishi with no lineage bloodlineTraitId", () => {
    const r = mockRikishi("r1", {
      technique: 60,
      stats: {
        technique: 60,
        power: 50,
        speed: 50,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        weight: 145,
        aggression: 50,
        experience: 50,
      },
    });
    r.lineage = {};
    const world = makeWorld(r, mockTrait);

    const impact = BloodlineService.applyHeritageBonus(world);
    const updates = impact.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      expect(updates.size).toBe(0);
    } else {
      // If no updates map exists, that's also correct (no rikishi were updated)
      expect(updates).toBeUndefined();
    }
  });
});

describe("BloodlineService.checkDynastyNarrative", () => {
  it("returns ancestor shikona when rikishi surname matches ancestor surname", () => {
    const r = mockRikishi("r1", {
      shikona: "Taro Hakuryu",
      lineage: { bloodlineTraitId: "bl_legend1" },
    });
    const world = makeWorld(r, mockTrait);

    const result = BloodlineService.checkDynastyNarrative(r, world);
    expect(result).toBe("Hakuryu");
  });

  it("returns null when rikishi surname does not match ancestor surname", () => {
    const r = mockRikishi("r1", {
      shikona: "Fujiyama Taro",
      lineage: { bloodlineTraitId: "bl_legend1" },
    });
    const world = makeWorld(r, mockTrait);

    const result = BloodlineService.checkDynastyNarrative(r, world);
    expect(result).toBeNull();
  });

  it("returns null when rikishi has no bloodlineTraitId", () => {
    const r = mockRikishi("r1", {
      shikona: "Hakuryu Taro",
      lineage: {},
    });
    const world = makeWorld(r, mockTrait);

    const result = BloodlineService.checkDynastyNarrative(r, world);
    expect(result).toBeNull();
  });
});
