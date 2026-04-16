import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState, BoutLogEntry } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteId, GrappleState, HandPosition } from "../types/combat";
import { EDGE_THRESHOLD } from "../types/combat-spatial";
import type {
  CombatPhase,
  EngineStateV2,
  EngineSnapshot,
  PushBattleState,
  BeltBattleState,
} from "../types/combat-spatial";
import {
  initPhysicalBody,
  isBodyFalling,
  tawaraBounceResistance,
  classifyFallKimarite,
  classifyBeltFallKimarite,
  classifyEdgeExitKimarite,
} from "./boutSpatial";
import { initBeltBattle, evolveGripGeometry } from "./boutGrip";
import { evaluateKimariteAttempt } from "./kimariteClassifier";

const MAX_TICKS = 120;

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BoutContext {
  id: string;
  day: number;
  rikishiEastId: string;
  rikishiWestId: string;
  playerSide?: Side;
  playerTactic?: import("../types/combat").BoutTactic;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
}

// Re-export EngineSnapshot for consumers that imported it here previously
export type { EngineSnapshot };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safe stat read — Rikishi has flat top-level stat fields (power, speed, etc.) */
function stat(r: Rikishi, key: string, fallback = 50): number {
  const v = (r as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function jitter(rng: SeededRNG, scale = 1): number {
  return (rng.next() - 0.5) * scale;
}

// ---------------------------------------------------------------------------
// Exported pure helpers (unit-testable, used internally)
// ---------------------------------------------------------------------------

/**
 * Computes a rikishi's tachiai power score without RNG jitter.
 * When `henkaVulnerabilityMode` is true, returns how susceptible this fighter
 * is as the OPPONENT of a henka attempt (high aggression = commits harder = easier
 * to sidestep).
 */
export function computeTachiaiPower(
  r: Rikishi,
  options?: { henkaVulnerabilityMode?: boolean }
): number {
  if (options?.henkaVulnerabilityMode) {
    // High aggression = overcommits = easier to sidestep
    return stat(r, "speed") * 1.5 + stat(r, "aggression") * 0.5;
  }
  // Tachiai power: power 50%, speed 30%, aggression 20%
  return stat(r, "power") * 0.5 + stat(r, "speed") * 0.3 + stat(r, "aggression") * 0.2;
}

/**
 * Per-tick boutFatigue increment based on stamina.
 * High-stamina fighters accumulate fatigue more slowly.
 *   stamina=100 → 0.5/tick (half rate)
 *   stamina=50  → 1.0/tick (baseline)
 *   stamina=25  → 2.0/tick (double, capped)
 */
export function boutFatigueIncrement(stamina: number): number {
  return 1 / Math.max(0.5, stamina * 0.02);
}

/**
 * Computes edge-crisis recovery probability for the defending fighter.
 * Mental composure is the dominant factor; balance is secondary.
 */
export function edgeCrisisRecoveryChance(
  defender: Rikishi,
  baseProbability: number,
  bounceBonus: number,
  tickDecay: number
): number {
  const mentalFactor = stat(defender, "mental") * 0.005; // 0–0.5 (dominant)
  const balanceFactor = stat(defender, "balance") * 0.002; // 0–0.2 (secondary)
  return (baseProbability + mentalFactor + balanceFactor + bounceBonus) * tickDecay;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
  void bout; // id/day used in seed; kept for signature clarity
  return {
    tick: 0,
    phase: { tag: "approach" },
    east: initPhysicalBody(east, "east"),
    west: initPhysicalBody(west, "west"),
    tachiaiWinner: "east", // placeholder; set in resolveTachiaiV2
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}

// ---------------------------------------------------------------------------
// Tachiai
// ---------------------------------------------------------------------------

/**
 * Resolves the initial clash. May early-terminate the bout (henka) by setting
 * phase to "resolved" — callers must check for this before entering the loop.
 */
function resolveTachiaiV2(
  rng: SeededRNG,
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): void {
  st.phase = { tag: "tachiai", impactVelocity: 8.0, contactAngle: 0 };

  // Tachiai power: power 50%, speed 30%, aggression 20% + jitter
  const eastPower = computeTachiaiPower(east) + jitter(rng, 8);
  const westPower = computeTachiaiPower(west) + jitter(rng, 8);
  const tachiaiWinner: Side = eastPower >= westPower ? "east" : "west";
  st.tachiaiWinner = tachiaiWinner;

  // CR-02: Henka resolution — must check before phase loop
  const henkaSide: Side | null =
    bout.playerTactic === "HENKA"
      ? (bout.playerSide ?? null)
      : bout.cpuTacticOverride === "HENKA"
        ? bout.playerSide === "east"
          ? "west"
          : "east"
        : null;

  if (henkaSide !== null) {
    const trickster = henkaSide === "east" ? east : west;
    const opponent = henkaSide === "east" ? west : east;
    // High-aggression opponents overcommit → more vulnerable to henka
    const henkaScore =
      stat(trickster, "technique") + computeTachiaiPower(opponent, { henkaVulnerabilityMode: true }) + jitter(rng, 8);
    const defenseScore = stat(opponent, "balance") + jitter(rng, 8);

    if (henkaScore > defenseScore) {
      st.phase = {
        tag: "resolved",
        winner: henkaSide,
        exitVector: { x: henkaSide === "east" ? 1 : -1, z: 0 },
        technique: "hatakikomi",
      };
      return;
    }
  }

  // Decide push vs belt battle (biased by combatProfile)
  const eastBeltBias = east.combatProfile?.familyPreferences?.belt ?? 25;
  const westBeltBias = west.combatProfile?.familyPreferences?.belt ?? 25;
  const beltThreshold = Math.min(0.7, (eastBeltBias + westBeltBias) / 200);
  const useBelt = rng.next() < beltThreshold;

  const initialPush: PushBattleState = {
    contestLine: 0,
    eastForce: eastPower,
    westForce: westPower,
    eastLeadFoot: st.east.x,
    westLeadFoot: st.west.x,
    eastMomentum: eastPower,
    westMomentum: westPower,
  };

  if (useBelt) {
    const belt = initBeltBattle(rng, east, west, tachiaiWinner);
    st.phase = { tag: "belt_battle", state: belt, push: initialPush };
  } else {
    st.phase = { tag: "push_battle", state: initialPush };
  }
}

// ---------------------------------------------------------------------------
// Phase tick handlers
// ---------------------------------------------------------------------------

function tickPushBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): { winner?: Side; kimarite?: KimariteId } | undefined {
  if (st.phase.tag !== "push_battle") return undefined;

  const push = st.phase.state;

  // --- Fix Bug 1 & 2: Force-differential physics ---
  // Per-tick jitter breaks ties; only the LOSING fighter retreats and destabilises.

  // Accumulate per-tick exertion — rate governed by stamina
  st.east.boutFatigue += boutFatigueIncrement(stat(east, "stamina"));
  st.west.boutFatigue += boutFatigueIncrement(stat(west, "stamina"));

  // Effective fatigue = pre-bout fatigue + in-bout accumulation
  const eastEffFatigue = stat(east, "fatigue") + st.east.boutFatigue * 0.4;
  const westEffFatigue = stat(west, "fatigue") + st.west.boutFatigue * 0.4;

  // Penalty: max 40% reduction (capped at fatigue ~100)
  const eastFatPenalty = Math.max(0.6, 1 - eastEffFatigue * 0.004);
  const westFatPenalty = Math.max(0.6, 1 - westEffFatigue * 0.004);

  const adjustedEastForce = push.eastForce * eastFatPenalty;
  const adjustedWestForce = push.westForce * westFatPenalty;

  const massAdvantageEast = (st.east.mass - st.west.mass) * 0.05; // ~5 N per 20 kg difference
  const jitteredForceDiff =
    adjustedEastForce - adjustedWestForce + massAdvantageEast + jitter(rng, 3);
  const displacement = Math.abs(jitteredForceDiff) * 0.04; // meters per tick

  push.contestLine += jitteredForceDiff * 0.01;

  if (jitteredForceDiff > 0) {
    // East dominant — west retreats toward west's tawara (−4.55)
    push.westLeadFoot -= displacement;
    st.west.cogOffset += Math.abs(jitteredForceDiff) * 0.003;
    st.east.velocityX = jitteredForceDiff * 0.1;
    st.west.velocityX = 0;
  } else if (jitteredForceDiff < 0) {
    // West dominant — east retreats toward east's tawara (+4.55)
    push.eastLeadFoot += displacement;
    st.east.cogOffset += Math.abs(jitteredForceDiff) * 0.003;
    st.west.velocityX = Math.abs(jitteredForceDiff) * 0.1;
    st.east.velocityX = 0;
  }

  // CR-03: Sync PhysicalBody positions so kimariteClassifier reads current state
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;

  // CI-03: Mid-fight kimarite attempt — emergent classification
  const attempt = evaluateKimariteAttempt(east, west, push, null, st, rng);
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

  // CR-04: Boundary check using EDGE_THRESHOLD with signed comparisons
  if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, undefined, "push_battle");
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, undefined, "push_battle");
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

  // Accumulate per-tick exertion — rate governed by stamina
  st.east.boutFatigue += boutFatigueIncrement(stat(east, "stamina"));
  st.west.boutFatigue += boutFatigueIncrement(stat(west, "stamina"));

  // Evolve grip geometry (arm reach, depth, grip strength decay)
  // Pass additional in-bout fatigue to grip decay
  const eastBoutFatigue = st.east.boutFatigue * 0.4;
  const westBoutFatigue = st.west.boutFatigue * 0.4;
  evolveGripGeometry(rng, east, west, belt, eastBoutFatigue, westBoutFatigue);

  const torqueAdvantage = belt.torqueEast - belt.torqueWest;

  // Apply torque to CoG — only the losing side destabilises
  if (torqueAdvantage > 0) {
    st.west.cogOffset += torqueAdvantage * 0.003;
  } else {
    st.east.cogOffset += Math.abs(torqueAdvantage) * 0.003;
  }

  // Torque translates to positional displacement — only the retreating fighter moves
  const torqueDisplacementEast = Math.max(0, belt.torqueWest - belt.torqueEast) * 0.005;
  const torqueDisplacementWest = Math.max(0, belt.torqueEast - belt.torqueWest) * 0.005;
  push.eastLeadFoot += torqueDisplacementEast; // east retreats when west has more torque
  push.westLeadFoot -= torqueDisplacementWest; // west retreats when east has more torque

  // CR-03: Sync PhysicalBody
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;

  // Set velocityX for classifier (torque-driven movement)
  st.east.velocityX = torqueAdvantage < 0 ? Math.abs(torqueAdvantage) * 0.05 : 0;
  st.west.velocityX = torqueAdvantage > 0 ? torqueAdvantage * 0.05 : 0;

  // CI-03: Mid-fight kimarite attempt
  const attempt = evaluateKimariteAttempt(east, west, push, belt, st, rng);
  if (attempt) {
    const succeeded = rng.next() < attempt.successProbability;
    if (succeeded) {
      return { winner: attempt.side, kimarite: attempt.technique };
    }
  }

  // Body fall check
  if (isBodyFalling(st.east)) {
    return { winner: "west", kimarite: classifyBeltFallKimarite(belt, st, "east") };
  }
  if (isBodyFalling(st.west)) {
    return { winner: "east", kimarite: classifyBeltFallKimarite(belt, st, "west") };
  }

  // CR-05A: Edge crisis — the LOSING side (less torque) goes into crisis
  if (Math.abs(torqueAdvantage) > 30) {
    const crisisSide: Side = torqueAdvantage > 0 ? "west" : "east";
    st.phase = buildEdgeCrisis(crisisSide, push, belt, "belt_battle");
  } else if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, belt, "belt_battle");
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, belt, "belt_battle");
  }

  return undefined;
}

