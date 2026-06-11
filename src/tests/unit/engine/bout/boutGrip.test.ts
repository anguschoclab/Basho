import { describe, it, expect } from "vitest";
import { initBeltBattle, evolveGripGeometry, calculateTorque, computeNetTorque } from "../boutGrip";
import { mockRikishi } from "../utils";
import { SeededRNG } from "../../rng";

describe("initBeltBattle", () => {
  it("gives tachiai winner inside arm advantage", () => {
    const east = mockRikishi("r1", { combatProfile: { preferredGrip: "migi" } });
    const west = mockRikishi("r2");
    const rng = new SeededRNG("test-seed");
    const belt = initBeltBattle(rng, east, west, "east");

    expect(belt.eastRight?.isInside).toBe(true);
    expect(belt.eastRight?.armReach).toBeGreaterThan(0.1);
    expect(belt.westRight?.isInside).toBe(false);
  });

  it("sets initial gripClass correctly for migi-preference east winner", () => {
    const east = mockRikishi("r1", { combatProfile: { preferredGrip: "migi" } });
    const west = mockRikishi("r2");
    const rng = new SeededRNG("test-seed");
    const belt = initBeltBattle(rng, east, west, "east");

    expect(belt.eastGripClass).toBe("shitate"); // One inside, one outside
  });

  it("morozashi when both arms inside", () => {
    const east = mockRikishi("r1", {
      combatProfile: {
        archetype: "hybrid",
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "migi",
        preferredGripDepth: "standard",
        statModifiers: {},
      },
    });
    const west = mockRikishi("r2", {
      combatProfile: {
        archetype: "hybrid",
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "hidari",
        preferredGripDepth: "standard",
        statModifiers: {},
      },
    });
    const rng = new SeededRNG("test-seed");
    const belt = initBeltBattle(rng, east, west, "east");

    // Manually set both arms inside for morozashi test
    if (belt.eastLeft) belt.eastLeft.isInside = true;
    if (belt.eastRight) belt.eastRight.isInside = true;

    // Both arms inside = morozashi (most dominant grip class)
    evolveGripGeometry(rng, east, west, belt);
    expect(belt.eastGripClass).toBe("morozashi");
  });
});

describe("evolveGripGeometry", () => {
  it("arm reach increases when technique margin > 12", () => {
    const east = mockRikishi("r1", { technique: 70 });
    const west = mockRikishi("r2", { technique: 50 });
    const rng = new SeededRNG("test-seed");
    const belt = initBeltBattle(rng, east, west, "east");

    const initialReach = belt.eastRight?.armReach ?? 0;
    evolveGripGeometry(rng, east, west, belt);

    expect(belt.eastRight?.armReach).toBeGreaterThan(initialReach);
  });

  it("grip strength decays with fatigue", () => {
    const east = mockRikishi("r1", { fatigue: 50 });
    const west = mockRikishi("r2");
    const rng = new SeededRNG("test-seed");
    const belt = initBeltBattle(rng, east, west, "east");

    const initialStrength = belt.eastRight?.gripStrength ?? 1.0;
    evolveGripGeometry(rng, east, west, belt);

    expect(belt.eastRight?.gripStrength).toBeLessThan(initialStrength);
  });

  it("blocked arm does not generate torque", () => {
    const grip = {
      armReach: 0.12,
      isInside: true,
      leverArm: 0.29,
      gripStrength: 1.0,
      isBlocked: true,
    };
    const torque = calculateTorque(grip, 100);
    expect(torque).toBe(0);
  });
});

describe("computeNetTorque", () => {
  it("morozashi produces ~2.6× torque vs single outside", () => {
    const morozashiLeft = {
      armReach: 0.12,
      isInside: true,
      leverArm: 0.29,
      gripStrength: 1.0,
      isBlocked: false,
    };
    const morozashiRight = {
      armReach: 0.12,
      isInside: true,
      leverArm: 0.29,
      gripStrength: 1.0,
      isBlocked: false,
    };
    const singleOutside = {
      armReach: 0.08,
      isInside: false,
      leverArm: 0.24,
      gripStrength: 1.0,
      isBlocked: false,
    };

    const morozashiTorque = computeNetTorque(morozashiLeft, morozashiRight, 100);
    const singleTorque = computeNetTorque(singleOutside, null, 100);

    expect(morozashiTorque).toBeGreaterThan(singleTorque * 2);
  });

  it("blocked grip produces 0 torque", () => {
    const blockedGrip = {
      armReach: 0.12,
      isInside: true,
      leverArm: 0.29,
      gripStrength: 1.0,
      isBlocked: true,
    };

    const torque = computeNetTorque(blockedGrip, null, 100);
    expect(torque).toBe(0);
  });
});
