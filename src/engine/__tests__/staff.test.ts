import { expect, test, describe } from "bun:test";
import { generateStaff, tickStaffWeek, tickStaffYear } from "../staff";
import { WorldState } from "../types/world";
import { Staff } from "../types/staff";

describe("Staff System", () => {
  test("generates staff deterministically", () => {
    const staff1 = generateStaff("seed1", "technique_coach", "heya1", 0);
    const staff2 = generateStaff("seed1", "technique_coach", "heya1", 0);
    const staff3 = generateStaff("seed2", "technique_coach", "heya1", 0);

    expect(staff1.id).toBe(staff2.id);
    expect(staff1.age).toBe(staff2.age);
    expect(staff1.competenceBands.primary).toBe(staff2.competenceBands.primary);

    expect(staff1.id).not.toBe(staff3.id);
  });

  test("ticks fatigue weekly", () => {
    const staff1 = generateStaff("seed1", "medical_staff", "heya1", 0);
    staff1.fatigue = 50;

    const world: Partial<WorldState> = {
      staff: new Map<string, Staff>([[staff1.id, staff1]]),
      week: 2,
    };

    tickStaffWeek(world as WorldState);
    expect(staff1.fatigue).toBe(51);

    staff1.fatigue = 100;
    tickStaffWeek(world as WorldState);
    expect(staff1.fatigue).toBe(100);
  });

  test("handles career phase transitions over years", () => {
    const staff1 = generateStaff("seed1", "assistant_oyakata", "heya1", 0);
    staff1.age = 29;
    staff1.careerPhase = "apprentice";

    const world: Partial<WorldState> = {
      staff: new Map<string, Staff>([[staff1.id, staff1]]),
      week: 1, // trigger year boundary in the tick (if we use that)
      year: 2026,
    };

    tickStaffYear(world as WorldState);
    expect(staff1.age).toBe(30);
    expect(staff1.careerPhase).toBe("established");

    staff1.age = 44;
    tickStaffYear(world as WorldState);
    expect(staff1.age).toBe(45);
    expect(staff1.careerPhase).toBe("senior");

    staff1.age = 54;
    tickStaffYear(world as WorldState);
    expect(staff1.age).toBe(55);
    expect(staff1.careerPhase).toBe("declining");

    staff1.age = 64;
    tickStaffYear(world as WorldState);
    expect(staff1.age).toBe(65);
    expect(staff1.careerPhase).toBe("retired");
  });
});
