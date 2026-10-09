/**
 * WS5 — Oyakata grudges become real behavior.
 *
 * `oyakata.grudges` was write-only. Now the RivalryAgent escalates grudged
 * rivalries preferentially (a vendetta), and grudge pressure feeds plan
 * scoring toward rivalry_suppression — bounded, never overriding need.
 */

import { describe, it, expect } from "vitest";
import { spawnRivalryAgent } from "@/engine/agents/RivalryAgent";
import type { Oyakata } from "@/engine/types/oyakata";
import type { RivalryPairState } from "@/constants/engine/rivalry";

const TRAITS = { ambition: 30, patience: 50, risk: 30, tradition: 50, compassion: 50 };

function oya(grudges: string[] = []): Oyakata {
  return {
    id: "o1",
    heyaId: "h1",
    archetype: "traditionalist",
    traits: { ...TRAITS },
    age: 55,
    yearsInCharge: 8,
    shikona: "Oya",
    name: "Oya",
    grudges,
  } as unknown as Oyakata;
}

function pair(key: string, heat: number): RivalryPairState {
  return {
    key,
    aId: `ra-${key}`,
    bId: `rb-${key}`,
    heat,
    meetings: 4,
    lastMetWeek: 8,
    aWins: 2,
    bWins: 2,
  } as RivalryPairState;
}

describe("grudge consumption", () => {
  it("escalates a grudged rivalry even without ambition", () => {
    const rivalries: Record<string, RivalryPairState> = {
      "ra1|rb1": pair("ra1|rb1", 45),
    };
    const res = spawnRivalryAgent({
      oyakata: oya(["h-grudged"]),
      activeRivalries: rivalries,
      grudgeRivalryKeys: ["ra1|rb1"],
    });
    expect(res.escalateRivalry).toBe(true);
    expect(res.rivalryId).toBe("ra1|rb1");
    expect(res.reasoning.join(" ")).toMatch(/vendetta|grudge/i);
  });

  it("without a grudge, the same oyakata does not escalate low heat", () => {
    const res = spawnRivalryAgent({
      oyakata: oya(),
      activeRivalries: { "ra1|rb1": pair("ra1|rb1", 45) },
      grudgeRivalryKeys: [],
    });
    expect(res.escalateRivalry).toBe(false);
  });
});
