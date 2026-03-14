import { describe, it, expect } from "vitest";
import { buildWeeklyDigest } from "../uiDigest";
import { generateWorld } from "../worldgen";
import { advanceDays } from "../dailyTick";

describe("UI Digest", () => {
  it("should build a weekly digest safely when passed null or world", () => {
    // Should handle null gracefully
    const nullDigest = buildWeeklyDigest(null);
    expect(nullDigest).toBeNull();

    // Create a new world
    const world = generateWorld("test-uidigest-seed");

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
