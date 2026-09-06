import { describe, it, expect } from "vitest";
import { runHoliday } from "@/engine/holiday";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { HolidayConfig } from "@/engine/holiday";
import type { WorldState } from "@/engine/types/world";
import { logEventImpact } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { selectHolidayDigest } from "@/presenters/projections/holidayDigestProjections";

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

  it("logging holiday_return event makes selectHolidayDigest return the digest", () => {
    // Regression: the GO_ON_HOLIDAY worker handler previously dropped result.digest
    // and never logged a holiday_return event, so the Dashboard "Holiday Return
    // Digest" section could never render. This test mirrors the worker handler's
    // event-logging path and verifies the projection picks it up.
    const world = generateInitialWorld("holiday-digest-test");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result).toBeDefined();

    let finalWorld: WorldState = result.reports[result.reports.length - 1];
    const incidents = result.digest.categories.flatMap((c) =>
      c.items.map((item) => ({ type: c.id, description: item }))
    );
    const holidayEventImpact = logEventImpact(
      "MANAGEMENT_DECISION",
      "ai_decision",
      {
        status: "holiday_return",
        eventId: "holiday_return",
        target: config.target,
        daysAdvanced: result.daysAdvanced,
        summary: result.digest.headline,
        incidents,
      },
      "GO_ON_HOLIDAY",
      { importance: "headline" }
    );
    finalWorld = resolveImpacts(finalWorld, [holidayEventImpact]);

    const digest = selectHolidayDigest(finalWorld);
    expect(digest).not.toBeNull();
    expect(digest?.returnEventId).toBe("holiday_return");
    expect(digest?.target).toBe("nextDay");
    expect(digest?.daysAdvanced).toBe(result.daysAdvanced);
    expect(digest?.summary).toBe(result.digest.headline);
  });
});
