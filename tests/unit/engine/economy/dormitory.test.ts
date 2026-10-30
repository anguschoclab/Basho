import { describe, it, expect } from "vitest";
import { FACILITY_REGISTRY } from "@/engine/types/infrastructure";

describe("dormitory facility (P3)", () => {
  it("is a valid registered FacilityId with coherent costs and bonuses", () => {
    const dorm = FACILITY_REGISTRY.dormitory;
    expect(dorm).toBeTruthy();
    expect(dorm.id).toBe("dormitory");
    expect(dorm.baseCost).toBeGreaterThan(0);
    expect(dorm.maintenanceCost).toBeGreaterThan(0);
    expect(dorm.buildTimeBasho).toBeGreaterThanOrEqual(1);
    // Rest benefit: lowers the resting fatigue floor per level.
    expect(dorm.bonuses.fatigueFloor).toBeLessThan(0);
  });
});
