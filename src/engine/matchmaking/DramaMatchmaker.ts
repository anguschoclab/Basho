/**
 * DramaMatchmaker.ts
 * =================
 * Drama-aware matchmaking post-processing for Swiss algorithm.
 * Evaluates narrative value of pairings and performs legal swaps to maximize story payoff.
 *
 * Responsibilities:
 * - Score pairings for narrative drama value (0-100)
 * - Apply drama budget post-processing to maximize story payoff
 * - Perform legal swaps without creating rematches
 *
 * @see SwissAlgorithm for the base matchmaking algorithm
 * @see MatchmakingPhases for pairing types and structures
 */

import type { Rikishi } from "../types/rikishi";
import type { Division, Rank } from "../types/banzuke";
import type { MatchPairing } from "./MatchmakingPhases";
import {
  DRAMA_DAY_SENSHURAKU,
  DRAMA_DAY_KADOBAN_START,
  DRAMA_DAY_DEMOTION_START,
  DRAMA_DAY_YOKOZUNA_HUNT_START,
  DRAMA_DAY_YOKOZUNA_HUNT_END,
  DRAMA_DAY_RELEGATION_START,
  DRAMA_DAY_WINLESS_START,
  DRAMA_MAKE_OR_BREAK_WINS,
  DRAMA_KADOBAN_WIN_THRESHOLD,
  DRAMA_YUSHO_CONTENDER_GAP,
  DRAMA_YUSHO_LEADER_MIN_WINS,
  DRAMA_DEMOTION_WIN_THRESHOLD,
  DRAMA_RELEGATION_WIN_THRESHOLD,
  DRAMA_GRUDGE_HEAT_THRESHOLD,
  DRAMA_RIVALRY_HEAT_THRESHOLD,
  DRAMA_RIVALRY_SCORE_BASE,
  DRAMA_RIVALRY_SCORE_CAP,
  DRAMA_RIVALRY_SCORE_DIVISOR,
  DRAMA_ROOKIE_TOTAL_BOUTS,
  DRAMA_VETERAN_TOTAL_BOUTS,
  DRAMA_DEBUT_MAKUUCHI_BOUTS,
  DRAMA_DEBUT_TOTAL_BOUTS,
  DRAMA_STREAK_BREAKER_THRESHOLD,
  DRAMA_SCORE_MAKE_OR_BREAK,
  DRAMA_SCORE_GRUDGE_MATCH,
  DRAMA_SCORE_KADOBAN,
  DRAMA_SCORE_YUSHO_DECIDER,
  DRAMA_SCORE_COMEBACK,
  DRAMA_SCORE_DEBUT_SHOWCASE,
  DRAMA_SCORE_YOKOZUNA_HUNT,
  DRAMA_SCORE_SENSHURAKU_FINALE,
  DRAMA_SCORE_ARCHETYPE_CLASH,
  DRAMA_SCORE_DEMOTION_DANGER,
  DRAMA_SCORE_RELEGATION_BATTLE,
  DRAMA_SCORE_ROOKIE_VS_VETERAN,
  DRAMA_SCORE_KINBOSHI_HUNT,
  DRAMA_SCORE_STREAK_BREAKER,
  DRAMA_SCORE_WINLESS_WARRIOR,
  DRAMA_SCORE_ORIGIN_MATCHUP,
  DRAMA_MAX_SWAPS_DEFAULT,
  DRAMA_MAX_SWAPS_WITH_RIVALRY,
} from "../../constants/engine/matchmaking";

/**
 * Drama labels identifying narrative significance of a matchup.
 * These labels are used to categorize pairings for narrative generation
 * and highlight bouts with high story potential.
 */
export type DramaLabel =
  | "make_or_break" // 7-7 on Day 15 (kachi-koshi)
  | "yusho_decider" // Yusho leaders facing each other
  | "kadoban_survival" // Ozeki kadoban pressure bout
  | "kinboshi_hunt" // Maegashira vs Yokozuna/Ozeki
  | "senshuraku_finale" // Final day elite matchup
  | "rivalry_renewed" // Rikishi with active rivalry facing each other
  | "archetype_clash" // Opposing archetypes face off (e.g. push vs belt)
  | "comeback_story" // Rikishi returning from injury facing tough opponent
  | "rookie_vs_veteran" // Young debutant vs established veteran
  | "winless_warrior" // Rikishi still winless on day 5+
  | "streak_breaker" // One rikishi on a long win streak vs opponent
  | "demotion_danger" // Sekiwake/Komusubi at risk of demotion
  | "grudge_match" // Rivalry heat > 70 — overrides rivalry_renewed
  | "debut_showcase" // Rookie's first makuuchi bout vs sanyaku
  | "relegation_battle" // Day 14-15, both at make-koshi risk in lower divisions
  | "yokozuna_hunt" // Komusubi/sekiwake vs yokozuna on days 10-14
  | "origin_matchup"; // Two rikishi from same origin facing each other

