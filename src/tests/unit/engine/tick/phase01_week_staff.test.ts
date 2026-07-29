import { describe, it, expect, vi } from "vitest";
import { phase01_week_staff } from "@/engine/tick/phases/phase01_week_staff";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import * as staff from "@/engine/staff";

vi.mock("@/engine/staff", () => ({
  tickStaffWeek: vi.fn(() => ({ type: "staff_impact" })),
}));

describe("phase01_week_staff", () => {
  it("calls tickStaffWeek and returns the impact", () => {
    const world = MockFactory.createWorld();
    const impact = phase01_week_staff(world);
    expect(staff.tickStaffWeek).toHaveBeenCalledWith(world);
    expect(impact).toEqual({ type: "staff_impact" });
  });
});
