import { describe, it, expect } from "vitest";
import {
  applyMonoiiVerdict,
  flipResultWinner,
} from "@/engine/bout/resolution/monoiiVerdict";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutPhysics";

/**
 * Honest mono-ii (W C): a "reversed" verdict must actually flip the bout
 * result — winner, winnerRikishiId, loserRikishiId, and the recomputed
 * upset flag — BEFORE achievements/standings/h2h/kensho see it.
 *
 * The apparent (pre-verdict) winner is preserved on the result so the
 * narrative can tell the story correctly.
 */
function baseResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "mv-1",
    day: 5,
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 12,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: {} }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    monoii: true,
    ...overrides,
  };
}

function verdictParams(
  result: BoutResult,
  east: ReturnType<typeof MockFactory.createRikishi>,
  west: ReturnType<typeof MockFactory.createRikishi>,
  world?: ReturnType<typeof MockFactory.createWorld>
) {
  const bout: BoutContext = {
    id: result.boutId,
    day: result.day ?? 5,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
  return {
    bout,
    ctxFinal: bout,
    result,
    east,
    west,
    eastBout: east,
    westBout: west,
    basho: MockFactory.createBasho({ day: result.day }),
    world,
    builder: createImpactBuilder("test-verdict"),
  };
}

describe("flipResultWinner", () => {
  it("flips winner/loser sides and ids, records apparent sides", () => {
    const east = MockFactory.createRikishi("r-east", { rankNumber: 5 });
    const west = MockFactory.createRikishi("r-west", { rankNumber: 10 });
    const result = baseResult();

    const flipped = flipResultWinner(result, east, west);

    expect(flipped.winner).toBe("west");
    expect(flipped.winnerRikishiId).toBe("r-west");
    expect(flipped.loserRikishiId).toBe("r-east");
    expect(flipped.apparentWinner).toBe("east");
    expect(flipped.apparentLoser).toBe("west");
    // west (rankNumber 10) beating east (rankNumber 5) IS an upset.
    expect(flipped.upset).toBe(true);
  });

  it("recomputes upset — favored apparent loser means no upset", () => {
    const east = MockFactory.createRikishi("r-east", { rankNumber: 10 });
    const west = MockFactory.createRikishi("r-west", { rankNumber: 3 });
    const result = baseResult({ upset: true });

    const flipped = flipResultWinner(result, east, west);

    expect(flipped.winner).toBe("west");
    // west is the higher rank — beating east is expected, not an upset.
    expect(flipped.upset).toBe(false);
  });
});

describe("applyMonoiiVerdict", () => {
  it("reversed generic mono-ii flips the winner", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    const result = baseResult({ monoiiOutcome: "reversed" });
    const params = verdictParams(result, east, west);

    const { result: final } = applyMonoiiVerdict(params);

    expect(final.winner).toBe("west");
    expect(final.winnerRikishiId).toBe("r-west");
    expect(final.loserRikishiId).toBe("r-east");
  });

  it("does NOT double-flip a confirmed foul review (already applied)", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    const result = baseResult({
      monoiiOutcome: "reversed",
      foulReview: {
        foul: "topknot_grab",
        suspectRikishiId: "r-west",
        victimRikishiId: "r-east",
        suspectSide: "west",
        confirmed: true,
        apparentKimarite: "oshidashi",
      },
    });
    const params = verdictParams(result, east, west);

    const { result: final } = applyMonoiiVerdict(params);

    // applyOfficiating already flipped to east; verdict application must
    // leave the result untouched.
    expect(final.winner).toBe("east");
    expect(final.winnerRikishiId).toBe("r-east");
  });

  it("upheld / absent outcomes leave the result unchanged", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    for (const outcome of ["upheld", undefined] as const) {
      const result = baseResult({ monoiiOutcome: outcome });
      const params = verdictParams(result, east, west);
      const { result: final } = applyMonoiiVerdict(params);
      expect(final.winner).toBe("east");
      expect(final.apparentWinner).toBeUndefined();
    }
  });

  it("applyBoutResult attributes the flipped winner — standings see truth", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      currentBasho: MockFactory.createBasho({ day: 5 }),
    });
    world.rikishi.set(east.id, east);
    world.rikishi.set(west.id, west);
    const result = baseResult({ monoiiOutcome: "reversed" });
    const { result: final } = applyMonoiiVerdict(verdictParams(result, east, west, world));

    const match = {
      boutId: "mv-1",
      day: 5,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    } as MatchSchedule;
    const impact = applyBoutResult(world, match, final);
    const standings = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number }
    >;
    expect(standings.get(west.id)?.wins).toBe(1);
    expect(standings.get(east.id)?.losses).toBe(1);
    // Career records follow the flipped winner too.
    const winnerUpd = impact.entities?.rikishiUpdates?.get(west.id);
    const loserUpd = impact.entities?.rikishiUpdates?.get(east.id);
    expect(winnerUpd?.careerWins).toBe(1);
    expect(loserUpd?.careerLosses).toBe(1);
  });
});