/**
 * Drama context describing the narrative significance of a pairing.
 * Used by the matchmaking system to prioritize story-rich matchups.
 */
export interface DramaContext {
  /** Drama label identifying the narrative type. */
  label: DramaLabel;
  /** Drama score from 0-100, higher = more dramatic. */
  score: number;
  /** Human-readable explanation of why this matchup is dramatic. */
  reason: string;
}

export function isMakuuchiDebut(
  makuuchiBouts: number,
  division: Division,
  totalBouts: number,
  rank: Rank
): boolean {
  return (
    makuuchiBouts <= DRAMA_DEBUT_MAKUUCHI_BOUTS &&
    division === "makuuchi" &&
    totalBouts < DRAMA_DEBUT_TOTAL_BOUTS &&
    rank !== "ozeki" &&
    rank !== "yokozuna"
  );
}

// ── Drama Scoring ─────────────────────────────────────────────────────────────

/**
 * Scores a pairing for narrative drama value.
 *
 * Evaluates the matchup context and returns a drama score (0-100) based on
 * narrative significance. Higher scores indicate more dramatic matchups that
 * should be prioritized for scheduling.
 *
 * Drama categories (in order of priority):
 * 1. Make or break (100): Day 15, both rikishi at 7-7 (kachi-koshi)
 * 2. Kadoban survival (90): Ozeki with < 8 wins on day 10+
 * 3. Yusho decider (85): Both rikishi are yusho contenders (within 2 wins of leader)
 * 4. Senshuraku finale (70): Elite matchup on final day
 * 5. Kinboshi hunt (50): Maegashira vs Yokozuna or Ozeki
 *
 * @param {Rikishi} a - First rikishi in the pairing.
 * @param {Rikishi} b - Second rikishi in the pairing.
 * @param {number} day - Current day of the basho (1-15).
 * @param {Map<string, { wins: number; losses: number }>} standings - Current standings map.
 * @param {Map<string, { heat: number; aId: string; bId: string }>} [rivalryState] - Active rivalries state map for grudge match checks.
 * @returns {DramaContext | null} Drama context if significant, null otherwise.
 *
 * @example
 * ```ts
 * const a = mockRikishi("r1", { rank: "ozeki" });
 * const b = mockRikishi("r2", { rank: "maegashira" });
 * const standings = new Map([["r1", { wins: 7, losses: 7 }], ["r2", { wins: 7, losses: 7 }]]);
 * const drama = scoreDrama(a, b, 15, standings);
 * expect(drama?.label).toBe("make_or_break");
 * expect(drama?.score).toBe(100);
 * ```
 */
