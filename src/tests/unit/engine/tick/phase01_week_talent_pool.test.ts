import { describe, it, expect, vi } from "vitest";
import { phase01_week_talent_pool } from "@/engine/tick/phases/phase01_week_talent_pool";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import * as talentpool from "@/engine/systems/generation/TalentPoolService";

vi.mock("@/engine/systems/generation/TalentPoolService", () => ({
  tickWeekTalentPool: vi.fn(() => ({ type: "talent_pool_impact" })),
}));

describe("phase01_week_talent_pool", () => {
  it("calls tickWeekTalentPool and returns the impact", () => {
    const world = MockFactory.createWorld();
    const impact = phase01_week_talent_pool(world);
    expect(talentpool.tickWeekTalentPool).toHaveBeenCalledWith(world);
    expect(impact).toEqual({ type: "talent_pool_impact" });
  });
});
