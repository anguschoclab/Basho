import { describe, it, expect } from "vitest";
import { CareerService } from "@/engine/lifecycle/CareerService";
import { mockRikishi, makeMockWorld } from "../utils";

describe("CareerService.evaluateRetirement", () => {
  it("returns false for an already-retired rikishi even when age would trigger mandatory retirement", () => {
    const rikishi = mockRikishi("r-retired", {
      birthYear: 1980, // age 45 at year 2025
      isRetired: true,
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-retired" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(false);
  });

  it("returns true for mandatory age retirement (age 45)", () => {
    const rikishi = mockRikishi("r-mandatory", {
      birthYear: 1980, // age 45
      rank: "maegashira",
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-mandatory" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(true);
  });

  it("returns false for a young healthy rikishi", () => {
    const rikishi = mockRikishi("r-young", {
      birthYear: 2005, // age 20
      rank: "maegashira",
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-young" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(false);
  });

  it("returns true for yokozuna mandatory retirement at age 40", () => {
    const rikishi = mockRikishi("r-yokozuna-40", {
      birthYear: 1985, // age 40
      rank: "yokozuna",
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-yoko40" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(true);
  });

  it("returns true for career-ending injury in a young rikishi (under-28 injury-only path)", () => {
    const rikishi = mockRikishi("r-young-injury", {
      birthYear: 2000, // age 25
      rank: "maegashira",
      injured: true,
      injuryWeeksRemaining: 21,
      injuryStatus: {
        type: "fracture",
        isInjured: true,
        severity: "serious",
        weeksRemaining: 21,
      },
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-young-injury" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(true);
  });

  it("returns true for career-ending injury in an older rikishi (over-28 injury path)", () => {
    const rikishi = mockRikishi("r-old-injury", {
      birthYear: 1990, // age 35
      rank: "maegashira",
      injured: true,
      injuryWeeksRemaining: 21,
      injuryStatus: {
        type: "fracture",
        isInjured: true,
        severity: "serious",
        weeksRemaining: 21,
      },
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-old-injury" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(true);
  });

  it("returns true for council forced retirement (3 warnings on yokozuna)", () => {
    const rikishi = mockRikishi("r-council", {
      birthYear: 1990, // age 35
      rank: "yokozuna",
      councilWarnings: 3,
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-council" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(true);
  });

  it("returns false for a retired yokozuna at age 40 (isRetired guard takes precedence)", () => {
    const rikishi = mockRikishi("r-retired-yoko", {
      birthYear: 1985, // age 40
      rank: "yokozuna",
      isRetired: true,
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-retired-yoko" });
    expect(CareerService.evaluateRetirement(world, rikishi)).toBe(false);
  });

  it("produces deterministic results with the same world.year and world.seed", () => {
    const rikishi = mockRikishi("r-determinism", {
      birthYear: 1985, // age 40 — not mandatory (non-yokozuna), enters natural aging curve
      rank: "maegashira",
    });
    const world = makeMockWorld({ year: 2025, seed: "test-eval-determinism" });
    const result1 = CareerService.evaluateRetirement(world, rikishi);
    const result2 = CareerService.evaluateRetirement(world, rikishi);
    expect(result1).toBe(result2);
  });
});
