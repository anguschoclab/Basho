import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import * as Logger from "@/engine/utils/Logger";
import type { Rikishi } from "@/engine/types/rikishi";

// Helper: create a minimal valid Rikishi for sanitizeRikishi
function makeRikishi(overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id: "r-test",
    shikona: "Test Rikishi",
    heyaId: "heya-1",
    nationality: "JP",
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    currentBashoWins: 0,
    currentBashoLosses: 0,
    side: "east",
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
    ...overrides,
  } as Rikishi;
}

describe("SerializationService.sanitizeRikishi — rank validation", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(Logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("leaves a valid rank unchanged", () => {
    const r = makeRikishi({ rank: "yokozuna", division: "makuuchi" });
    SerializationService.sanitizeRikishi(r);
    expect(r.rank).toBe("yokozuna");
    expect(r.division).toBe("makuuchi");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("coerces an invalid rank string to jonokuchi", () => {
    const r = makeRikishi({ rank: "maegashira", division: "makuuchi" });
    (r as any).rank = "bogus_rank";
    SerializationService.sanitizeRikishi(r);
    expect(r.rank).toBe("jonokuchi");
    expect(r.division).toBe(RANK_HIERARCHY.jonokuchi.division);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("resets division to match jonokuchi when rank is coerced", () => {
    const r = makeRikishi({ rank: "ozeki", division: "makuuchi" });
    (r as any).rank = "corrupted";
    SerializationService.sanitizeRikishi(r);
    expect(r.rank).toBe("jonokuchi");
    expect(r.division).toBe("jonokuchi");
  });

  it("does not log a warning for a valid rank", () => {
    const r = makeRikishi({ rank: "juryo", division: "juryo" });
    SerializationService.sanitizeRikishi(r);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("SerializationService.deserializeWorld — invalid rank integration", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(Logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("deserializes a world with an invalid rank and coerces it safely", () => {
    const r = makeRikishi({ id: "r-bad", rank: "maegashira", division: "makuuchi" });
    (r as any).rank = "invalid_rank";

    const serialized = {
      seed: "test-seed",
      year: 2025,
      week: 1,
      cyclePhase: "interim" as const,
      heyas: {},
      closedHeyas: {},
      rikishi: { "r-bad": r },
      historicalRikishi: {},
      activeRikishiIds: ["r-bad"],
      oyakata: {},
      staff: {},
      history: [],
      lineage: [],
      records: {
        allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
        active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      },
      events: { version: "1.0.0", log: [], dedupe: {} },
      dayIndexGlobal: 0,
      almanacSnapshots: [],
      settings: { archiveMode: "standard" as const },
    };

    const world = SerializationService.deserializeWorld(serialized as any);
    const loadedR = world.rikishi.get("r-bad");

    expect(loadedR).toBeDefined();
    expect(loadedR!.rank).toBe("jonokuchi");
    expect(loadedR!.division).toBe("jonokuchi");
    // Should not throw when accessing RANK_HIERARCHY
    expect(RANK_HIERARCHY[loadedR!.rank]).toBeDefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
