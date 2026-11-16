import { describe, it, expect } from "vitest";
import {
  applyGyojiOfficiation,
  boutImportanceForBout,
} from "@/engine/bout/resolution/gyoji";
import { generateGyoji, generateShimpan } from "@/engine/officials/GyojiService";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BoutResult } from "@/engine/types/basho";

/**
 * Gyoji importance (W C): the official assigned to a bout must be chosen
 * from the bout's own profile — rank tier and day number — because the
 * verdict now runs BEFORE stakes/enrichment set isTitleStakes/isYushoRace.
 *
 * Grading mirrors the production tiers: yokozuna/ozeki bouts get the top
 * officials, sanyaku bouts mid-tier, maegashira baseline, with a bump on
 * the final weekend.
 */
function resultFor(day: number, overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: `imp-${day}`,
    day,
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: {} }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  };
}

function rikishi(rank: "yokozuna" | "ozeki" | "sekiwake" | "maegashira") {
  return MockFactory.createRikishi(`r-${rank}`, { rank });
}

describe("boutImportanceForBout", () => {
  it("grades yokozuna/ozeki bouts highest", () => {
    expect(boutImportanceForBout(rikishi("yokozuna"), rikishi("maegashira"), 1)).toBeGreaterThanOrEqual(80);
    expect(boutImportanceForBout(rikishi("ozeki"), rikishi("ozeki"), 1)).toBeGreaterThanOrEqual(80);
  });

  it("grades sanyaku bouts above rank-and-file", () => {
    const sanyaku = boutImportanceForBout(rikishi("sekiwake"), rikishi("maegashira"), 1);
    const hiramaku = boutImportanceForBout(rikishi("maegashira"), rikishi("maegashira"), 1);
    expect(sanyaku).toBeGreaterThan(hiramaku);
  });

  it("bumps importance on senshuraku and the final weekend", () => {
    const base = boutImportanceForBout(rikishi("maegashira"), rikishi("maegashira"), 8);
    expect(boutImportanceForBout(rikishi("maegashira"), rikishi("maegashira"), 15)).toBeGreaterThan(base);
    expect(boutImportanceForBout(rikishi("maegashira"), rikishi("maegashira"), 14)).toBeGreaterThan(base);
  });

  it("does not depend on stakes flags — early-day yokozuna bout still grades high", () => {
    // An unstakes-flagged yokozuna bout on day 1 must still draw a senior
    // official — the old implementation read isTitleStakes, which was not
    // yet set at verdict time.
    expect(
      boutImportanceForBout(rikishi("yokozuna"), rikishi("maegashira"), 1)
    ).toBeGreaterThanOrEqual(80);
  });
});

describe("applyGyojiOfficiation — rank/day assignment", () => {
  it("a yokozuna bout draws the highest-tier available gyoji", () => {
    const junior = generateGyoji("imp-junior", "makushita", 0);
    const senior = generateGyoji("imp-senior", "tate", 0);
    const world = MockFactory.createWorld({
      gyojiPool: [junior, senior],
      shimpanPool: [0, 1, 2, 3, 4].map((i) => generateShimpan("imp-sh", i)),
    });
    const result = resultFor(3);
    const builder = createImpactBuilder("test-importance");

    applyGyojiOfficiation(
      world,
      result,
      MockFactory.createBasho({ day: 3 }),
      builder,
      rikishi("yokozuna"),
      rikishi("maegashira")
    );

    expect(result.gyojiId).toBe(senior.id);
  });

  it("assigns importance from rikishi ranks, not post-hoc stakes flags", () => {
    const junior = generateGyoji("imp2-junior", "makushita", 0);
    const senior = generateGyoji("imp2-senior", "tate", 0);
    const world = MockFactory.createWorld({
      gyojiPool: [junior, senior],
      shimpanPool: [0, 1, 2, 3, 4].map((i) => generateShimpan("imp2-sh", i)),
    });
    // Result with NO stakes flags set — as it exists pre-enrichment.
    const result = resultFor(5);
    const builder = createImpactBuilder("test-importance2");

    applyGyojiOfficiation(
      world,
      result,
      MockFactory.createBasho({ day: 5 }),
      builder,
      rikishi("ozeki"),
      rikishi("maegashira")
    );

    expect(result.gyojiId).toBe(senior.id);
  });
});
