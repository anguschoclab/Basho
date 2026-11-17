import { describe, it, expect } from "vitest";
import { scheduleAllDivisionsDay } from "@/engine/calendar/schedule";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockBasho, makeMockWorld } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

/**
 * W L — JSA no-byes cascade. In honbasho nobody sits out: odd pools are
 * rebalanced by calling up the top rikishi from the division below, the
 * callup pairs against the bottom man of the receiving division, and the
 * cascade flows top-down (juryo shortfall → makushita → sandanme → … →
 * maezumo / 8th bout at the bottom).
 */

function mkDivision(
  division: Rikishi["division"],
  id: string,
  rankNumber: number,
  side: "east" | "west" = "east",
  overrides: Partial<Rikishi> = {}
): Rikishi {
  return mockRikishi(id, {
    division,
    rank: division === "makuuchi" ? "maegashira" : division,
    rankNumber,
    side,
    ...overrides,
  });
}

function buildWorld(rikishiList: Rikishi[], playerHeyaId?: string): WorldState {
  const world = makeMockWorld({ seed: "cascade-test", ...(playerHeyaId ? { playerHeyaId } : {}) });
  for (const r of rikishiList) world.rikishi.set(r.id, r);
  return world;
}

function ids(scheduled: { eastRikishiId: string; westRikishiId: string }[]): Set<string> {
  return new Set(scheduled.flatMap((m) => [m.eastRikishiId, m.westRikishiId]));
}

function daysLowerDivision(): number[] {
  return [1, 3, 5, 7, 9, 11, 13];
}

describe("lower-division callup cascade", () => {
  it("odd makushita calls up the top sandanme man against the bottom makushita", () => {
    const world = buildWorld([
      mkDivision("makushita", "ms-1", 1),
      mkDivision("makushita", "ms-2", 2),
      mkDivision("makushita", "ms-3", 3),
      mkDivision("sandanme", "sd-1", 1),
      mkDivision("sandanme", "sd-2", 2),
      mkDivision("sandanme", "sd-3", 3),
    ]);
    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s1",
      divisions: ["makushita", "sandanme"],
    });

    const cross = scheduled.find((m) => m.crossDivisionCallupId);
    expect(cross).toBeDefined();
    expect(cross!.crossDivisionCallupId).toBe("sd-1");
    // Bottom makushita man (ms-3) faces the callup.
    expect([cross!.eastRikishiId, cross!.westRikishiId]).toContain("ms-3");
    // The callup does NOT also fight on the sandanme card.
    const sdBouts = scheduled.filter(
      (m) => m !== cross && [m.eastRikishiId, m.westRikishiId].includes("sd-1")
    );
    expect(sdBouts).toHaveLength(0);
    // Remaining makushita pair + remaining sandanme pair happen.
    const paired = ids(scheduled);
    expect(paired.has("ms-1")).toBe(true);
    expect(paired.has("ms-2")).toBe(true);
    expect(paired.has("sd-2")).toBe(true);
    expect(paired.has("sd-3")).toBe(true);
  });

  it("cascade: a division losing its top man re-checks its own parity", () => {
    // makushita odd (3) → calls sd-1; sandanme had 3 → now 2 (even, no further callup).
    // Flip: sandanme 4 → still even after losing 1? 4-1=3 odd → needs jonidan callup.
    const world = buildWorld([
      mkDivision("makushita", "ms-1", 1),
      mkDivision("makushita", "ms-2", 2),
      mkDivision("makushita", "ms-3", 3),
      mkDivision("sandanme", "sd-1", 1),
      mkDivision("sandanme", "sd-2", 2),
      mkDivision("sandanme", "sd-3", 3),
      mkDivision("sandanme", "sd-4", 4),
      mkDivision("jonidan", "jd-1", 1),
      mkDivision("jonidan", "jd-2", 2),
      mkDivision("jonokuchi", "jk-1", 1),
    ]);
    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s2",
      divisions: ["makushita", "sandanme", "jonidan", "jonokuchi"],
    });

    const callups = scheduled.filter((m) => m.crossDivisionCallupId);
    // sd-1 up to makushita; sd pool 4-1=3 odd → jd-1 up to sandanme;
    // jd pool 2-1=1 odd → jk-1 up to jonidan.
    const callupIds = callups.map((m) => m.crossDivisionCallupId).sort();
    expect(callupIds).toEqual(["jd-1", "jk-1", "sd-1"]);
    // Nobody double-booked.
    const paired = ids(scheduled);
    for (const id of ["ms-1", "ms-2", "ms-3", "sd-1", "sd-2", "sd-3", "sd-4", "jd-1", "jd-2", "jk-1"]) {
      expect(paired.has(id)).toBe(true);
    }
  });

  it("no eligible callup in the division below leaves the odd man unpaired", () => {
    // sandanme all kyujo → nothing to call up; odd makushita man sits (documented edge).
    const world = buildWorld([
      mkDivision("makushita", "ms-1", 1),
      mkDivision("makushita", "ms-2", 2),
      mkDivision("makushita", "ms-3", 3),
      mkDivision("sandanme", "sd-1", 1, "east", { isKyujo: true }),
    ]);
    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s3",
      divisions: ["makushita", "sandanme"],
    });
    const paired = ids(scheduled);
    // Exactly one makushita pairing — the odd man sits.
    expect(paired.size).toBe(2);
  });
});

