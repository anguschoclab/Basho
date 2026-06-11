/**
 * Tests that weakAgainstStyles applies an 8% tachiai power penalty when a rikishi
 * faces an opponent whose style is in their weakness list.
 */
import { describe, it, expect } from "vitest";
import { computeTachiaiPower, tachiaiPowerWithMatchupPenalty } from "../boutPhysics";
import { mockRikishi } from "../utils";

describe("tachiaiPowerWithMatchupPenalty — weakAgainstStyles", () => {
  it("reduces tachiai power by 8% when facing a style in weakAgainstStyles", () => {
    const east = mockRikishi("east", {
      power: 80,
      speed: 60,
      aggression: 50,
      weakAgainstStyles: ["oshi"],
    });
    const westOshi = mockRikishi("west", { style: "oshi" });

    const base = computeTachiaiPower(east);
    const penalized = tachiaiPowerWithMatchupPenalty(east, westOshi);

    expect(penalized).toBeCloseTo(base * 0.92, 4);
  });

  it("applies no penalty when opponent style is NOT in weakAgainstStyles", () => {
    const east = mockRikishi("east", {
      power: 80,
      speed: 60,
      aggression: 50,
      weakAgainstStyles: ["yotsu"],
    });
    const westOshi = mockRikishi("west", { style: "oshi" });

    const base = computeTachiaiPower(east);
    const withOpponent = tachiaiPowerWithMatchupPenalty(east, westOshi);

    expect(withOpponent).toBeCloseTo(base, 4);
  });

  it("applies no penalty when weakAgainstStyles is empty", () => {
    const east = mockRikishi("east", { power: 80, speed: 60, aggression: 50 });
    const westOshi = mockRikishi("west", { style: "oshi" });

    const base = computeTachiaiPower(east);
    const withOpponent = tachiaiPowerWithMatchupPenalty(east, westOshi);

    expect(withOpponent).toBeCloseTo(base, 4);
  });
});
