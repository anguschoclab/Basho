import { describe, it, expect } from "vitest";
import { spawnNarrativeAgent, type NarrativeAgentContext } from "@/engine/agents/NarrativeAgent";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

describe("NarrativeAgent", () => {
  it("should trigger championship celebration for yusho in post_basho", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 50, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { rank: "yokozuna", shikona: "Yokozuna A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: ["yusho"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("championship_celebration");
    expect(result.rikishiId).toBe("r1");
    expect(result.eventFocus).toBe("Yokozuna A");
    expect(result.narrativeTone).toBe("heroic");
  });

  it("should trigger yokozuna promotion", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 50, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { rank: "ozeki", shikona: "Ozeki A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: ["yokozuna_promotion"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("yokozuna_promotion");
    expect(result.rikishiId).toBe("r1");
    expect(result.eventFocus).toBe("Ozeki A");
    expect(result.narrativeTone).toBe("dramatic");
  });

  it("should trigger yokozuna promotion with heroic tone if traditionalist", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 80, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { rank: "ozeki", shikona: "Ozeki A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: ["yokozuna_promotion"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("yokozuna_promotion");
    expect(result.narrativeTone).toBe("heroic");
  });

  it("should trigger retirement ceremony", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 50, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { isRetired: true, shikona: "Retired A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: ["retirement"],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("retirement_ceremony");
    expect(result.rikishiId).toBe("r1");
    expect(result.eventFocus).toBe("Retired A");
    expect(result.narrativeTone).toBe("tragic");
  });

  it("should trigger underdog victory for kinboshi if not ambitious", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 50, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { rank: "maegashira", shikona: "Underdog A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: ["kinboshi"],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("underdog_victory");
    expect(result.rikishiId).toBe("r1");
    expect(result.eventFocus).toBe("Underdog A");
    expect(result.narrativeTone).toBe("underdog");
  });

  it("should not trigger underdog victory for kinboshi if ambitious", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 80, tradition: 50, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { rank: "maegashira", shikona: "Underdog A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: ["kinboshi"],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(false);
  });

  it("should trigger media spotlight if publicity hawk in mid_basho", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 50, patience: 50, risk: 50, compassion: 50 }, managerFlags: { publicityHawk: true } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { shikona: "Star A" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: [],
      currentBashoPhase: "mid_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("media_spotlight");
    expect(result.rikishiId).toBe("r1");
    expect(result.eventFocus).toBe("Star A");
    expect(result.narrativeTone).toBe("dramatic");
  });

  it("should trigger legacy milestone if traditionalist in post_basho", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 80, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      { ...MockFactory.createRikishi("r1", { shikona: "Veteran A" }), stats: { experience: 120 } } as unknown as Rikishi,
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: [],
      currentBashoPhase: "post_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("legacy_milestone");
    expect(result.rikishiId).toBe("r1");
    expect(result.eventFocus).toBe("Veteran A");
    expect(result.narrativeTone).toBe("heroic");
  });

  it("should not trigger any event if no conditions are met", () => {
    const oyakata = MockFactory.createOyakata("o1", { traits: { ambition: 50, tradition: 50, patience: 50, risk: 50, compassion: 50 } });
    const topRikishi = [
      MockFactory.createRikishi("r1", { rank: "maegashira" }),
    ];

    const ctx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: [],
      currentBashoPhase: "pre_basho",
    };

    const result = spawnNarrativeAgent(ctx);

    expect(result.shouldTriggerEvent).toBe(false);
    expect(result.eventType).toBeUndefined();
    expect(result.narrativeTone).toBe("neutral");
  });
});
