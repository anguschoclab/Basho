/**
 * GoOnHolidayCommand.test.ts — tests GO_ON_HOLIDAY worker command.
 * Plan Feature 8 Test-First Protocol items 1-2.
 */
import { describe, it, expect } from "vitest";
import { runHoliday } from "@/engine/holiday";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { HolidayConfig } from "@/engine/holiday";

describe("GO_ON_HOLIDAY worker command", () => {
  it("GO_ON_HOLIDAY command type is defined", () => {
    const cmd = { type: "GO_ON_HOLIDAY" as const, config: { target: "nextWeek" } as HolidayConfig };
    expect(cmd.type).toBe("GO_ON_HOLIDAY");
    expect(cmd.config.target).toBe("nextWeek");
  });

  it("runHoliday returns a HolidayResult", () => {
    const world = generateInitialWorld("holiday-cmd-test");
    const config: HolidayConfig = {
      target: "nextWeek",
      gates: [],
      delegationPolicy: { autoAccept: false, autoReject: false } as any,
      playerHeyaId: world.playerHeyaId ?? "",
    };
    const result = runHoliday(world, config);
    expect(result).toBeDefined();
    expect(typeof result.daysAdvanced).toBe("number");
  });
});
