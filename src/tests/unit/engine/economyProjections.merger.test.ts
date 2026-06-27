 
import { describe, it, expect } from "vitest";
import { projectMergerWarnings } from "@/presenters/projections/economyProjections";
import { makeMockWorld, makeMockHeya } from "./utils";
import {
  CHRONIC_UNDERPERFORMANCE_BASHO,
  PRESTIGE_COLLAPSE_BAND,
  NON_FINANCIAL_MERGER_MAX_ROSTER,
} from "@/constants/engine/economic";

describe("projectMergerWarnings — non-financial warnings", () => {
  it("includes stables with chronic underperformance + prestige collapse", () => {
    const world = makeMockWorld();

    const struggling = makeMockHeya("heya-struggle", {
      prestigeBand: PRESTIGE_COLLAPSE_BAND as any,
      funds: 500_000,
      consecutiveUnderperformanceBasho: CHRONIC_UNDERPERFORMANCE_BASHO,
      rikishiIds: ["r1", "r2"],
    });
    world.heyas.set("heya-struggle", struggling);

    const healthy = makeMockHeya("heya-healthy", {
      prestigeBand: "respected",
      funds: 10_000_000,
      rikishiIds: ["r3", "r4", "r5"],
    });
    world.heyas.set("heya-healthy", healthy);

    const warnings = projectMergerWarnings(world);

    const struggleWarning = warnings.find((w) => w.heyaId === "heya-struggle");
    expect(struggleWarning).toBeDefined();
    expect(struggleWarning!.warningType).toBe("non_financial");
  });

  it("includes financial warnings alongside non-financial", () => {
    const world = makeMockWorld();

    const inDebt = makeMockHeya("heya-debt", {
      funds: -20_000_000,
      rikishiIds: ["r1"],
    });
    world.heyas.set("heya-debt", inDebt);

    const struggling = makeMockHeya("heya-struggle", {
      prestigeBand: PRESTIGE_COLLAPSE_BAND as any,
      funds: 500_000,
      consecutiveUnderperformanceBasho: CHRONIC_UNDERPERFORMANCE_BASHO,
      rikishiIds: ["r2", "r3"],
    });
    world.heyas.set("heya-struggle", struggling);

    const warnings = projectMergerWarnings(world);

    expect(warnings.find((w) => w.heyaId === "heya-debt")).toBeDefined();
    expect(warnings.find((w) => w.heyaId === "heya-struggle")).toBeDefined();
  });

  it("does NOT include healthy stables", () => {
    const world = makeMockWorld();

    const healthy = makeMockHeya("heya-healthy", {
      prestigeBand: "respected",
      funds: 10_000_000,
      rikishiIds: ["r1", "r2", "r3"],
    });
    world.heyas.set("heya-healthy", healthy);

    const warnings = projectMergerWarnings(world);
    expect(warnings.find((w) => w.heyaId === "heya-healthy")).toBeUndefined();
  });
});