export function scoreDrama(
  a: Rikishi,
  b: Rikishi,
  day: number,
  standings: Map<string, { wins: number; losses: number }>,
  rivalryState?: Map<string, { heat: number; aId: string; bId: string }>
): DramaContext | null {
  const aRecord = standings.get(a.id) ?? { wins: 0, losses: 0 };
  const bRecord = standings.get(b.id) ?? { wins: 0, losses: 0 };

  // Day 15: 7-7 kachi-koshi showdown (highest drama)
  if (
    day === DRAMA_DAY_SENSHURAKU &&
    aRecord.wins === DRAMA_MAKE_OR_BREAK_WINS &&
    aRecord.losses === DRAMA_MAKE_OR_BREAK_WINS &&
    bRecord.wins === DRAMA_MAKE_OR_BREAK_WINS &&
    bRecord.losses === DRAMA_MAKE_OR_BREAK_WINS
  ) {
    return {
      label: "make_or_break",
      score: DRAMA_SCORE_MAKE_OR_BREAK,
      reason: "kachi_koshi_showdown_day15",
    };
  }

  // Ozeki kadoban survival (day 10+ with < 8 wins) — higher priority than yusho
  const aIsKadoban =
    a.rank === "ozeki" &&
    day >= DRAMA_DAY_KADOBAN_START &&
    aRecord.wins < DRAMA_KADOBAN_WIN_THRESHOLD;
  const bIsKadoban =
    b.rank === "ozeki" &&
    day >= DRAMA_DAY_KADOBAN_START &&
    bRecord.wins < DRAMA_KADOBAN_WIN_THRESHOLD;
  if (aIsKadoban || bIsKadoban) {
    return {
      label: "kadoban_survival",
      score: DRAMA_SCORE_KADOBAN,
      reason: "ozeki_kadoban_pressure",
    };
  }

  // Yusho decider: both rikishi are yusho contenders (within 2 wins of leader)
  let leaderWins = 0;
  for (const record of standings.values()) {
    if (record.wins > leaderWins) leaderWins = record.wins;
  }

  const aIsContender = leaderWins - aRecord.wins <= DRAMA_YUSHO_CONTENDER_GAP;
  const bIsContender = leaderWins - bRecord.wins <= DRAMA_YUSHO_CONTENDER_GAP;
  if (aIsContender && bIsContender && leaderWins >= DRAMA_YUSHO_LEADER_MIN_WINS) {
    return {
      label: "yusho_decider",
      score: DRAMA_SCORE_YUSHO_DECIDER,
      reason: "yusho_contender_matchup",
    };
  }

  // Kinboshi hunt: Maegashira vs Yokozuna or Ozeki
  const aIsMaegashira = a.rank === "maegashira";
  const bIsMaegashira = b.rank === "maegashira";
  const aIsElite = a.rank === "yokozuna" || a.rank === "ozeki";
  const bIsElite = b.rank === "yokozuna" || b.rank === "ozeki";
  if ((aIsMaegashira && bIsElite) || (bIsMaegashira && aIsElite)) {
    return {
      label: "kinboshi_hunt",
      score: DRAMA_SCORE_KINBOSHI_HUNT,
      reason: "maegashira_vs_elite",
    };
  }

  // Senshuraku finale: elite matchup on final day
  if (day === DRAMA_DAY_SENSHURAKU && (aIsElite || bIsElite)) {
    return {
      label: "senshuraku_finale",
      score: DRAMA_SCORE_SENSHURAKU_FINALE,
      reason: "senshuraku_elite",
    };
  }

  // Expanded drama labels (3.1) + Rivalry-aware matchmaking (3.2)

  // Rivalry: use rivalryState if available, fall back to rikishi.rivalries
  let rivalryHeat = 0;
  if (rivalryState) {
    const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
    const rivalry = rivalryState.get(pairKey);
    if (rivalry) rivalryHeat = rivalry.heat;
  }
  const aRivalry = (a as Rikishi & { rivalries?: string[] }).rivalries;
  const bRivalry = (b as Rikishi & { rivalries?: string[] }).rivalries;
  const hasRivalryLink = aRivalry?.includes(b.id) || bRivalry?.includes(a.id);
  if (rivalryHeat > DRAMA_GRUDGE_HEAT_THRESHOLD) {
    return {
      label: "grudge_match",
      score: DRAMA_SCORE_GRUDGE_MATCH,
      reason: "rivalry_heat_extreme",
    };
  }
  if (rivalryHeat > DRAMA_RIVALRY_HEAT_THRESHOLD || hasRivalryLink) {
    return {
      label: "rivalry_renewed",
      score: Math.min(
        DRAMA_RIVALRY_SCORE_CAP,
        DRAMA_RIVALRY_SCORE_BASE + rivalryHeat / DRAMA_RIVALRY_SCORE_DIVISOR
      ),
      reason: "active_rivalry_matchup",
    };
  }

  // Archetype clash: opposing archetype families face off
  const aArchetype = a.combatProfile?.archetype;
  const bArchetype = b.combatProfile?.archetype;
  if (aArchetype && bArchetype) {
    const isPushVsBelt =
      (aArchetype === "tsuppari" && bArchetype === "yotsu") ||
      (aArchetype === "yotsu" && bArchetype === "tsuppari");
    const isSpeedVsGiant =
      (aArchetype === "speedster" && bArchetype === "giant") ||
      (aArchetype === "giant" && bArchetype === "speedster");
    if (isPushVsBelt || isSpeedVsGiant) {
      return {
        label: "archetype_clash",
        score: DRAMA_SCORE_ARCHETYPE_CLASH,
        reason: `archetype_clash_${aArchetype}_vs_${bArchetype}`,
      };
    }
  }

  // Comeback story: rikishi returning from injury
  const aComeback =
    a.injured === false &&
    (a as Rikishi & { justReturnedFromInjury?: boolean }).justReturnedFromInjury;
  const bComeback =
    b.injured === false &&
    (b as Rikishi & { justReturnedFromInjury?: boolean }).justReturnedFromInjury;
  if (aComeback || bComeback) {
    return {
      label: "comeback_story",
      score: DRAMA_SCORE_COMEBACK,
      reason: "return_from_injury",
    };
  }

  // Rookie vs veteran: young debutant vs established veteran
  const aIsRookie = a.careerWins + a.careerLosses < DRAMA_ROOKIE_TOTAL_BOUTS;
  const bIsRookie = b.careerWins + b.careerLosses < DRAMA_ROOKIE_TOTAL_BOUTS;
  const aIsVeteran = a.careerWins + a.careerLosses > DRAMA_VETERAN_TOTAL_BOUTS;
  const bIsVeteran = b.careerWins + b.careerLosses > DRAMA_VETERAN_TOTAL_BOUTS;
  if ((aIsRookie && bIsVeteran) || (bIsRookie && aIsVeteran)) {
    return {
      label: "rookie_vs_veteran",
      score: DRAMA_SCORE_ROOKIE_VS_VETERAN,
      reason: "rookie_vs_veteran",
    };
  }

  // Winless warrior: rikishi still winless on day 5+
  if (day >= DRAMA_DAY_WINLESS_START && (aRecord.wins === 0 || bRecord.wins === 0)) {
    return {
      label: "winless_warrior",
      score: DRAMA_SCORE_WINLESS_WARRIOR,
      reason: "winless_streak",
    };
  }

  // Streak breaker: one rikishi on a 5+ win streak
  const aStreak = (a as Rikishi & { winStreak?: number }).winStreak ?? 0;
  const bStreak = (b as Rikishi & { winStreak?: number }).winStreak ?? 0;
  if (aStreak >= DRAMA_STREAK_BREAKER_THRESHOLD || bStreak >= DRAMA_STREAK_BREAKER_THRESHOLD) {
    return {
      label: "streak_breaker",
      score: DRAMA_SCORE_STREAK_BREAKER,
      reason: `win_streak_${Math.max(aStreak, bStreak)}`,
    };
  }

  // Demotion danger: Sekiwake/Komusubi at risk of demotion (day 12+, < 6 wins)
  const aIsSanyaku = a.rank === "sekiwake" || a.rank === "komusubi";
  const bIsSanyaku = b.rank === "sekiwake" || b.rank === "komusubi";
  const aDemotionRisk = aIsSanyaku && aRecord.wins < DRAMA_DEMOTION_WIN_THRESHOLD;
  const bDemotionRisk = bIsSanyaku && bRecord.wins < DRAMA_DEMOTION_WIN_THRESHOLD;
  if (day >= DRAMA_DAY_DEMOTION_START && (aDemotionRisk || bDemotionRisk)) {
    return {
      label: "demotion_danger",
      score: DRAMA_SCORE_DEMOTION_DANGER,
      reason: "sanyaku_demotion_risk",
    };
  }

  // Debut showcase: rookie's first makuuchi bout against sanyaku
  const aTotalBouts = (a.careerWins ?? 0) + (a.careerLosses ?? 0);
  const bTotalBouts = (b.careerWins ?? 0) + (b.careerLosses ?? 0);

  // PERF: Prevent intermediate O(N) array allocation in hot path loop.
  // Replaces `.filter((h) => h.division === "makuuchi").length`.
  let aMakuuchiBouts = 0;
  for (const h of a.careerHistory ?? []) if (h.division === "makuuchi") aMakuuchiBouts++;
  let bMakuuchiBouts = 0;
  for (const h of b.careerHistory ?? []) if (h.division === "makuuchi") bMakuuchiBouts++;

  const aIsDebut = isMakuuchiDebut(aMakuuchiBouts, a.division, aTotalBouts, a.rank);
  const bIsDebut = isMakuuchiDebut(bMakuuchiBouts, b.division, bTotalBouts, b.rank);
  if ((aIsDebut && bIsSanyaku) || (bIsDebut && aIsSanyaku)) {
    return {
      label: "debut_showcase",
      score: DRAMA_SCORE_DEBUT_SHOWCASE,
      reason: "rookie_debut_vs_sanyaku",
    };
  }

  // Yokozuna hunt: komusubi/sekiwake vs yokozuna on days 10-14
  const aIsYokozuna = a.rank === "yokozuna";
  const bIsYokozuna = b.rank === "yokozuna";
  if (
    day >= DRAMA_DAY_YOKOZUNA_HUNT_START &&
    day <= DRAMA_DAY_YOKOZUNA_HUNT_END &&
    ((aIsSanyaku && bIsYokozuna) || (bIsSanyaku && aIsYokozuna))
  ) {
    return {
      label: "yokozuna_hunt",
      score: DRAMA_SCORE_YOKOZUNA_HUNT,
      reason: "sanyaku_vs_yokozuna",
    };
  }

  // Relegation battle: day 14-15, both at make-koshi risk in lower divisions
  const aIsLowerDivision = a.division === "makushita" || a.division === "sandanme";
  const bIsLowerDivision = b.division === "makushita" || b.division === "sandanme";
  if (
    day >= DRAMA_DAY_RELEGATION_START &&
    aIsLowerDivision &&
    bIsLowerDivision &&
    aRecord.wins < DRAMA_RELEGATION_WIN_THRESHOLD &&
    bRecord.wins < DRAMA_RELEGATION_WIN_THRESHOLD
  ) {
    return {
      label: "relegation_battle",
      score: DRAMA_SCORE_RELEGATION_BATTLE,
      reason: "lower_division_relegation",
    };
  }

  // Origin matchup: two rikishi from same origin
  if (a.origin && b.origin && a.origin === b.origin) {
    return {
      label: "origin_matchup",
      score: DRAMA_SCORE_ORIGIN_MATCHUP,
      reason: `same_origin_${a.origin}`,
    };
  }

  // No significant drama
  return null;
}

