import { describe, it, expect } from "vitest";
import { announceConditionalSansho } from "@/engine/basho/conditionalSansho";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoState, MatchSchedule } from "@/engine/types/basho";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvedBout(
  boutId: string,
  day: number,
  winnerId: string,
  loserId: string,
  kimarite = "yorikiri"
): MatchSchedule {
  return {
    boutId,
    day,
    eastRikishiId: winnerId,
    westRikishiId: loserId,
    result: {
      boutId,
      day,
      winner: "east",
      winnerRikishiId: winnerId,
      loserRikishiId: loserId,
      kimarite,
      isDraw: false,
    },
  };
}

function pendingBout(boutId: string, day: number, eastId: string, westId: string): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId };
}

/** 14 days of wins for a rikishi against a rotation of jobber opponents. */
function winsFor(id: string, wins: number, startDay = 1): MatchSchedule[] {
  const out: MatchSchedule[] = [];
  for (let i = 0; i < wins; i++) {
    out.push(resolvedBout(`b-${id}-w${i}`, startDay + i, id, `jobber-${i}`));
  }
  return out;
}

function eventPayloads(impact: ReturnType<typeof announceConditionalSansho>) {
  return (impact.events ?? []).map((e) => e.data ?? {});
}

// ---------------------------------------------------------------------------
// WS-12 residual — day-15-AM conditional sanshō
//
// The real sanshō committee convenes on the morning of senshuraku and
// announces provisional awards: a locked candidate is named outright; a 7-7
// rikishi gets the classic "wins the prize with a victory today" conditional.
// The final deliberation still runs post-basho on complete results — the AM
// meeting is the provisional table the press reports, not a binding award.
// ---------------------------------------------------------------------------

describe("conditionalSansho — day-15-AM provisional committee", () => {
  it("flags a 7-7 candidate as needing a win today on day 15", () => {
    const candidate = MockFactory.createRikishi({
      id: "cand-1",
      rank: "maegashira",
      rankNumber: 8,
      division: "makuuchi",
    });
    const leader = MockFactory.createRikishi({
      id: "yoko-1",
      rank: "yokozuna",
      division: "makuuchi",
    });
    const world = MockFactory.createWorld();
    world.rikishi.set(candidate.id, candidate);
    world.rikishi.set(leader.id, leader);

    const basho = MockFactory.createBasho({ day: 15 });
    basho.matches = [
      ...winsFor("yoko-1", 12),
      ...winsFor("cand-1", 7),
      pendingBout("b-d15-cand", 15, "cand-1", "someone"),
    ];

    const impact = announceConditionalSansho(world, basho);
    const payloads = eventPayloads(impact);
    const conditional = payloads.find(
      (p) => p.status === "sansho_conditional" && p.rikishiId === "cand-1"
    );
    expect(conditional).toBeDefined();
    expect(conditional?.condition).toBe("needs_win");
  });

  it("announces a locked provisional winner outright on day 15", () => {
    const strong = MockFactory.createRikishi({
      id: "strong-1",
      rank: "sekiwake",
      division: "makuuchi",
    });
    const yushoLeader = MockFactory.createRikishi({
      id: "yoko-1",
      rank: "yokozuna",
      division: "makuuchi",
    });
    const world = MockFactory.createWorld();
    world.rikishi.set(strong.id, strong);
    world.rikishi.set(yushoLeader.id, yushoLeader);

    const basho = MockFactory.createBasho({ day: 15 });
    basho.matches = [
      ...winsFor("yoko-1", 13),
      ...winsFor("strong-1", 11),
      pendingBout("b-d15-strong", 15, "strong-1", "someone"),
    ];

    const impact = announceConditionalSansho(world, basho);
    const payloads = eventPayloads(impact);
    const provisional = payloads.find(
      (p) => p.status === "sansho_conditional" && p.rikishiId === "strong-1"
    );
    expect(provisional).toBeDefined();
    expect(provisional?.condition).toBe("secured");
  });

  it("is a no-op on day 14 and after all day-15 bouts resolve", () => {
    const r = MockFactory.createRikishi({ id: "cand-1", rank: "maegashira", division: "makuuchi" });
    const world = MockFactory.createWorld();
    world.rikishi.set(r.id, r);

    const bashoD14 = MockFactory.createBasho({ day: 14 });
    bashoD14.matches = [...winsFor("cand-1", 7), pendingBout("b-d14", 14, "cand-1", "x")];
    expect(eventPayloads(announceConditionalSansho(world, bashoD14)).length).toBe(0);

    const bashoResolved = MockFactory.createBasho({ day: 15 });
    bashoResolved.matches = [
      ...winsFor("cand-1", 8),
      resolvedBout("b-d15-done", 15, "cand-1", "x"),
    ];
    expect(eventPayloads(announceConditionalSansho(world, bashoResolved)).length).toBe(0);
  });
});
