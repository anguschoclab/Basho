import type { Rikishi } from "../types/rikishi";
import type { Division } from "../types/banzuke";
import type { SpatialBoutContext, KimariteAttempt, EngineStateV2 } from "../types/combat-spatial";
import type { KimariteId } from "../types/combat";
import { KIMARITE_STRATEGIES, getKimarite } from "../kimarite";
import { KIMARITE_FREQUENCY_TARGETS } from "../../constants/engine/kimariteFrequencies";
import { getTacticProfile } from "./tacticProfiles";
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
  ARCHETYPE_FAMILY_BIAS,
  GRIP_ADVANTAGE_THRESHOLD,
  GRIP_ADVANTAGE_WEIGHT,
  GRIP_ADVANTAGE_CAP,
  LOW_BALANCE_THRESHOLD,
  LOW_TECHNIQUE_THRESHOLD,
  SPEED_LOW_BALANCE_BOOST,
  PUSH_LOW_TECH_BOOST,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_SCALE,
  KIMARITE_MIDFIGHT_ATTEMPT_RATE,
} from "../../constants/engine/kimarite";

type KimariteMeta = { tone: string; drift: Record<string, number> };
type SideTactics = import("./boutUtils").SideTactics;
type KimariteStrategy = (typeof KIMARITE_STRATEGIES)[number];

/**
 * Strategy weights: real-share base * division * meta * specialization.
 * Base weight is the technique's real-world makuuchi share — the raw
 * strategy `weight` field is retained for ordering/metadata but no
 * longer drives selection, which is what drifts the simulated
 * distribution toward real life.
 */
function weightStrategies(
  applicable: KimariteStrategy[],
  attacker: Rikishi,
  defender: Rikishi,
  side: "east" | "west",
  st: EngineStateV2,
  division: Division | undefined,
  effectiveMeta: KimariteMeta,
  tactics?: SideTactics
): { weighted: { strategy: KimariteStrategy; weight: number }[]; totalWeight: number } {
  let totalWeight = 0;
  const weighted = applicable.map((s) => {
    let weight = (KIMARITE_FREQUENCY_TARGETS[s.id] ?? 0) * 10000;
    if (weight <= 0) return { strategy: s, weight: 0 };

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

    if (effectiveMeta.tone === "explosive" && tacticalFamily === "push")
      weight *= KIMARITE_TONE_MATCH_BOOST;
    if (effectiveMeta.tone === "classic" && tacticalFamily === "belt")
      weight *= KIMARITE_TONE_MATCH_BOOST;
    if (effectiveMeta.tone === "technical" && tacticalFamily === "speed")
      weight *= KIMARITE_TONE_MATCH_BOOST;
    if (effectiveMeta.tone === "defensive" && tacticalFamily === "trick")
      weight *= KIMARITE_TONE_MATCH_BOOST;

    // Tactic-driven kimarite family bias — the attacker's own resolved
    // tactic biases which family of techniques they attempt.
    const attackerTactic = side === "east" ? tactics?.east : tactics?.west;
    if (attackerTactic && tacticalFamily) {
      const bias = getTacticProfile(attackerTactic).kimariteWeightBias[tacticalFamily];
      if (bias) weight *= bias;
    }

    // Rikishi Specialization (Favored Moves)
    if (attacker.favoredKimarite?.includes(s.id as KimariteId)) {
      weight *= KIMARITE_FAVORITE_BOOST;
    }

    // Archetype-based kimarite bias (8.3): archetype aligns with tactical family
    const archetype = attacker.combatProfile?.archetype;
    if (archetype && tacticalFamily) {
      const familyBias = ARCHETYPE_FAMILY_BIAS[archetype]?.[tacticalFamily];
      if (familyBias) weight *= familyBias;
    }

    // Grip state weight (8.3): boost belt techniques when grip advantage is high
    if (tacticalFamily === "belt" && st.phase.tag === "belt_battle") {
      const beltState = st.phase.state;
      const attackerTorque = side === "east" ? beltState.torqueEast : beltState.torqueWest;
      const defenderTorque = side === "east" ? beltState.torqueWest : beltState.torqueEast;
      const gripAdvantage = attackerTorque - defenderTorque;
      if (gripAdvantage > GRIP_ADVANTAGE_THRESHOLD) {
        weight *= 1 + Math.min(GRIP_ADVANTAGE_CAP, gripAdvantage * GRIP_ADVANTAGE_WEIGHT);
      }
    }

    // Opponent vulnerability weight (8.3): boost trip/sweep when opponent balance is low
    const defenderBalance = defender.stats?.balance ?? 50;
    if (tacticalFamily === "speed" && defenderBalance < LOW_BALANCE_THRESHOLD) {
      weight *= SPEED_LOW_BALANCE_BOOST;
    }
    // Boost push techniques when opponent technique is low (clumsy defender)
    const defenderTech = defender.stats?.technique ?? 50;
    if (tacticalFamily === "push" && defenderTech < LOW_TECHNIQUE_THRESHOLD) {
      weight *= PUSH_LOW_TECH_BOOST;
    }

    totalWeight += weight;
    return { strategy: s, weight };
  });
  return { weighted, totalWeight };
}

