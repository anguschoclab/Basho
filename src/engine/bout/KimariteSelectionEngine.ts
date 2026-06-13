import type { Rikishi } from "../types/rikishi";
import type { Division } from "../types/banzuke";
import type { SpatialBoutContext, KimariteAttempt, EngineStateV2 } from "../types/combat-spatial";
import type { KimariteId } from "../types/combat";
import { KIMARITE_STRATEGIES, getKimarite } from "../kimarite";
import { SeededRNG } from "../rng";
import {
  KIMARITE_NAGE_HINERI_BOOST,
  KIMARITE_KIHON_PENALTY,
  KIMARITE_KIHON_DEFENSE_BOOST,
  KIMARITE_OFF_AXIS_PENALTY,
  KIMARITE_TONE_MATCH_BOOST,
  KIMARITE_FAVORITE_BOOST,
  KIMARITE_SUCCESS_MIN,
  KIMARITE_SUCCESS_MAX,
  KIMARITE_SUCCESS_BASE_SCALE,
  KIMARITE_MAKUUCHI_BOOST,
  KIMARITE_LOWER_DIVISION_PENALTY,
  KIMARITE_FAVORITE_SUCCESS_BOOST,
  KIMARITE_SUCCESS_HARD_MIN,
} from "../../constants/engine/kimarite";


/**
 * The KimariteSelectionEngine handles the logic for choosing which technique
 * is attempted and whether it successfully executes.
 */
export const KimariteSelectionEngine = {
  /**
   * Selects a technique attempt based on spatial state, division, and meta.
   */
  evaluate(
    east: Rikishi,
    west: Rikishi,
    st: EngineStateV2,
    ctx: SpatialBoutContext,
    division: Division | undefined,
    meta: { tone: string; drift: Record<string, number> } | undefined,
    rng: SeededRNG
  ): KimariteAttempt | null {
    const effectiveMeta = meta ?? { tone: "classic", drift: {} };
    // 1. Determine attacker and defender candidates
    // In many cases both could be attackers, but classifier logic usually picks a side.
    const sides: ("east" | "west")[] = ["east", "west"];
    const results: KimariteAttempt[] = [];

    for (const side of sides) {
      const attacker = side === "east" ? east : west;
      const defender = side === "east" ? west : east;
      const wSide = side;
      const lSide = side === "east" ? "west" : "east";

      // 2. Filter strategies by phase and condition
      const applicable = KIMARITE_STRATEGIES.filter((s) => {
        // Filter by phase
        if (
          s.appliesTo &&
          !s.appliesTo.includes(st.phase.tag as "push_battle" | "belt_battle" | "edge_crisis")
        )
          return false;

        // Filter by condition
        try {
          return s.condition(attacker, defender, ctx, st, wSide, lSide);
        } catch {
          return false;
        }
      });

      if (applicable.length === 0) continue;

      // 3. Apply weights (Base * Division * Meta * Specialization)
      let totalWeight = 0;
      const weighted = applicable.map((s) => {
        let weight = s.weight;

        // Division Biases (E2)
        if (division === "makuuchi") {
          if (s.category === "nage" || s.category === "hineri") weight *= KIMARITE_NAGE_HINERI_BOOST;
          if (s.category === "kihon") weight *= KIMARITE_KIHON_PENALTY;
        } else if (division === "jonokuchi" || division === "jonidan") {
          if (s.category === "kihon") weight *= KIMARITE_KIHON_DEFENSE_BOOST;
          if (s.category === "nage" || s.category === "hineri" || s.category === "sori")
            weight *= KIMARITE_OFF_AXIS_PENALTY;
        }

        // Meta Drift (E5)
        const drift = effectiveMeta.drift[s.id] || 1.0;
        weight *= drift;

        // Era Tone Category Bonuses (P2 Extension)
        const registryEntry = getKimarite(s.id);
        const tacticalFamily = registryEntry?.tacticalFamily;

        if (effectiveMeta.tone === "explosive" && tacticalFamily === "push") weight *= KIMARITE_TONE_MATCH_BOOST;
        if (effectiveMeta.tone === "classic" && tacticalFamily === "belt") weight *= KIMARITE_TONE_MATCH_BOOST;
        if (effectiveMeta.tone === "technical" && tacticalFamily === "speed") weight *= KIMARITE_TONE_MATCH_BOOST;
        if (effectiveMeta.tone === "defensive" && tacticalFamily === "trick") weight *= KIMARITE_TONE_MATCH_BOOST;

        // Rikishi Specialization (Favored Moves)
        if (attacker.favoredKimarite?.includes(s.id as KimariteId)) {
          weight *= KIMARITE_FAVORITE_BOOST;
        }

        totalWeight += weight;
        return { strategy: s, weight };
      });

      // 4. Weighted Random Selection
      let roll = rng.next() * totalWeight;
      let selected = weighted[0].strategy;

      for (const w of weighted) {
        roll -= w.weight;
        if (roll <= 0) {
          selected = w.strategy;
          break;
        }
      }

      // 5. Execution Success Probability (E2 Deep Dive)
      // Execution = f(Technique, Difficulty, Division)
      const attackerTech = attacker.stats?.technique ?? attacker.stats.technique ?? 50;
      const difficulty = selected.difficulty || 5;

      // Base probability: tech (0-100) vs difficulty (1-10) scaled to 10-100
      let successProb = Math.max(KIMARITE_SUCCESS_MIN, Math.min(KIMARITE_SUCCESS_MAX, (attackerTech / (difficulty * 10)) * KIMARITE_SUCCESS_BASE_SCALE));

      // Division execution scaling
      if (division === "makuuchi") successProb += KIMARITE_MAKUUCHI_BOOST;
      if (division === "jonidan" || division === "jonokuchi") successProb -= KIMARITE_LOWER_DIVISION_PENALTY;

      // Favored kimarite execution boost: +0.08 when the attacker specialises in this technique
      if (attacker.favoredKimarite?.includes(selected.id as KimariteId)) {
        successProb += KIMARITE_FAVORITE_SUCCESS_BOOST;
      }

      results.push({
        technique: selected.id as KimariteId,
        side: side,
        successProbability: Math.max(KIMARITE_SUCCESS_HARD_MIN, Math.min(KIMARITE_SUCCESS_MAX, successProb)),
        requiredConditions: ["registry_match", `difficulty_${difficulty}`],
      });
    }

    // Pick the best attempt (highest success probability among valid sides)
    if (results.length === 0) return null;
    return results.sort((a, b) => b.successProbability - a.successProbability)[0];
  },
};
