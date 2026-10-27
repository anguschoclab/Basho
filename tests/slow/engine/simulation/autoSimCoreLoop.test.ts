import { describe, it, expect } from "vitest";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { makeMockWorld } from "@tests/unit/engine/utils";

/**
 * runAutoSim core-loop coverage — relocated from the unit suite because
 * `noSubprocessInUnitTests` bans runAutoSim from src/tests/unit (it drives
 * multi-basho sims, incl. a 600-basho untilEvent case). Lives in the slow
 * suite per the fast-by-default philosophy.
 */
describe("runAutoSim", () => {
  it("should run the simulation for exactly 1 basho", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "basho", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(1);
    expect(result.stoppedBy).toBe("completed");
    expect(result.daysSimulated).toBe(64); // 15 + 7 + 42
  });

  it("should run the simulation for days-based duration (30 days = 2 bashos)", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "days", count: 30 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(2);
    expect(result.stoppedBy).toBe("completed");
  });

  it("should run the simulation for weeks-based duration (10 weeks = 2 bashos)", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "weeks", count: 10 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(2);
    expect(result.stoppedBy).toBe("completed");
  });

  it("should run the simulation for months-based duration (4 months = 2 bashos)", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "months", count: 4 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(2);
    expect(result.stoppedBy).toBe("completed");
  });

  it("should run the simulation for years-based duration (1 year = 6 bashos)", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "years", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(6);
    expect(result.stoppedBy).toBe("completed");
  });

  it("should run the simulation for untilEvent duration with 'never' stopping early", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "untilEvent", eventType: "never" },
      // Use an event that stops it on the first iteration to prevent infinite loop/600 basho run
      stopConditions: ["never"],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    // With `never` as stopCondition, it will hit the 100-year cap (600 bashos).
    expect(result.bashoSimulated).toBe(600);
    expect(result.stoppedBy).toBe("completed");
  });

  it("should correctly log verbosity detailed highlights", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "basho", count: 1 },
      stopConditions: [],
      verbosity: "detailed",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(1);
    expect(result.chronicle.highlights.length).toBeGreaterThan(0);
  });

  it("should return early if duration count is 0", () => {
    const world = makeMockWorld();
    const result = runAutoSim(world, {
      duration: { type: "days", count: 0 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "conservative",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(0);
  });
});
