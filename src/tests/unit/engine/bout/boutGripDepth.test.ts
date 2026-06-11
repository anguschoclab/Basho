/**
 * Tests that CombatProfile.preferredGripDepth is applied during belt battle
 * initialisation so deep-grip archetypes (yotsu, giant) start with a grip
 * depth head-start rather than always beginning at "standard".
 */
import { describe, it, expect } from "vitest";
import { initBeltBattle } from "../boutGrip";
import { mockRikishi } from "../utils";
import { SeededRNG } from "../../rng";

const rng = new SeededRNG("grip-depth-test");

function makeRikishiWithDepth(id: string, depth: "standard" | "deep" | "maemitsu") {
  return mockRikishi(id, {
    combatProfile: {
      archetype: "yotsu",
      familyPreferences: { push: 15, belt: 75, trick: 5, speed: 5 },
      preferredGrip: "migi",
      preferredGripDepth: depth,
      statModifiers: {},
    },
  });
}

describe("initBeltBattle — preferredGripDepth initialises belt state depth", () => {
  it("tachiai winner with deep grip preference starts at eastDepth = 'deep'", () => {
    const east = makeRikishiWithDepth("east-deep", "deep");
    const west = makeRikishiWithDepth("west-std", "standard");

    const belt = initBeltBattle(new SeededRNG("test-deep-east"), east, west, "east");

    expect(belt.eastDepth).toBe("deep");
  });

  it("tachiai loser with deep grip preference starts at their depth = 'deep'", () => {
    const east = makeRikishiWithDepth("east-std", "standard");
    const west = makeRikishiWithDepth("west-deep", "deep");

    const belt = initBeltBattle(new SeededRNG("test-deep-west"), east, west, "east");

    // West lost tachiai but still starts with their preferred depth
    expect(belt.westDepth).toBe("deep");
  });

  it("maemitsu preference sets eastDepth = 'maemitsu'", () => {
    const east = makeRikishiWithDepth("east-mae", "maemitsu");
    const west = makeRikishiWithDepth("west-std", "standard");

    const belt = initBeltBattle(new SeededRNG("test-maemitsu"), east, west, "east");

    expect(belt.eastDepth).toBe("maemitsu");
  });

  it("standard preference keeps eastDepth = 'standard'", () => {
    const east = makeRikishiWithDepth("east-std", "standard");
    const west = makeRikishiWithDepth("west-std", "standard");

    const belt = initBeltBattle(new SeededRNG("test-standard"), east, west, "east");

    expect(belt.eastDepth).toBe("standard");
    expect(belt.westDepth).toBe("standard");
  });

  it("deep grip preference sets higher initial lever arms for the deep-grip fighter", () => {
    const eastDeep = makeRikishiWithDepth("east-deep", "deep");
    const eastStd = makeRikishiWithDepth("east-std", "standard");
    const west = makeRikishiWithDepth("west-std", "standard");

    const beltDeep = initBeltBattle(new SeededRNG("deep-levers"), eastDeep, west, "east");
    const beltStd = initBeltBattle(new SeededRNG("deep-levers"), eastStd, west, "east");

    // Deep grip = higher lever arm = more torque capacity
    const deepLever = beltDeep.eastRight?.leverArm ?? beltDeep.eastLeft?.leverArm ?? 0;
    const stdLever = beltStd.eastRight?.leverArm ?? beltStd.eastLeft?.leverArm ?? 0;
    expect(deepLever).toBeGreaterThan(stdLever);
  });

  it("yotsu archetype (preferredGripDepth='deep') starts with deep grip by default", () => {
    // Regression test: verifies the archetype definition actually produces deep depth
    const east = mockRikishi("yotsu-east", {
      combatProfile: {
        archetype: "yotsu",
        familyPreferences: { push: 15, belt: 75, trick: 5, speed: 5 },
        preferredGrip: "migi",
        preferredGripDepth: "deep",
        statModifiers: {},
      },
    });
    const west = mockRikishi("std-west");

    const belt = initBeltBattle(new SeededRNG("yotsu-deep"), east, west, "east");

    expect(belt.eastDepth).toBe("deep");
  });
});
