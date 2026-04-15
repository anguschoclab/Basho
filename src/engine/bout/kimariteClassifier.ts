import type { Rikishi } from "../types/rikishi";
import type { CombatAction } from "../types/combat";
import type {
  PushBattleState,
  BeltBattleState,
  EngineStateV2,
  KimariteAttempt,
  SpatialBoutContext,
} from "../types/combat-spatial";
import { EDGE_THRESHOLD } from "../types/combat-spatial";

/**
 * Evaluates whether a kimarite technique can be attempted mid-fight
 * based on the current spatial state and combat actions.
 *
 * This replaces the post-physics kimariteEvaluator with a mid-fight
 * classifier that reads spatial state to determine technique applicability.
 */
export function evaluateKimariteAttempt(
  _east: Rikishi,
  _west: Rikishi,
  _eastAction: CombatAction | null,
  _westAction: CombatAction | null,
  push: PushBattleState | null,
  belt: BeltBattleState | null,
  st: EngineStateV2
): KimariteAttempt | null {
  // Build spatial context for evaluation — use current PhysicalBody positions
  // (boutPhysics.ts syncs leadingFootX / x every tick)
  const torqueDiff = belt ? belt.torqueEast - belt.torqueWest : 0;
  const eastAbsFoot = Math.abs(st.east.leadingFootX);
  const westAbsFoot = Math.abs(st.west.leadingFootX);

  const ctx: SpatialBoutContext = {
    eastLeadFoot: st.east.leadingFootX,
    westLeadFoot: st.west.leadingFootX,
    eastCoGOffset: st.east.cogOffset,
    westCoGOffset: st.west.cogOffset,
    eastMomentumX: st.east.velocityX,
    westMomentumX: st.west.velocityX,
    eastGrip: belt?.eastGripClass ?? "none",
    westGrip: belt?.westGripClass ?? "none",
    torqueDiff,
    atEdge: eastAbsFoot > EDGE_THRESHOLD || westAbsFoot > EDGE_THRESHOLD,
  };

  // Check for edge crisis conditions first
  if (Math.abs(ctx.eastLeadFoot) > 3.8 || Math.abs(ctx.westLeadFoot) > 3.8) {
    return classifyEdgeKimarite(ctx);
  }

  // Check for belt battle conditions
  if (belt && (belt.eastGripClass !== "none" || belt.westGripClass !== "none")) {
    return classifyBeltKimarite(ctx, belt, st);
  }

  // Check for push battle conditions
  if (push) {
    return classifyPushKimarite(ctx, push, st);
  }

  return null;
}

function classifyEdgeKimarite(ctx: SpatialBoutContext): KimariteAttempt | null {
  const eastNearEdge = Math.abs(ctx.eastLeadFoot) > 3.8;
  const westNearEdge = Math.abs(ctx.westLeadFoot) > 3.8;

  if (eastNearEdge && westNearEdge) {
    // Both near edge - could be okuridashi or similar
    return {
      technique: "okuridashi",
      side: ctx.eastMomentumX > ctx.westMomentumX ? "east" : "west",
      successProbability: 0.7,
      requiredConditions: ["both_near_edge", "momentum_advantage"],
    };
  }

  const defenderSide = eastNearEdge ? "east" : "west";
  const attackerSide = eastNearEdge ? "west" : "east";

  // Check grip for determining technique
  const attackerGrip = defenderSide === "east" ? ctx.westGrip : ctx.eastGrip;

  if (attackerGrip === "morozashi" || attackerGrip === "uwate" || attackerGrip === "shitate") {
    // morozashi gives higher success probability — dominant inside-arm grip
    const prob = attackerGrip === "morozashi" ? 0.92 : 0.8;
    return {
      technique: "yorikiri",
      side: attackerSide,
      successProbability: prob,
      requiredConditions: ["defender_near_edge", "attacker_belt_grip"],
    };
  }

  return {
    technique: "oshidashi",
    side: attackerSide,
    successProbability: 0.75,
    requiredConditions: ["defender_near_edge", "push_battle"],
  };
}

