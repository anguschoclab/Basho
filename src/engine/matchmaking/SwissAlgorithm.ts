// @ts-nocheck
/**
 * src/engine/matchmaking/SwissAlgorithm.ts
 * ==========================================
 * JSA Swiss Shimpan matchmaking system — three-phase torikumi pairing.
 *
 * Phase 1 (Days  1–7):  San'yaku Gauntlet — elite vs upper-joi, then proximity
 * Phase 2 (Days  8–14): Win-bucket Swiss pairing
 * Phase 3 (Day  15):    Senshuraku — Yusho exception + kore yori san'yaku
 *
 * Export: buildSwissTorikumi
 */

import { clamp } from "../utils";
import type { BashoState } from "../types/basho";
import type { Division } from "../types/banzuke";
import type { Rikishi } from "../types/rikishi";
import type { RivalriesState } from "../systems/narrative/RivalryConstants";
import { getRivalryBoutModifiers } from "../systems/narrative/RivalryHeatService";
import { scorePairing, type MatchPairing, type MatchmakingRules } from "./MatchmakingPhases";

// ── Banzuke ordinal helpers ────────────────────────────────────────────────────

const SWISS_RANK_ORDINAL: Record<string, number> = {
  yokozuna: 0,
  ozeki: 100,
  sekiwake: 200,
  komusubi: 300,
  maegashira: 400,
  juryo: 500,
  makushita: 600,
  sandanme: 700,
  jonidan: 800,
  jonokuchi: 900,
};

function banzukeOrdinal(r: Rikishi): number {
  const base = SWISS_RANK_ORDINAL[r.rank] ?? 9000;
  const num = typeof r.rankNumber === "number" ? r.rankNumber : 1;
  const side = r.side === "east" ? 0 : 1;
  return base + num * 2 + side;
}

function isSanyakuRank(r: Rikishi): boolean {
  return ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(r.rank);
}

function isM1toM4(r: Rikishi): boolean {
  return r.rank === "maegashira" && (r.rankNumber ?? 99) <= 4;
}

function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
}

function alreadyPaired(pairings: MatchPairing[], aId: string, bId: string): boolean {
  const key = pairKey(aId, bId);
  return pairings.some((p) => pairKey(p.eastId, p.westId) === key);
}

function buildFacedSet(basho: BashoState): Set<string> {
  const set = new Set<string>();
  for (const m of basho.matches) {
    set.add(pairKey(m.eastRikishiId, m.westRikishiId));
  }
  return set;
}

/** Try to create a valid pairing; returns null on hard-rule violations. */
function tryPair(
  basho: BashoState,
  a: Rikishi,
  b: Rikishi,
  facedSet: Set<string>,
  pairedIds: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing | null {
  if (pairedIds.has(a.id) || pairedIds.has(b.id)) return null;
  const p = scorePairing({ basho, a, b, facedPairs: facedSet });
  if (!p) return null;
  if (rivalriesState) {
    const mod = getRivalryBoutModifiers({ state: rivalriesState, aId: a.id, bId: b.id });
    if (mod.tension >= 0.5) {
      return { ...p, score: clamp(p.score + 0.3, 0, 5), reasons: [...p.reasons, "rivalry_heat"] };
    }
  }
  return p;
}

// ── Phase 1 — Days 1–7: San'yaku Gauntlet ─────────────────────────────────────

/**
 * Phase 1 — Days 1–7: The San'yaku Gauntlet.
 *
 * Step 1: Partition into three groups:
 *   - Elite      = Yokozuna + Ozeki
 *   - Upper-Joi  = M1–M4
 *   - Rest       = Sekiwake, Komusubi, M5+
 *
 * Step 2: Each Elite MUST face an Upper-Joi rikishi (not another Elite).
 *   Greedy: for each Elite (sorted by banzuke ordinal) find the highest-available
 *   Upper-Joi that satisfies all hard constraints (heya block + no repeat).
 *
 * Step 3: Standard proximity for all remaining unmatched rikishi — sort by
 *   banzuke ordinal and pair i with i+1 (offset up to 3 to dodge heya conflicts).
 *   Heya block is NEVER overridden in Phase 1 (JSA 2.1 mandate).
 */
function phase1(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];

  const elite = pool
    .filter((r) => r.rank === "yokozuna" || r.rank === "ozeki")
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  const upperJoi = pool
    .filter((r) => isM1toM4(r))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  for (const e of elite) {
    if (paired.has(e.id)) continue;
    for (const joi of upperJoi) {
      if (paired.has(joi.id)) continue;
      const p = tryPair(basho, e, joi, facedSet, paired, rivalriesState);
      if (p) {
        pairings.push({ ...p, reasons: [...p.reasons, "gauntlet"] });
        paired.add(e.id);
        paired.add(joi.id);
        break;
      }
    }
  }

  const remaining = [...pool]
    .filter((r) => !paired.has(r.id))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    if (paired.has(a.id)) continue;

    let matched = false;
    for (let offset = 1; offset <= 3 && i + offset < remaining.length; offset++) {
      const b = remaining[i + offset];
      if (paired.has(b.id)) continue;
      const p = tryPair(basho, a, b, facedSet, paired, rivalriesState);
      if (p) {
        pairings.push(p);
        paired.add(a.id);
        paired.add(b.id);
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (let j = i + 1; j < remaining.length; j++) {
        const b = remaining[j];
        if (paired.has(b.id)) continue;
        const forced = scorePairing({
          basho,
          a,
          b,
          facedPairs: facedSet,
          allowRepeatOverride: true,
        });
        if (forced) {
          pairings.push({ ...forced, reasons: [...forced.reasons, "forced"] });
          paired.add(a.id);
          paired.add(b.id);
          break;
        }
      }
    }
  }

  return pairings;
}