function buildEdgeCrisis(
  crisisSide: Side,
  push: PushBattleState,
  belt: BeltBattleState | undefined,
  prev: "push_battle" | "belt_battle"
): Extract<CombatPhase, { tag: "edge_crisis" }> {
  const opponentPressure = crisisSide === "east" ? push.westMomentum : push.eastMomentum;

  // Fix Bug 3: Compute initial tawaraToePosition from how far foot is past edge threshold
  const footPos = crisisSide === "east" ? push.eastLeadFoot : Math.abs(push.westLeadFoot);
  const overage = Math.max(0, footPos - EDGE_THRESHOLD);
  // Scale overage (0–0.75m) to toePosition (0–1.0)
  const initialToePos = Math.min(1.0, overage / 0.75);

  return {
    tag: "edge_crisis",
    crisis: {
      side: crisisSide,
      ticksInCrisis: 0,
      recoveryProbability: 0.3,
      tawaraToePosition: initialToePos,
      tawaraBounceForce: tawaraBounceResistance(initialToePos),
      escapeAngle: 0,
      escapeForceAvailable: crisisSide === "east" ? push.eastForce : push.westForce,
      opponentPressureX: opponentPressure,
      opponentPressureZ: 0,
      escaped: false,
    },
    prev,
    savedPush: push,
    savedBelt: belt,
  };
}

