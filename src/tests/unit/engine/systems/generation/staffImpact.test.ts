import { describe, it, expect } from "vitest";
import { getHeyaStaffBonuses } from "@/engine/staff";
import { MockFactory } from "../../../helpers/utils/MockFactory";

describe("Staff System Integration", () => {
  it("should calculate aggregate stacking bonuses for multiple staff", () => {
    const world = MockFactory.createWorld();
    const heyaId = "test-heya";

    // Create 2 Technique Coaches with 'strong' competence (+0.15 each)
    const staff1 = MockFactory.createStaff("s1", {
      name: "Coach A",
      role: "technique_coach",
      competenceBands: { primary: "strong" },
      heyaId,
    });

    const staff2 = MockFactory.createStaff("s2", {
      name: "Coach B",
      role: "technique_coach",
      competenceBands: { primary: "strong" },
      heyaId,
    });

    world.staff.set(staff1.id, staff1);
    world.staff.set(staff2.id, staff2);

    const heya = MockFactory.createHeya(heyaId, {
      rikishiIds: [],
      staffIds: ["s1", "s2"],
    });
    world.heyas.set(heyaId, heya);

    const bonuses = getHeyaStaffBonuses(world, heyaId);

    // Expected: 1.0 + 0.15 + 0.15 = 1.3
    expect(bonuses.technique).toBeCloseTo(1.3);
    expect(bonuses.conditioning).toBe(1.0); // unchanged
  });

  it("should penalize bonuses based on staff fatigue", () => {
    const world = MockFactory.createWorld();
    const heyaId = "test-heya";

    const staff1 = MockFactory.createStaff("s1", {
      name: "Tired Coach",
      role: "conditioning_coach",
      fatigue: 100, // 100% fatigue = 50% effectiveness
      competenceBands: { primary: "dominant" }, // +0.3
      heyaId,
    });

    world.staff.set(staff1.id, staff1);
    const heya = MockFactory.createHeya(heyaId, { staffIds: ["s1"] });
    world.heyas.set(heyaId, heya);

    const bonuses = getHeyaStaffBonuses(world, heyaId);

    // Expected: 1.0 + (0.3 * 0.4) = 1.12 — fatigue > 80 applies 0.4 efficiency factor
    expect(bonuses.conditioning).toBeCloseTo(1.12);
  });
});
