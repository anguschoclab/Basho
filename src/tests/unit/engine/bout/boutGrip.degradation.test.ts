import { describe, it, expect } from "vitest";
import { initBeltBattle, evolveGripGeometry } from "@/engine/bout/boutGrip";
import { mockRikishi } from "../utils";
import { SeededRNG } from "@/engine/rng";

describe("grip degradation under pressure (1.8)", () => {
  it("grip strength decays under pressure when torque differential exceeds threshold", () => {
    const east = mockRikishi("r1", { technique: 70, power: 80 });
    const west = mockRikishi("r2", { technique: 50, power: 40 });
    const rng = new SeededRNG("test-pressure-decay");
    const belt = initBeltBattle(rng, east, west, "east");

    // Set up morozashi for east (both inside)
    if (belt.eastLeft) belt.eastLeft.isInside = true;
    if (belt.eastLeft) belt.eastLeft.armReach = 0.14;
    if (belt.eastRight) belt.eastRight.isInside = true;
    if (belt.eastRight) belt.eastRight.armReach = 0.14;

    // Recalculate torque to create large differential
    belt.torqueEast = 100;
    belt.torqueWest = 10;

    const initialWestStrength = belt.westRight?.gripStrength ?? 1.0;
    evolveGripGeometry(rng, east, west, belt);

    // West grip strength should decay due to pressure
    expect(belt.westRight?.gripStrength).toBeLessThan(initialWestStrength);
  });

  it("grip class downgrades from morozashi when one arm is broken under pressure", () => {
    const east = mockRikishi("r1", { technique: 80, power: 90 });
    const west = mockRikishi("r2", { technique: 40, power: 30 });
    const rng = new SeededRNG("test-grip-break");
    const belt = initBeltBattle(rng, east, west, "east");

    // Set up morozashi for west (both inside) — west has dominant grip but weak technique
    if (belt.westLeft) belt.westLeft.isInside = true;
    if (belt.westLeft) belt.westLeft.armReach = 0.14;
    if (belt.westRight) belt.westRight.isInside = true;
    if (belt.westRight) belt.westRight.armReach = 0.14;
    belt.westGripClass = "morozashi";

    // Large torque differential in favor of east (technique margin = 40)
    belt.torqueEast = 120;
    belt.torqueWest = 10;

    evolveGripGeometry(rng, east, west, belt);

    // West grip class should downgrade from morozashi (at least one isInside broken)
    expect(belt.westGripClass).not.toBe("morozashi");
  });

  it("grip class downgrades from uwate to shitate when arm reach reduced under pressure", () => {
    const east = mockRikishi("r1", { technique: 80, power: 90 });
    const west = mockRikishi("r2", { technique: 40, power: 30 });
    const rng = new SeededRNG("test-reach-reduce");
    const belt = initBeltBattle(rng, east, west, "east");

    // Set up uwate for west (one inside, deep reach)
    if (belt.westRight) belt.westRight.isInside = true;
    if (belt.westRight) belt.westRight.armReach = 0.14; // above ARM_REACH_DEEP_THRESHOLD
    belt.westGripClass = "uwate";

    // Large torque differential in favor of east
    belt.torqueEast = 120;
    belt.torqueWest = 10;

    evolveGripGeometry(rng, east, west, belt);

    // West grip class should downgrade: either uwate→shitate (reach reduced below threshold)
    // or uwate→outside (isInside broken)
    const downgraded = ["shitate", "outside", "none"];
    expect(downgraded).toContain(belt.westGripClass);
  });

  it("no grip breaking when torque differential is below threshold", () => {
    const east = mockRikishi("r1", { technique: 55, power: 50 });
    const west = mockRikishi("r2", { technique: 50, power: 50 });
    const rng = new SeededRNG("test-no-break");
    const belt = initBeltBattle(rng, east, west, "east");

    // Set up morozashi for west
    if (belt.westLeft) belt.westLeft.isInside = true;
    if (belt.westLeft) belt.westLeft.armReach = 0.14;
    if (belt.westRight) belt.westRight.isInside = true;
    if (belt.westRight) belt.westRight.armReach = 0.14;
    belt.westGripClass = "morozashi";

    // Small torque differential — below PRESSURE_THRESHOLD
    belt.torqueEast = 55;
    belt.torqueWest = 50;

    evolveGripGeometry(rng, east, west, belt);

    // West grip class should remain morozashi (no breaking under low pressure)
    expect(belt.westGripClass).toBe("morozashi");
  });

  it("grip breaking is deterministic for same seed", () => {
    const east = mockRikishi("r1", { technique: 80, power: 90 });
    const west = mockRikishi("r2", { technique: 40, power: 30 });

    const runOnce = () => {
      const rng = new SeededRNG("deterministic-break");
      const belt = initBeltBattle(rng, east, west, "east");
      if (belt.westLeft) belt.westLeft.isInside = true;
      if (belt.westLeft) belt.westLeft.armReach = 0.14;
      if (belt.westRight) belt.westRight.isInside = true;
      if (belt.westRight) belt.westRight.armReach = 0.14;
      belt.westGripClass = "morozashi";
      belt.torqueEast = 120;
      belt.torqueWest = 10;
      evolveGripGeometry(rng, east, west, belt);
      return belt.westGripClass;
    };

    const result1 = runOnce();
    const result2 = runOnce();
    expect(result1).toBe(result2);
  });
});
