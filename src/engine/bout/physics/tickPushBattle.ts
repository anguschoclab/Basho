import type { SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { BoutLogEntry } from "../../types/basho";
import type { Division } from "../../types/banzuke";
import type { KimariteId } from "../../types/combat";
import type { Side } from "../../types/banzuke";
import {
  COG_OFFSET_PER_FORCE,
  DOMINANT_VELOCITY_SCALE,
  FORCE_DIFF_JITTER_MAGNITUDE,
  FATIGUE_PENALTY_PER_POINT,
  MIN_FORCE_AFTER_FATIGUE,
  MASS_ADVANTAGE_MULTIPLIER,
  DISPLACEMENT_PER_FORCE,
  CONTEST_LINE_JITTER_MULTIPLIER,
  LATERAL_MAX_OFFSET,
  LATERAL_RESTORING_DECAY,
  LATERAL_SLIP_CHANCE,
  LATERAL_SLIP_IMPULSE,
  OFF_AXIS_FORCE_FALLOFF,
  ENGAGEMENT_ANGLE_GLANCING_THRESHOLD,
  NARRATIVE_TICK_CADENCE,
  BOUT_FATIGUE_MULTIPLIER,
  CLOCK_MULTIPLIER,
  COUNTER_FORCE_REDUCTION,
} from "../../../constants/engine/physics";
import { EDGE_THRESHOLD } from "../../types/combat-spatial";
import type { EngineStateV2 } from "../../types/combat-spatial";
import { isBodyFalling, classifyFallKimarite } from "../boutSpatial";
import { evaluateKimariteAttempt } from "../kimariteClassifier";
import { stat, jitter, boutFatigueIncrement } from "../boutUtils";
import { buildEdgeCrisis } from "./edgeCrisis";

export function tickPushBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  division: Division,
  meta: { tone: string; drift: Record<string, number> },
  playerTactic?: import("../../types/combat").BoutTactic
): { winner?: Side; kimarite?: KimariteId } | undefined {
  if (st.phase.tag !== "push_battle") return undefined;

  const push = st.phase.state;

  // --- Force-differential physics ---
  // Per-tick jitter breaks ties; only the LOSING fighter retreats and destabilises.

  // Accumulate per-tick exertion — rate governed by stamina
  st.east.boutFatigue += boutFatigueIncrement(stat(east, "stamina"));
  st.west.boutFatigue += boutFatigueIncrement(stat(west, "stamina"));

  // Effective fatigue = pre-bout fatigue + in-bout accumulation
  const eastEffFatigue = stat(east, "fatigue") + st.east.boutFatigue * BOUT_FATIGUE_MULTIPLIER;
  const westEffFatigue = stat(west, "fatigue") + st.west.boutFatigue * BOUT_FATIGUE_MULTIPLIER;

  // Penalty: max 40% reduction (capped at fatigue ~100)
  const eastFatPenalty = Math.max(
    MIN_FORCE_AFTER_FATIGUE,
    1 - eastEffFatigue * FATIGUE_PENALTY_PER_POINT
  );
  const westFatPenalty = Math.max(
    MIN_FORCE_AFTER_FATIGUE,
    1 - westEffFatigue * FATIGUE_PENALTY_PER_POINT
  );

  let adjustedEastForce = push.eastForce * eastFatPenalty;
  let adjustedWestForce = push.westForce * westFatPenalty;

  // In-bout counter-tactic activation (2.2): when defender's counterFamily matches
  // the current engagement family ("push"), reduce attacker's effective force
  let counterActivated = false;
  let counterSide: Side | null = null;
  if (
    west.combatProfile?.counterFamily === "push" &&
    east.combatProfile?.counterFamily !== "push"
  ) {
    adjustedEastForce *= 1 - COUNTER_FORCE_REDUCTION;
    counterActivated = true;
    counterSide = "west";
  } else if (
    east.combatProfile?.counterFamily === "push" &&
    west.combatProfile?.counterFamily !== "push"
  ) {
    adjustedWestForce *= 1 - COUNTER_FORCE_REDUCTION;
    counterActivated = true;
    counterSide = "east";
  }
  if (counterActivated && counterSide && st.tick % NARRATIVE_TICK_CADENCE === 0) {
    boutLog.push({
      phase: "counter_tactic",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        event: "counter_tactic",
        side: counterSide,
        counterFamily: "push",
        attackerFamily: "push",
        forceReduction: COUNTER_FORCE_REDUCTION,
      },
    });
  }

  // Archetype-specific bout behavior (2.1): apply pushVelocityBonus to force
  // Body type behavior (5.1): combine with body type push/lateral bonuses
  const eastPushBonus =
    ((east.combatProfile?.archetypeBehavior?.pushVelocityBonus ?? 0) +
      (east.combatProfile?.bodyTypeBehavior?.pushVelocityBonus ?? 0)) /
    100;
  const westPushBonus =
    ((west.combatProfile?.archetypeBehavior?.pushVelocityBonus ?? 0) +
      (west.combatProfile?.bodyTypeBehavior?.pushVelocityBonus ?? 0)) /
    100;
  const eastLateralBonus =
    ((east.combatProfile?.archetypeBehavior?.lateralMovementBonus ?? 0) +
      (east.combatProfile?.bodyTypeBehavior?.lateralMovementBonus ?? 0)) /
    100;
  const westLateralBonus =
    ((west.combatProfile?.archetypeBehavior?.lateralMovementBonus ?? 0) +
      (west.combatProfile?.bodyTypeBehavior?.lateralMovementBonus ?? 0)) /
    100;

  const massAdvantageEast = (st.east.mass - st.west.mass) * MASS_ADVANTAGE_MULTIPLIER;
  const jitteredForceDiff =
    adjustedEastForce * (1 + eastPushBonus) -
    adjustedWestForce * (1 + westPushBonus) +
    massAdvantageEast +
    jitter(rng, FORCE_DIFF_JITTER_MAGNITUDE);
  const displacement = Math.abs(jitteredForceDiff) * DISPLACEMENT_PER_FORCE;

  push.contestLine += jitteredForceDiff * CONTEST_LINE_JITTER_MULTIPLIER;

  // --- 1.75D Lateral integration ---
  // The defender can slip off-axis only when the attacker OVER-COMMITS (drives
  // with a large force differential). The slip is scaled by the defender's speed,
  // normalized to the 0–1 stat scale so it lives on the metre-scale lateral axis.
  // A balanced push (small force diff) produces no slip — fighters stay on the
  // contest line and the exchange reads as straight oshi-zumo.
  const lateralOffsetDiff = push.eastLateral - push.westLateral;
  const isGlancing = Math.abs(lateralOffsetDiff) > ENGAGEMENT_ANGLE_GLANCING_THRESHOLD;
  const forceFalloff = isGlancing ? OFF_AXIS_FORCE_FALLOFF : 1.0;

  if (jitteredForceDiff > 0) {
    // East dominant — west retreats toward west's tawara
    push.westLeadFoot -= displacement * forceFalloff;
    st.west.cogOffset += Math.abs(jitteredForceDiff) * COG_OFFSET_PER_FORCE;
    st.east.velocityX = jitteredForceDiff * DOMINANT_VELOCITY_SCALE;
    st.west.velocityX = 0;
    // Defender (west) may attempt a discrete lateral slip — likelier the faster
    // it is. Stochastic (seeded) so even a sustained duel flickers between square
    // pushing and glancing rather than saturating off-axis.
    if (rng.next() < (stat(west, "speed") / 100) * LATERAL_SLIP_CHANCE * (1 + westLateralBonus)) {
      push.westLateralMomentum += LATERAL_SLIP_IMPULSE;
    }
  } else if (jitteredForceDiff < 0) {
    // West dominant — east retreats toward east's tawara
    push.eastLeadFoot += displacement * forceFalloff;
    st.east.cogOffset += Math.abs(jitteredForceDiff) * COG_OFFSET_PER_FORCE;
    st.west.velocityX = Math.abs(jitteredForceDiff) * DOMINANT_VELOCITY_SCALE;
    st.east.velocityX = 0;
    if (rng.next() < (stat(east, "speed") / 100) * LATERAL_SLIP_CHANCE * (1 + eastLateralBonus)) {
      push.eastLateralMomentum += LATERAL_SLIP_IMPULSE;
    }
  }

  // Integrate lateral position
  push.eastLateral += push.eastLateralMomentum;
  push.westLateral += push.westLateralMomentum;

  // Clamp lateral offset
  push.eastLateral = Math.max(-LATERAL_MAX_OFFSET, Math.min(LATERAL_MAX_OFFSET, push.eastLateral));
  push.westLateral = Math.max(-LATERAL_MAX_OFFSET, Math.min(LATERAL_MAX_OFFSET, push.westLateral));

  // Apply restoring decay
  push.eastLateral *= LATERAL_RESTORING_DECAY;
  push.westLateral *= LATERAL_RESTORING_DECAY;
  push.eastLateralMomentum *= LATERAL_RESTORING_DECAY;
  push.westLateralMomentum *= LATERAL_RESTORING_DECAY;

  // Sync PhysicalBody
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.z = push.eastLateral;
  st.west.z = push.westLateral;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;
  st.east.velocityZ = push.eastLateralMomentum;
  st.west.velocityZ = push.westLateralMomentum;

  // Narrative cadence
  if (st.tick % NARRATIVE_TICK_CADENCE === 0) {
    boutLog.push({
      phase: "engagement",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        // A glancing exchange (large lateral offset) reads as a speed/evasion
        // beat rather than a straight oshi push, so route it to the speed family
        // and credit the fighter who slipped off-axis (the defender).
        tick: st.tick,
        family: isGlancing ? "speed" : "push",
        attackerSide: isGlancing
          ? jitteredForceDiff >= 0
            ? "west"
            : "east"
          : jitteredForceDiff >= 0
            ? "east"
            : "west",
        forceDiff: jitteredForceDiff,
        lateralOffsetDiff,
        engagementAngle: Math.abs(lateralOffsetDiff),
        eastLateral: push.eastLateral,
        westLateral: push.westLateral,
      },
    });
  }

  // Mid-fight kimarite attempt
  const attempt = evaluateKimariteAttempt(
    east,
    west,
    push,
    null,
    st,
    rng,
    division,
    meta,
    playerTactic
  );
  if (attempt) {
    const succeeded = rng.next() < attempt.successProbability;
    if (succeeded) {
      return { winner: attempt.side, kimarite: attempt.technique };
    }
  }

  // Falling check (extreme CoG offset)
  if (isBodyFalling(st.east)) {
    return { winner: "west", kimarite: classifyFallKimarite(push, st, "east") };
  }
  if (isBodyFalling(st.west)) {
    return { winner: "east", kimarite: classifyFallKimarite(push, st, "west") };
  }

  // Boundary check
  if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, undefined, "push_battle", st);
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, undefined, "push_battle", st);
  }

  return undefined;
}
