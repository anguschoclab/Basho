import { describe, it, expect } from "vitest";
import { CareerService } from "@/engine/lifecycle/CareerService";
import { runRetirements } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("retirementYearConsistency — all paths stamp world.year", () => {
  it("CareerService.processRetirements stamps retirementYear = world.year (2050)", () => {
    const r = mockRikishi("r45a", { birthYear: 2005, rank: "maegashira", power: 60 });
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r45a"] });
    const world = makeMockWorld({
      year: 2050,
      calendar: { currentWeek: 1, },
      seed: "test-career-year",
    });
    world.rikishi.set("r45a", r);
    world.heyas.set("heya-1", heya);

    const impact = CareerService.processRetirements(world);
    const resolved = resolveImpacts(world, [impact]);
    const retired = resolved.historicalRikishi.get("r45a") as Rikishi | undefined;

    expect(retired?.isRetired).toBe(true);
    expect(retired?.retirementYear).toBe(2050);
  });

  it("runRetirements stamps retirementYear = world.year (2050)", () => {
    const r = mockRikishi("r45b", { birthYear: 2005, rank: "maegashira", power: 60 });
    const heya = makeMockHeya("heya-2", { rikishiIds: ["r45b"] });
    const world = makeMockWorld({
      year: 2050,
      calendar: { currentWeek: 1, },
      seed: "test-gov-year",
    });
    world.rikishi.set("r45b", r);
    world.heyas.set("heya-2", heya);

    const impact = runRetirements(world);
    const resolved = resolveImpacts(world, [impact]);
    const retired = resolved.historicalRikishi.get("r45b") as Rikishi | undefined;

    expect(retired?.isRetired).toBe(true);
    expect(retired?.retirementYear).toBe(2050);
  });
});
