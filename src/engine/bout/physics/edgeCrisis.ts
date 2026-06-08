import type { SeededRNG } from "../../rng";
import type { BoutLogEntry } from "../../types/basho";
import type { KimariteId } from "../../types/combat";
import type { Side } from "../../types/banzuke";
import type { Rikishi } from "../../types/rikishi";
import {
  TOE_OVERAGE_SCALE,
  TOE_POSITION_NORMALIZED_MAX,
  TOE_POSITION_FORCED_OUT,
  TOE_POSITION_MAX,
  CRISIS_PRESSURE_MULTIPLIER,
  OPPONENT_PRESSURE_Z_MULTIPLIER,
  ESCAPE_RESISTANCE_MULTIPLIER,
  EDGE_ESCAPE_MOMENTUM_RETENTION,
  UTCHARI_PIVOT_THRESHOLD,
  ESCAPE_MARGIN_THRESHOLD,
  ESCAPE_BASE_PROBABILITY,
  ESCAPE_MARGIN_PROBABILITY_MULTIPLIER,
  ANGULAR_ESCAPE_POWER_SCALE,
  EDGE_CRISIS_RECOVERY_PROBABILITY,
} from "../../../constants/engine/physics";
import { EDGE_THRESHOLD } from "../../types/combat-spatial";
import type { CombatPhase, EngineStateV2, PushBattleState, BeltBattleState } from "../../types/combat-spatial";
import { tawaraBounceResistance, classifyEdgeExitKimarite } from "../boutSpatial";

export function buildEdgeCrisis(
  crisisSide: Side,
  push: PushBattleState,
  belt: BeltBattleState | undefined,
  prev: "push_battle" | "belt_battle",
  st: EngineStateV2
): Extract<CombatPhase, { tag: "edge_crisis" }> {
  const opponentPressure = crisisSide === "east" ? push.westMomentum : push.eastMomentum;

  // Compute initial tawaraToePosition from how far foot is past edge threshold
  const footPos = crisisSide === "east" ? push.eastLeadFoot : Math.abs(push.westLeadFoot);
  const overage = Math.max(0, footPos - EDGE_THRESHOLD);
  const initialToePos = Math.min(TOE_POSITION_NORMALIZED_MAX, overage / TOE_OVERAGE_SCALE);

  // 1.75D: escapeAngle derived from defender's facingAngle (rotation = pivoting at edge)
  const defender = crisisSide === "east" ? st.east : st.west;
  const escapeAngle = Math.abs(defender.facingAngle);

  // 1.75D: opponentPressureZ from attacker's lateral momentum
  const opponentPressureZ = crisisSide === "east" ? push.westLateralMomentum : push.eastLateralMomentum;

  return {
    tag: "edge_crisis",
    crisis: {
      side: crisisSide,
      ticksInCrisis: 0,
      recoveryProbability: EDGE_CRISIS_RECOVERY_PROBABILITY,
      tawaraToePosition: initialToePos,
      tawaraBounceForce: tawaraBounceResistance(initialToePos),
      escapeAngle,
      escapeForceAvailable: crisisSide === "east" ? push.eastForce : push.westForce,
      opponentPressureX: opponentPressure,
      opponentPressureZ,
      escaped: false,
    },
    prev,
    savedPush: push,
    savedBelt: belt,
  };
}

export function tickEdgeCrisis(
  rng: SeededRNG,
  _east: Rikishi,
  _west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | undefined {
  if (st.phase.tag !== "edge_crisis") return undefined;

  const crisis = st.phase.crisis;
  const prev = st.phase.prev;
  crisis.ticksInCrisis++;

  // Update tawaraToePosition each tick using real opponent pressure (X + Z)
  const pressureIncrease = crisis.opponentPressureX * CRISIS_PRESSURE_MULTIPLIER + Math.abs(crisis.opponentPressureZ) * OPPONENT_PRESSURE_Z_MULTIPLIER;
  const escapeResistance = crisis.escapeForceAvailable * ESCAPE_RESISTANCE_MULTIPLIER;
  crisis.tawaraToePosition = Math.max(
    0,
    Math.min(TOE_POSITION_MAX, crisis.tawaraToePosition + pressureIncrease - escapeResistance)
  );

  const bounceForce = tawaraBounceResistance(crisis.tawaraToePosition);
  crisis.tawaraBounceForce = bounceForce;

  // When fully past tawara, no more recovery possible
  if (crisis.tawaraToePosition >= TOE_POSITION_FORCED_OUT) {
    const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
    const winner: Side = crisis.side === "east" ? "west" : "east";
    boutLog.push({
      phase: "edge_crisis",
      data: {
        side: crisis.side,
        escaped: false,
        tawaraToePosition: crisis.tawaraToePosition,
        escapeAngle: crisis.escapeAngle,
        opponentPressureZ: crisis.opponentPressureZ,
        forced: true,
      },
    });
    return { winner, kimarite };
  }

  // 1.75D: Physics-driven escape — angular authority projected along escapeAngle vs opponent pressure
  const defender = crisis.side === "east" ? st.east : st.west;
  const angularEscapePower = Math.abs(defender.facingAngle) * ANGULAR_ESCAPE_POWER_SCALE; // rough projection scaling
  const totalPressure = crisis.opponentPressureX + Math.abs(crisis.opponentPressureZ);
  const canEscape = angularEscapePower >= totalPressure;

  // Seeded jitter as tie-breaker when close
  const escapeMargin = angularEscapePower - totalPressure;
  const didEscape = canEscape && (escapeMargin > ESCAPE_MARGIN_THRESHOLD || rng.next() < ESCAPE_BASE_PROBABILITY + escapeMargin * ESCAPE_MARGIN_PROBABILITY_MULTIPLIER);

  // Log this crisis tick for narrative
  boutLog.push({
    phase: "edge_crisis",
    data: {
      side: crisis.side,
      escaped: didEscape,
      tawaraToePosition: crisis.tawaraToePosition,
      escapeAngle: crisis.escapeAngle,
      opponentPressureZ: crisis.opponentPressureZ,
      tawaraBounceForce: bounceForce,
      ticksInCrisis: crisis.ticksInCrisis,
    },
  });

  if (didEscape) {
    // Tawara drama — fighter escapes. Restore previous phase with absorbed momentum.
    if (prev === "belt_battle" && st.phase.savedBelt && st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
        westMomentum: st.phase.savedPush.westMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
      };
      st.phase = { tag: "belt_battle", state: st.phase.savedBelt, push: restoredPush };
    } else if (st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
        westMomentum: st.phase.savedPush.westMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
      };
      st.phase = { tag: "push_battle", state: restoredPush };
    }

    // High-angle pivot at edge = utchari classification on escape
    if (crisis.escapeAngle > UTCHARI_PIVOT_THRESHOLD) {
      boutLog.push({
        phase: "edge_crisis",
        data: { event: "utchari_pivot", side: crisis.side, escapeAngle: crisis.escapeAngle },
      });
    }

    return { escaped: true };
  }

  // Fighter failed to escape — classify the exit
  const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
  const winner: Side = crisis.side === "east" ? "west" : "east";
  return { winner, kimarite };
}
