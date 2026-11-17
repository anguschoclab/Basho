/**
 * committee.test.ts — generic JSA committee framework.
 *
 * All JSA committees (banzuke composition, sansho selection, YDC, board)
 * share one shape: seeded members deliberate over cases where a mechanical
 * baseline meets informal evidence (merits/demerits) inside bounded
 * discretion. These tests pin that contract before any implementation.
 */
import { describe, it, expect } from "vitest";
import { conveneCommittee, type CommitteeCase } from "@/engine/committee/committee";
import { BANZUKE_COMMITTEE, SANSHO_COMMITTEE } from "@/constants/engine/committee";
import { rngFromSeed } from "@/engine/core/rng";

const cases = (overrides: Partial<CommitteeCase>[] = []): CommitteeCase[] =>
  overrides.map((o, i) => ({
    subjectId: `s${i}`,
    baseScore: 0,
    merits: 0,
    demerits: 0,
    faction: "none",
    ...o,
  }));

describe("conveneCommittee — shared deliberation contract", () => {
  it("is fully deterministic for the same seed and spec", () => {
    const cs = cases([{ baseScore: 3 }, { baseScore: -2 }, { baseScore: 1 }]);
    const a = conveneCommittee(BANZUKE_COMMITTEE, cs, rngFromSeed("det", "governance", "c1"));
    const b = conveneCommittee(BANZUKE_COMMITTEE, cs, rngFromSeed("det", "governance", "c1"));
    expect(a).toEqual(b);
  });

  it("merits can only raise and demerits can only lower the score vs base", () => {
    const cs = cases([
      { subjectId: "merit", baseScore: 0, merits: 2 },
      { subjectId: "demerit", baseScore: 0, demerits: 2 },
      { subjectId: "plain", baseScore: 0 },
    ]);
    const out = conveneCommittee(BANZUKE_COMMITTEE, cs, rngFromSeed("dir", "governance", "c2"));
    expect(out.get("merit")!.score).toBeGreaterThanOrEqual(0);
    expect(out.get("demerit")!.score).toBeLessThanOrEqual(0);
  });

  it("discretion is bounded — the score never deviates past the cap", () => {
    const cs = cases([{ baseScore: 0, merits: 50 }, { baseScore: 0, demerits: 50 }]);
    const out = conveneCommittee(BANZUKE_COMMITTEE, cs, rngFromSeed("cap", "governance", "c3"));
    for (const d of out.values()) {
      expect(Math.abs(d.score - d.baseScore)).toBeLessThanOrEqual(
        BANZUKE_COMMITTEE.discretionCap
      );
    }
  });

  it("records vote totals and a rationale for every decision", () => {
    const cs = cases([{ baseScore: 1, merits: 1 }]);
    const out = conveneCommittee(BANZUKE_COMMITTEE, cs, rngFromSeed("vote", "governance", "c4"));
    const d = out.get("s0")!;
    expect(d.votesFor + d.votesAgainst).toBe(BANZUKE_COMMITTEE.size);
    expect(d.rationale.length).toBeGreaterThan(0);
  });

  it("different committee specs produce different rosters/sizes", () => {
    const cs = cases([{ baseScore: 1 }]);
    const banzuke = conveneCommittee(
      BANZUKE_COMMITTEE,
      cs,
      rngFromSeed("spec", "governance", "c5")
    );
    const sansho = conveneCommittee(
      SANSHO_COMMITTEE,
      cs,
      rngFromSeed("spec", "governance", "c5")
    );
    const b = banzuke.get("s0")!;
    const s = sansho.get("s0")!;
    expect(b.votesFor + b.votesAgainst).toBe(BANZUKE_COMMITTEE.size);
    expect(s.votesFor + s.votesAgainst).toBe(SANSHO_COMMITTEE.size);
    expect(BANZUKE_COMMITTEE.size).not.toBe(SANSHO_COMMITTEE.size);
  });
});
