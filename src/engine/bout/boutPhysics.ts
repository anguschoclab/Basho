import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteId } from "../types/combat";
import {
  initPhysicalBody,
  isBodyFalling,
  classifyFallKimarite,
  classifyBeltFallKimarite,
  classifyEdgeExitKimarite,
} from "./boutSpatial";
import { initBeltBattle, computeNetTorque, evolveGripGeometry } from "./boutGrip";
import type { EngineStateV2 } from "../types/combat-spatial";
import type { EngineSnapshot } from "./kimariteEvaluator";

const MAX_TICKS = 120;

export interface BoutContext {
  id: string;
  day: number;
  rikishiEastId: string;
  rikishiWestId: string;
  playerSide?: Side;
  playerTactic?: import("../types/combat").BoutTactic;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
}

function initEngineStateV2(_bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
  return {
    tick: 0,
    phase: { tag: "approach" },
    east: initPhysicalBody(east, "east"),
    west: initPhysicalBody(west, "west"),
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}

function resolveTachiaiV2(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineStateV2): void {
  st.phase = { tag: "tachiai", impactVelocity: 8.0, contactAngle: 0 };

  const eastPower = (east as Rikishi & { power?: number }).power || 50;
  const westPower = (west as Rikishi & { power?: number }).power || 50;

  const winner = eastPower >= westPower ? "east" : "west";

  const useBelt = rng.next() < 0.3;

  if (useBelt) {
    const belt = initBeltBattle(rng, east, west, winner);
    st.phase = {
      tag: "belt_battle",
      state: belt,
      push: {
        contestLine: 0,
        eastForce: eastPower,
        westForce: westPower,
        eastLeadFoot: st.east.x,
        westLeadFoot: st.west.x,
        eastMomentum: eastPower,
        westMomentum: westPower,
      },
    };
  } else {
    st.phase = {
      tag: "push_battle",
      state: {
        contestLine: 0,
        eastForce: eastPower,
        westForce: westPower,
        eastLeadFoot: st.east.x,
        westLeadFoot: st.west.x,
        eastMomentum: eastPower,
        westMomentum: westPower,
      },
    };
  }
}

function tickPushBattle(
  _rng: SeededRNG,
  _east: Rikishi,
  _west: Rikishi,
  st: EngineStateV2
): { winner?: Side; kimarite?: KimariteId } | undefined {
  if (st.phase.tag !== "push_battle") return undefined;

  const push = st.phase.state;
  push.contestLine += (push.eastForce - push.westForce) * 0.01;
  push.eastLeadFoot += push.eastMomentum * 0.01;
  push.westLeadFoot += push.westMomentum * 0.01;

  if (Math.abs(push.eastLeadFoot) > 4.0 || Math.abs(push.westLeadFoot) > 4.0) {
    const fallenSide = Math.abs(push.eastLeadFoot) > 4.0 ? "east" : "west";
    const kimarite = classifyFallKimarite(push, st, fallenSide);
    return { winner: fallenSide === "east" ? "west" : "east", kimarite };
  }
  return undefined;
}

function tickBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): { winner?: Side; kimarite?: KimariteId } | undefined {
  if (st.phase.tag !== "belt_battle") return undefined;

  const belt = st.phase.state;
  const push = st.phase.push;

  evolveGripGeometry(rng, east, west, belt);

  const eastTorque = computeNetTorque(belt.eastLeft, belt.eastRight, push.eastForce);
  const westTorque = computeNetTorque(belt.westLeft, belt.westRight, push.westForce);

  const torqueAdvantage = eastTorque - westTorque;
  belt.torqueEast = eastTorque;
  belt.torqueWest = westTorque;

  // Transition to edge crisis if someone's torque is overwhelming
  if (Math.abs(torqueAdvantage) > 30) {
    st.phase = {
      tag: "edge_crisis",
      crisis: {
        ticksInCrisis: 0,
        recoveryProbability: 0.3,
        side: torqueAdvantage > 0 ? "east" : "west",
        tawaraToePosition: 0,
        tawaraBounceForce: 0,
        escapeAngle: 0,
        escapeForceAvailable: 0,
        opponentPressureX: 0,
        opponentPressureZ: 0,
        escaped: false,
      },
      prev: "belt_battle",
    };
    return undefined;
  }

  // Check for body fall
  if (isBodyFalling(st.east)) {
    const kimarite = classifyBeltFallKimarite(belt, st, "east");
    return { winner: "west", kimarite };
  }
  if (isBodyFalling(st.west)) {
    const kimarite = classifyBeltFallKimarite(belt, st, "west");
    return { winner: "east", kimarite };
  }
  return undefined;
}

