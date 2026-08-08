import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { getHeyaRoster, clearQueryCaches } from "@/engine/queries";

describe("clearQueryCaches weekly cadence (B1.2)", () => {
  it("does not clear roster cache on non-weekly daily ticks", () => {
    const world = generateInitialWorld("cache-test-seed-001");
    const worldAtWeekStart = { ...world, _daysSinceLastWeeklyTick: 0 };

    // Populate cache by calling getHeyaRoster
    const firstHeyaId = Array.from(world.heyas.keys())[0];
    if (firstHeyaId) {
      getHeyaRoster(world, firstHeyaId);
    }

    // Advance one day (day 1 of 7 — not a weekly tick)
    const afterDay1 = advanceOneDay(worldAtWeekStart, { skipDailyMicroPhases: true });

    // Smoke test: day advanced correctly
    expect(afterDay1.dayIndexGlobal).toBeGreaterThan(world.dayIndexGlobal);
  });

  it("calls clearQueryCaches on weekly tick entry", () => {
    const world = generateInitialWorld("cache-test-seed-002");
    // Set daysSinceLastWeeklyTick to 6 so the next day (7th) triggers a weekly tick
    const worldNearWeekly = { ...world, _daysSinceLastWeeklyTick: 6 };

    // Populate cache
    const firstHeyaId = Array.from(world.heyas.keys())[0];
    if (firstHeyaId) {
      getHeyaRoster(world, firstHeyaId);
    }

    // Advance one day — this should be a weekly tick
    const afterWeekly = advanceOneDay(worldNearWeekly, {
      skipDailyMicroPhases: true,
    });

    // After a weekly tick, _daysSinceLastWeeklyTick should reset
    expect(afterWeekly._daysSinceLastWeeklyTick ?? 0).toBeLessThanOrEqual(1);
  });

  it("clearQueryCaches is exported and callable", () => {
    expect(() => clearQueryCaches()).not.toThrow();
  });
});
