import { describe, it, expect } from "vitest";
import { spawnRivalryAgent } from "@/engine/agents/RivalryAgent";
import type { Oyakata } from "@/engine/types/oyakata";
import type { RivalryPairState } from "@/constants/engine/rivalry";

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "o1",
    name: "Oya",
    archetype: "strategist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    ...overrides,
  } as Oyakata;
}

function makePair(heat: number): RivalryPairState {
  return {
    key: "r1-r2",
    aId: "r1",
    bId: "r2",
    heat,
    meetings: 1,
    lastMetWeek: 1,
    aWins: 0,
    bWins: 1,
    closeness: 50,
    spite: 30,
    tone: "grudge",
    triggers: {},
    sameHeya: false,
  };
}

describe("spawnRivalryAgent", () => {
  it("does not escalate without active rivalries", () => {
    const result = spawnRivalryAgent({
      oyakata: makeOyakata({ traits: { ambition: 80, risk: 80, tradition: 20, compassion: 20, patience: 50 } }),
      activeRivalries: {},
    });
    expect(result.escalateRivalry).toBe(false);
  });

  it("escalates medium-heat rivalries when ambitious", () => {
    const result = spawnRivalryAgent({
      oyakata: makeOyakata({ traits: { ambition: 80, risk: 50, tradition: 20, compassion: 20, patience: 50 } }),
      activeRivalries: { "r1-r2": makePair(50) },
    });
    expect(result.escalateRivalry).toBe(true);
    expect(result.rivalryId).toBe("r1-r2");
  });

  it("de-escalates when compassionate and too many high-heat rivalries", () => {
    const activeRivalries: Record<string, RivalryPairState> = {
      a: makePair(75),
      b: makePair(80),
      c: makePair(90),
      d: makePair(95),
    };
    const result = spawnRivalryAgent({
      oyakata: makeOyakata({ traits: { ambition: 30, risk: 20, tradition: 50, compassion: 80, patience: 80 } }),
      activeRivalries,
    });
    expect(result.deescalateRivalry).toBe(true);
  });

  it("anxiety overrides escalation", () => {
    const result = spawnRivalryAgent({
      oyakata: makeOyakata({ traits: { ambition: 80, risk: 80, tradition: 20, compassion: 20, patience: 50 } }),
      activeRivalries: { "r1-r2": makePair(50) },
      currentMood: "anxious",
    });
    expect(result.escalateRivalry).toBe(false);
  });
});
