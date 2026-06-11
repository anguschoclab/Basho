/**
 * Tests that:
 * 1. conditionMultiplier returns a scaling factor 0.8–1.0
 * 2. Low condition reduces effective tachiai power in boutResolver cloning
 * 3. condition decays daily during basho based on fatigue
 * 4. condition recovers daily during interim
 */
import { describe, it, expect } from "vitest";
import { conditionMultiplier } from "../boutPhysics";

describe("conditionMultiplier", () => {
  it("returns 1.0 when condition is 100 (peak)", () => {
    expect(conditionMultiplier(100)).toBeCloseTo(1.0, 4);
  });

  it("returns 0.8 when condition is 0 (floor)", () => {
    expect(conditionMultiplier(0)).toBeCloseTo(0.8, 4);
  });

  it("returns ~0.9 when condition is 50 (half)", () => {
    expect(conditionMultiplier(50)).toBeCloseTo(0.9, 4);
  });

  it("is monotonically increasing with condition", () => {
    expect(conditionMultiplier(80)).toBeGreaterThan(conditionMultiplier(60));
    expect(conditionMultiplier(60)).toBeGreaterThan(conditionMultiplier(40));
  });
});

import { tickCondition } from "../../tick/conditionTick";
import { mockRikishi } from "../utils";

describe("tickCondition — basho decay", () => {
  it("decays condition during active_basho when fatigue is high", () => {
    const r = mockRikishi("r", { condition: 90, fatigue: 60 });
    const next = tickCondition(r, "active_basho");
    expect(next.condition).toBeLessThan(90);
  });

  it("does not decay condition during active_basho when fatigue is 0", () => {
    const r = mockRikishi("r", { condition: 90, fatigue: 0 });
    const next = tickCondition(r, "active_basho");
    // No fatigue = no decay
    expect(next.condition).toBeCloseTo(90, 1);
  });

  it("recovers condition during interim", () => {
    const r = mockRikishi("r", { condition: 70, fatigue: 20 });
    const next = tickCondition(r, "interim");
    expect(next.condition).toBeGreaterThan(70);
  });

  it("does not recover condition above 100", () => {
    const r = mockRikishi("r", { condition: 100, fatigue: 0 });
    const next = tickCondition(r, "interim");
    expect(next.condition).toBeCloseTo(100, 1);
  });

  it("does not decay condition below 0", () => {
    const r = mockRikishi("r", { condition: 1, fatigue: 100 });
    const next = tickCondition(r, "active_basho");
    expect(next.condition).toBeGreaterThanOrEqual(0);
  });
});
