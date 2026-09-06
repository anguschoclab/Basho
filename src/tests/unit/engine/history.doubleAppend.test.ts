/**
 * Verifies that runHistoryUpdates does NOT append to careerHistory.
 * careerHistory appending is the sole responsibility of publishBanzukeUpdate
 * (which also truncates to 6). The old runHistoryUpdates appended a duplicate
 * snapshot, causing 2 entries per basho → only 3 bashos of unique history
 * retained after the slice(-6) truncation.
 */
import { describe, it, expect } from "vitest";
import { runHistoryUpdates } from "@/engine/history";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "./utils";

describe("careerHistory double-append fix", () => {
  it("runHistoryUpdates does NOT append to careerHistory (publishBanzukeUpdate is sole appender)", () => {
    const rikishi = mockRikishi("r-double-append", {
      careerHistory: [
        {
          id: "ch-existing",
          bashoId: "hatsu-2025",
          year: 2025,
          month: 1,
          bashoName: "hatsu",
          rank: "maegashira",
          division: "makuuchi",
          rankNumber: 1,
          side: "east",
          wins: 10,
          losses: 5,
          absences: 0,
          isYusho: false,
          isJunYusho: false,
          specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
          weight: 120,
          momentum: 0,
        },
      ],
      careerWins: 50,
    });

    const world = makeMockWorld({
      activeRikishiIds: new Set(["r-double-append"]),
      rikishi: new Map([["r-double-append", rikishi]]),
      history: [
        {
          id: "hatsu-2026",
          bashoName: "hatsu",
          year: 2026,
          month: 1,
          yusho: "r-double-append",
          junYusho: [],
          shukunsho: null,
          kantosho: null,
          ginoSho: null,
        } as any,
      ],
      currentBashoName: "hatsu",
      calendar: { currentWeek: 1, month: 1, year: 2026 } as any,
      year: 2026,
    });

    const originalHistoryLength = rikishi.careerHistory!.length;
    const impact = runHistoryUpdates(world);
    const resolved = resolveImpacts(world, [impact]);

    const updatedRikishi = resolved.rikishi.get("r-double-append")!;
    // careerHistory should NOT have grown — runHistoryUpdates no longer appends.
    // publishBanzukeUpdate is the sole appender (with slice(-6) truncation).
    expect(updatedRikishi.careerHistory).toHaveLength(originalHistoryLength);
  });

  it("runHistoryUpdates still records milestones (yusho, career win thresholds)", () => {
    const rikishi = mockRikishi("r-milestones", {
      careerHistory: [],
      careerWins: 100, // Threshold milestone
      milestones: [],
    });

    const world = makeMockWorld({
      activeRikishiIds: new Set(["r-milestones"]),
      rikishi: new Map([["r-milestones", rikishi]]),
      history: [
        {
          id: "hatsu-2026",
          bashoName: "hatsu",
          year: 2026,
          month: 1,
          yusho: "r-milestones",
          junYusho: [],
          shukunsho: null,
          kantosho: null,
          ginoSho: null,
        } as any,
      ],
      currentBashoName: "hatsu",
      calendar: { currentWeek: 1, month: 1, year: 2026 } as any,
      year: 2026,
    });

    const impact = runHistoryUpdates(world);
    const resolved = resolveImpacts(world, [impact]);

    const updatedRikishi = resolved.rikishi.get("r-milestones")!;
    // Milestones should still be recorded
    expect(updatedRikishi.milestones).toBeDefined();
    expect(updatedRikishi.milestones!.length).toBeGreaterThan(0);
    // Should have a yusho milestone and a career-wins milestone
    const types = updatedRikishi.milestones!.map((m) => m.type);
    expect(types).toContain("yusho");
    expect(types).toContain("stats_record");
  });
});
