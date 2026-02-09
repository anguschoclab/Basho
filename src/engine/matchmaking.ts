// matchmaking.ts
// =======================================================
// Matchmaking System v1.1 — Deterministic torikumi pairing for ALL divisions
// - Deterministic (seedrandom only, no Math.random)
// - Hard rules: no same-heya, avoid repeats within basho (unless forced)
// - Soft rules: similar records, similar rank placement, avoid huge size mismatch (optional)
// - Division-aware bout counts (sekitori 15, others 7 by default; overrideable)
// - Produces scored candidate pairs; schedule.ts builds final set.
// =======================================================
import { rngFromSeed } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { BashoState, Division, Rikishi, Side } from "./types";

export interface MatchPairing {
  eastId: string;
  westId: string;
  score: number; // higher = better
  reasons: string[];
}

export interface MatchmakingRules {
  avoidSameHeya: boolean;
  avoidRepeatOpponents: boolean;
  preferSimilarRecords: boolean;
  preferSimilarRank: boolean;
  avoidHugeWeightMismatch: boolean;
  honorExistingSide: boolean;

  /** Allowed if we cannot complete a full card without violating repeat rule */
  allowRepeatsWhenForced: boolean;
}

export const DEFAULT_MATCHMAKING_RULES: MatchmakingRules = {
  avoidSameHeya: true,
  avoidRepeatOpponents: true,
  preferSimilarRecords: true,
  preferSimilarRank: true,
  avoidHugeWeightMismatch: true,
  honorExistingSide: true,
  allowRepeatsWhenForced: true
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function stableSort<T>(arr: T[], keyFn: (x: T) => string): T[] {
  return [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

function getRecord(basho: BashoState, rikishiId: string): { wins: number; losses: number } {
  const row = basho.standings.get(rikishiId);
  return row ? { wins: row.wins, losses: row.losses } : { wins: 0, losses: 0 };
}

function recordSimilarity(a: { wins: number; losses: number }, b: { wins: number; losses: number }): number {
  // Similar record => higher; 0 diff => 1.0
  const diff = Math.abs(a.wins - b.wins) + Math.abs(a.losses - b.losses);
  return 1 / (1 + diff * 0.5);
}

function rankSimilarity(a: Rikishi, b: Rikishi): number {
  // If ranks differ (e.g., upper vs lower), penalize. If equal, compare rankNumber distance.
  if (a.rank !== b.rank) return 0.25;

  const an = typeof (a as any).rankNumber === "number" ? (a as any).rankNumber : 0;
  const bn = typeof (b as any).rankNumber === "number" ? (b as any).rankNumber : 0;

  if (an <= 0 || bn <= 0) return 0.75;
  const diff = Math.abs(an - bn);
  return 1 / (1 + diff * 0.35);
}

function weightMismatchScore(a: Rikishi, b: Rikishi): number {
  const wa = a.weight || 0;
  const wb = b.weight || 0;
  if (wa <= 0 || wb <= 0) return 1;

  const diff = Math.abs(wa - wb);
  // 0kg diff -> 1.0, 40kg diff -> ~0.5, 80kg diff -> ~0.33
  return 1 / (1 + diff / 40);
}

function haveFacedThisBasho(basho: BashoState, aId: string, bId: string): boolean {
  for (const m of basho.matches) {
    const e = m.eastRikishiId;
    const w = m.westRikishiId;
    if ((e === aId && w === bId) || (e === bId && w === aId)) return true;
  }
  return false;
}

function assignSides(a: Rikishi, b: Rikishi, honorExistingSide: boolean): { eastId: string; westId: string; bonus: number; reasons: string[] } {
  const reasons: string[] = [];
  const aSide = (a as any).side as Side | undefined;
  const bSide = (b as any).side as Side | undefined;

  if (honorExistingSide && aSide && bSide && aSide !== bSide) {
    reasons.push("honor_existing_side");
    return {
      eastId: aSide === "east" ? a.id : b.id,
      westId: aSide === "west" ? a.id : b.id,
      bonus: 0.2,
      reasons
    };
  }

  // Deterministic fallback
  const eastId = a.id < b.id ? a.id : b.id;
  const westId = a.id < b.id ? b.id : a.id;
  return { eastId, westId, bonus: 0, reasons };
}

/**
 * Score a pairing. Returns null if a hard rule is violated (unless allowed by caller).
 */
export function scorePairing(args: {
  basho: BashoState;
  a: Rikishi;
  b: Rikishi;
  rules?: Partial<MatchmakingRules>;
  allowRepeatOverride?: boolean;
}): MatchPairing | null {
  const rules = { ...DEFAULT_MATCHMAKING_RULES, ...(args.rules ?? {}) };
  const { basho, a, b } = args;

  if (a.id === b.id) return null;

  // Hard: no same-heya (if configured)
  if (rules.avoidSameHeya && a.heyaId && b.heyaId && a.heyaId === b.heyaId) return null;

  const faced = haveFacedThisBasho(basho, a.id, b.id);
  if (rules.avoidRepeatOpponents && faced && !args.allowRepeatOverride) return null;

  const reasons: string[] = [];
  let score = 1.0;

  // Soft: similar records
  if (rules.preferSimilarRecords) {
    const ra = getRecord(basho, a.id);
    const rb = getRecord(basho, b.id);
    const s = recordSimilarity(ra, rb);
    score *= (0.6 + 0.4 * s);
    if (s > 0.75) reasons.push("similar_records");
  }

  // Soft: similar rank slot
  if (rules.preferSimilarRank) {
    const s = rankSimilarity(a, b);
    score *= (0.6 + 0.4 * s);
    if (s > 0.75) reasons.push("similar_rank");
  }

  // Soft: avoid huge weight mismatch
  if (rules.avoidHugeWeightMismatch) {
    const s = weightMismatchScore(a, b);
    score *= (0.7 + 0.3 * s);
    if (s < 0.6) reasons.push("weight_mismatch");
  }

  // Mild penalty if repeat is allowed (forced scenario)
  if (faced) {
    score *= 0.65;
    reasons.push("repeat_forced");
  }

  // Side assignment
  const side = assignSides(a, b, rules.honorExistingSide);
  score += side.bonus;
  reasons.push(...side.reasons);

  return {
    eastId: side.eastId,
    westId: side.westId,
    score: clamp(score, 0, 5),
    reasons
  };
}

export interface CandidateBuildOptions {
  seed: string;
  rules?: Partial<MatchmakingRules>;
  /** If provided, candidates are built within this division only */
  division?: Division;
}

/**
 * Build all candidate pairs for a given set of rikishi, scored.
 * schedule.ts will choose a non-overlapping maximum set.
 */
export function buildCandidatePairs(
  basho: BashoState,
  rikishi: Rikishi[],
  options: CandidateBuildOptions
): MatchPairing[] {
  const rules = { ...DEFAULT_MATCHMAKING_RULES, ...(options.rules ?? {}) };
  const rng = rngFromSeed(options.seed, "matchmaking", "root");

  const pool = stableSort(
    options.division ? rikishi.filter(r => r.division === options.division) : [...rikishi],
    r => r.id
  ).filter(r => !(r as any).injured);

  const out: MatchPairing[] = [];

  // O(n^2) candidate build; divisions are limited in size (<= ~70 typically).
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];

      const pairing = scorePairing({ basho, a, b, rules });
      if (pairing) {
        // Add tiny deterministic jitter for stable tie-breaks, without changing relative magnitudes much
        const jitter = (rng.next() - 0.5) * 0.0001;
        out.push({ ...pairing, score: pairing.score + jitter });
      }
    }
  }

  // Higher score first; stable tie by ids
  out.sort((p1, p2) => {
    if (p2.score !== p1.score) return p2.score - p1.score;
    const a1 = `${p1.eastId}-${p1.westId}`;
    const a2 = `${p2.eastId}-${p2.westId}`;
    return a1.localeCompare(a2);
  });

  return out;
}