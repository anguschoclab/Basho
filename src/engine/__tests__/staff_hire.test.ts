import { describe, it, expect } from "vitest";
import { hireStaff } from "../staff";
import { WorldState } from "../types/world";
import { Heya } from "../types/heya";

describe("Staff Hiring", () => {
  it("should successfully hire staff if funds are sufficient", () => {
    const mockHeya: Partial<Heya> = {
      id: "heya-1",
      name: "Mock Heya",
      funds: 1000000,
      staffIds: [],
    };

    const mockWorld: Partial<WorldState> = {
      seed: "test-seed",
      heyas: new Map([["heya-1", mockHeya as Heya]]),
      staff: new Map(),
    };

    const staff = hireStaff(mockWorld as WorldState, "heya-1", "coach" as any);

    expect(staff).toBeDefined();
    expect(staff?.role).toBe("coach");
    expect(mockHeya.funds).toBe(500000);
    expect(mockHeya.staffIds).toContain(staff?.id);
    expect(mockWorld.staff?.has(staff!.id)).toBe(true);
  });

  it("should fail to hire staff if funds are insufficient", () => {
    const mockHeya: Partial<Heya> = {
      id: "heya-1",
      funds: 100000,
      staffIds: [],
    };

    const mockWorld: Partial<WorldState> = {
      seed: "test-seed",
      heyas: new Map([["heya-1", mockHeya as Heya]]),
      staff: new Map(),
    };

    const staff = hireStaff(mockWorld as WorldState, "heya-1", "coach" as any);

    expect(staff).toBeNull();
    expect(mockHeya.funds).toBe(100000);
    expect(mockHeya.staffIds?.length).toBe(0);
  });
});