// ── Drama Budget Swap Algorithm ───────────────────────────────────────────────

/**
 * Applies drama budget post-processing to pairings.
 *
 * This function attempts legal swaps to increase total drama score without
 * creating rematches. It uses a greedy algorithm that tries up to 3 swaps
 * (or 5 if there are active rivalries), always accepting swaps that improve
 * the total drama score.
 *
 * Algorithm:
 * 1. Score all pairings for drama value
 * 2. Calculate initial total drama score
 * 3. Attempt swaps (up to 3, or 5 with rivalries):
 *    a. Try all pairwise swaps between pairings
 *    b. Check if swap would create a rematch (skip if so)
 *    c. Calculate score change from swap
 *    d. If score change > 0, apply swap and restart
 * 4. Add drama labels to reasons for high-drama bouts
 * 5. Return optimized pairings
 *
 * @param {MatchPairing[]} pairings - Initial pairings from Swiss algorithm.
 * @param {Map<string, Rikishi>} rikishiMap - Map of rikishi ID to rikishi data.
 * @param {number} day - Current day of the basho (1-15).
 * @param {Map<string, { wins: number; losses: number }>} standings - Current standings map.
 * @param {Set<string>} facedSet - Set of already-faced pair keys (to avoid rematches).
 * @param {Map<string, { heat: number; aId: string; bId: string }>} [rivalryState] - Active rivalries state map.
 * @returns {MatchPairing[]} Optimized pairings with drama labels added.
 *
 * @example
 * ```ts
 * const pairings = generateSwissPairings(rikishi, day, standings, facedSet);
 * const optimized = applyDramaBudget(pairings, rikishiMap, day, standings, facedSet);
 * expect(optimized).toHaveLength(pairings.length);
 * ```
 */
