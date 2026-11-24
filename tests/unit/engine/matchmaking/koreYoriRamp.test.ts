import { describe, it, expect } from "vitest";
import { buildSwissTorikumi } from "@/engine/matchmaking/index";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoState } from "@/engine/types/basho";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStandings(
  basho: BashoState,
  records: Record<string, { wins: number; losses: number }>
) {
  for (const [id, record] of Object.entries(records)) {
    basho.standings.set(id, record);
  }
}

function isElitePairing(p: { eastId: string; westId: string }, eliteIds: Set<string>): boolean {
  return eliteIds.has(p.eastId) && eliteIds.has(p.westId);
}

// ---------------------------------------------------------------------------
// Kore-yori ramp — Days 13–14
//
// Real torikumi committees do not wait until senshuraku to begin contender
// pairings. From day 13 the yusho leaders are stepped up into the sanyaku/
// joi block and elite-vs-elite clashes begin landing; only the musubi-no-
// ichiban "finale" pairing stays reserved for day 15. Pre-fix the sim ran
// plain win-bucket Swiss through day 14, so a runaway maegashira leader
// could face a same-record rank-and-filer on day 13 while the ozeki duelled
// a different bucket — the d13–14 marquee cards never materialized.
// ---------------------------------------------------------------------------

describe("koreYoriRamp — contender pairing begins days 13–14", () => {
  it("steps a runaway sole leader up into the elite block on day 13", () => {
    const leader = MockFactory.createRikishi({
      id: "m8-leader",
      rank: "maegashira",
      rankNumber: 8,
      heyaId: "heya-l",
    });
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna", heyaId: "heya-y" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki", rank: "ozeki", heyaId: "heya-o" });
    const m6 = MockFactory.createRikishi({
      id: "m6",
      rank: "maegashira",
      rankNumber: 6,
      heyaId: "heya-p",
    });

    const basho = MockFactory.createBasho({ day: 13 });
    setStandings(basho, {
      // Runaway: nobody within one win — the committee feeds the leader to
      // the strongest available opposition rather than a win-bucket peer.
      "m8-leader": { wins: 12, losses: 0 },
      yoko: { wins: 9, losses: 3 },
      ozeki: { wins: 8, losses: 4 },
      m6: { wins: 9, losses: 3 },
    });

    const pairings = buildSwissTorikumi(basho, [leader, yoko, ozeki, m6], {
      seed: "test-leader-steps-up-d13",
      division: "makuuchi",
    });

    const leaderBout = pairings.find(
      (p) => p.eastId === "m8-leader" || p.westId === "m8-leader"
    );
    expect(leaderBout).toBeDefined();
    const opponent =
      leaderBout?.eastId === "m8-leader" ? leaderBout?.westId : leaderBout?.eastId;
    // The top elite (yokozuna) is the natural step-up opponent.
    expect(opponent).toBe("yoko");
    expect(leaderBout?.reasons).toContain("leader_steps_up");
  });

  it("begins elite-vs-elite clashes on day 14 without the finale tag", () => {
    const yoko1 = MockFactory.createRikishi({ id: "yoko1", rank: "yokozuna", heyaId: "heya-a" });
    const yoko2 = MockFactory.createRikishi({ id: "yoko2", rank: "yokozuna", heyaId: "heya-b" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki", rank: "ozeki", heyaId: "heya-c" });
    const m5 = MockFactory.createRikishi({
      id: "m5",
      rank: "maegashira",
      rankNumber: 5,
      heyaId: "heya-d",
    });

    const basho = MockFactory.createBasho({ day: 14 });
    setStandings(basho, {
      // Divergent records — win-bucket Swiss alone would never pair yoko1
      // (10-3) with yoko2 (7-6); only the kore-yori elite block does.
      yoko1: { wins: 10, losses: 3 },
      yoko2: { wins: 7, losses: 6 },
      ozeki: { wins: 8, losses: 5 },
      m5: { wins: 7, losses: 6 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko1, yoko2, ozeki, m5], {
      seed: "test-koreyori-d14",
      division: "makuuchi",
    });

    const eliteIds = new Set(["yoko1", "yoko2", "ozeki"]);
    const eliteBouts = pairings.filter((p) => isElitePairing(p, eliteIds));
    expect(eliteBouts.length).toBeGreaterThanOrEqual(1);
    for (const p of eliteBouts) {
      expect(p.reasons).toContain("kore_yori_sanyaku");
      // The musubi finale is still reserved for senshuraku.
      expect(p.reasons).not.toContain("finale");
    }
  });

  it("keeps plain win-bucket Swiss through day 12 — no early elite block", () => {
    const yoko1 = MockFactory.createRikishi({ id: "yoko1", rank: "yokozuna", heyaId: "heya-a" });
    const yoko2 = MockFactory.createRikishi({ id: "yoko2", rank: "yokozuna", heyaId: "heya-b" });
    const m5a = MockFactory.createRikishi({
      id: "m5a",
      rank: "maegashira",
      rankNumber: 5,
      heyaId: "heya-c",
    });
    const m5b = MockFactory.createRikishi({
      id: "m5b",
      rank: "maegashira",
      rankNumber: 6,
      heyaId: "heya-d",
    });

    const basho = MockFactory.createBasho({ day: 12 });
    setStandings(basho, {
      yoko1: { wins: 10, losses: 1 },
      yoko2: { wins: 5, losses: 6 },
      m5a: { wins: 10, losses: 1 },
      m5b: { wins: 5, losses: 6 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko1, yoko2, m5a, m5b], {
      seed: "test-swiss-d12",
      division: "makuuchi",
    });

    // On day 12 the win buckets hold: yoko1 must NOT be forced onto yoko2.
    const forced = pairings.find(
      (p) =>
        (p.eastId === "yoko1" && p.westId === "yoko2") ||
        (p.eastId === "yoko2" && p.westId === "yoko1")
    );
    expect(forced).toBeUndefined();
  });
});
