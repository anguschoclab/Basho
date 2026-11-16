import { describe, it, expect } from "vitest";
import { resolveBout, absentRikishi } from "@/engine/bout/boutResolver";
import { resolveAndApplyBout } from "@/engine/bout/boutPipeline";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { MatchSchedule } from "@/engine/types/basho";

/**
 * Harmonized absence semantics (W0).
 *
 * Canonical rule everywhere: absent === isRetired || isKyujo.
 * `injured` alone never means absent — an injured rikishi who has not
 * withdrawn fights (competing-injured path) rather than gifting a fusensho.
 *
 * Before harmonization `tryFusensho` treated `injured` as absent
 * (boutResolver) and TournamentSimulator ran a third, divergent gate.
 */
describe("absentRikishi — canonical absence gate", () => {
  it("healthy rikishi is not absent", () => {
    expect(absentRikishi(MockFactory.createRikishi("r1"))).toBe(false);
  });

  it("injured-but-not-kyujo rikishi is NOT absent (fights hurt)", () => {
    const r = MockFactory.createRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });
    expect(absentRikishi(r)).toBe(false);
  });

  it("isKyujo rikishi is absent", () => {
    expect(absentRikishi(MockFactory.createRikishi("r1", { isKyujo: true }))).toBe(true);
  });

  it("isRetired rikishi is absent", () => {
    expect(absentRikishi(MockFactory.createRikishi("r1", { isRetired: true }))).toBe(true);
  });

  it("injured AND kyujo is absent (kyujo is what makes him absent)", () => {
    expect(
      absentRikishi(MockFactory.createRikishi("r1", { injured: true, isKyujo: true }))
    ).toBe(true);
  });
});

function boutCtx(east: Rikishi, west: Rikishi): BoutContext {
  return {
    id: `test-${east.id}-${west.id}`,
    day: 1,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
}

describe("resolveBout — fusensho gate uses canonical absence", () => {
  const basho = MockFactory.createBasho();

  it("injured rikishi still fights — real kimarite, not fusensho", () => {
    const east = MockFactory.createRikishi("east", { injured: true, injuryWeeksRemaining: 2 });
    const west = MockFactory.createRikishi("west");
    const { result } = resolveBout(boutCtx(east, west), east, west, basho);
    expect(result.kimarite).not.toBe("fusensho");
    expect(result.winnerRikishiId).not.toBe("");
  });

  it("isKyujo rikishi yields fusensho; healthy opponent wins", () => {
    const east = MockFactory.createRikishi("east", { isKyujo: true });
    const west = MockFactory.createRikishi("west");
    const { result } = resolveBout(boutCtx(east, west), east, west, basho);
    expect(result.kimarite).toBe("fusensho");
    expect(result.winnerRikishiId).toBe(west.id);
    expect(result.loserRikishiId).toBe(east.id);
  });

  it("isRetired rikishi yields fusensho", () => {
    const east = MockFactory.createRikishi("east");
    const west = MockFactory.createRikishi("west", { isRetired: true });
    const { result } = resolveBout(boutCtx(east, west), east, west, basho);
    expect(result.kimarite).toBe("fusensho");
    expect(result.winnerRikishiId).toBe(east.id);
  });

  it("both absent → double fusenpai (no winner)", () => {
    const east = MockFactory.createRikishi("east", { isKyujo: true });
    const west = MockFactory.createRikishi("west", { isRetired: true });
    const { result } = resolveBout(boutCtx(east, west), east, west, basho);
    expect(result.kimarite).toBe("fusensho");
    expect(result.winnerRikishiId).toBe("");
    expect(result.loserRikishiId).toBe("");
  });
});

describe("resolveAndApplyBout — shared bout pipeline", () => {
  function worldWithBasho(rikishi: Rikishi[], day = 3) {
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      currentBasho: MockFactory.createBasho({ day }),
    });
    for (const r of rikishi) world.rikishi.set(r.id, r);
    return world;
  }

  function match(east: Rikishi, west: Rikishi, day = 3): MatchSchedule {
    return {
      boutId: `m-${east.id}-${west.id}`,
      day,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    } as MatchSchedule;
  }

  it("fusensho loser records an ABSENCE, not a loss", () => {
    const east = MockFactory.createRikishi("east", { isKyujo: true });
    const west = MockFactory.createRikishi("west");
    const world = worldWithBasho([east, west]);
    const { result, updatedStandings } = resolveAndApplyBout(
      world,
      world.currentBasho!,
      match(east, west),
      undefined,
      "fallback"
    );
    expect(result?.kimarite).toBe("fusensho");
    const loserRec = updatedStandings?.get(east.id);
    expect(loserRec?.absences).toBe(1);
    expect(loserRec?.losses).toBe(0);
    const winnerRec = updatedStandings?.get(west.id);
    expect(winnerRec?.wins).toBe(1);
  });

  it("injured rikishi resolves a real bout with normal W/L standings", () => {
    const east = MockFactory.createRikishi("east", { injured: true, injuryWeeksRemaining: 2 });
    const west = MockFactory.createRikishi("west");
    const world = worldWithBasho([east, west]);
    const { result, updatedStandings } = resolveAndApplyBout(
      world,
      world.currentBasho!,
      match(east, west),
      undefined,
      "fallback"
    );
    expect(result?.kimarite).not.toBe("fusensho");
    const winnerId = result!.winnerRikishiId;
    const loserId = result!.loserRikishiId;
    expect(updatedStandings?.get(winnerId)?.wins).toBe(1);
    expect(updatedStandings?.get(loserId)?.losses).toBe(1);
    expect(updatedStandings?.get(loserId)?.absences ?? 0).toBe(0);
  });

  it("career records apply per-bout through the shared path", () => {
    const east = MockFactory.createRikishi("east");
    const west = MockFactory.createRikishi("west");
    const world = worldWithBasho([east, west]);
    const { world: next, result } = resolveAndApplyBout(
      world,
      world.currentBasho!,
      match(east, west),
      undefined,
      "fallback"
    );
    const winner = next.rikishi.get(result!.winnerRikishiId)!;
    const loser = next.rikishi.get(result!.loserRikishiId)!;
    expect(winner.careerWins).toBe(1);
    expect(winner.currentBashoWins).toBe(1);
    expect(loser.careerLosses).toBe(1);
    expect(loser.currentBashoLosses).toBe(1);
  });
});
