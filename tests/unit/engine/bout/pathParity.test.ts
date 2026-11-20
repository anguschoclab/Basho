import { describe, it, expect } from "vitest";
import { simulateBoutForToday, simulateBoutsForDay } from "@/engine/core/world";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { MatchSchedule } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

/**
 * Path-parity pin: the interactive single-bout path
 * (simulateBoutForToday → resolveAndApplyBout) and the batch path
 * (simulateBoutsForDay → resolveAndApplyBout) must produce identical
 * BoutResults for the same fixture — same winner, kimarite, and log.
 */
function worldWithMatch(): {
  world: ReturnType<typeof MockFactory.createWorld>;
  match: MatchSchedule;
  east: Rikishi;
  west: Rikishi;
} {
  const east = MockFactory.createRikishi("east", {
    stats: { ...MockFactory.createRikishi("tmp").stats, power: 60 },
  });
  const west = MockFactory.createRikishi("west");
  const match: MatchSchedule = {
    boutId: "parity-bout",
    day: 3,
    eastRikishiId: east.id,
    westRikishiId: west.id,
  } as MatchSchedule;
  const world = MockFactory.createWorld({
    cyclePhase: "active_basho",
    currentBasho: MockFactory.createBasho({ day: 3, matches: [match] }),
  });
  world.rikishi.set(east.id, east);
  world.rikishi.set(west.id, west);
  return { world, match, east, west };
}

describe("bout path parity — interactive vs batch", () => {
  it("single and batch paths produce identical results", () => {
    const { world } = worldWithMatch();

    const single = simulateBoutForToday(world, 0);
    const batch = simulateBoutsForDay(world);

    expect(single.result).toBeTruthy();
    expect(batch.results).toHaveLength(1);
    const a = single.result!;
    const b = batch.results[0];

    expect(a.winnerRikishiId).toBe(b.winnerRikishiId);
    expect(a.kimarite).toBe(b.kimarite);
    expect(a.winner).toBe(b.winner);
    expect(a.duration).toBe(b.duration);
    expect(a.log).toEqual(b.log);
  });

  it("both paths converge standings identically", () => {
    const { world } = worldWithMatch();

    const single = simulateBoutForToday(world, 0);
    const batch = simulateBoutsForDay(world);

    const sA = single.world.currentBasho?.standings;
    const sB = batch.world.currentBasho?.standings;
    expect(sA?.size).toBe(sB?.size);
    for (const [id, rec] of sA ?? []) {
      expect(sB?.get(id)).toEqual(rec);
    }
  });
});
