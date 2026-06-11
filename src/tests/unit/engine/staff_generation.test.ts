import { describe, it, expect } from "vitest";
import { generateStaff } from "../staff";

describe("generateStaff", () => {
  it("should generate a staff member deterministically", () => {
    const seed = "test-seed-123";
    const role = "technique_coach";
    const heyaId = "heya-1";
    const sequence = 1;

    const staff1 = generateStaff(seed, role, heyaId, sequence);
    const staff2 = generateStaff(seed, role, heyaId, sequence);

    expect(staff1).toEqual(staff2);
  });

  it("should generate different staff members for different seeds", () => {
    const role = "technique_coach";
    const heyaId = "heya-1";
    const sequence = 1;

    const staff1 = generateStaff("seed1", role, heyaId, sequence);
    const staff2 = generateStaff("seed2", role, heyaId, sequence);

    expect(staff1.id).not.toBe(staff2.id);
  });

  it("should generate different staff members for different sequences", () => {
    const seed = "test-seed-123";
    const role = "technique_coach";
    const heyaId = "heya-1";

    const staff1 = generateStaff(seed, role, heyaId, 1);
    const staff2 = generateStaff(seed, role, heyaId, 2);

    expect(staff1.id).not.toBe(staff2.id);
  });

  it("should generate staff with properties within expected bounds", () => {
    const staff = generateStaff("test-seed-bounds", "medical_staff", "heya-1", 1);

    expect(staff.role).toBe("medical_staff");
    expect(staff.heyaId).toBe("heya-1");
    expect(typeof staff.name).toBe("string");

    // Bounds check
    expect(staff.age).toBeGreaterThanOrEqual(25); // STAFF_BASE_AGE = 25
    expect(staff.fatigue).toBeGreaterThanOrEqual(0);
    expect(staff.fatigue).toBeLessThanOrEqual(100);

    expect(staff.morale).toBeGreaterThanOrEqual(0);
    expect(staff.morale).toBeLessThanOrEqual(100);

    // Array type bounds
    const validPhases = ["apprentice", "established", "senior", "declining", "retired"];
    expect(validPhases).toContain(staff.careerPhase);

    expect(staff.priorAffiliations).toEqual([]);
  });

  it("should handle successorEligible flag correctly based on role", () => {
    // Only assistant_oyakata can be successor eligible based on code logic
    const scout = generateStaff("seed-scout", "scout", "heya-1", 1);
    expect(scout.successorEligible).toBe(false);
  });
});
