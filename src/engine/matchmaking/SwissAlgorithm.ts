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

import { toIdMap } from "@/engine/utils/index";
import type { BashoState } from "@/engine/types/basho";
import type { Division } from "@/engine/types/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RivalriesState } from "@/constants/engine/rivalry";
import {
  scorePairing,
  type MatchPairing,
  type MatchmakingRules,
} from "@/engine/matchmaking/MatchmakingPhases";
import { applyDramaBudget } from "@/engine/matchmaking/DramaMatchmaker";
import { pairKey, buildFacedSet, tryPair } from "@/engine/matchmaking/swissShared";
import {
  isSanyakuRank,
  rankSeniority,
  isYokozunaOrOzekiRank,
  isLowerSanyakuRank,
} from "@/constants/engine/rankDisplay";
import {
  SWISS_RANK_DEFAULT,
  M1_TO_M4_THRESHOLD,
  PROXIMITY_OFFSET_MAX,
  HOT_STREAK_WINS_THRESHOLD,
  YOKOZUNA_BACKLOAD_WEEK1_SPLIT_DAY,
  YOKOZUNA_OZEKI_CLASH_START_DAY,
  YOKOZUNA_YOKOZUNA_CLASH_START_DAY,
  SWISS_PHASE1_END_DAY,
  SWISS_PHASE3_DAY,
  RANK_NUMBER_MULTIPLIER,
  SIDE_EAST_OFFSET,
  SIDE_WEST_OFFSET,
  PROXIMITY_OFFSET_START,
  UNPAIRED_INCREMENT,
  FINALE_INDEX,
} from "@/constants/engine/matchmaking";

// ── Banzuke ordinal helpers ────────────────────────────────────────────────────

/**
 * Swiss banzuke base per rank — the canonical seniority ordinal scaled by
 * 100, leaving rank-number + side room below the next rank. Lower values
 * indicate higher rank (yokozuna is highest).
 */
const SWISS_RANK_BASE = (rank: string): number => {
  const seniority = rankSeniority(rank);
  return seniority > 9 ? SWISS_RANK_DEFAULT : seniority * 100;
};

/**
 * Calculates the banzuke ordinal for a rikishi.
 * Used for proximity-based pairing in Phase 1.
 *
 * @param {Rikishi} r - The rikishi to calculate ordinal for.
 * @returns {number} Ordinal value (lower = higher rank).
 */
function banzukeOrdinal(r: Rikishi): number {
  const base = SWISS_RANK_BASE(r.rank);
  const num = typeof r.rankNumber === "number" ? r.rankNumber : 1;
  const side = r.side === "east" ? SIDE_EAST_OFFSET : SIDE_WEST_OFFSET;
  return base + num * RANK_NUMBER_MULTIPLIER + side;
}

/** Checks if a rikishi is in san'yaku ranks (delegates to canonical helper). */
const isSanyakuRikishi = (r: Rikishi): boolean => isSanyakuRank(r.rank);

/**
 * Checks if a rikishi is in M1-M4 ranks.
 *
 * @param {Rikishi} r - The rikishi to check.
 * @returns {boolean} True if rank is maegashira and rankNumber <= 4.
 */
function isM1toM4(r: Rikishi): boolean {
  return r.rank === "maegashira" && (r.rankNumber ?? 99) <= M1_TO_M4_THRESHOLD;
}

// ── Phase 1 — Days 1–7: San'yaku Gauntlet ─────────────────────────────────────