function classifyBeltKimarite(
  ctx: SpatialBoutContext,
  belt: BeltBattleState,
  st: EngineStateV2
): KimariteAttempt | null {
  const eastTorque = belt.torqueEast;
  const westTorque = belt.torqueWest;
  const torqueAdvantage = eastTorque - westTorque;

  // Check for throw conditions (uwatenage, shitatenage)
  if (Math.abs(torqueAdvantage) > 25) {
    const throwerSide = torqueAdvantage > 0 ? "east" : "west";
    const throwerGrip = throwerSide === "east" ? ctx.eastGrip : ctx.westGrip;

    if (throwerGrip === "morozashi") {
      return {
        technique: "uwatenage",
        side: throwerSide,
        successProbability: 0.75,
        requiredConditions: ["high_torque_advantage", "morozashi_grip"],
      };
    } else if (throwerGrip === "uwate") {
      return {
        technique: "uwatenage",
        side: throwerSide,
        successProbability: 0.6,
        requiredConditions: ["high_torque_advantage", "uwate_grip"],
      };
    } else if (throwerGrip === "shitate") {
      return {
        technique: "shitatenage",
        side: throwerSide,
        successProbability: 0.55,
        requiredConditions: ["high_torque_advantage", "shitate_grip"],
      };
    }
  }

  // Check for belt push-out (yorikiri)
  const eastNearEdge = Math.abs(ctx.eastLeadFoot) > 3.5;
  const westNearEdge = Math.abs(ctx.westLeadFoot) > 3.5;

  if (eastNearEdge || westNearEdge) {
    const pusherSide = eastNearEdge ? "west" : "east";
    const pusherGrip = pusherSide === "east" ? ctx.eastGrip : ctx.westGrip;

    if (pusherGrip === "uwate" || pusherGrip === "shitate") {
      return {
        technique: "yorikiri",
        side: pusherSide,
        successProbability: 0.85,
        requiredConditions: ["defender_near_edge", "belt_grip"],
      };
    }
  }

  // Check for belt throw-down (yoritaoshi)
  const eastFalling = Math.abs(ctx.eastCoGOffset) > st.east.footSpread / 2;
  const westFalling = Math.abs(ctx.westCoGOffset) > st.west.footSpread / 2;

  if (eastFalling || westFalling) {
    const winnerSide = eastFalling ? "west" : "east";
    const winnerGrip = winnerSide === "east" ? ctx.eastGrip : ctx.westGrip;

    if (winnerGrip === "uwate" || winnerGrip === "shitate") {
      return {
        technique: "yoritaoshi",
        side: winnerSide,
        successProbability: 0.9,
        requiredConditions: ["opponent_falling", "belt_grip"],
      };
    }
  }

  return null;
}

function classifyPushKimarite(
  ctx: SpatialBoutContext,
  push: PushBattleState,
  st: EngineStateV2
): KimariteAttempt | null {
  const eastMomentum = push.eastMomentum;
  const westMomentum = push.westMomentum;
  const momentumAdvantage = eastMomentum - westMomentum;

  // Check for push-out (oshidashi)
  const eastNearEdge = Math.abs(ctx.eastLeadFoot) > 3.5;
  const westNearEdge = Math.abs(ctx.westLeadFoot) > 3.5;

  if (eastNearEdge || westNearEdge) {
    const pusherSide = eastNearEdge ? "west" : "east";

    if (Math.abs(momentumAdvantage) > 10) {
      return {
        technique: "oshidashi",
        side: pusherSide,
        successProbability: 0.8,
        requiredConditions: ["defender_near_edge", "momentum_advantage"],
      };
    }
  }

  // Check for push-down (oshitaoshi)
  const eastFalling = Math.abs(ctx.eastCoGOffset) > st.east.footSpread / 2;
  const westFalling = Math.abs(ctx.westCoGOffset) > st.west.footSpread / 2;

  if (eastFalling || westFalling) {
    const winnerSide = eastFalling ? "west" : "east";
    const winnerMomentum = winnerSide === "east" ? eastMomentum : westMomentum;

    if (winnerMomentum > 15) {
      return {
        technique: "oshitaoshi",
        side: winnerSide,
        successProbability: 0.85,
        requiredConditions: ["opponent_falling", "high_momentum"],
      };
    }

    return {
      technique: "tsukitaoshi",
      side: winnerSide,
      successProbability: 0.75,
      requiredConditions: ["opponent_falling", "thrust_action"],
    };
  }

  // Check for thrust techniques (tsukidashi, tsukitaoshi)
  const contestLine = push.contestLine;
  if (Math.abs(contestLine) > 2.5 && Math.abs(momentumAdvantage) > 5) {
    const attackerSide = momentumAdvantage > 0 ? "east" : "west";
    return {
      technique: "tsukidashi",
      side: attackerSide,
      successProbability: 0.65,
      requiredConditions: ["contest_line_advantage", "momentum_advantage"],
    };
  }

  return null;
}
