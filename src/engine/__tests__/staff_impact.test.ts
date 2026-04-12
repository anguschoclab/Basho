import { describe, it, expect } from "vitest";
import { getHeyaStaffBonuses } from "../staff";
import { makeMockWorld } from "./utils";
import type { Staff } from "../types/staff";

describe("Staff System Integration", () => {
  it("should calculate aggregate stacking bonuses for multiple staff", () => {
    const world = makeMockWorld();
    const heyaId = "test-heya";

    // Create 2 Technique Coaches with 'strong' competence (+0.15 each)
    const staff1: Staff = {
      id: "s1",
      name: "Coach A",
      role: "technique_coach",
      fatigue: 0,
      competenceBands: { primary: "strong" } as any,
      active: true,
      heyaId,
    } as any;

    const staff2: Staff = {
      id: "s2",
      name: "Coach B",
      role: "technique_coach",
      fatigue: 0,
      competenceBands: { primary: "strong" } as any,
      active: true,
      heyaId,
    } as any;

    world.staff.set(staff1.id, staff1);
    world.staff.set(staff2.id, staff2);

    const heya = world.heyas.get(heyaId) || { id: heyaId, staffIds: [] };
    (heya as any).staffIds = ["s1", "s2"];
    world.heyas.set(heyaId, heya as any);

    const bonuses = getHeyaStaffBonuses(world, heyaId);

    // Expected: 1.0 + 0.15 + 0.15 = 1.3
    expect(bonuses.technique).toBeCloseTo(1.3);
    expect(bonuses.conditioning).toBe(1.0); // unchanged
  });

  it("should penalize bonuses based on staff fatigue", () => {
    const world = makeMockWorld();
    const heyaId = "test-heya";

    const staff1: Staff = {
      id: "s1",
      name: "Tired Coach",
      role: "conditioning_coach",
      fatigue: 100, // 100% fatigue = 50% effectiveness
      competenceBands: { primary: "dominant" } as any, // +0.3
      active: true,
      heyaId,
    } as any;

    world.staff.set(staff1.id, staff1);
    const heya = { id: heyaId, staffIds: ["s1"] };
    world.heyas.set(heyaId, heya as any);

    const bonuses = getHeyaStaffBonuses(world, heyaId);

    // Expected: 1.0 + (0.3 * 0.4) = 1.12 — fatigue > 80 applies 0.4 efficiency factor
    expect(bonuses.conditioning).toBeCloseTo(1.12);
  });
});
