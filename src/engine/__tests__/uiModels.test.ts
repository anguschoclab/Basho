import { describe, it, expect } from "vitest";
import { projectRikishi, projectHeya } from "../uiModels";
import { generateWorld } from "../worldgen";

describe("UI Models Projections", () => {
  it("should project a Rikishi safely for the UI without leaking raw stats", () => {
    const world = generateWorld("test-uimodels");
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

    // Check injury bands
    rikishi.injured = true;
    rikishi.injuryStatus = { location: "knee", severity: 25 };
    rikishi.injuryWeeksRemaining = 2;
    const uiRikishiInjured = projectRikishi(rikishi, world);
    expect(uiRikishiInjured.injurySeverityBand).toBe("minor");

    rikishi.injuryStatus = { location: "knee", severity: 80 };
    const uiRikishiSeriouslyInjured = projectRikishi(rikishi, world);
    expect(uiRikishiSeriouslyInjured.injurySeverityBand).toBe("serious");
  });

  it("should project a Heya safely for the UI", () => {
    const world = generateWorld("test-uimodels-heya");
    const heyaId = Array.from(world.heyas.keys())[0];
    const heya = world.heyas.get(heyaId)!;

    const uiHeya = projectHeya(heya, world);

    expect(uiHeya.id).toBe(heyaId);
    expect(uiHeya.name).toBe(heya.name);
    expect(uiHeya.oyakataName).toBeDefined();
    expect(uiHeya.rosterSize).toBe((heya.rikishiIds || []).length);
    // expect(uiHeya.funds).toBeDefined();

    // Check financial bands
    expect(typeof uiHeya.maintenanceAffordable).toBe("boolean");
    expect(typeof uiHeya.monthlyMaintenanceDisplay).toBe("string");
    expect(typeof uiHeya.canAffordTraining1).toBe("boolean");
    expect(uiHeya.upgradeCostDisplay.training1).toBeDefined();
  });
});