function tickEdgeCrisis(
  rng: SeededRNG,
  _east: Rikishi,
  _west: Rikishi,
  st: EngineStateV2
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | undefined {
  if (st.phase.tag !== "edge_crisis") return undefined;

  const crisis = st.phase.crisis;
  crisis.ticksInCrisis++;

  if (rng.next() < crisis.recoveryProbability) {
    return { escaped: true };
  }

  const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
  return { winner: crisis.side === "east" ? "west" : "east", kimarite };
}

function runPhaseLoop(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): { winner: Side; kimarite: KimariteId } {
  for (let i = 0; i < MAX_TICKS; i++) {
    st.tick++;

    const pushResult = tickPushBattle(rng, east, west, st);
    if (pushResult?.winner && pushResult?.kimarite)
      return { winner: pushResult.winner, kimarite: pushResult.kimarite };

    const beltResult = tickBeltBattle(rng, east, west, st);
    if (beltResult?.winner && beltResult?.kimarite)
      return { winner: beltResult.winner, kimarite: beltResult.kimarite };

    const crisisResult = tickEdgeCrisis(rng, east, west, st);
    if (crisisResult?.winner && crisisResult?.kimarite)
      return { winner: crisisResult.winner, kimarite: crisisResult.kimarite };
  }

  const eastDist = Math.sqrt(st.east.x * st.east.x + st.east.z * st.east.z);
  const westDist = Math.sqrt(st.west.x * st.west.x + st.west.z * st.west.z);
  const winner = eastDist > westDist ? "west" : "east";
  const kimarite = eastDist > westDist ? "yorikiri" : "oshidashi";
  return { winner, kimarite };
}

function buildBoutResultV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  winner: Side,
  kimarite: KimariteId
): BoutResult {
  const duration = st.tick * 2;
  return {
    boutId: bout.id,
    winner: winner as Side,
    winnerRikishiId: winner === "east" ? east.id : west.id,
    loserRikishiId: winner === "east" ? west.id : east.id,
    kimarite: kimarite as BoutResult["kimarite"],
    kimariteName: kimarite,
    stance: "belt-dominant",
    tachiaiWinner: winner,
    duration: Math.max(1, duration),
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
  };
}

function buildEngineSnapshotV2(st: EngineStateV2): EngineSnapshot {
  return {
    stance: "belt-dominant",
    grappleState: st.grappleState,
    balanceEast: 100 - Math.abs(st.east.cogOffset) * 10,
    balanceWest: 100 - Math.abs(st.west.cogOffset) * 10,
    position: "front",
    advantage: "none",
    winnerConsecutiveAdvantage: 0,
    loserLastActionFamily: undefined,
    finalLoserBalanceDrain: 0,
  };
}

export function resolveBoutPhysics(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState
): { result: BoutResult; engineSnapshot: EngineSnapshot } {
  const seed = `${basho.id || "basho"}-${basho.year || 0}-${bout.day}-${east.id}-${west.id}`;
  const rng = rngFromSeed(seed, "bout", "root");

  const st = initEngineStateV2(bout, east, west);
  resolveTachiaiV2(rng, east, west, st);

  const { winner, kimarite } = runPhaseLoop(rng, east, west, st);

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite);
  const engineSnapshot = buildEngineSnapshotV2(st);

  return { result, engineSnapshot };
}
