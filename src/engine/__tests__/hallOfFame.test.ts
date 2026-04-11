import { describe, it, expect, beforeEach } from "vitest";
import {
  tryAddInductee,
  createEmptyHallOfFame,
  type HoFInductee,
  type HallOfFameState,
} from "../hallOfFame";
import { mockRikishi, makeMockWorld } from "./utils";
import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";

describe("hallOfFame.ts - tryAddInductee", () => {
  let world: WorldState;
  let hof: HallOfFameState;
  let newInductees: HoFInductee[];
  let rikishi: Rikishi;

  beforeEach(() => {
    world = makeMockWorld({ year: 2025 });
    hof = createEmptyHallOfFame();
    newInductees = [];
    rikishi = mockRikishi("r1", {
      shikona: "Testyama",
      rank: "yokozuna",
      careerWins: 100,
      careerLosses: 20,
    });
  });

  it("should add a new inductee if they are not already inducted in the category", () => {
    tryAddInductee(world, hof, newInductees, rikishi.id, rikishi, "champion", {
      yushoCount: 5,
    });

    expect(newInductees).toHaveLength(1);
    expect(hof.inductees).toHaveLength(1);

    expect(hof.inducted[`${rikishi.id}::champion`]).toBe(true);

    const inductee = newInductees[0];
    expect(inductee.rikishiId).toBe("r1");
    expect(inductee.shikona).toBe("Testyama");
    expect(inductee.category).toBe("champion");
    expect(inductee.inductionYear).toBe(2025);
    expect(inductee.stats.highestRank).toBe("yokozuna");
    expect(inductee.stats.careerWins).toBe(100);
    expect(inductee.stats.careerLosses).toBe(20);
    expect(inductee.stats.yushoCount).toBe(5);
  });

  it("should not add an inductee if they are already inducted in the same category", () => {
    // Add once
    tryAddInductee(world, hof, newInductees, rikishi.id, rikishi, "champion", {
      yushoCount: 5,
    });

    // Try to add again
    tryAddInductee(world, hof, newInductees, rikishi.id, rikishi, "champion", {
      yushoCount: 6,
    });

    // Should still only have 1 entry
    expect(newInductees).toHaveLength(1);
    expect(hof.inductees).toHaveLength(1);
    expect(newInductees[0].stats.yushoCount).toBe(5); // The first one
  });

  it("should allow the same rikishi to be inducted in different categories", () => {
    tryAddInductee(world, hof, newInductees, rikishi.id, rikishi, "champion", {
      yushoCount: 5,
    });
    tryAddInductee(world, hof, newInductees, rikishi.id, rikishi, "iron_man", {
      consecutiveBasho: 30,
    });

    expect(newInductees).toHaveLength(2);
    expect(hof.inductees).toHaveLength(2);
    expect(hof.inducted[`${rikishi.id}::champion`]).toBe(true);
    expect(hof.inducted[`${rikishi.id}::iron_man`]).toBe(true);
  });
});
