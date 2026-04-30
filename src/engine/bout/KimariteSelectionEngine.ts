// @ts-nocheck
import type { Rikishi } from "../types/rikishi";
import type { Division } from "../types/banzuke";
import type { SpatialBoutContext, KimariteAttempt, EngineStateV2 } from "../types/combat-spatial";
import type { FinalBoutState } from "../types/kimariteStrategy";
import type { KimariteId } from "../types/combat";
import { KIMARITE_STRATEGIES_V2 } from "./kimariteStrategy";
import { SeededRNG } from "../rng";

/**
 * Maps spatial context and rikishi stats to the FinalBoutState required by the registry.
 */
function mapToFinalBoutState(
  r: Rikishi,
  side: "east" | "west",
  ctx: SpatialBoutContext
): FinalBoutState {
  const isEast = side === "east";
  const momentumX = isEast ? ctx.eastMomentumX : ctx.westMomentumX;
  const cogOffset = isEast ? ctx.eastCoGOffset : ctx.westCoGOffset;
  const grip = isEast ? ctx.eastGrip : ctx.westGrip;
  const leadFoot = isEast ? ctx.eastLeadFoot : ctx.westLeadFoot;

  // Normalize stats (0-100 expected)
  const strength = r.stats?.strength ?? r.power ?? 50;
  const balanceStat = r.stats?.balance ?? r.balance ?? 50;

  return {
    grip: grip === "outside" || grip === "none" ? "none" : grip,
    // Use r.style (set at generation from archetype) rather than re-deriving from combatProfile
    style: r.style === "oshi" ? "oshi" : "yotsu",
    power: strength,
    balanceResistance: balanceStat,
    forwardMomentum: Math.max(0, momentumX),
    offensiveOutput: 1, // Assume attacking if this is called, unless hi_waza checks override
    balance: Math.max(0, 100 - Math.abs(cogOffset) * 200), // Approximate balance from CoG offset
    stamina: (r.stats?.stamina ?? r.stamina ?? 1.0) / 100, // Normalize to 0-1 range
    edgeDistance: Math.max(0, 4.55 - Math.abs(leadFoot)), // 4.55m is RING_RADIUS
    cogOffset,
    momentumX,
    gripClass: grip,
    leadFootX: leadFoot,
  };
}

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
      const attackerState = mapToFinalBoutState(attacker, side, ctx);
      const defenderState = mapToFinalBoutState(defender, side === "east" ? "west" : "east", ctx);

      // 2. Filter strategies by phase and condition
      const applicable = KIMARITE_STRATEGIES_V2.filter((s) => {
        // Filter by phase
        if (
          s.appliesTo &&
          !s.appliesTo.includes(st.phase.tag as "push_battle" | "belt_battle" | "edge_crisis")
        )
          return false;

        // Filter by condition
        try {
          return s.condition(attackerState, defenderState, ctx);
        } catch {
          return false;
        }
      });

      if (applicable.length === 0) continue;

      // 3. Apply weights (Base * Division * Meta * Specialization)
      const weighted = applicable.map((s) => {
        let weight = s.weight;

        // Division Biases (E2)
        if (division === "makuuchi") {
          if (s.category === "nage" || s.category === "hineri") weight *= 1.3;
          if (s.category === "kihon") weight *= 0.8;
        } else if (division === "jonokuchi" || division === "jonidan") {
          if (s.category === "kihon") weight *= 1.5;
          if (s.category === "nage" || s.category === "hineri" || s.category === "sori")
            weight *= 0.4;
        }

        // Meta Drift (E5)
        const drift = effectiveMeta.drift[s.id] || 1.0;
        weight *= drift;

        // Era Tone Category Bonuses (P2 Extension)
        if (effectiveMeta.tone === "explosive" && s.tacticalFamily === "push") weight *= 1.15;
        if (effectiveMeta.tone === "classic" && s.tacticalFamily === "belt") weight *= 1.15;
        if (effectiveMeta.tone === "technical" && s.tacticalFamily === "speed") weight *= 1.15;
        if (effectiveMeta.tone === "defensive" && s.tacticalFamily === "trick") weight *= 1.15;

        // Rikishi Specialization (Favored Moves)
        if (attacker.favoredKimarite?.includes(s.id)) {
          weight *= 1.5;
        }

        return { strategy: s, weight };
      });

      // 4. Weighted Random Selection
      const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
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
      const attackerTech = attacker.stats?.technique ?? attacker.technique ?? 50;
      const difficulty = selected.difficulty || 5;

      // Base probability: tech (0-100) vs difficulty (1-10) scaled to 10-100
      let successProb = Math.max(0.1, Math.min(0.97, (attackerTech / (difficulty * 10)) * 0.8));

      // Division execution scaling
      if (division === "makuuchi") successProb += 0.1;
      if (division === "jonidan" || division === "jonokuchi") successProb -= 0.15;

      // Favored kimarite execution boost: +0.08 when the attacker specialises in this technique
      if (attacker.favoredKimarite?.includes(selected.id)) {
        successProb += 0.08;
      }

      results.push({
        technique: selected.id as KimariteId,
        side: side,
        successProbability: Math.max(0.05, Math.min(0.97, successProb)),
        requiredConditions: ["registry_match", `difficulty_${difficulty}`],
      });
    }

    // Pick the best attempt (highest success probability among valid sides)
    if (results.length === 0) return null;
    return results.sort((a, b) => b.successProbability - a.successProbability)[0];
  },
};
