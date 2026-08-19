import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getOrCreateScouted, tickWeekScouting } from "@/engine/scoutingStore";
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

describe("scoutingStore - tickWeekScouting", () => {
  it("applies decay to scouting levels correctly", () => {
    const world = makeMockWorld();
    world.week = 10;
    world.playerKnowledge = {
      scouting: {
        "rikishi-1": {
          rikishiId: "rikishi-1",
          publicInfo: { id: "rikishi-1", shikona: "Test Wrestler", rank: "maegashira", height: 180, weight: 140 },
          isOwned: false,
          timesObserved: 1,
          lastObservedWeek: 5,
          scoutingInvestment: "none",
          scoutingLevel: 80,
          attributes: { power: 0, speed: 0, balance: 0, technique: 0, aggression: 0, experience: 0 },
        },
        "owned-rikishi": {
          rikishiId: "owned-rikishi",
          publicInfo: { id: "owned-rikishi", shikona: "Owned Wrestler", rank: "maegashira", height: 180, weight: 140 },
          isOwned: true,
          timesObserved: 1,
          lastObservedWeek: 5,
          scoutingInvestment: "none",
          scoutingLevel: 100,
          attributes: { power: 0, speed: 0, balance: 0, technique: 0, aggression: 0, experience: 0 },
        }
      }
    };

    const impact = tickWeekScouting(world);

    // Decay is 0.02 * weeksSince * 100 = 2 * (10 - 5) = 10
    expect(impact.worldFields?.playerKnowledge?.scouting["rikishi-1"]?.scoutingLevel).toBe(70);
    // Owned rikishi don't decay
    expect(impact.worldFields?.playerKnowledge?.scouting["owned-rikishi"]?.scoutingLevel).toBe(100);
  });
});
