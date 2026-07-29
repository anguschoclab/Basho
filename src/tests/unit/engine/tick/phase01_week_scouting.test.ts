import { describe, it, expect, vi } from "vitest";
import { phase01_week_scouting } from "@/engine/tick/phases/phase01_week_scouting";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import * as scoutingStore from "@/engine/scoutingStore";

vi.mock("@/engine/scoutingStore", () => ({
  tickWeekScouting: vi.fn(() => ({ type: "scouting_impact" })),
}));

describe("phase01_week_scouting", () => {
  it("calls tickWeekScouting and returns the impact", () => {
    const world = MockFactory.createWorld();
    const impact = phase01_week_scouting(world);
    expect(scoutingStore.tickWeekScouting).toHaveBeenCalledWith(world);
    expect(impact).toEqual({ type: "scouting_impact" });
  });
});
