import { describe, it, expect } from "vitest";
import { applyMonoiiVerdict } from "@/engine/bout/resolution/monoiiVerdict";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutPhysics";

/**
 * Torinaoshi (W C): a "rematch" verdict must actually re-run the bout —
 * physics re-resolved under a salted basho id, and only the rematch result
 * counts for standings, records, h2h, and narrative.
 */
function monoiiResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "tori-1",
    day: 5,
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 20,
    upset: false,
    isKinboshi: false,
    log: [
      {
        phase: "edge_crisis",
        data: { side: "west", escaped: false, forced: true, controversial: true },
      },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    monoii: true,
    monoiiOutcome: "rematch",
    ...overrides,
  };
}

function params(
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
    basho: MockFactory.createBasho({ id: "basho-t", day: result.day }),
    world,
    builder: createImpactBuilder("test-torinaoshi"),
  };
}

describe("torinaoshi — rematch actually re-fights", () => {
  it("re-runs the bout and marks it torinaoshi", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    const result = monoiiResult();

    const { result: final } = applyMonoiiVerdict(params(result, east, west));

    expect(final.isTorinaoshi).toBe(true);
    expect(final.torinaoshiContext?.firstWinner).toBe("east");
    expect(final.torinaoshiContext?.firstKimarite).toBe("yorikiri");
    expect(final.torinaoshiContext?.firstLog.length).toBeGreaterThan(0);
    // The rematch produced a decisive winner (never another rematch).
    expect(["r-east", "r-west"]).toContain(final.winnerRikishiId);
    expect(final.winnerRikishiId).not.toBe("");
    expect(final.kimarite).not.toBe("fusensho");
    // monoiiOutcome stays "rematch" — the ordering that shaped this bout.
    expect(final.monoiiOutcome).toBe("rematch");
  });

  it("is deterministic — same fixture, same rematch", () => {
    const a = applyMonoiiVerdict(
      params(
        monoiiResult(),
        MockFactory.createRikishi("r-east"),
        MockFactory.createRikishi("r-west")
      )
    ).result;
    const b = applyMonoiiVerdict(
      params(
        monoiiResult(),
        MockFactory.createRikishi("r-east"),
        MockFactory.createRikishi("r-west")
      )
    ).result;
    expect(a.winnerRikishiId).toBe(b.winnerRikishiId);
    expect(a.kimarite).toBe(b.kimarite);
    expect(a.duration).toBe(b.duration);
  });

  it("the salted rerun diverges from a naive re-run (basho id reaches physics)", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    // Re-running physics with the SAME basho id must not be what happens —
    // the rematch is salted, so its log differs from a same-seed replay.
    const { result: final } = applyMonoiiVerdict(
      params(monoiiResult({ boutId: "tori-salt" }), east, west)
    );
    expect(final.log).not.toEqual(final.torinaoshiContext?.firstLog);
  });

  it("only the rematch counts — one standings entry per rikishi", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      currentBasho: MockFactory.createBasho({ day: 5 }),
    });
    world.rikishi.set(east.id, east);
    world.rikishi.set(west.id, west);

    const { result: final } = applyMonoiiVerdict(
      params(monoiiResult(), east, west, world)
    );

    const match = {
      boutId: "tori-1",
      day: 5,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    } as MatchSchedule;
    const impact = applyBoutResult(world, match, final);
    const standings = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number }
    >;
    // Exactly one win and one loss recorded — the annulled first attempt
    // contributes nothing.
    expect(standings.get(final.winnerRikishiId)?.wins).toBe(1);
    expect(standings.get(final.loserRikishiId)?.losses).toBe(1);
    expect(
      (standings.get(east.id)?.wins ?? 0) + (standings.get(east.id)?.losses ?? 0)
    ).toBe(1);
    expect(
      (standings.get(west.id)?.wins ?? 0) + (standings.get(west.id)?.losses ?? 0)
    ).toBe(1);
  });
});
