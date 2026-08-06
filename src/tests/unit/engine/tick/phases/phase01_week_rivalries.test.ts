import { describe, it, expect } from "vitest";
import { phase01_week_rivalries } from "../../../../../engine/tick/phases/phase01_week_rivalries";
import { MockFactory } from "../../../../helpers/utils/MockFactory";

describe("phase01_week_rivalries", () => {
  it("should decay active rivalries", () => {
    const world = MockFactory.createWorld();
    world.calendar = { year: 2025, currentWeek: 10 } as any;

    // Short term decay (2 weeks ago)
    const weeksSinceShort = 2;
    world.rivalriesState = {
      pairs: {
        "r1_r2": {
          rikishi1Id: "r1",
          rikishi2Id: "r2",
          heat: 50,
          closeness: 30,
          spite: 20,
          meetings: 3,
          lastMetWeek: 10 - weeksSinceShort,
          tone: "competitive"
        }
      }
    } as any;

    const impact = phase01_week_rivalries(world);

    expect(impact.worldFields?.rivalriesState).toBeDefined();
    const newPairs = (impact.worldFields?.rivalriesState as any).pairs;
    expect(newPairs["r1_r2"].heat).toBeLessThan(50);
  });

  it("should not decay already cold rivalries to save processing", () => {
    const world = MockFactory.createWorld();
    world.calendar = { year: 2025, currentWeek: 50 } as any; // 40 weeks ago
    world.rivalriesState = {
      pairs: {
        "r1_r2": {
          rikishi1Id: "r1",
          rikishi2Id: "r2",
          heat: 4, // Below MIN_HEAT
          closeness: 5,
          spite: 5,
          meetings: 1, // Below MIN_MEETINGS
          lastMetWeek: 10,
          tone: "cold"
        }
      }
    } as any;

    const impact = phase01_week_rivalries(world);

    // Because it's completely skipped, the `nextPairs` object will not include it.
    // Verify that the resulting pairs object is explicitly empty, showing it was correctly pruned.
    const newPairs = (impact.worldFields?.rivalriesState as any).pairs;
    expect(newPairs).toEqual({});
  });

  it("should trim stale events from the event log", () => {
    const world = MockFactory.createWorld();
    world.calendar = { year: 2025, currentWeek: 50 } as any;
    world.events = {
      log: [
        // Very old minor event (should be trimmed)
        { year: 2024, week: 1, importance: "minor", category: "training" },
        // Very old headline (should be kept)
        { year: 2024, week: 1, importance: "headline", category: "career" },
        // Recent minor event (should be kept)
        { year: 2025, week: 49, importance: "minor", category: "training" }
      ]
    } as any;

    const impact = phase01_week_rivalries(world);

    const newEvents = (impact.worldFields?.events as any).log;
    expect(newEvents.length).toBe(2);
    expect(newEvents[0].importance).toBe("headline");
    expect(newEvents[1].year).toBe(2025);
  });
});
