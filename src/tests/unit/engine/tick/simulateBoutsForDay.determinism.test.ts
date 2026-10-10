import { describe, it, expect } from "vitest";
import { phase01_basho_bouts } from "@/engine/tick/phases/phase01_basho_bouts";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { MatchSchedule } from "@/engine/types/basho";

function world() {
  const mk = (id: string, side: "east" | "west") =>
    MockFactory.createRikishi(id, {
      division: "makuuchi",
      rank: "maegashira",
      side,
      heyaId: "h1",
      stats: {
        power: 60,
        speed: 60,
        technique: 60,
        weight: 140,
        stamina: 60,
        mental: 60,
        adaptability: 60,
        balance: 60,
        aggression: 60,
        experience: 10,
      },
    });
  const matches: MatchSchedule[] = [];
  for (let i = 0; i < 8; i++) {
    matches.push({
      boutId: `d1-b${i}`,
      day: 1,
      eastRikishiId: `e${i}`,
      westRikishiId: `w${i}`,
    } as MatchSchedule);
  }
  const rikishi = new Map();
  for (let i = 0; i < 8; i++) {
    rikishi.set(`e${i}`, mk(`e${i}`, "east"));
    rikishi.set(`w${i}`, mk(`w${i}`, "west"));
  }
  const standings = new Map(
    [...rikishi.keys()].map((id) => [id, { wins: 0, losses: 0, absences: 0 }])
  );
  return MockFactory.createWorld({
    rikishi,
    playerHeyaId: "h1",
    cyclePhase: "active_basho",
    currentBasho: {
      id: "b1",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 1,
      matches,
      standings,
      isActive: true,
    } as any,
  });
}

describe("simulateBoutsForDay determinism", () => {
  it("two runs produce identical results", () => {
    const w1 = resolveImpacts(world(), [phase01_basho_bouts(world())]);
    const w2 = resolveImpacts(world(), [phase01_basho_bouts(world())]);
    const r1 = w1.currentBasho!.matches.map((m) => m.result?.winnerRikishiId);
    const r2 = w2.currentBasho!.matches.map((m) => m.result?.winnerRikishiId);
    expect(r1).toEqual(r2);
    expect(r1.filter(Boolean).length).toBe(8);
    expect(JSON.stringify([...w1.currentBasho!.standings!])).toBe(
      JSON.stringify([...w2.currentBasho!.standings!])
    );
  });
});
