import { describe, it, expect } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";

/**
 * Adaptive per-day torikumi (V10-R11).
 *
 * simulateEntireBasho used to pre-generate all 15 days up front, so Swiss
 * pairing never saw results — multiple makuuchi rikishi could finish 15-0
 * without ever meeting. The interactive path already schedules day-by-day
 * (ensureDaySchedule); autosim must do the same so records steer pairing.
 */
function mkWorld(boostedIds: string[]) {
  const world = MockFactory.createWorld();
  const heyas = ["h1", "h2", "h3", "h4"].map((h) => MockFactory.createHeya(h as Id, {}));
  for (const h of heyas) world.heyas.set(h.id, h);
  const rikishi = new Map<Id, Rikishi>();
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
        ? { condition: 100, motivation: 100,
            stats: { power: 95, technique: 95, speed: 95, balance: 95, stamina: 85, mental: 85 } as Rikishi["stats"] }
        : { stats: { power: 30, technique: 30, speed: 30, balance: 30, stamina: 30, mental: 30 } as Rikishi["stats"] }),
    });
    rikishi.set(id, r);
  }
  world.rikishi = rikishi;
  world.activeRikishiIds = new Set(rikishi.keys());
  return world;
}

describe("simulateEntireBasho — adaptive torikumi", () => {
  it("two cross-heya co-leaders meet — they cannot both finish undefeated", () => {
    const world = mkWorld(["r0", "r1"]);
    const res = simulateEntireBasho(world, "hatsu", "adaptive-seed-1");

    const s0 = res.standings.get("r0" as Id);
    const s1 = res.standings.get("r1" as Id);
    expect(s0).toBeDefined();
    expect(s1).toBeDefined();
    // Pre-gen allowed r0 AND r1 to finish 15-0 without meeting (R11).
    // With records feeding the Swiss each day, the only plausible winner
    // for the other's loss is the fellow 95-stat rikishi.
    const bothUndefeated = s0!.losses === 0 && s1!.losses === 0;
    expect(bothUndefeated).toBe(false);
  });

  it("stays deterministic — same seed, same schedule and winner", () => {
    const a = simulateEntireBasho(mkWorld(["r0", "r1"]), "hatsu", "adaptive-seed-2");
    const b = simulateEntireBasho(mkWorld(["r0", "r1"]), "hatsu", "adaptive-seed-2");
    const boutsA = a.finalWorld?.currentBasho?.matches.map((m) => m.boutId);
    const boutsB = b.finalWorld?.currentBasho?.matches.map((m) => m.boutId);
    expect(boutsA).toEqual(boutsB);
    expect(a.yushoWinner.id).toBe(b.yushoWinner.id);
  });
});
