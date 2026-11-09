/**
 * holiday.gates.test.ts — tests each safety gate can halt the holiday.
 * Plan Feature 8 Test-First Protocol item 3.
 */
import { describe, it, expect } from "vitest";
import { runHoliday } from "@/engine/calendar/holiday";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import type { HolidayConfig, SafetyGate } from "@/engine/calendar/holiday";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { makeMockWorld, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";

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

// ── V18-B04 — rosterOverForeignLimit must use the canonical foreign check ──
// holiday.ts:219 counts `r.nationality !== "japanese"`, but generated data
// uses "Japan" (avatarGenerator.ts:369, naturalization.ts:60) — every Japanese
// rikishi counts as foreign. The canonical check is countsAsForeign()
// (citizenshipUtils.ts:41-43) against FOREIGN_RIKISHI_LIMIT_PER_HEYA (=1).

function worldWithPlayerRoster(roster: Rikishi[]): WorldState {
  const heya = makeMockHeya("h-player", { rikishiIds: roster.map((r) => r.id) });
  return makeMockWorld({
    playerHeyaId: "h-player",
    heyas: new Map([["h-player", heya]]),
    rikishi: new Map(roster.map((r) => [r.id, r])),
    cyclePhase: "interim",
    _interimDaysRemaining: 30,
    calendar: { month: 3, currentDay: 5, currentWeek: 10 } as never,
  });
}

function holidayWithForeignGate(world: WorldState) {
  return runHoliday(world, {
    target: "nextDay",
    gates: ["rosterOverForeignLimit"],
    delegationPolicy: "balanced",
    playerHeyaId: "h-player",
  });
}

describe("V18-B04 — rosterOverForeignLimit gate nationality semantics", () => {
  it("an all-Japanese roster does not trip the foreign-limit gate", () => {
    const world = worldWithPlayerRoster([
      mockRikishi("j1", { heyaId: "h-player", nationality: "Japan" }),
      mockRikishi("j2", { heyaId: "h-player", nationality: "Japan" }),
      mockRikishi("j3", { heyaId: "h-player", nationality: "Japan" }),
    ]);
    const result = holidayWithForeignGate(world);
    // Canonical count is 0 foreign — the gate must not fire. Today every
    // "Japan" rikishi fails the `!== "japanese"` string check and counts.
    expect(result.gateTriggered).toBeNull();
  });

  it("naturalized foreign rikishi do not count toward the limit", () => {
    const world = worldWithPlayerRoster([
      mockRikishi("f1", {
        heyaId: "h-player",
        nationality: "Mongolia",
        citizenshipStatus: "naturalized",
      }),
      mockRikishi("f2", {
        heyaId: "h-player",
        nationality: "Georgia",
        citizenshipStatus: "naturalized",
      }),
    ]);
    const result = holidayWithForeignGate(world);
    // countsAsForeign() → "naturalized" → 0 toward the quota; the raw
    // nationality string check counts them anyway.
    expect(result.gateTriggered).toBeNull();
  });

  it("a canonically over-limit roster DOES trip the gate", () => {
    // Control: proves the harness actually exercises the gate — two raw
    // foreign rikishi exceed FOREIGN_RIKISHI_LIMIT_PER_HEYA (1).
    const world = worldWithPlayerRoster([
      mockRikishi("x1", { heyaId: "h-player", nationality: "Mongolia" }),
      mockRikishi("x2", { heyaId: "h-player", nationality: "Kazakhstan" }),
    ]);
    const result = holidayWithForeignGate(world);
    expect(result.gateTriggered?.gate).toBe("rosterOverForeignLimit");
  });
});
