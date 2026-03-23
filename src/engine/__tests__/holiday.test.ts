import { describe, it, expect } from "vitest";
import { runHoliday, type HolidayConfig } from "../holiday";
import { generateWorld } from "../worldgen";
import type { CyclePhase } from "../types/world";

describe("runHoliday", () => {
  it("should advance one day when target is nextDay", () => {
    const world = generateWorld("test-holiday-seed");
    const startDay = world.dayIndexGlobal ?? 0;

    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced"
    };

    const result = runHoliday(world, config);

    expect(result.daysAdvanced).toBe(1);
    expect(world.dayIndexGlobal).toBe(startDay + 1);
    expect(result.gateTriggered).toBeNull();
  });

  it("should advance 7 days when target is nextWeek", () => {
    const world = generateWorld("test-holiday-seed");
    const startDay = world.dayIndexGlobal ?? 0;

    const config: HolidayConfig = {
      target: "nextWeek",
      gates: [],
      delegationPolicy: "balanced"
    };

    const result = runHoliday(world, config);

    expect(result.daysAdvanced).toBe(7);
    expect(world.dayIndexGlobal).toBe(startDay + 7);
  });

  it("should advance 30 days when target is nextMonth and not interrupted by basho", () => {
    const world = generateWorld("test-holiday-seed");
    // Ensure we don't start right before an active basho, or it will interrupt
    world.cyclePhase = "interim";
    world._interimDaysRemaining = 100;

    const startDay = world.dayIndexGlobal ?? 0;

    const config: HolidayConfig = {
      target: "nextMonth",
      gates: [],
      delegationPolicy: "balanced"
    };

    const result = runHoliday(world, config);

    expect(result.daysAdvanced).toBe(30);
    expect(world.dayIndexGlobal).toBe(startDay + 30);
  });

  it("should stop if it hits an active basho when target is nextMonth", () => {
    const world = generateWorld("test-holiday-seed");
    world.cyclePhase = "interim";
    world._interimDaysRemaining = 0; // Pre-basho will be next

    const config: HolidayConfig = {
      target: "nextMonth",
      gates: [],
      delegationPolicy: "balanced"
    };

    const result = runHoliday(world, config);

    // Interim remaining is 0 -> advances 7 days to pre_basho, then 1 day into basho -> stops
    // (Because the cap loop logic:
    //   if (world.cyclePhase === "active_basho" && config.target !== "endOfBasho"...) break;
    // )
    expect(result.daysAdvanced).toBeLessThan(30);
  });

  it("should advance to end of basho when target is endOfBasho", () => {
    const world = generateWorld("test-holiday-seed");

    // Manually set to active basho on day 5
    world.cyclePhase = "active_basho";
    world.currentBasho = { day: 5 } as any;
    const startDay = world.dayIndexGlobal ?? 0;

    const config: HolidayConfig = {
      target: "endOfBasho",
      gates: [],
      delegationPolicy: "balanced"
    };

    const result = runHoliday(world, config);

    // Day 5 -> Day 15 is 10 days
    expect(result.daysAdvanced).toBe(10);
  });

  it("should trigger safety gates correctly", () => {
    const world = generateWorld("test-holiday-seed");
    const heyaId = Array.from(world.heyas.keys())[0];
    const heya = world.heyas.get(heyaId);

    if (heya) {
        // Trigger insolvency gate
        heya.funds = -1000;
    }

    const config: HolidayConfig = {
      target: "nextMonth",
      // "insolvencyWarning" checks < 1000000, "loanDefault" checks < 0
      gates: ["insolvencyWarning", "loanDefault"],
      delegationPolicy: "balanced",
      playerHeyaId: heyaId
    };

    const result = runHoliday(world, config);

    expect(result.gateTriggered).not.toBeNull();
    // It triggers insolvencyWarning first since it evaluates gates in order
    expect(result.gateTriggered?.gate).toBe("insolvencyWarning");

    // Interrupted early, so shouldn't advance full target
    expect(result.daysAdvanced).toBeLessThan(30);
  });

  it("should return early if already in active basho and target is nextBashoDay1", () => {
    const world = generateWorld("test-holiday-seed");
    world.cyclePhase = "active_basho";

    const config: HolidayConfig = {
      target: "nextBashoDay1",
      gates: [],
      delegationPolicy: "balanced"
    };

    const result = runHoliday(world, config);

    expect(result.daysAdvanced).toBe(0);
  });
});
