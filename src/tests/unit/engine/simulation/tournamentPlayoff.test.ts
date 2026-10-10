import { describe, it, expect } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";

/**
 * Autosim playoff resolution (V10-B15).
 *
 * simulateEntireBasho pre-generates all 15 days, so pairing cannot react
 * to results — multiple makuuchi rikishi can finish 15-0 without ever
 * meeting. The interactive path resolves ties via resolvePlayoffs
 * (kettei-sen); autosim crowned finalStandings[0] by an arbitrary stable
 * tie-break, masking dominant rikishi and making yokozuna promotion
 * unreachable in autosim (yokozunaPromotionAutoSim perf failure).
 */
function mkWorld(boostedIds: string[]) {
  const world = MockFactory.createWorld();
  const heyas = ["h1", "h2", "h3", "h4"].map((h) => MockFactory.createHeya(h as Id, {}));
  for (const h of heyas) world.heyas.set(h.id, h);
  const rikishi = new Map<Id, Rikishi>();
  // Makuuchi field with distinct banzuke slots; boosted rikishi at 95 stats.
  // Rikishi spread across heyas — heya-mates can't be paired.
  for (let i = 0; i < 14; i++) {
    const id = `r${i}` as Id;
    const isBoosted = boostedIds.includes(id);
    const r = MockFactory.createRikishi(id, {
      heyaId: heyas[i % 4].id,
      division: "makuuchi",
      rank: i < 2 ? "ozeki" : "maegashira",
      rankNumber: Math.floor(i / 2) + 1,
      side: i % 2 === 0 ? "east" : "west",
      ...(isBoosted
        ? {
            condition: 100,
            motivation: 100,
            stats: {
              power: 95,
              technique: 95,
              speed: 95,
              balance: 95,
              stamina: 85,
              mental: 85,
            } as Rikishi["stats"],
          }
        : {
            stats: {
              power: 30,
              technique: 30,
              speed: 30,
              balance: 30,
              stamina: 30,
              mental: 30,
            } as Rikishi["stats"],
          }),
    });
    rikishi.set(id, r);
  }
  world.rikishi = rikishi;
  world.activeRikishiIds = new Set(rikishi.keys());
  return world;
}

describe("simulateEntireBasho playoff resolution", () => {
  it("resolves a shared top record via playoff — winner is one of the tied leaders", () => {
    const world = mkWorld(["r0", "r1"]);
    const res = simulateEntireBasho(world, "hatsu", "yoko-playoff-seed");

    const maxWins = Math.max(...Array.from(res.standings.values()).map((s) => s.wins));
    const tied = [...res.standings.entries()]
      .filter(([, s]) => s.wins === maxWins)
      .map(([id]) => id);

    if (tied.length > 1) {
      // A shared top record must be decided by playoff, not stableTieBreak.
      expect(res.playoffMatches?.length ?? 0).toBeGreaterThan(0);
      expect(tied).toContain(res.yushoWinner.id);
    } else {
      expect(res.yushoWinner.id).toBe(tied[0]);
    }
  });

  it("is deterministic — the same seed produces the same playoff winner", () => {
    const a = simulateEntireBasho(mkWorld(["r0", "r1"]), "hatsu", "det-seed-1");
    const b = simulateEntireBasho(mkWorld(["r0", "r1"]), "hatsu", "det-seed-1");
    expect(a.yushoWinner.id).toBe(b.yushoWinner.id);
    expect(a.yushoWinner.wins).toBe(b.yushoWinner.wins);
  });
});
