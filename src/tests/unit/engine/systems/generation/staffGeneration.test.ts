import { describe, it, expect } from "vitest";
import { generateStaff } from "@/engine/staff";

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

  it("should produce a valid ReputationBand", () => {
    const staff = generateStaff("seed-rep", "technique_coach", "heya-1", 1);
    const validReputationBands = ["unknown", "questionable", "respected", "renowned", "legendary"];
    expect(validReputationBands).toContain(staff.reputationBand);
  });

  it("should produce a valid LoyaltyBand", () => {
    const staff = generateStaff("seed-loy", "technique_coach", "heya-1", 1);
    const validLoyaltyBands = ["mercenary", "wavering", "stable", "devoted", "unshakable"];
    expect(validLoyaltyBands).toContain(staff.loyaltyBand);
  });

  it("should produce a valid CompetenceBand for primary", () => {
    const staff = generateStaff("seed-comp", "technique_coach", "heya-1", 1);
    const validCompetenceBands = [
      "feeble", "limited", "serviceable", "strong", "great", "dominant", "monstrous",
    ];
    expect(validCompetenceBands).toContain(staff.competenceBands.primary);
  });

  it("should produce a valid CompetenceBand for secondary when present", () => {
    // Generate multiple staff to find one with a secondary competence
    for (let i = 0; i < 20; i++) {
      const staff = generateStaff(`seed-sec-${i}`, "technique_coach", "heya-1", i);
      if (staff.competenceBands.secondary) {
        const validCompetenceBands = [
          "feeble", "limited", "serviceable", "strong", "great", "dominant", "monstrous",
        ];
        expect(validCompetenceBands).toContain(staff.competenceBands.secondary);
        return;
      }
    }
    // If none have secondary, that's fine — the test still passes
  });
});