function tickEdgeCrisis(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | undefined {
  if (st.phase.tag !== "edge_crisis") return undefined;

  const crisis = st.phase.crisis;
  const prev = st.phase.prev;
  crisis.ticksInCrisis++;

  // Fix Bug 3: Update tawaraToePosition each tick using real opponent pressure
  const pressureIncrease = crisis.opponentPressureX * 0.02;
  const escapeResistance = crisis.escapeForceAvailable * 0.008;
  crisis.tawaraToePosition = Math.max(
    0,
    Math.min(2.0, crisis.tawaraToePosition + pressureIncrease - escapeResistance)
  );

  // Wire up tawaraBounceResistance from boutSpatial.ts
  const bounceForce = tawaraBounceResistance(crisis.tawaraToePosition);
  crisis.tawaraBounceForce = bounceForce;

  // When fully past tawara (toe > 1.5), no more recovery possible
  if (crisis.tawaraToePosition >= 1.5) {
    const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
    const winner: Side = crisis.side === "east" ? "west" : "east";
    boutLog.push({
      phase: "edge_crisis",
      data: {
        side: crisis.side,
        escaped: false,
        tawaraToePosition: crisis.tawaraToePosition,
        forced: true,
      },
    });
    return { winner, kimarite };
  }

  // Recovery: mental composure (dominant) + balance (secondary) + tawara bounce
  const defenderRikishi = crisis.side === "east" ? east : west;
  const bounceBonus = bounceForce / 100; // 0.15 at heel contact, 0.08 at toe
  const tickDecay = Math.max(0.1, 1 - crisis.ticksInCrisis * 0.05);
  const recoveryChance = edgeCrisisRecoveryChance(
    defenderRikishi,
    crisis.recoveryProbability,
    bounceBonus,
    tickDecay
  );

  const didEscape = rng.next() < recoveryChance;

  // Log this crisis tick for narrative
  boutLog.push({
    phase: "edge_crisis",
    data: {
      side: crisis.side,
      escaped: didEscape,
      recoveryProbability: recoveryChance,
      tawaraToePosition: crisis.tawaraToePosition,
      ticksInCrisis: crisis.ticksInCrisis,
    },
  });

  if (didEscape) {
    // CI-04: Tawara drama — fighter escapes. Restore previous phase with absorbed momentum.
    if (prev === "belt_battle" && st.phase.savedBelt && st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * 0.4,
        westMomentum: st.phase.savedPush.westMomentum * 0.4,
      };
      st.phase = { tag: "belt_battle", state: st.phase.savedBelt, push: restoredPush };
    } else if (st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * 0.4,
        westMomentum: st.phase.savedPush.westMomentum * 0.4,
      };
      st.phase = { tag: "push_battle", state: restoredPush };
    }

    return { escaped: true };
  }

  // Fighter failed to escape — classify the exit
  const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
  const winner: Side = crisis.side === "east" ? "west" : "east";
  return { winner, kimarite };
}

