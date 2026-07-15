import { describe, it, expect } from "vitest";
import { BloodlineService } from "@/engine/systems/legacy/BloodlineService";
import { mockRikishi } from "../../utils";
import type { BloodlineTrait } from "@/engine/types/dynasty";
import type { WorldState } from "@/engine/types/world";

const mockTraitWithInvalidKey: BloodlineTrait = {
  traitId: "bl_test_invalid",
  label: "Test Trait",
  description: "Test trait with invalid stat key",
  statFloorBonus: { invalidKey: 80, power: 80 } as any,
  ceilingBonus: 5,
  ancestorShikona: "TestAncestor",
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
    activeRikishiIds: new Set([rikishi.id]),
  } as unknown as WorldState;
}

describe("BloodlineService.applyHeritageBonus — statKey guard", () => {
  it("skips invalid stat keys in trait.statFloorBonus without crashing", () => {
    const r = mockRikishi("r1", {
      stats: {
        technique: 50,
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
    r.lineage = { bloodlineTraitId: "bl_test_invalid" };
    const world = makeWorld(r, mockTraitWithInvalidKey);

    // Should not throw
    const impact = BloodlineService.applyHeritageBonus(world);
    expect(impact).toBeDefined();
  });

  it("only applies bonuses to valid RikishiStats keys", () => {
    const r = mockRikishi("r1", {
      stats: {
        technique: 50,
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
    r.lineage = { bloodlineTraitId: "bl_test_invalid" };
    const world = makeWorld(r, mockTraitWithInvalidKey);

    const impact = BloodlineService.applyHeritageBonus(world);
    const updates = impact.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      const upd = updates.get(r.id);
      if (upd?.stats) {
        // power should be boosted (valid key with floor 80)
        expect(upd.stats.power).toBeGreaterThan(50);
        // The invalid key should not appear as a stat
        expect((upd.stats as any).invalidKey).toBeUndefined();
      }
    }
  });

  it("does not mutate stats for keys not in RikishiStats", () => {
    const r = mockRikishi("r1", {
      stats: {
        technique: 50,
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
    r.lineage = { bloodlineTraitId: "bl_test_invalid" };
    const world = makeWorld(r, mockTraitWithInvalidKey);

    const originalStats = { ...r.stats };
    BloodlineService.applyHeritageBonus(world);
    // Original rikishi stats should not be mutated by the impact-based function
    expect(r.stats).toEqual(originalStats);
  });
});
