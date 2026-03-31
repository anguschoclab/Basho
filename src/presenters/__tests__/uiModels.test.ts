import { describe, it, expect } from "vitest";
import { projectRikishi, projectHeya, getLocalizedArchetype } from "../uiModels";
import { generateInitialWorld } from "../../engine/systems/generation/WorldFactory";

describe("UI Models Projections", () => {
  it("should project a Rikishi safely for the UI without leaking raw stats", () => {
    const world = generateInitialWorld("test-uimodels");
    const rikishiId = Array.from(world.rikishi.keys())[0];
    const rikishi = world.rikishi.get(rikishiId)!;

    // Mutate to set a specific raw value
    rikishi.power = 85;

    const uiRikishi = projectRikishi(rikishi, world);

    // Verify raw power is NOT in the UI projection
    expect((uiRikishi as { power?: number }).power).toBeUndefined();

    // Verify it translates to a band correctly mapped in the struct
    expect(uiRikishi.descriptor).toBeDefined();
    expect(uiRikishi.descriptor.powerBand).toBeDefined();
    expect(uiRikishi.id).toBe(rikishiId);
    expect(uiRikishi.shikona).toBe(rikishi.shikona);
    expect(uiRikishi.heyaName).toBeDefined();
    expect(uiRikishi.rank).toBe(rikishi.rank);
  });

  it("should project a Heya safely for the UI", () => {
    const world = generateInitialWorld("test-uimodels-heya");
    const heyaId = Array.from(world.heyas.keys())[0];
    const heya = world.heyas.get(heyaId)!;

    const uiHeya = projectHeya(heya, world);

    expect(uiHeya.id).toBe(heyaId);
    expect(uiHeya.name).toBe(heya.name);
    expect(uiHeya.oyakataName).toBeDefined();
    const expectedSize = Array.from(world.rikishi.values()).filter((r: any) => r.heyaId === heyaId).length;
    expect(uiHeya.rosterSize).toBe(expectedSize);
  });

  describe("Injury Modifiers", () => {
    it("should project injury modifiers when rikishi has a minor knee injury", () => {
      const world = generateInitialWorld("test-inj-1");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId)!;

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "sprain", severity: "minor", location: "knee", weeksRemaining: 1 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("taped_up");
    });

    it("should project injury modifiers when rikishi has a moderate back injury", () => {
      const world = generateInitialWorld("test-inj-2");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId)!;

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "strain", severity: 40, location: "back", weeksRemaining: 2 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("hampered");
    });

    it("should not project injury modifiers when rikishi is healthy", () => {
      const world = generateInitialWorld("test-inj-3");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId)!;

      rikishi.injured = false;
      rikishi.injuryStatus = undefined;

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toEqual([]);
    });
  });
});

describe("Narrative Leakage - Archetype Localizer", () => {
  it("Test A: Translation Selector", () => {
    expect(getLocalizedArchetype("trickster")).toBe("Acrobatic Trickster");
    expect(getLocalizedArchetype("oshi")).toBe("Explosive Blitzer");
  });

  it("Test B: Fallback Handling", () => {
    expect(getLocalizedArchetype(undefined as any)).toBe("All-Rounder");
    expect(getLocalizedArchetype("unknown_enum" as any)).toBe("Unknown");
  });
});
