import { describe, it, expect } from "vitest";
import { buildWeeklyDigest } from "../uiDigest";
import { projectRosterEntry, buildPrevRankScores, buildBanzukeRows } from "../uiModels";
import { generateWorld } from "../../engine/worldgen";
import { advanceDays } from "../../engine/tick/tickDaily";

describe("UI Digest", () => {
  it("should build a weekly digest safely when passed null or world", () => {
    // Should handle null gracefully
    const nullDigest = buildWeeklyDigest(null);
    expect(nullDigest).toBeNull();

    // Create a new world
    const world = generateWorld("test-uidigest-seed");
    if (!world.calendar) world.calendar = { year: 2025, month: 1, currentWeek: 1, currentDay: 1 };

    // Simulate a week to populate perceptions and events
    advanceDays(world, 7);

    const digest = buildWeeklyDigest(world);
    expect(digest).toBeDefined();

    expect(digest?.time.label).toBeDefined();
    expect(digest?.headline).toBeDefined();
    expect(digest?.counts.trainingEvents).toBeGreaterThanOrEqual(0);
    expect(digest?.counts.injuries).toBeGreaterThanOrEqual(0);
    expect(digest?.sections.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Banzuke Hysteresis Pipeline", () => {
  it("should generate UI-safe rank delta tokens and group rows accurately without React-layer math", () => {
    const world = generateWorld("test-banzuke-seed");
    
    // Fake a Rikishi in the active world
    const r = Array.from(world.rikishi.values())[0];
    r.rank = "maegashira";
    r.rankNumber = 5;
    r.side = "west";
    r.division = "makuuchi";

    // Simulate history data with previous banzuke positions
    const mockHistory = [
      {
        nextBanzuke: {
          divisions: {
            makuuchi: {
              assignments: [
                {
                  rikishiId: r.id,
                  position: { rank: "maegashira", rankNumber: 8, side: "east" }
                }
              ]
            }
          }
        }
      }
    ];

    const prevMap = buildPrevRankScores(mockHistory);
    // Maegashira 8 East = Tier 5 * 1000 = 5000 + (8 * 2) = 5016
    // Maegashira 5 West = Tier 5 * 1000 = 5000 + (5 * 2) + 0.5 = 5010.5
    // Diff = 5016 - 5010.5 = 5.5  -> steps: Math.round(5.5 / 2) = 3
    
    const entry = projectRosterEntry(r, world, prevMap.get(r.id));
    
    expect(entry.rankDelta).toBeDefined();
    expect(entry.rankDelta?.type).toBe("up");
    expect(entry.rankDelta?.steps).toBe(3);

    // Ensure New entry functionality works
    world.history = mockHistory as any; // Mock non-empty world history
    const newEntryR = Array.from(world.rikishi.values())[1];
    newEntryR.rank = "juryo";
    const newEntry = projectRosterEntry(newEntryR, world); // No prev score map matched
    expect(newEntry.rankDelta?.type).toBe("new");

    // Check Row Building groups correctly and maps rank tier class seamlessly
    const rows = buildBanzukeRows([entry], r.division, "");
    expect(rows.length).toBe(1);
    expect(rows[0].east).toBeNull();
    expect(rows[0].west?.id).toBe(r.id);
    expect(rows[0].rankTierClass).toBe(""); // Maegashira returns ""

    // Check rank formatting
    expect(rows[0].rankLabel).toBe("Maegashira #5");
  });
});
