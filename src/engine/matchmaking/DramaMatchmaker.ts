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
import type { MatchPairing } from "./MatchmakingPhases";

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
    day === 15 &&
    aRecord.wins === 7 &&
    aRecord.losses === 7 &&
    bRecord.wins === 7 &&
    bRecord.losses === 7
  ) {
    return {
      label: "make_or_break",
      score: 100,
      reason: "kachi_koshi_showdown_day15",
    };
  }

  // Ozeki kadoban survival (day 10+ with < 8 wins) — higher priority than yusho
  const aIsKadoban = a.rank === "ozeki" && day >= 10 && aRecord.wins < 8;
  const bIsKadoban = b.rank === "ozeki" && day >= 10 && bRecord.wins < 8;
  if (aIsKadoban || bIsKadoban) {
    return {
      label: "kadoban_survival",
      score: 90,
      reason: "ozeki_kadoban_pressure",
    };
  }

  // Yusho decider: both rikishi are yusho contenders (within 2 wins of leader)
  let leaderWins = 0;
  for (const record of standings.values()) {
    if (record.wins > leaderWins) leaderWins = record.wins;
  }

  const aIsContender = leaderWins - aRecord.wins <= 2;
  const bIsContender = leaderWins - bRecord.wins <= 2;
  if (aIsContender && bIsContender && leaderWins >= 10) {
    return {
      label: "yusho_decider",
      score: 85,
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
      score: 50,
      reason: "maegashira_vs_elite",
    };
  }

  // Senshuraku finale: elite matchup on final day
  if (day === 15 && (aIsElite || bIsElite)) {
    return {
      label: "senshuraku_finale",
      score: 70,
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
  if (rivalryHeat > 70) {
    return {
      label: "grudge_match",
      score: 95,
      reason: "rivalry_heat_extreme",
    };
  }
  if (rivalryHeat > 40 || hasRivalryLink) {
    return {
      label: "rivalry_renewed",
      score: Math.min(95, 50 + rivalryHeat / 2),
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
        score: 60,
        reason: `archetype_clash_${aArchetype}_vs_${bArchetype}`,
      };
    }
  }

  // Comeback story: rikishi returning from injury
  const aComeback = a.injured === false && (a as Rikishi & { justReturnedFromInjury?: boolean }).justReturnedFromInjury;
  const bComeback = b.injured === false && (b as Rikishi & { justReturnedFromInjury?: boolean }).justReturnedFromInjury;
  if (aComeback || bComeback) {
    return {
      label: "comeback_story",
      score: 65,
      reason: "return_from_injury",
    };
  }

  // Rookie vs veteran: young debutant vs established veteran
  const aIsRookie = (a.careerWins + a.careerLosses) < 5;
  const bIsRookie = (b.careerWins + b.careerLosses) < 5;
  const aIsVeteran = (a.careerWins + a.careerLosses) > 200;
  const bIsVeteran = (b.careerWins + b.careerLosses) > 200;
  if ((aIsRookie && bIsVeteran) || (bIsRookie && aIsVeteran)) {
    return {
      label: "rookie_vs_veteran",
      score: 55,
      reason: "rookie_vs_veteran",
    };
  }

  // Winless warrior: rikishi still winless on day 5+
  if (day >= 5 && (aRecord.wins === 0 || bRecord.wins === 0)) {
    return {
      label: "winless_warrior",
      score: 45,
      reason: "winless_streak",
    };
  }

  // Streak breaker: one rikishi on a 5+ win streak
  const aStreak = (a as Rikishi & { winStreak?: number }).winStreak ?? 0;
  const bStreak = (b as Rikishi & { winStreak?: number }).winStreak ?? 0;
  if (aStreak >= 5 || bStreak >= 5) {
    return {
      label: "streak_breaker",
      score: 50,
      reason: `win_streak_${Math.max(aStreak, bStreak)}`,
    };
  }

  // Demotion danger: Sekiwake/Komusubi at risk of demotion (day 12+, < 6 wins)
  const aIsSanyaku = a.rank === "sekiwake" || a.rank === "komusubi";
  const bIsSanyaku = b.rank === "sekiwake" || b.rank === "komusubi";
  if (day >= 12 && ((aIsSanyaku && aRecord.wins < 6) || (bIsSanyaku && bRecord.wins < 6))) {
    return {
      label: "demotion_danger",
      score: 60,
      reason: "sanyaku_demotion_risk",
    };
  }

  // Debut showcase: rookie's first makuuchi bout against sanyaku
  const aMakuuchiBouts = (a.careerHistory ?? []).filter(
    (h) => h.division === "makuuchi"
  ).length;
  const bMakuuchiBouts = (b.careerHistory ?? []).filter(
    (h) => h.division === "makuuchi"
  ).length;
  const aIsDebut = aMakuuchiBouts <= 1 && a.division === "makuuchi";
  const bIsDebut = bMakuuchiBouts <= 1 && b.division === "makuuchi";
  if ((aIsDebut && bIsSanyaku) || (bIsDebut && aIsSanyaku)) {
    return {
      label: "debut_showcase",
      score: 65,
      reason: "rookie_debut_vs_sanyaku",
    };
  }

  // Yokozuna hunt: komusubi/sekiwake vs yokozuna on days 10-14
  const aIsYokozuna = a.rank === "yokozuna";
  const bIsYokozuna = b.rank === "yokozuna";
  if (
    day >= 10 &&
    day <= 14 &&
    ((aIsSanyaku && bIsYokozuna) || (bIsSanyaku && aIsYokozuna))
  ) {
    return {
      label: "yokozuna_hunt",
      score: 70,
      reason: "sanyaku_vs_yokozuna",
    };
  }

  // Relegation battle: day 14-15, both at make-koshi risk in lower divisions
  const aIsLowerDivision =
    a.division === "makushita" || a.division === "sandanme";
  const bIsLowerDivision =
    b.division === "makushita" || b.division === "sandanme";
  if (
    day >= 14 &&
    aIsLowerDivision &&
    bIsLowerDivision &&
    aRecord.wins < 4 &&
    bRecord.wins < 4
  ) {
    return {
      label: "relegation_battle",
      score: 60,
      reason: "lower_division_relegation",
    };
  }

  // Origin matchup: two rikishi from same origin
  if (a.origin && b.origin && a.origin === b.origin) {
    return {
      label: "origin_matchup",
      score: 40,
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
 * creating rematches. It uses a greedy algorithm that tries up to 3 swaps,
 * always accepting swaps that improve the total drama score.
 *
 * Algorithm:
 * 1. Score all pairings for drama value
 * 2. Calculate initial total drama score
 * 3. Attempt up to 3 swaps:
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
  // Score all pairings for drama
  let initialScore = 0;
  for (const p of pairings) {
    const east = rikishiMap.get(p.eastId);
    const west = rikishiMap.get(p.westId);
    if (!east || !west) continue;
    const drama = scoreDrama(east, west, day, standings, rivalryState);
    initialScore += drama?.score ?? 0;
  }

  // Rivalry-aware: increase max swaps when rivalry pairs exist (3.2)
  const hasRivalryPairs = rivalryState && rivalryState.size > 0;
  const maxSwaps = hasRivalryPairs ? 5 : 3;

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

        // Calculate new total score
        const p1East = rikishiMap.get(p1.eastId);
        const p1West = rikishiMap.get(p1.westId);
        const p2East = rikishiMap.get(p2.eastId);
        const p2West = rikishiMap.get(p2.westId);
        if (!p1East || !p1West || !p2East || !p2West) continue;
        const oldDrama1 = scoreDrama(p1East, p1West, day, standings, rivalryState);
        const oldDrama2 = scoreDrama(p2East, p2West, day, standings, rivalryState);

        const scoreChange =
          (drama1?.score ?? 0) +
          (drama2?.score ?? 0) -
          (oldDrama1?.score ?? 0) -
          (oldDrama2?.score ?? 0);

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
  const finalPairings = bestPairings.map((p) => {
    if (p.reasons.some((r: string) => r.startsWith("drama_"))) return p;
    const east = rikishiMap.get(p.eastId);
    const west = rikishiMap.get(p.westId);
    if (!east || !west) return p;

    const drama = scoreDrama(east, west, day, standings, rivalryState);
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