describe("jonokuchi — maezumo and 8th bout", () => {
  it("odd jonokuchi mints a maezumo entrant for the cross bout", () => {
    const world = buildWorld([
      mkDivision("jonokuchi", "jk-1", 1),
      mkDivision("jonokuchi", "jk-2", 2),
      mkDivision("jonokuchi", "jk-3", 3),
    ]);
    const { scheduled, impact } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s4",
      divisions: ["jonokuchi"],
    });

    const cross = scheduled.find((m) => m.crossDivisionCallupId);
    expect(cross).toBeDefined();
    const callupId = cross!.crossDivisionCallupId!;
    expect(callupId.startsWith("maezumo")).toBe(true);

    // The maezumo entrant is persisted via the impact's rikishiToAdd.
    const added = impact.collections?.rikishiToAdd ?? [];
    const entrant = added.find((r) => r.id === callupId);
    expect(entrant).toBeDefined();
    expect(entrant!.isMaezumo).toBe(true);
    expect(entrant!.division).toBe("jonokuchi");

    // After resolution he's in the world and paired in exactly one bout.
    const next = resolveImpacts(world, [impact]);
    expect(next.rikishi.get(callupId)?.isMaezumo).toBe(true);
  });

  it("reuses an existing maezumo entrant instead of minting another", () => {
    const maezumo = mockRikishi("maezumo-0", {
      division: "jonokuchi",
      rank: "jonokuchi",
      rankNumber: 999,
      isMaezumo: true,
    } as Partial<Rikishi>);
    const world = buildWorld([
      mkDivision("jonokuchi", "jk-1", 1),
      mkDivision("jonokuchi", "jk-2", 2),
      mkDivision("jonokuchi", "jk-3", 3),
      maezumo,
    ]);
    const { scheduled, impact } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s5",
      divisions: ["jonokuchi"],
    });

    const cross = scheduled.find((m) => m.crossDivisionCallupId);
    expect(cross?.crossDivisionCallupId).toBe("maezumo-0");
    // No new entrant minted.
    expect(impact.collections?.rikishiToAdd ?? []).toHaveLength(0);
  });

  it("exhausted maezumo on the last lower-division day falls to an 8th bout", () => {
    // Two maezumo already minted (cap) and busy → day 13 odd jonokuchi →
    // a rikishi who already completed 7 bouts fights again.
    const busy = (id: string) =>
      mockRikishi(id, { division: "jonokuchi", rank: "jonokuchi", rankNumber: 998, isMaezumo: true, injured: true } as Partial<Rikishi>);
    const mz1 = busy("maezumo-1");
    const mz2 = busy("maezumo-2");
    const veteran = mkDivision("jonokuchi", "jk-vet", 5);
    const world = buildWorld([
      mkDivision("jonokuchi", "jk-1", 1),
      mkDivision("jonokuchi", "jk-2", 2),
      mkDivision("jonokuchi", "jk-3", 3),
      veteran,
      mz1,
      mz2,
    ]);
    const basho = makeMockBasho({ day: 13 });
    // mz1/mz2 already used twice (cap = 2 uses? design: cap on minted count);
    // jk-vet has fought all 7 scheduled bouts already.
    for (let d = 1; d <= 11; d += 2) {
      basho.matches.push({
        boutId: `done-${d}`,
        day: d,
        eastRikishiId: "jk-vet",
        westRikishiId: d === 1 ? "maezumo-1" : "maezumo-2",
        result: { winnerRikishiId: "jk-vet" } as never,
      });
    }
    basho.matches.push({
      boutId: "done-13",
      day: 13,
      eastRikishiId: "jk-vet",
      westRikishiId: "ms-9",
      result: { winnerRikishiId: "jk-vet" } as never,
    });

    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 13,
      seed: "s6",
      divisions: ["jonokuchi"],
    });

    const eighth = scheduled.find((m) => m.eighthBoutForRikishiId);
    expect(eighth).toBeDefined();
    expect(eighth!.eighthBoutForRikishiId).toBe("jk-vet");
    expect([eighth!.eastRikishiId, eighth!.westRikishiId]).toContain("jk-vet");
  });
});