export function applyDramaBudget(
  pairings: MatchPairing[],
  rikishiMap: Map<string, Rikishi>,
  day: number,
  standings: Map<string, { wins: number; losses: number }>,
  facedSet: Set<string>,
  rivalryState?: Map<string, { heat: number; aId: string; bId: string }>
): MatchPairing[] {
  // Score all pairings for drama and cache scores
  let initialScore = 0;
  const scoreCache = new Map<number, number>();
  const dramaCache = new Map<number, { score: number; label: string } | null>();
  for (let i = 0; i < pairings.length; i++) {
    const east = rikishiMap.get(pairings[i].eastId);
    const west = rikishiMap.get(pairings[i].westId);
    if (!east || !west) {
      scoreCache.set(i, 0);
      dramaCache.set(i, null);
      continue;
    }
    const drama = scoreDrama(east, west, day, standings, rivalryState);
    const score = drama?.score ?? 0;
    scoreCache.set(i, score);
    dramaCache.set(i, drama);
    initialScore += score;
  }

  // Rivalry-aware: increase max swaps when rivalry pairs exist (3.2)
  const hasRivalryPairs = rivalryState && rivalryState.size > 0;
  const maxSwaps = hasRivalryPairs ? DRAMA_MAX_SWAPS_WITH_RIVALRY : DRAMA_MAX_SWAPS_DEFAULT;

  // Attempt up to maxSwaps to increase drama
  let bestPairings = [...pairings];
  let bestScore = initialScore;

  for (let swapCount = 0; swapCount < maxSwaps; swapCount++) {
    let improved = false;

    // Try all pairwise swaps
    for (let i = 0; i < bestPairings.length; i++) {
      for (let j = i + 1; j < bestPairings.length; j++) {
        const p1 = bestPairings[i];
        const p2 = bestPairings[j];

        // Create swapped pairings
        const swapped1: MatchPairing = { ...p1, eastId: p2.eastId, westId: p2.westId };
        const swapped2: MatchPairing = { ...p2, eastId: p1.eastId, westId: p1.westId };

        // Check if swaps would create rematches
        const key1 = pairKey(swapped1.eastId, swapped1.westId);
        const key2 = pairKey(swapped2.eastId, swapped2.westId);
        if (facedSet.has(key1) || facedSet.has(key2)) {
          continue; // Skip if would create rematch
        }

        // Score the swapped configuration
        const east1 = rikishiMap.get(swapped1.eastId);
        const west1 = rikishiMap.get(swapped1.westId);
        const east2 = rikishiMap.get(swapped2.eastId);
        const west2 = rikishiMap.get(swapped2.westId);

        if (!east1 || !west1 || !east2 || !west2) continue;

        const drama1 = scoreDrama(east1, west1, day, standings, rivalryState);
        const drama2 = scoreDrama(east2, west2, day, standings, rivalryState);

        // Use cached old scores instead of recomputing
        const oldDrama1Score = scoreCache.get(i) ?? 0;
        const oldDrama2Score = scoreCache.get(j) ?? 0;

        const scoreChange =
          (drama1?.score ?? 0) + (drama2?.score ?? 0) - oldDrama1Score - oldDrama2Score;

        if (scoreChange > 0) {
          // Apply the swap
          const newPairings = [...bestPairings];
          newPairings[i] = {
            ...swapped1,
            reasons: [...swapped1.reasons, ...(drama1 ? [`drama_${drama1.label}`] : [])],
          };
          newPairings[j] = {
            ...swapped2,
            reasons: [...swapped2.reasons, ...(drama2 ? [`drama_${drama2.label}`] : [])],
          };

          // Update best if this is better
          const newScore = bestScore + scoreChange;
          if (newScore > bestScore) {
            bestPairings = newPairings;
            bestScore = newScore;
            // Update caches for swapped indices
            scoreCache.set(i, drama1?.score ?? 0);
            scoreCache.set(j, drama2?.score ?? 0);
            dramaCache.set(i, drama1);
            dramaCache.set(j, drama2);
            improved = true;
            break; // Take this improvement and restart
          }
        }
      }
      if (improved) break;
    }

    if (!improved) break; // No more improvements possible
  }

  // Add drama labels to reasons for high-drama bouts (skip if already labeled from swap)
  // Uses cached drama scores instead of recomputing
  const finalPairings = bestPairings.map((p, idx) => {
    if (p.reasons.some((r: string) => r.startsWith("drama_"))) return p;
    const drama = dramaCache.get(idx);
    if (drama && drama.score > 0) {
      return {
        ...p,
        reasons: [...p.reasons, `drama_${drama.label}`],
      };
    }
    return p;
  });

  return finalPairings;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a consistent key for a pair of rikishi IDs.
 * Ensures the key is the same regardless of which rikishi is passed first.
 *
 * @param aId - First rikishi ID
 * @param bId - Second rikishi ID
 * @returns A consistent string key for the pair
 */
function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
}