// ---------------------------------------------------------------------------
// Phase loop
// ---------------------------------------------------------------------------

function runPhaseLoop(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): { winner: Side; kimarite: KimariteId } {
  // CR-02: Henka may have resolved the bout at tachiai
  if (st.phase.tag === "resolved") {
    return { winner: st.phase.winner, kimarite: st.phase.technique };
  }

  for (let i = 0; i < MAX_TICKS; i++) {
    st.tick++;

    const pushResult = tickPushBattle(rng, east, west, st);
    if (pushResult?.winner && pushResult?.kimarite) {
      return { winner: pushResult.winner, kimarite: pushResult.kimarite };
    }

    const beltResult = tickBeltBattle(rng, east, west, st);
    if (beltResult?.winner && beltResult?.kimarite) {
      return { winner: beltResult.winner, kimarite: beltResult.kimarite };
    }

    const crisisResult = tickEdgeCrisis(rng, east, west, st, boutLog);
    // CI-04: escaped: true means phase was restored — keep looping
    if (crisisResult?.winner && crisisResult?.kimarite) {
      return { winner: crisisResult.winner, kimarite: crisisResult.kimarite };
    }
  }

  // Timeout — most stable rikishi wins (smallest cogOffset relative to footSpread)
  const eastInstability = Math.abs(st.east.cogOffset) / Math.max(0.01, st.east.footSpread);
  const westInstability = Math.abs(st.west.cogOffset) / Math.max(0.01, st.west.footSpread);
  const winner: Side = eastInstability <= westInstability ? "east" : "west";

  const hadBelt =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle");
  const kimarite: KimariteId = hadBelt ? "yorikiri" : "oshidashi";

  // CI-05: Rare hi_waza reversals (isamiashi, tsukite)
  // Very rare (1.5% each) post-resolution reversals where "winner" loses due to own mistake
  const loser: Side = winner === "east" ? "west" : "east";
  const loserInstability = winner === "east" ? westInstability : eastInstability;

  // isamiashi: false start - only if loser was very unstable (near falling)
  if (loserInstability > 0.9 && rng.next() < 0.015) {
    return { winner: loser, kimarite: "isamiashi" };
  }

  // tsukite: missed thrust - only if bout was push-dominant (no belt)
  if (!hadBelt && rng.next() < 0.015) {
    return { winner: loser, kimarite: "tsukite" };
  }

  return { winner, kimarite };
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

function buildBoutResultV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  winner: Side,
  kimarite: KimariteId,
  boutLog: BoutLogEntry[]
): BoutResult {
  const duration = Math.max(1, st.tick * 2);

  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle") ||
    st.phase.tag === "resolved"
      ? "belt-dominant"
      : "push-dominant";

  const winnerRikishi = winner === "east" ? east : west;
  const loserRikishi = winner === "east" ? west : east;
  const winnerRankNum = winnerRikishi.rankNumber ?? 99;
  const loserRankNum = loserRikishi.rankNumber ?? 99;
  const upset = winnerRankNum > loserRankNum;

  return {
    boutId: bout.id,
    winner,
    winnerRikishiId: winnerRikishi.id,
    loserRikishiId: loserRikishi.id,
    kimarite: kimarite as BoutResult["kimarite"],
    kimariteName: kimarite,
    stance: resolvedStance,
    tachiaiWinner: st.tachiaiWinner,
    duration,
    upset,
    isKinboshi: false, // set by boutResolver
    log: boutLog,
    kenshoEnvelopes: 0,
  };
}

