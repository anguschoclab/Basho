// committee.ts
// =======================================================
// Generic JSA-style committee deliberation framework.
//
// Every committee in the game (banzuke composition, sansho selection,
// YDC, board election) shares one shape:
//
//   1. A mechanical baseline (baseScore) is computed by rule-bound
//      code — eligibility predicates, record math, election tallies.
//   2. The committee then deliberates: informal evidence (merits,
//      demerits) and seeded faction affinity may bend the outcome,
//      but only inside a bounded discretion cap.
//   3. The decision is a record — votes, rationale — suitable for
//      feed items, headlines, and deliberation logs.
//
// Deliberation is fully deterministic: for a given seeded RNG stream
// and identical case list, decisions are identical.
// =======================================================

import type { SeededRNG } from "@/engine/core/rng";
import type { CommitteeSpec } from "@/constants/engine/committee";

/** One case placed before the committee. */
export interface CommitteeCase {
  /** Subject under deliberation (rikishi id, candidate id, …). */
  readonly subjectId: string;
  /** Rule-bound baseline score computed by the caller. */
  readonly baseScore: number;
  /** Positive informal evidence units (yusho, sansho, kinboshi, …). */
  readonly merits: number;
  /** Negative informal evidence units (kyujo optics, scandal, …). */
  readonly demerits: number;
  /** Optional faction tag (ichimon) — enables same-faction preference. */
  readonly faction: string;
}

/** The committee's ruling on one case. */
export interface CommitteeDecision {
  readonly subjectId: string;
  /** Mechanical baseline the committee received. */
  readonly baseScore: number;
  /** Final score after bounded deliberation. */
  readonly score: number;
  /** Adjustment actually applied (score − baseScore). */
  readonly adjustment: number;
  readonly votesFor: number;
  readonly votesAgainst: number;
  /** Human-readable deliberation notes for feed items/log lines. */
  readonly rationale: string[];
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Convene a committee over a list of cases.
 *
 * For each case, evidence produces a signed adjustment:
 *   merits and demerits contribute meritWeight each; a faction tag
 *   produces one seeded faction-weight nudge (the "member preference"
 *   channel — the only place politics enters, and it is bounded).
 * The total adjustment is clamped to ±discretionCap before being
 * added to the rule-bound baseScore.
 */
export function conveneCommittee(
  spec: CommitteeSpec,
  cases: readonly CommitteeCase[],
  rng: SeededRNG
): Map<string, CommitteeDecision> {
  const out = new Map<string, CommitteeDecision>();

  for (const c of cases) {
    const rationale: string[] = [];

    let adjust = (c.merits - c.demerits) * spec.meritWeight;
    if (c.merits > 0) rationale.push(`merit evidence +${c.merits}`);
    if (c.demerits > 0) rationale.push(`demerit evidence −${c.demerits}`);

    if (c.faction !== "none" && spec.factionWeight > 0) {
      const lean = rng.int(-1, 1) * spec.factionWeight;
      if (lean !== 0) {
        adjust += lean;
        rationale.push(`faction sympathy ${lean > 0 ? "+" : ""}${lean}`);
      }
    }

    const bounded = clamp(Math.round(adjust), -spec.discretionCap, spec.discretionCap);
    if (Math.abs(adjust) > spec.discretionCap)
      rationale.push(`bounded by discretion cap ±${spec.discretionCap}`);
    if (rationale.length === 0) rationale.push("adopted mechanical baseline");

    const score = c.baseScore + bounded;
    const votesAgainst = clamp(
      Math.round((Math.abs(bounded) / (spec.discretionCap || 1)) * spec.size),
      0,
      spec.size
    );

    out.set(c.subjectId, {
      subjectId: c.subjectId,
      baseScore: c.baseScore,
      score,
      adjustment: bounded,
      votesFor: spec.size - votesAgainst,
      votesAgainst,
      rationale,
    });
  }

  return out;
}
