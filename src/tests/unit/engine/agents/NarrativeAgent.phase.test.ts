import { describe, it, expect } from "vitest";
import { spawnNarrativeAgent } from "@/engine/agents/NarrativeAgent";
import type { Oyakata } from "@/engine/types/oyakata";
import { mockRikishi } from "../utils";

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "oyakata-1",
    heyaId: "heya-1",
    name: "Test Oyakata",
    shikona: "TestShikona",
    age: 55,
    archetype: "traditional",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
    ...overrides,
  } as Oyakata;
}

describe("NarrativeAgent — phase checks", () => {
  it("active_basho triggers media_spotlight for publicity hawk", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 30, compassion: 50 },
      managerFlags: { publicityHawk: true },
    });
    const topRikishi = [mockRikishi("r1", { shikona: "Star" })];

    const result = spawnNarrativeAgent({
      oyakata,
      topRikishi,
      recentAchievements: [],
      currentBashoPhase: "active_basho",
    });

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("media_spotlight");
  });

  it("post_basho triggers championship_celebration for yusho", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 70, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    });
    const topRikishi = [mockRikishi("r1", { shikona: "Champion" })];

    const result = spawnNarrativeAgent({
      oyakata,
      topRikishi,
      recentAchievements: ["yusho"],
      currentBashoPhase: "post_basho",
    });

    expect(result.shouldTriggerEvent).toBe(true);
    expect(result.eventType).toBe("championship_celebration");
  });

  it("interim phase → no media_spotlight or post_basho events", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      managerFlags: { publicityHawk: true },
    });
    const topRikishi = [mockRikishi("r1", { shikona: "Star" })];

    const result = spawnNarrativeAgent({
      oyakata,
      topRikishi,
      recentAchievements: [],
      currentBashoPhase: "interim",
    });

    // media_spotlight only fires during active_basho, not interim
    expect(result.eventType).not.toBe("media_spotlight");
  });

  it("pre_basho phase → no media_spotlight", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 30, compassion: 50 },
      managerFlags: { publicityHawk: true },
    });
    const topRikishi = [mockRikishi("r1", { shikona: "Star" })];

    const result = spawnNarrativeAgent({
      oyakata,
      topRikishi,
      recentAchievements: [],
      currentBashoPhase: "pre_basho",
    });

    expect(result.eventType).not.toBe("media_spotlight");
  });
});