/**
 * Build EngineSnapshot from final spatial state.
 * Provides real derived values for position, advantage, balance.
 */
function buildEngineSnapshotV2(st: EngineStateV2, winner: Side): EngineSnapshot {
  const beltPhase = st.phase.tag === "belt_battle" ? st.phase : null;
  const grappleState: GrappleState = beltPhase
    ? deriveGrappleStateFromBelt(beltPhase.state)
    : st.grappleState;
  st.grappleState = grappleState;

  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle")
      ? ("belt-dominant" as const)
      : ("push-dominant" as const);

  // Derive position from average foot position
  const avgFoot = (Math.abs(st.east.leadingFootX) + Math.abs(st.west.leadingFootX)) / 2;
  const position: "front" | "lateral" | "rear" =
    avgFoot > 3.5 ? "rear" : avgFoot > 2.0 ? "lateral" : "front";

  // Derive advantage from CoG stability differential
  const advantage: "none" | "east" | "west" =
    st.east.cogOffset < st.west.cogOffset - 0.05
      ? "east"
      : st.west.cogOffset < st.east.cogOffset - 0.05
        ? "west"
        : "none";

  return {
    stance: resolvedStance,
    grappleState,
    balanceEast: Math.max(0, Math.min(100, 100 - Math.abs(st.east.cogOffset) * 10)),
    balanceWest: Math.max(0, Math.min(100, 100 - Math.abs(st.west.cogOffset) * 10)),
    position,
    advantage,
    winnerConsecutiveAdvantage: st.tick,
    loserLastActionFamily: undefined,
    finalLoserBalanceDrain:
      winner === "east" ? Math.abs(st.west.cogOffset) * 10 : Math.abs(st.east.cogOffset) * 10,
  };
}

