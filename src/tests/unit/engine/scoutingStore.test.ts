import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getOrCreateScouted } from "@/engine/scoutingStore";
import { makeMockWorld } from "@/tests/unit/engine/utils";
import { logger } from "@/engine/utils/Logger";

describe("scoutingStore - Logger integration", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("warns via Logger when scouting non-existent rikishi", () => {
    const world = makeMockWorld();

    getOrCreateScouted(world, "nonexistent-id");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Scouting requested for non-existent rikishi"),
      "ScoutingStore",
      undefined
    );
  });

  it("does not warn when rikishi exists", () => {
    const world = makeMockWorld();
    // Add a rikishi to the world so it exists
    world.rikishi.set("existing-id", {
      id: "existing-id",
      shikona: "Test Wrestler",
      heyaId: "heya-1",
      rank: "maegashira",
      rankNumber: 5,
      division: "makuuchi",
      side: "east",
      currentBashoWins: 0,
      currentBashoLosses: 0,
      weight: 140,
      height: 180,
      style: "oshi",
      archetype: "hybrid",
      momentum: 0,
      fatigue: 0,
      injured: false,
      injuryWeeksRemaining: 0,
      birthYear: 1995,
      h2h: {},
      history: [],
      personalityTraits: [],
      condition: 90,
      motivation: 50,
      stats: {
        power: 50,
        speed: 50,
        technique: 50,
        balance: 50,
        weight: 140,
        stamina: 100,
        mental: 50,
        adaptability: 50,
        experience: 50,
        aggression: 50,
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        },
      },
      careerWins: 0,
      careerLosses: 0,
      favoredKimarite: [],
      weakAgainstStyles: [],
      combatProfile: {
        archetype: "all_rounder",
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
        counterFamily: "push",
        archetypeBehavior: {
          tachiaiSpeedBonus: 0,
          lateralMovementBonus: 0,
          edgeEscapeBonus: 0,
          beltTorqueBonus: 0,
          pushVelocityBonus: 0,
        },
      },
    } as any);

    getOrCreateScouted(world, "existing-id");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
