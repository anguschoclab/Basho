import { describe, it, expect } from "vitest";
import { SimTuningService } from "@/engine/simulation/SimTuningService";
import { mockRikishi, makeMockWorld } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("SimTuningService — retirement age metric filters impossible ages", () => {
  it("filters out corrupt retirement records (negative or impossible ages)", () => {
    // Valid retiree: age 30 (birthYear 1995, retirementYear 2025)
    const valid = mockRikishi("valid", { birthYear: 1995 });
    (valid as Rikishi).isRetired = true;
    (valid as Rikishi).retirementYear = 2025;

    // Corrupt retiree: retirementYear 2026, birthYear 2044 => age -18
    const corrupt = mockRikishi("corrupt", { birthYear: 2044 });
    (corrupt as Rikishi).isRetired = true;
    (corrupt as Rikishi).retirementYear = 2026;

    const world = makeMockWorld({ year: 2025, seed: "test-tuning" });
    world.rikishi.set("valid", valid);
    world.rikishi.set("corrupt", corrupt);

    const metrics = SimTuningService.calculateMetrics(world);

    expect(metrics.retirementAges).toEqual([30]);
    expect(metrics.averageRetirementAge).toBe(30);
  });
});
