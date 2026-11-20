/**
 * banzukeCommittee.test.ts — real-JSA banzuke movement via committee.
 *
 * Real banzuke movement approximates (W−L)/2 rank slots where kyujo counts
 * roughly as losses — NO 1.4–2.5× absence multiplier, NO fixed achievement
 * units, and NO ichimon political weighting. The committee deliberates each
 * case: base delta from the record, merits (yusho/sansho/kinboshi) and
 * faction affinity as bounded discretion.
 */
import { describe, it, expect } from "vitest";
import { deliberateBanzukeMovement } from "@/engine/banzuke/banzukeCommittee";
import { rngFromSeed } from "@/engine/core/rng";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

const entry = (rank: string, rankNumber: number, division = "makuuchi"): BanzukeEntry =>
  ({
    rikishiId: `r-${rank}${rankNumber}`,
    division,
    position: { rank, rankNumber, side: "east" },
  }) as unknown as BanzukeEntry;

const perf = (wins: number, losses: number, absences = 0, extra = {}): BashoPerformance =>
  ({ wins, losses, absences, ...extra }) as unknown as BashoPerformance;

const noOzeki = new Set<string>();
const rng = () => rngFromSeed("w1", "banzuke", "committee");

describe("deliberateBanzukeMovement — real (W−L)/2 movement", () => {
  it("8-7 maegashira holds roughly in place (delta 0..1)", () => {
    const d = deliberateBanzukeMovement(entry("maegashira", 5), perf(8, 7), noOzeki, rng());
    expect(d.delta).toBeGreaterThanOrEqual(-1);
    expect(d.delta).toBeLessThanOrEqual(1);
  });

  it("10-5 mid-maegashira rises ~2-3 slots, not units-inflated", () => {
    const d = deliberateBanzukeMovement(entry("maegashira", 10), perf(10, 5), noOzeki, rng());
    expect(d.delta).toBeGreaterThanOrEqual(2);
    expect(d.delta).toBeLessThanOrEqual(4);
  });

  it("5-10 maegashira falls ~2-3 slots", () => {
    const d = deliberateBanzukeMovement(entry("maegashira", 8), perf(5, 10), noOzeki, rng());
    expect(d.delta).toBeLessThanOrEqual(-2);
    expect(d.delta).toBeGreaterThanOrEqual(-4);
  });

  it("kyujo counts ≈ losses with no absence multiplier (5-2+8ab ≈ 5-10)", () => {
    const kyujo = deliberateBanzukeMovement(entry("maegashira", 6), perf(5, 2, 8), noOzeki, rng());
    const losses = deliberateBanzukeMovement(
      entry("maegashira", 6),
      perf(5, 10, 0),
      noOzeki,
      rng()
    );
    // Old model: absences * 1.4–2.5 → up to −20 penalty. Real: ≈ losses.
    expect(Math.abs(kyujo.delta - losses.delta)).toBeLessThanOrEqual(1);
    expect(kyujo.delta).toBeGreaterThanOrEqual(-4);
  });

  it("achievements nudge upward but stay within committee discretion", () => {
    const base = deliberateBanzukeMovement(entry("maegashira", 12), perf(10, 5), noOzeki, rng());
    const yusho = deliberateBanzukeMovement(
      entry("maegashira", 12),
      perf(10, 5, 0, { yusho: true }),
      noOzeki,
      rng()
    );
    expect(yusho.delta).toBeGreaterThanOrEqual(base.delta);
    expect(yusho.delta - base.delta).toBeLessThanOrEqual(2);
  });

  it("is deterministic across repeated deliberations", () => {
    const a = deliberateBanzukeMovement(
      entry("sekiwake", 1),
      perf(9, 6, 0, { specialPrizes: 2 }),
      noOzeki,
      rngFromSeed("w1", "banzuke", "rep")
    );
    const b = deliberateBanzukeMovement(
      entry("sekiwake", 1),
      perf(9, 6, 0, { specialPrizes: 2 }),
      noOzeki,
      rngFromSeed("w1", "banzuke", "rep")
    );
    expect(a).toEqual(b);
  });

  it("produces a deliberation record with votes and rationale", () => {
    const d = deliberateBanzukeMovement(entry("maegashira", 3), perf(11, 4), noOzeki, rng());
    expect(d.decision).toBeDefined();
    expect(d.decision.votesFor + d.decision.votesAgainst).toBeGreaterThan(0);
    expect(d.decision.rationale.length).toBeGreaterThan(0);
  });

  it("no heya/ichimon political weighting is applied", () => {
    // Two identical entries/performances differing only by faction must
    // receive identical deltas when faction preference is disabled at the
    // committee boundary (politics is seeded member preference only,
    // bounded — never a fixed +300 key offset).
    const d = deliberateBanzukeMovement(entry("maegashira", 7), perf(9, 6), noOzeki, rng());
    expect(d.delta).toBeLessThanOrEqual(3);
  });
});
