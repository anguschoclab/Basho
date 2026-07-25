import { vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Test file global mock
// @ts-ignore
global.calculatePerceivedStats = vi.fn(() => ({ power: "Dominant" }));
import { describe, it, expect } from "vitest";
import { projectRikishi, projectHeya } from "@/presenters/uiModels";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("UI Models Projections", () => {
  it("should project a Rikishi safely for the UI without leaking raw stats", () => {
    const world = generateInitialWorld("test-uimodels");
    const rikishiId = Array.from(world.rikishi.keys())[0];
    const rikishi = world.rikishi.get(rikishiId);
    if (!rikishi) throw new Error("No rikishi found");

    // Mutate to set a specific raw value
    rikishi.stats.power = 85;

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
    const heya = world.heyas.get(heyaId);
    if (!heya) throw new Error("No heya found");

    const uiHeya = projectHeya(heya, world);

    expect(uiHeya.id).toBe(heyaId);
    expect(uiHeya.name).toBe(heya.name);
    expect(uiHeya.oyakataName).toBeDefined();
    const expectedSize = Array.from(world.rikishi.values()).filter(
      (r) => r.heyaId === heyaId
    ).length;
    expect(uiHeya.rosterSize).toBe(expectedSize);
  });

  describe("Injury Modifiers", () => {
    it("should project injury modifiers when rikishi has a minor knee injury", () => {
      const world = generateInitialWorld("test-inj-1");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId);
      if (!rikishi) throw new Error("No rikishi found");

      rikishi.injured = true;
      rikishi.injuryStatus = {
        type: "sprain",
        severity: "minor",
        location: "knee",
        weeksRemaining: 1,
      };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("taped_up");
    });

    it("should project injury modifiers when rikishi has a moderate back injury", () => {
      const world = generateInitialWorld("test-inj-2");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId);
      if (!rikishi) throw new Error("No rikishi found");

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "strain", severity: "moderate", location: "back", weeksRemaining: 2 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("hampered");
    });

    it("should project taped_up modifier when severity is minor", () => {
      const world = generateInitialWorld("test-inj-4");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId);
      if (!rikishi) throw new Error("No rikishi found");

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "sprain", severity: "minor", location: "ankle", weeksRemaining: 1 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("taped_up");
    });

    it("should project taped_up modifier when severity is minor (low end)", () => {
      const world = generateInitialWorld("test-inj-5");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId);
      if (!rikishi) throw new Error("No rikishi found");

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "contusion", severity: "minor", location: "rib", weeksRemaining: 1 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("taped_up");
    });

    it("should not project injury modifiers when rikishi is healthy", () => {
      const world = generateInitialWorld("test-inj-3");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId);
      if (!rikishi) throw new Error("No rikishi found");

      rikishi.injured = false;
      rikishi.injuryStatus = undefined;

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toEqual([]);
    });
  });
});
