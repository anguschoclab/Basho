import { describe, it, expect } from "vitest";
import { runHoliday } from "@/engine/holiday";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { HolidayConfig } from "@/engine/holiday";
import type { WorldState } from "@/engine/types/world";

describe("GO_ON_HOLIDAY worker command — runHoliday integration", () => {
  it("runHoliday advances the world state", () => {
    const world = generateInitialWorld("holiday-test-1");
    const startDay = world.dayIndexGlobal ?? 0;
    const config: HolidayConfig = {
      target: "nextWeek",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.daysAdvanced).toBeGreaterThan(0);
    expect(result.reports.length).toBeGreaterThan(0);
    // The last report should have advanced dayIndexGlobal
    const finalWorld = result.reports[result.reports.length - 1];
    expect(finalWorld.dayIndexGlobal).toBeGreaterThan(startDay);
  });

  it("runHoliday returns a digest with a headline", () => {
    const world = generateInitialWorld("holiday-test-2");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.digest).toBeDefined();
    expect(result.digest.headline).toBeDefined();
    expect(typeof result.digest.headline).toBe("string");
  });

  it("runHoliday with nextDay target advances at least 1 day", () => {
    const world = generateInitialWorld("holiday-test-3");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.daysAdvanced).toBeGreaterThanOrEqual(1);
  });

  it("runHoliday returns phaseOnExit", () => {
    const world = generateInitialWorld("holiday-test-4");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.phaseOnExit).toBeDefined();
    expect(typeof result.phaseOnExit).toBe("string");
  });
});
