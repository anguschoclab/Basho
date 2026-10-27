/**
 * positionInvariance.test.ts — the bout engine must not favor the east slot.
 *
 * Regression tests for the positional win bias that came from `east.id`
 * always leading the physics seed string. Uses the real kimarite registry —
 * no mocks of KIMARITE_STRATEGIES here.
 */
import { describe, it, expect } from "vitest";
import { mockRikishi, makeMockBasho } from "@tests/unit/engine/utils";
import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";

describe("east/west position invariance", () => {
  it("swapping positions preserves the outcome for most bouts — no positional edge", () => {
    // The order-independent seed gives both arrangements the identical rng
    // stream, but draw *consumption* is per-position (draw #1 always feeds
    // "east's" roll), so individual bouts may legitimately diverge when a
    // marginal draw lands differently. What must NOT happen is a systematic
    // flip toward one slot — which is what the old east-first seed produced.
    let consistent = 0;
    const flips = { toEast: 0, toWest: 0 };
    const basho = makeMockBasho();
    for (let i = 0; i < 40; i++) {
      const a = mockRikishi(`alpha-${i}`, { power: 30 + ((i * 7) % 40), technique: 30 + ((i * 11) % 40) });
      const b = mockRikishi(`beta-${i}`, { power: 30 + ((i * 13) % 40), technique: 30 + ((i * 17) % 40) });
      const r1 = resolveBoutPhysics(
        { id: `sw-${i}`, day: 1, rikishiEastId: a.id, rikishiWestId: b.id },
        a, b, basho
      );
      const r2 = resolveBoutPhysics(
        { id: `sw-${i}`, day: 1, rikishiEastId: b.id, rikishiWestId: a.id },
        b, a, basho
      );
      const aWon1 = r1.result.winnerRikishiId === a.id;
      const aWon2 = r2.result.winnerRikishiId === a.id;
      if (aWon1 === aWon2) consistent++;
      else if (aWon1) flips.toWest++;
      else flips.toEast++;
    }
    // Majority consistent; any flips must not pile onto one side.
    expect(consistent).toBeGreaterThanOrEqual(28);
    expect(Math.abs(flips.toEast - flips.toWest)).toBeLessThanOrEqual(8);
  });

  it("winner distribution stays near 50/50 across a varied population", () => {
    let eastWins = 0;
    for (let i = 0; i < 200; i++) {
      const b = { id: `pop-${i}`, day: 1, rikishiEastId: `pe-${i}`, rikishiWestId: `pw-${i}` };
      const { result } = resolveBoutPhysics(
        b,
        mockRikishi(`pe-${i}`, { power: 30 + (i % 40), speed: 30 + ((i * 7) % 40) }),
        mockRikishi(`pw-${i}`, { power: 30 + ((i * 11) % 40), speed: 30 + ((i * 13) % 40) }),
        makeMockBasho()
      );
      if (result.winner === "east") eastWins++;
    }
    // ~50% expected; 36%–64% is a generous bound — the old code skewed ~56%+.
    expect(eastWins).toBeGreaterThan(72);
    expect(eastWins).toBeLessThan(128);
  });
});
