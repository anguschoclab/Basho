/**
 * v18Scheduling.test.ts
 * =====================
 * V18 failing-first regression pins for two confirmed scheduling/matchmaking
 * bugs. Every assertion below is expected to FAIL against the current
 * implementation — they pin behavior, not current output.
 *
 * BUG V18-S1 — juryo crossover callups are silently dropped.
 *   scheduleJuryoWithCrossover (src/engine/calendar/schedule.ts:250-275)
 *   appends top makushita callups to the scheduling pool, then invokes
 *   buildLowerDivisionSwiss(..., { division: "juryo" }). The swiss drops any
 *   rikishi whose `r.division !== options.division`
 *   (src/engine/matchmaking/LowerDivisionSwiss.ts:399), so every callup —
 *   division "makushita" — is removed before pairing. Observable effect:
 *   with an odd healthy juryo roster the crossover slot is never scheduled,
 *   leaving exactly one healthy juryo rikishi unpaired. Downstream that
 *   rikishi finishes the basho one bout short and buildPerformanceList
 *   records the difference as `absences` (publish/performance.ts:356) —
 *   a phantom absence for a wrestler who never withdrew.
 *
 * BUG V18-S2 — the lower-division Swiss last-resort silently disables
 *   same-heya avoidance (LowerDivisionSwiss.ts:224-238): unpaired rikishi
 *   are force-paired with `rules: { avoidSameHeya: false }` and tagged only
 *   with the generic "forced" reason — the heya violation is invisible to
 *   consumers (MatchSchedule strips `reasons` entirely).
 */
import { describe, it, expect } from "vitest";
import { scheduleDivisionDay } from "@/engine/calendar/schedule";
import { buildLowerDivisionSwiss } from "@/engine/matchmaking/index";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

function sekitoriJuryo(i: number): Rikishi {
  return MockFactory.createRikishi(`j-${i}`, {
    division: "juryo",
    rank: "juryo",
    rankNumber: i,
    side: i % 2 === 1 ? "east" : "west",
  });
}

describe("V18-S1 — juryo crossover schedules the makushita callup", () => {
  /**
   * Fixture: 27 healthy juryo (expected size 28 → oddSlots = 1 → one
   * makushita callup) plus a makushita pool headed by rankNumber 1.
   * Day 2 is a juryo-only day — makushita is not scheduled on even days, so
   * no callup can be `busyToday`.
   */
  function crossoverWorld() {
    const world = MockFactory.createWorld();
    const juryoIds: string[] = [];
    for (let i = 1; i <= 27; i++) {
      const r = sekitoriJuryo(i);
      world.rikishi.set(r.id, r);
      juryoIds.push(r.id);
    }
    const callup = MockFactory.createRikishi("ms-ace", {
      division: "makushita",
      rank: "makushita",
      rankNumber: 1,
      side: "east",
    });
    world.rikishi.set(callup.id, callup);
    for (let i = 2; i <= 6; i++) {
      world.rikishi.set(
        `ms-${i}`,
        MockFactory.createRikishi(`ms-${i}`, {
          division: "makushita",
          rank: "makushita",
          rankNumber: i,
        })
      );
    }
    return { world, juryoIds, callupId: callup.id };
  }

  it("schedules the top makushita callup into an actual juryo bout", () => {
    const { world, callupId } = crossoverWorld();
    const basho = MockFactory.createBasho({ day: 2 });

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "juryo",
      day: 2,
      seed: "v18-s1",
    });

    const scheduledIds = new Set(
      scheduled.flatMap((m) => [m.eastRikishiId, m.westRikishiId])
    );
    // The callup is added to the pool at schedule.ts:264 but filtered out by
    // buildLowerDivisionSwiss's division check — this FAILS today.
    expect(scheduledIds.has(callupId)).toBe(true);
  });

  it("leaves no healthy juryo rikishi unpaired on a crossover day", () => {
    const { world, juryoIds } = crossoverWorld();
    const basho = MockFactory.createBasho({ day: 2 });

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "juryo",
      day: 2,
      seed: "v18-s1",
    });

    const scheduledIds = new Set(
      scheduled.flatMap((m) => [m.eastRikishiId, m.westRikishiId])
    );
    // With the callup dropped, 27 juryo produce 13 bouts and one healthy
    // rikishi goes unpaired — he will be charged a phantom absence at
    // performance publication. This FAILS today.
    const unpaired = juryoIds.filter((id) => !scheduledIds.has(id));
    expect(unpaired).toEqual([]);
  });
});

describe("V18-S2 — lower-division Swiss must not silently pair same-heya", () => {
  it("emits a bye or an explicitly flagged pairing, never a silent same-heya bout", () => {
    // Two rikishi, same heya, same record — the only possible pairing is
    // same-heya, so phase2's tryPair rejects it and the last-resort loop
    // force-pairs them with avoidSameHeya disabled.
    const basho = MockFactory.createBasho({ day: 4 });
    basho.standings.set("mk-x1", { wins: 2, losses: 0 });
    basho.standings.set("mk-x2", { wins: 2, losses: 0 });
    const a = MockFactory.createRikishi("mk-x1", {
      division: "makushita",
      rank: "makushita",
      rankNumber: 1,
      heyaId: "heya-x",
      side: "east",
    });
    const b = MockFactory.createRikishi("mk-x2", {
      division: "makushita",
      rank: "makushita",
      rankNumber: 2,
      heyaId: "heya-x",
      side: "west",
    });

    const pairings = buildLowerDivisionSwiss(basho, [a, b], {
      seed: "v18-s2",
      division: "makushita",
    });

    const sameHeyaPair = pairings.find(
      (p) =>
        (p.eastId === "mk-x1" && p.westId === "mk-x2") ||
        (p.eastId === "mk-x2" && p.westId === "mk-x1")
    );
    // Acceptable outcomes: no pairing at all (both take a bye / fusensho
    // upstream) OR a pairing explicitly flagged as a same-heya violation.
    // Current output: a pairing tagged only "forced" — indistinguishable
    // from a repeat-override and invisible once MatchSchedule strips
    // `reasons`. This FAILS today.
    const flagged =
      sameHeyaPair?.reasons.some((r) => /same.?heya|stable/i.test(r)) ?? false;
    expect(sameHeyaPair === undefined || flagged).toBe(true);
  });
});
