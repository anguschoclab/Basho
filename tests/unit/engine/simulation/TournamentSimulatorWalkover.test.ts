import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { resolveAndApplyBout } from "@/engine/bout/boutPipeline";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { MatchSchedule } from "@/engine/types/basho";

/**
 * N9/N10: walkover (fusensho) semantics — exercised through the REAL shared
 * pipeline (W0 harmonization). There is no longer a separate
 * TournamentSimulator walkover check; every path routes through
 * resolveBout's absentRikishi gate (absent === isKyujo || isRetired).
 */
function ctx(east: Rikishi, west: Rikishi): BoutContext {
  return {
    id: `walkover-${east.id}-${west.id}`,
    day: 1,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
}

describe("N9/N10: walkover semantics through the shared pipeline", () => {
  it("H.1: isKyujo produces a fusensho, not a real bout", () => {
    const east = MockFactory.createRikishi("east", { injured: false, isKyujo: true });
    const west = MockFactory.createRikishi("west", { injured: false, isKyujo: false });
    const { result } = resolveBout(ctx(east, west), east, west, MockFactory.createBasho());
    expect(result.kimarite).toBe("fusensho");
    expect(result.winnerRikishiId).toBe(west.id);
  });

  it("H.2: isRetired produces a fusensho", () => {
    const east = MockFactory.createRikishi("east", { isRetired: false });
    const west = MockFactory.createRikishi("west", { isRetired: true });
    const { result } = resolveBout(ctx(east, west), east, west, MockFactory.createBasho());
    expect(result.kimarite).toBe("fusensho");
    expect(result.winnerRikishiId).toBe(east.id);
  });

  it('H.3: walkover kimarite is "fusensho" (never a real technique)', () => {
    const east = MockFactory.createRikishi("east", { isKyujo: true });
    const west = MockFactory.createRikishi("west");
    const { result } = resolveBout(ctx(east, west), east, west, MockFactory.createBasho());
    expect(result.kimarite).toBe("fusensho");
    expect(result.kimariteName).toBe("Fusenshō");
  });

  it("H.4: fusenpai records a loss, not an absence, in standings", () => {
    const east = MockFactory.createRikishi("east", { isKyujo: true });
    const west = MockFactory.createRikishi("west");
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      currentBasho: MockFactory.createBasho({ day: 2 }),
    });
    world.rikishi.set(east.id, east);
    world.rikishi.set(west.id, west);
    const match = {
      boutId: "w4",
      day: 2,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    } as MatchSchedule;
    const { updatedStandings } = resolveAndApplyBout(
      world,
      world.currentBasho!,
      match,
      undefined,
      "w4"
    );
    expect(updatedStandings?.get(east.id)?.losses).toBe(1);
    expect(updatedStandings?.get(east.id)?.absences).toBe(0);
  });
});
