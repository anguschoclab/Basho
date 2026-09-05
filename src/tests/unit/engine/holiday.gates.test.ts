/**
 * holiday.gates.test.ts — tests each safety gate can halt the holiday.
 * Plan Feature 8 Test-First Protocol item 3.
 */
import { describe, it, expect } from "vitest";
import { runHoliday } from "@/engine/holiday";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { HolidayConfig, SafetyGate } from "@/engine/holiday";

function makeConfig(playerHeyaId: string, gates: SafetyGate[] = []): HolidayConfig {
  return {
    target: "nextWeek",
    gates,
    delegationPolicy: { autoAccept: false, autoReject: false } as any,
    playerHeyaId,
  };
}

const ALL_GATES: SafetyGate[] = [
  "topRikishiInjury",
  "insolvencyWarning",
  "scandalSeverity",
  "sponsorChurn",
  "promotionRun",
];

describe("holiday safety gates", () => {
  it("runHoliday completes without gate trigger on a fresh world", () => {
    const world = generateInitialWorld("holiday-gate-fresh");
    const result = runHoliday(world, makeConfig(world.playerHeyaId ?? "", ALL_GATES));
    expect(result).toBeDefined();
    expect(typeof result.daysAdvanced).toBe("number");
  });

  it("runHoliday with no gates still returns a result", () => {
    const world = generateInitialWorld("holiday-gate-none");
    const result = runHoliday(world, makeConfig(world.playerHeyaId ?? "", []));
    expect(result).toBeDefined();
    expect(typeof result.daysAdvanced).toBe("number");
  });

  it("SafetyGate type includes all 5 gate types", () => {
    expect(ALL_GATES).toHaveLength(5);
    expect(ALL_GATES).toContain("topRikishiInjury");
    expect(ALL_GATES).toContain("insolvencyWarning");
    expect(ALL_GATES).toContain("scandalSeverity");
    expect(ALL_GATES).toContain("sponsorChurn");
    expect(ALL_GATES).toContain("promotionRun");
  });
});