// ── Phase 2 — Days 8–14: Swiss win-bucket pairing ─────────────────────────────

function phase2(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const standings = basho.standings;
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];
  const pulledUp = new Set<string>();

  const bucketMap = new Map<number, Rikishi[]>();
  for (const r of pool) {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    const wins = rec.wins;
    if (!bucketMap.has(wins)) bucketMap.set(wins, []);
    bucketMap.get(wins)!.push(r);
  }

  const bucketKeys = [...bucketMap.keys()].sort((a, b) => b - a);

  for (const r of pool) {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    if (rec.wins >= 10 && rec.losses === 0 && !isSanyakuRank(r)) {
      const topSanyaku = pool
        .filter((s) => isSanyakuRank(s) && !paired.has(s.id) && !pulledUp.has(s.id))
        .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];
      if (topSanyaku) {
        const p = tryPair(basho, r, topSanyaku, facedSet, paired, rivalriesState);
        if (p) {
          pairings.push({ ...p, reasons: [...p.reasons, "hot_streak_pullup"] });
          paired.add(r.id);
          paired.add(topSanyaku.id);
          pulledUp.add(r.id);
        }
      }
    }
  }

  for (const wins of bucketKeys) {
    const bucket = (bucketMap.get(wins) ?? [])
      .filter((r) => !paired.has(r.id))
      .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

    let extraFromBelow: Rikishi | undefined;
    if (bucket.length % 2 !== 0) {
      const lowerWins = bucketKeys.find((k) => k < wins);
      if (lowerWins !== undefined) {
        const lowerBucket = (bucketMap.get(lowerWins) ?? [])
          .filter((r) => !paired.has(r.id) && !pulledUp.has(r.id))
          .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
        if (lowerBucket.length > 0) {
          extraFromBelow = lowerBucket[0];
          pulledUp.add(extraFromBelow.id);
          bucket.push(extraFromBelow);
        }
      }
    }

    for (let i = 0; i < bucket.length; i++) {
      const a = bucket[i];
      if (paired.has(a.id)) continue;
      for (let j = i + 1; j < bucket.length; j++) {
        const b = bucket[j];
        if (paired.has(b.id)) continue;
        const p = tryPair(basho, a, b, facedSet, paired, rivalriesState);
        if (p) {
          pairings.push(p);
          paired.add(a.id);
          paired.add(b.id);
          break;
        }
      }
    }
  }

  const unpaired = pool.filter((r) => !paired.has(r.id));
  for (let i = 0; i < unpaired.length - 1; i += 2) {
    const a = unpaired[i];
    const b = unpaired[i + 1];
    const forced = scorePairing({
      basho,
      a,
      b,
      facedPairs: facedSet,
      allowRepeatOverride: true,
      rules: { avoidSameHeya: false },
    });
    if (forced) {
      pairings.push({ ...forced, reasons: [...forced.reasons, "forced"] });
    }
  }

  return pairings;
}

// ── Phase 3 — Day 15 (Senshuraku) ─────────────────────────────────────────────

/**
 * Phase 3 — Day 15 (Senshuraku): Yusho Exception + Kore yori san'yaku + Swiss fallback.
 *
 * Execution order (per TDD §3.1–3.3):
 *
 *  A. YUSHO EXCEPTION OVERRIDE (§3.1)
 *     — Exactly one leader AND that leader is Maegashira
 *       → pair them against the highest-available Yokozuna/Ozeki gatekeeper.
 *
 *  B. KORE YORI SAN'YAKU (§3.2)
 *     — All remaining Yokozuna and Ozeki are force-paired against each other.
 *     — The final pairing is tagged "finale".
 *
 *  C. SWISS FALLBACK (§3.3)
 *     — All unmatched rikishi are passed into phase2() as normal.
 */