function phase1(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  day: number,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];

  const elite: Rikishi[] = [];
  const upperJoi: Rikishi[] = [];
  const sanyakuLower: Rikishi[] = [];
  for (const r of pool) {
    if (isYokozunaOrOzekiRank(r.rank)) elite.push(r);
    else if (isM1toM4(r)) upperJoi.push(r);
    else if (isLowerSanyakuRank(r.rank)) sanyakuLower.push(r);
  }
  elite.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
  upperJoi.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
  // Komusubi before Sekiwake on late-week fallback so Yokozuna ramp inward.
  sanyakuLower.sort((a, b) => banzukeOrdinal(b) - banzukeOrdinal(a));

  for (const e of elite) {
    if (paired.has(e.id)) continue;
    const isYokozuna = e.rank === "yokozuna";
    const joiOrder =
      isYokozuna && day < YOKOZUNA_BACKLOAD_WEEK1_SPLIT_DAY ? [...upperJoi].reverse() : upperJoi;

    let matchedElite = false;
    for (const joi of joiOrder) {
      if (paired.has(joi.id)) continue;
      const p = tryPair(basho, e, joi, facedSet, paired, { rivalriesState, day });
      if (p) {
        const extra = isYokozuna ? ["gauntlet", "yokozuna_joi_backload"] : ["gauntlet"];
        pairings.push({ ...p, reasons: [...p.reasons, ...extra] });
        paired.add(e.id);
        paired.add(joi.id);
        matchedElite = true;
        break;
      }
    }

    if (!matchedElite && isYokozuna && day >= YOKOZUNA_BACKLOAD_WEEK1_SPLIT_DAY) {
      for (const sk of sanyakuLower) {
        if (paired.has(sk.id)) continue;
        const p = tryPair(basho, e, sk, facedSet, paired, { rivalriesState, day });
        if (p) {
          pairings.push({ ...p, reasons: [...p.reasons, "gauntlet", "yokozuna_joi_backload"] });
          paired.add(e.id);
          paired.add(sk.id);
          break;
        }
      }
    }
  }

  const remaining: Rikishi[] = [];
  for (const r of pool) {
    if (!paired.has(r.id)) remaining.push(r);
  }
  remaining.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    if (paired.has(a.id)) continue;

    let matched = false;
    for (
      let offset = PROXIMITY_OFFSET_START;
      offset <= PROXIMITY_OFFSET_MAX && i + offset < remaining.length;
      offset++
    ) {
      const b = remaining[i + offset];
      if (paired.has(b.id)) continue;
      const p = tryPair(basho, a, b, facedSet, paired, { rivalriesState, day });
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
          day,
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

function yokozunaOpponentTier(
  y: Rikishi,
  o: Rikishi,
  day: number,
  yWins: number,
  oWins: number,
  reservedIds: Set<string>
): number {
  if (day < YOKOZUNA_OZEKI_CLASH_START_DAY) {
    if (isLowerSanyakuRank(o.rank)) return 0;
    if (isM1toM4(o) || (o.rank !== "yokozuna" && o.rank !== "ozeki" && yWins === oWins)) return 1;
    if (o.rank !== "yokozuna" && o.rank !== "ozeki") return 2;
    return o.rank === "ozeki" ? 3 : 4;
  }
  if (day < YOKOZUNA_YOKOZUNA_CLASH_START_DAY) {
    if (o.rank === "ozeki") return 0;
    if (isLowerSanyakuRank(o.rank)) return 1;
    return o.rank !== "yokozuna" ? 2 : 3;
  }
  const isReservedClash = reservedIds.has(y.id) && reservedIds.has(o.id);
  if (o.rank === "ozeki" || (o.rank === "yokozuna" && !isReservedClash)) return 0;
  if (isLowerSanyakuRank(o.rank)) return 1;
  return o.rank !== "yokozuna" ? 2 : 3;
}

function pairYokozunaBackloaded(
  basho: BashoState,
  pool: Rikishi[],
  day: number,
  facedSet: Set<string>,
  paired: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const pairings: MatchPairing[] = [];
  const standings = basho.standings;
  const yokozunas = pool
    .filter((r) => r.rank === "yokozuna" && !paired.has(r.id))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
  if (yokozunas.length === 0) return pairings;

  // Reserve the top 2 unfaced yokozuna from meeting on Day 14 so they collide on Day 15 finale.
  const reservedIds = new Set<string>();
  if (day === YOKOZUNA_YOKOZUNA_CLASH_START_DAY && yokozunas.length >= 2) {
    const y0 = yokozunas[0];
    const y1 = yokozunas.find(
      (cand) => cand.id !== y0.id && !facedSet.has(pairKey(y0.id, cand.id))
    );
    if (y1) {
      reservedIds.add(y0.id);
      reservedIds.add(y1.id);
    }
  }

  for (const y of yokozunas) {
    if (paired.has(y.id)) continue;
    const yWins = standings?.get(y.id)?.wins ?? 0;
    const candidates: Array<{
      opp: Rikishi;
      pairing: MatchPairing;
      tier: number;
      winDiff: number;
    }> = [];

    for (const o of pool) {
      if (o.id === y.id || paired.has(o.id)) continue;
      const p = tryPair(basho, y, o, facedSet, paired, { rivalriesState, day });
      if (!p) continue;
      const oWins = standings?.get(o.id)?.wins ?? 0;
      candidates.push({
        opp: o,
        pairing: p,
        tier: yokozunaOpponentTier(y, o, day, yWins, oWins, reservedIds),
        winDiff: Math.abs(yWins - oWins),
      });
    }

    if (candidates.length === 0) continue;
    candidates.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.winDiff !== b.winDiff) return a.winDiff - b.winDiff;
      if (a.pairing.score !== b.pairing.score) return b.pairing.score - a.pairing.score;
      return banzukeOrdinal(a.opp) - banzukeOrdinal(b.opp);
    });

    const chosen = candidates[0];
    pairings.push({
      ...chosen.pairing,
      reasons: [...chosen.pairing.reasons, "yokozuna_backload"],
    });
    paired.add(y.id);
    paired.add(chosen.opp.id);
  }

  return pairings;
}

