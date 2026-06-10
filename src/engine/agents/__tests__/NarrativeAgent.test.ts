import { describe, it, expect, vi } from "vitest";
import { spawnNarrativeAgent, NarrativeAgentContext } from "../NarrativeAgent";
import type { Oyakata } from "../../types/oyakata";
import type { Rikishi } from "../../types/rikishi";

describe("NarrativeAgent", () => {
  const mockOyakata = (overrides?: Partial<Oyakata>): Oyakata => ({
    id: "oyakata1",
    heyaId: "heya1",
    name: "Test Oyakata",
    shikona: "Test Shikona",
    age: 50,
    archetype: "traditionalist",
    traits: {
      ambition: 50,
      patience: 50,
      risk: 50,
      tradition: 50,
      compassion: 50,
    },
    yearsInCharge: 10,
    ...overrides,
  } as Oyakata);

  const mockRikishi = (overrides?: Partial<Rikishi>): Rikishi => ({
    id: "rikishi1",
    heyaId: "heya1",
    shikona: "Test Rikishi",
    nationality: "Japan",
    birthYear: 2000,
    height: 180,
    weight: 120,
    momentum: 50,
    fatigue: 50,
    injured: false,
    injuryWeeksRemaining: 0,
    isKyujo: false,
    style: "yotsu",
    combatProfile: {
      preferredTechniques: [],
      strengths: [],
      weaknesses: [],
    },
    archetypeEvidence: {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    },
    division: "makuuchi",
    rank: "maegashira",
    side: "east",
    careerWins: 0,
    careerLosses: 0,
    careerAbsences: 0,
    makuuchiWins: 0,
    divisionRecords: {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    consecutiveYusho: 0,
    careerHistory: [],
    milestones: [],
    lineage: {},
    h2h: {},
    history: [],
    favoredKimarite: [],
    weakAgainstStyles: [],
    stats: {
      power: 50,
      technique: 50,
      speed: 50,
      weight: 50,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      balance: 50,
      aggression: 50,
      experience: 50,
    },
    personalityTraits: [],
    condition: 100,
    motivation: 100,
    behavior: "neutral",
    ...overrides,
  } as Rikishi);

  it("should not trigger event if no conditions met", () => {
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata(),
      topRikishi: [mockRikishi()],
      recentAchievements: [],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(false);
    expect(result.eventType).toBeUndefined();
    expect(result.narrativeTone).toBe("neutral");
  });

  it("should trigger championship_celebration for yusho post-basho", () => {
    const yokozuna = mockRikishi({ id: "yokozuna1", shikona: "Yokozuna A", rank: "yokozuna" });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata(),
      topRikishi: [yokozuna],
      recentAchievements: ["yusho"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("championship_celebration");
    expect(result.eventFocus).toBe("Yokozuna A");
    expect(result.rikishiId).toBe("yokozuna1");
    expect(result.narrativeTone).toBe("heroic");
  });

  it("should trigger yokozuna_promotion", () => {
    const ozeki = mockRikishi({ id: "ozeki1", shikona: "Ozeki A", rank: "ozeki" });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata(),
      topRikishi: [ozeki],
      recentAchievements: ["yokozuna_promotion"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("yokozuna_promotion");
    expect(result.eventFocus).toBe("Ozeki A");
    expect(result.rikishiId).toBe("ozeki1");
    expect(result.narrativeTone).toBe("dramatic"); // Default since not traditionalist
  });

  it("should trigger yokozuna_promotion with heroic tone for traditionalist", () => {
    const ozeki = mockRikishi({ id: "ozeki1", shikona: "Ozeki A", rank: "ozeki" });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata({ traits: { ambition: 50, patience: 50, risk: 50, tradition: 80, compassion: 50 } }),
      topRikishi: [ozeki],
      recentAchievements: ["yokozuna_promotion"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("yokozuna_promotion");
    expect(result.narrativeTone).toBe("heroic");
  });

  it("should trigger retirement_ceremony", () => {
    const retiring = mockRikishi({ id: "ret1", shikona: "Retiring A", isRetired: true });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata(),
      topRikishi: [retiring],
      recentAchievements: ["retirement"],
      currentBashoPhase: "pre_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("retirement_ceremony");
    expect(result.eventFocus).toBe("Retiring A");
    expect(result.rikishiId).toBe("ret1");
    expect(result.narrativeTone).toBe("tragic"); // Default since not traditionalist
  });

  it("should trigger underdog_victory for kinboshi when not ambitious", () => {
    const underdog = mockRikishi({ id: "underdog1", shikona: "Underdog A", rank: "maegashira" });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata({ traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 } }),
      topRikishi: [underdog],
      recentAchievements: ["kinboshi"],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("underdog_victory");
    expect(result.eventFocus).toBe("Underdog A");
    expect(result.rikishiId).toBe("underdog1");
    expect(result.narrativeTone).toBe("underdog");
  });

  it("should not trigger underdog_victory for kinboshi when ambitious", () => {
    const underdog = mockRikishi({ id: "underdog1", shikona: "Underdog A", rank: "maegashira" });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata({ traits: { ambition: 70, patience: 50, risk: 50, tradition: 50, compassion: 50 } }),
      topRikishi: [underdog],
      recentAchievements: ["kinboshi"],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(false);
  });

  it("should trigger media_spotlight for publicity hawk mid-basho", () => {
    const rikishi = mockRikishi({ id: "r1", shikona: "Star" });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata({ managerFlags: { publicityHawk: true } }),
      topRikishi: [rikishi],
      recentAchievements: [],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("media_spotlight");
    expect(result.eventFocus).toBe("Star");
    expect(result.rikishiId).toBe("r1");
    expect(result.narrativeTone).toBe("dramatic");
  });

  it("should trigger legacy_milestone for traditionalist post-basho with veteran", () => {
    const veteran = mockRikishi({
      id: "vet1",
      shikona: "Veteran A",
      stats: {
        power: 50, technique: 50, speed: 50, weight: 50, stamina: 50,
        mental: 50, adaptability: 50, balance: 50, aggression: 50,
        experience: 150
      }
    });
    const ctx: NarrativeAgentContext = {
      oyakata: mockOyakata({ traits: { ambition: 50, patience: 50, risk: 50, tradition: 80, compassion: 50 } }),
      topRikishi: [veteran],
      recentAchievements: [],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("legacy_milestone");
    expect(result.eventFocus).toBe("Veteran A");
    expect(result.rikishiId).toBe("vet1");
    expect(result.narrativeTone).toBe("heroic");
  });
});
