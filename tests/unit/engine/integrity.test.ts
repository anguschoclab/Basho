/**
 * Spec — engine integrity guards for the realism-calibration workstreams.
 *
 * Every new path added by this plan must respect the deterministic
 * contract: seeded RNG only, identical inputs → identical outputs.
 * These checks pin that contract at the touch-points the workstreams
 * modify (banzuke deliberation + torikumi).
 */
import { describe, it, expect } from "vitest";
import { deliberateBanzukeMovement } from "@/engine/banzuke/banzukeCommittee";
import { buildSwissTorikumi } from "@/engine/matchmaking/SwissAlgorithm";
import { SeededRNG } from "@/engine/core/rng";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BanzukeEntry, RankPosition } from "@/engine/types/banzuke";

describe("determinism at calibrated touch-points", () => {
  const entry: BanzukeEntry = {
    rikishiId: "r1",
    position: { rank: "maegashira", rankNumber: 8, side: "east" } as RankPosition,
    division: "makuuchi",
  };
  const perf = { rikishiId: "r1", wins: 9, losses: 6, absences: 0 };

  it("banzuke deliberation is identical across fresh identical RNGs", () => {
    const a = deliberateBanzukeMovement(entry, perf, new Set(), new SeededRNG("det-seed"), "dewanoumi");
    const b = deliberateBanzukeMovement(entry, perf, new Set(), new SeededRNG("det-seed"), "dewanoumi");
    expect(a.delta).toBe(b.delta);
    expect(a.decision.score).toBe(b.decision.score);
  });

  it("torikumi is identical across fresh identical RNGs", () => {
    const mk = (id: string, heyaId: string) =>
      MockFactory.createRikishi({ id, heyaId, division: "makuuchi" });
    const pool = ["a", "b", "c", "d", "e", "f"].map((id, i) => mk(id, `heya-${i}`));
    const run = () => {
      const basho = MockFactory.createBasho({ day: 8 });
      for (const r of pool) basho.standings.set(r.id, { wins: 4, losses: 4 });
      return buildSwissTorikumi(basho, pool, { seed: "det-seed", day: 8 }).map(
        (p) => `${p.eastId}v${p.westId}`
      );
    };
    expect(run()).toEqual(run());
  });
});