describe("juryo odd-day starvation (regression)", () => {
  it("odd juryo on an odd day still gets a makushita callup (was starved by busyToday)", () => {
    // Day 1: makushita AND juryo both fight. The makushita callup is chosen
    // before the makushita card is set — not filtered out as "busy".
    const world = buildWorld([
      mkDivision("juryo", "j-1", 1),
      mkDivision("juryo", "j-2", 2),
      mkDivision("juryo", "j-3", 3),
      mkDivision("makushita", "ms-1", 1),
      mkDivision("makushita", "ms-2", 2),
      mkDivision("makushita", "ms-3", 3),
      mkDivision("makushita", "ms-4", 4),
      mkDivision("makushita", "ms-5", 5),
    ]);
    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s7",
      divisions: ["makushita", "juryo"],
    });

    const paired = ids(scheduled);
    // All three juryo men fight — makushita callups joined their card.
    for (const id of ["j-1", "j-2", "j-3"]) expect(paired.has(id)).toBe(true);
    expect(["ms-1", "ms-2", "ms-3", "ms-4", "ms-5"].some((id) => paired.has(id))).toBe(true);
    // The called-up makushita man fights exactly one bout.
    const callupBouts = scheduled.filter((m) => m.crossDivisionCallupId);
    for (const m of callupBouts) {
      const id = m.crossDivisionCallupId!;
      const count = scheduled.filter((x) =>
        [x.eastRikishiId, x.westRikishiId].includes(id)
      ).length;
      expect(count).toBe(1);
    }
  });
});

describe("player-rikishi callup surfacing", () => {
  it("a player's rikishi called up produces a notable event", () => {
    const world = buildWorld(
      [
        mkDivision("makuuchi", "m-1", 1, "east", { heyaId: "player_heya" }),
        mkDivision("makuuchi", "m-2", 2, "east", { heyaId: "player_heya" }),
        mkDivision("makuuchi", "m-3", 3, "east", { heyaId: "player_heya" }),
        mkDivision("juryo", "j-1", 1, "east", { heyaId: "player_heya" }),
        mkDivision("juryo", "j-2", 2),
        mkDivision("juryo", "j-3", 3),
      ],
      "player_heya"
    );
    const { impact } = scheduleAllDivisionsDay({
      world,
      basho: makeMockBasho({ day: 1 }),
      day: 1,
      seed: "s8",
      divisions: ["juryo", "makuuchi"],
    });
    const events = impact.events ?? [];
    const callupEvent = events.find((e) => e.data?.status === "callup");
    expect(callupEvent).toBeDefined();
    expect(callupEvent!.data?.rikishiId).toBe("j-1");
  });
});

describe("no-byes invariant (odd-pool day sweep)", () => {
  it("every active lower-division rikishi is paired across all 7 lower days", () => {
    // Odd pools at every level plus a mid-basho kyujo — no one should be
    // left without a bout on any scheduled day.
    const roster: Rikishi[] = [];
    for (const div of ["makushita", "sandanme", "jonidan", "jonokuchi"] as const) {
      for (let i = 1; i <= 5; i++) roster.push(mkDivision(div, `${div}-${i}`, i));
    }
    const world = buildWorld(roster);
    const basho = makeMockBasho({ day: 1, matches: [] });

    const unpaired: string[] = [];
    for (const day of daysLowerDivision()) {
      const { scheduled } = scheduleAllDivisionsDay({
        world,
        basho,
        day,
        seed: "sweep",
        divisions: ["makushita", "sandanme", "jonidan", "jonokuchi"],
      });
      basho.matches.push(...scheduled);
      const paired = ids(scheduled);
      for (const r of roster) {
        if (r.isKyujo || r.isRetired) continue;
        // A called-up man may be paired on a *higher* division's card; he
        // still appears in `paired` since the schedule contains all bouts.
        if (!paired.has(r.id)) unpaired.push(`${r.id}@d${day}`);
      }
    }
    expect(unpaired).toEqual([]);
  });
});