function phase3(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const standings = basho.standings;
  const paired = new Set<string>();
  const yushoExceptionPairings: MatchPairing[] = [];
  const koreyoriPairings: MatchPairing[] = [];

  let maxWins = 0;
  for (const [, rec] of standings ?? []) {
    if (rec.wins > maxWins) maxWins = rec.wins;
  }

  const leaders = pool.filter((r) => (standings?.get(r.id)?.wins ?? 0) >= maxWins);

  if (leaders.length === 1 && leaders[0].rank === "maegashira") {
    const cinderella = leaders[0];
    const gatekeeper = pool
      .filter((r) => (r.rank === "yokozuna" || r.rank === "ozeki") && !paired.has(r.id))
      .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];

    if (gatekeeper) {
      const p = tryPair(basho, cinderella, gatekeeper, facedSet, paired, rivalriesState);
      if (p) {
        yushoExceptionPairings.push({ ...p, reasons: [...p.reasons, "yusho_exception"] });
        paired.add(cinderella.id);
        paired.add(gatekeeper.id);
      }
    }
  }

  let elites = pool
    .filter((r) => (r.rank === "yokozuna" || r.rank === "ozeki") && !paired.has(r.id))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  while (elites.length >= 2) {
    const e1 = elites[0];
    let didPair = false;

    for (let i = 1; i < elites.length; i++) {
      const e2 = elites[i];
      if (paired.has(e2.id)) continue;

      const p = tryPair(basho, e1, e2, facedSet, paired, rivalriesState);
      if (p) {
        koreyoriPairings.push({ ...p, reasons: [...p.reasons, "kore_yori_sanyaku"] });
        paired.add(e1.id);
        paired.add(e2.id);
        elites = elites.filter((r) => r.id !== e1.id && r.id !== e2.id);
        didPair = true;
        break;
      }
    }

    if (!didPair) {
      elites = elites.slice(1);
    }
  }

  if (koreyoriPairings.length > 0) {
    const finaleIdx = 0;
    koreyoriPairings[finaleIdx] = {
      ...koreyoriPairings[finaleIdx],
      reasons: [...koreyoriPairings[finaleIdx].reasons, "finale"],
    };
  }

  const swissPool = pool.filter((r) => !paired.has(r.id));
  const swissPairings = phase2(basho, swissPool, facedSet, rivalriesState);

  return [...swissPairings, ...yushoExceptionPairings, ...koreyoriPairings];
}

// ── Chronological sort ─────────────────────────────────────────────────────────

/**
 * Sort a finalized pairing list in chronological broadcast order.
 *
 * Lower-ranked rikishi fight first (index 0); elite san'yaku fight last.
 * Pairings tagged "kore_yori_sanyaku" or "finale" are always at the end.
 */
function sortChronologically(pairings: MatchPairing[], pool: Rikishi[]): MatchPairing[] {
  const byId = new Map<string, Rikishi>(pool.map((r) => [r.id, r]));

  const rankScore = (p: MatchPairing): number => {
    const east = byId.get(p.eastId);
    const west = byId.get(p.westId);
    return (east ? banzukeOrdinal(east) : 9000) + (west ? banzukeOrdinal(west) : 9000);
  };

  const isElite = (p: MatchPairing) =>
    p.reasons.includes("finale") || p.reasons.includes("kore_yori_sanyaku");

  const regular = pairings.filter((p) => !isElite(p)).sort((a, b) => rankScore(b) - rankScore(a));
  const elite = pairings.filter((p) => isElite(p)).sort((a, b) => rankScore(b) - rankScore(a));

  return [...regular, ...elite];
}

// ── Public: buildSwissTorikumi ─────────────────────────────────────────────────

/**
 * Build Swiss torikumi for a single day of a Basho.
 * Implements the JSA Shimpan three-phase matchmaking system:
 *   - Days 1–7:  Banzuke-proximal / San'yaku Gauntlet (Phase 1)
 *   - Days 8–14: Swiss win-bucket (Phase 2)
 *   - Day 15:    Senshuraku / kore yori san'yaku (Phase 3)
 *
 * Output is sorted chronologically: lowest-ranked bouts at index 0,
 * elite san'yaku (and the Yusho decider) at the end. (TDD §2.4 Step 3)
 */
export function buildSwissTorikumi(
  basho: BashoState,
  rikishi: Rikishi[],
  options: {
    seed: string;
    division?: Division;
    rules?: Partial<MatchmakingRules>;
    rivalriesState?: RivalriesState;
  }
): MatchPairing[] {
  const pool = rikishi.filter((r) => {
    if (r.isRetired || r.injured) return false;
    if (options.division && r.division !== options.division) return false;
    return true;
  });

  const facedSet = buildFacedSet(basho);
  const day = basho.day ?? 1;

  let raw: MatchPairing[];
  if (day <= 7) raw = phase1(basho, pool, facedSet, options.rivalriesState);
  else if (day === 15) raw = phase3(basho, pool, facedSet, options.rivalriesState);
  else raw = phase2(basho, pool, facedSet, options.rivalriesState);

  return sortChronologically(raw, pool);
}