function phase2(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  day: number,
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
    const bucket = bucketMap.get(wins);
    if (bucket) bucket.push(r);
  }

  const bucketKeys = [...bucketMap.keys()].sort((a, b) => b - a);

  for (const r of pool) {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    if (rec.wins >= HOT_STREAK_WINS_THRESHOLD && rec.losses === 0 && !isSanyakuRikishi(r)) {
      const topSanyakuPool: Rikishi[] = [];
      for (const s of pool) {
        if (isSanyakuRikishi(s) && !paired.has(s.id) && !pulledUp.has(s.id)) topSanyakuPool.push(s);
      }
      const topSanyaku = topSanyakuPool.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];
      if (topSanyaku) {
        const p = tryPair(basho, r, topSanyaku, facedSet, paired, { rivalriesState, day });
        if (p) {
          pairings.push({ ...p, reasons: [...p.reasons, "hot_streak_pullup"] });
          paired.add(r.id);
          paired.add(topSanyaku.id);
          pulledUp.add(r.id);
        }
      }
    }
  }

  // Yokozuna back-loading in Week 2 (only during Phase 2 days 8..14, not Phase 3 fallback).
  if (day < SWISS_PHASE3_DAY) {
    pairings.push(...pairYokozunaBackloaded(basho, pool, day, facedSet, paired, rivalriesState));
  }

  for (let i = 0; i < bucketKeys.length; i++) {
    const wins = bucketKeys[i];
    const bucket: Rikishi[] = [];
    for (const r of bucketMap.get(wins) ?? []) {
      if (!paired.has(r.id)) bucket.push(r);
    }
    bucket.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

    let extraFromBelow: Rikishi | undefined;
    if (bucket.length % 2 !== 0) {
      const lowerWins = bucketKeys[i + 1];
      if (lowerWins !== undefined) {
        const lowerBucket: Rikishi[] = [];
        for (const r of bucketMap.get(lowerWins) ?? []) {
          if (!paired.has(r.id) && !pulledUp.has(r.id)) lowerBucket.push(r);
        }
        lowerBucket.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
        if (lowerBucket.length > 0) {
          extraFromBelow = lowerBucket[0];
          pulledUp.add(extraFromBelow.id);
          bucket.push(extraFromBelow);
        }
      }
    }

    for (let idx = 0; idx < bucket.length; idx++) {
      const a = bucket[idx];
      if (paired.has(a.id)) continue;
      let bestPartner: Rikishi | undefined;
      let bestPairing: MatchPairing | undefined;
      for (let j = idx + 1; j < bucket.length; j++) {
        const b = bucket[j];
        if (paired.has(b.id)) continue;
        const p = tryPair(basho, a, b, facedSet, paired, { rivalriesState, day });
        if (p && (!bestPairing || p.score > bestPairing.score)) {
          bestPartner = b;
          bestPairing = p;
        }
      }
      if (bestPartner && bestPairing) {
        pairings.push(bestPairing);
        paired.add(a.id);
        paired.add(bestPartner.id);
      }
    }
  }

  const unpaired: Rikishi[] = [];
  for (const r of pool) {
    if (!paired.has(r.id)) unpaired.push(r);
  }
  for (let i = 0; i < unpaired.length - 1; i += UNPAIRED_INCREMENT) {
    const a = unpaired[i];
    const b = unpaired[i + 1];
    const forced = scorePairing({
      basho,
      a,
      b,
      day,
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

function phase3(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  day: number,
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

  const leaders: Rikishi[] = [];
  for (const r of pool) {
    if ((standings?.get(r.id)?.wins ?? 0) >= maxWins) leaders.push(r);
  }

  if (leaders.length === 1 && leaders[0].rank === "maegashira") {
    const cinderella = leaders[0];
    const gatekeepers: Rikishi[] = [];
    for (const r of pool) {
      if (isYokozunaOrOzekiRank(r.rank) && !paired.has(r.id)) gatekeepers.push(r);
    }
    const gatekeeper = gatekeepers.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];

    if (gatekeeper) {
      const p = tryPair(basho, cinderella, gatekeeper, facedSet, paired, { rivalriesState, day });
      if (p) {
        yushoExceptionPairings.push({ ...p, reasons: [...p.reasons, "yusho_exception"] });
        paired.add(cinderella.id);
        paired.add(gatekeeper.id);
      }
    }
  }

  let elites: Rikishi[] = [];
  for (const r of pool) {
    if (isYokozunaOrOzekiRank(r.rank) && !paired.has(r.id)) elites.push(r);
  }
  elites.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  while (elites.length >= 2) {
    const e1 = elites[0];
    let didPair = false;

    for (let i = 1; i < elites.length; i++) {
      const e2 = elites[i];
      if (paired.has(e2.id)) continue;

      const p = tryPair(basho, e1, e2, facedSet, paired, { rivalriesState, day });
      if (p) {
        koreyoriPairings.push({ ...p, reasons: [...p.reasons, "kore_yori_sanyaku"] });
        paired.add(e1.id);
        paired.add(e2.id);
        const nextElites: Rikishi[] = [];
        for (const r of elites) {
          if (r.id !== e1.id && r.id !== e2.id) nextElites.push(r);
        }
        elites = nextElites;
        didPair = true;
        break;
      }
    }

    if (!didPair) {
      elites = elites.slice(1);
    }
  }

  if (koreyoriPairings.length > 0) {
    const finaleIdx = FINALE_INDEX;
    koreyoriPairings[finaleIdx] = {
      ...koreyoriPairings[finaleIdx],
      reasons: [...koreyoriPairings[finaleIdx].reasons, "finale"],
    };
  }

  const swissPool: Rikishi[] = [];
  for (const r of pool) {
    if (!paired.has(r.id)) swissPool.push(r);
  }
  const swissPairings = phase2(basho, swissPool, facedSet, day, rivalriesState);

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
  const byId = toIdMap(pool);

  const rankScore = (p: MatchPairing): number => {
    const east = byId.get(p.eastId);
    const west = byId.get(p.westId);
    return (east ? banzukeOrdinal(east) : 9000) + (west ? banzukeOrdinal(west) : 9000);
  };

  const isElite = (p: MatchPairing) =>
    p.reasons.includes("finale") || p.reasons.includes("kore_yori_sanyaku");

  const regular: MatchPairing[] = [];
  const elite: MatchPairing[] = [];
  for (const p of pairings) {
    if (isElite(p)) elite.push(p);
    else regular.push(p);
  }
  regular.sort((a, b) => rankScore(b) - rankScore(a));
  elite.sort((a, b) => rankScore(b) - rankScore(a));

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
    day?: number;
    division?: Division;
    rules?: Partial<MatchmakingRules>;
    rivalriesState?: RivalriesState;
  }
): MatchPairing[] {
  const pool: Rikishi[] = [];
  for (const r of rikishi) {
    // W A: injured-but-entered rikishi stay in the pool — kyujo/retirement
    // alone removes them. The withdraw call happens at the morning-of-day
    // evaluation; a hurt rikishi who stays entered fights with penalties.
    if (r.isRetired || r.isKyujo) continue;
    if (options.division && r.division !== options.division) continue;
    pool.push(r);
  }

  const facedSet = buildFacedSet(basho);
  const day = options.day ?? basho.day ?? 1;

  let raw: MatchPairing[];
  if (day <= SWISS_PHASE1_END_DAY) raw = phase1(basho, pool, facedSet, day, options.rivalriesState);
  else if (day === SWISS_PHASE3_DAY)
    raw = phase3(basho, pool, facedSet, day, options.rivalriesState);
  else raw = phase2(basho, pool, facedSet, day, options.rivalriesState);

  // Apply drama budget post-processing to maximize narrative value
  const rikishiMap = toIdMap(rikishi);
  const optimizedPairings = applyDramaBudget(
    raw,
    rikishiMap,
    day,
    basho.standings,
    facedSet,
    options.rivalriesState
  );

  return sortChronologically(optimizedPairings, pool);
}