/** Weighted random selection over the scored strategies. */
function rollWeightedSelection(
  weighted: { strategy: KimariteStrategy; weight: number }[],
  totalWeight: number,
  rng: SeededRNG
): KimariteStrategy {
  let roll = rng.next() * totalWeight;
  let selected = weighted[0].strategy;

  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) {
      selected = w.strategy;
      break;
    }
  }
  return selected;
}

/** Execution Success Probability (E2): f(technique, difficulty, division). */
function computeSuccessProbability(
  attacker: Rikishi,
  selected: KimariteStrategy,
  division: Division | undefined
): number {
  const attackerTech = attacker.stats?.technique ?? attacker.stats.technique ?? 50;
  const difficulty = selected.difficulty || DEFAULT_DIFFICULTY;

  // Base probability: tech (0-100) vs difficulty (1-10) scaled to 10-100
  let successProb = Math.max(
    KIMARITE_SUCCESS_MIN,
    Math.min(
      KIMARITE_SUCCESS_MAX,
      (attackerTech / (difficulty * DIFFICULTY_SCALE)) * KIMARITE_SUCCESS_BASE_SCALE
    )
  );

  // Division execution scaling
  if (division === "makuuchi") successProb += KIMARITE_MAKUUCHI_BOOST;
  if (division === "jonidan" || division === "jonokuchi")
    successProb -= KIMARITE_LOWER_DIVISION_PENALTY;

  // Favored kimarite execution boost: +0.08 when the attacker specialises in this technique
  if (attacker.favoredKimarite?.includes(selected.id as KimariteId)) {
    successProb += KIMARITE_FAVORITE_SUCCESS_BOOST;
  }

  return successProb;
}

/** Evaluates one side's attempt: filter, weight, roll, success prob. */
function evaluateSideAttempt(
  side: "east" | "west",
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  ctx: SpatialBoutContext,
  division: Division | undefined,
  effectiveMeta: KimariteMeta,
  rng: SeededRNG,
  tactics?: SideTactics
): KimariteAttempt | null {
  const attacker = side === "east" ? east : west;
  const defender = side === "east" ? west : east;
  const wSide = side;
  const lSide = side === "east" ? "west" : "east";

  // Filter strategies by phase and condition
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

  if (applicable.length === 0) return null;

  const { weighted, totalWeight } = weightStrategies(
    applicable,
    attacker,
    defender,
    side,
    st,
    division,
    effectiveMeta,
    tactics
  );
  const selected = rollWeightedSelection(weighted, totalWeight, rng);
  const successProb = computeSuccessProbability(attacker, selected, division);
  const difficulty = selected.difficulty || DEFAULT_DIFFICULTY;

  return {
    technique: selected.id as KimariteId,
    side: side,
    successProbability: Math.max(
      KIMARITE_SUCCESS_HARD_MIN,
      Math.min(KIMARITE_SUCCESS_MAX, successProb)
    ),
    requiredConditions: ["registry_match", `difficulty_${difficulty}`],
  };
}

/**
 * Selects a technique attempt based on spatial state, division, and meta.
 */
function evaluate(
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  ctx: SpatialBoutContext,
  division: Division | undefined,
  meta: KimariteMeta | undefined,
  rng: SeededRNG,
  tactics?: SideTactics
): KimariteAttempt | null {
  const effectiveMeta = meta ?? { tone: "classic", drift: {} };
  // Attempt-rate gate: a technique is only launched on a minority of the
  // ticks where its conditions hold, so physics-driven endings (boundary
  // exits, collapses) — which are calibrated to real-world shares in the
  // terminal classifiers — remain the dominant resolution path.
  if (rng.next() >= KIMARITE_MIDFIGHT_ATTEMPT_RATE) return null;
  // In many cases both could be attackers, but classifier logic usually picks a side.
  const sides: ("east" | "west")[] = ["east", "west"];
  const results: KimariteAttempt[] = [];

  for (const side of sides) {
    const attempt = evaluateSideAttempt(
      side,
      east,
      west,
      st,
      ctx,
      division,
      effectiveMeta,
      rng,
      tactics
    );
    if (attempt) results.push(attempt);
  }

  // Pick the best attempt (highest success probability among valid sides)
  if (results.length === 0) return null;
  return results.sort((a, b) => b.successProbability - a.successProbability)[0];
}

/**
 * The KimariteSelectionEngine handles the logic for choosing which technique
 * is attempted and whether it successfully executes.
 */
export const KimariteSelectionEngine = {
  evaluate,
};