/** Maps B+ BeltBattleState to legacy GrappleState. */
function deriveGrappleStateFromBelt(belt: BeltBattleState): GrappleState {
  const toHandPos = (grip: { isInside: boolean; isBlocked: boolean } | null): HandPosition =>
    grip === null ? "outside" : grip.isBlocked ? "blocked" : grip.isInside ? "inside" : "outside";

  const eastInsideCount = (belt.eastLeft?.isInside ? 1 : 0) + (belt.eastRight?.isInside ? 1 : 0);
  const westInsideCount = (belt.westLeft?.isInside ? 1 : 0) + (belt.westRight?.isInside ? 1 : 0);

  const gripAdvantage: GrappleState["gripAdvantage"] =
    eastInsideCount >= 2
      ? "moro_zashi_east"
      : westInsideCount >= 2
        ? "moro_zashi_west"
        : eastInsideCount > westInsideCount
          ? "east_strong"
          : westInsideCount > eastInsideCount
            ? "west_strong"
            : "neutral";

  const eastDepth =
    belt.eastDepth === "maemitsu" ? "maemitsu" : belt.eastDepth === "deep" ? "deep" : "standard";
  const westDepth =
    belt.westDepth === "maemitsu" ? "maemitsu" : belt.westDepth === "deep" ? "deep" : "standard";

  return {
    east: {
      rightHand: toHandPos(belt.eastRight),
      leftHand: toHandPos(belt.eastLeft),
      depth: eastDepth,
    },
    west: {
      rightHand: toHandPos(belt.westRight),
      leftHand: toHandPos(belt.westLeft),
      depth: westDepth,
    },
    gripAdvantage,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function resolveBoutPhysics(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState
): { result: BoutResult; engineSnapshot: EngineSnapshot } {
  const seed = `${basho.id ?? "basho"}-${basho.year ?? 0}-${bout.day}-${east.id}-${west.id}`;
  const rng = rngFromSeed(seed, "bout", "root");

  const st = initEngineStateV2(bout, east, west);
  resolveTachiaiV2(rng, bout, east, west, st);

  const boutLog: BoutLogEntry[] = [];
  const { winner, kimarite } = runPhaseLoop(rng, east, west, st, boutLog);

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite, boutLog);
  const engineSnapshot = buildEngineSnapshotV2(st, winner);

  return { result, engineSnapshot };
}
