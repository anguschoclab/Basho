import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteId, GrappleState, HandPosition } from "../types/combat";
import { TAWARA_RADIUS } from "../types/combat-spatial";
import type {
  CombatPhase,
  EngineStateV2,
  PushBattleState,
  BeltBattleState,
} from "../types/combat-spatial";
import {
  initPhysicalBody,
  isBodyFalling,
  classifyFallKimarite,
  classifyBeltFallKimarite,
  classifyEdgeExitKimarite,
} from "./boutSpatial";
import { initBeltBattle, evolveGripGeometry } from "./boutGrip";
import { evaluateKimariteAttempt } from "./kimariteClassifier";
import type { EngineSnapshot } from "./kimariteEvaluator";

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
// Initialisation
// ---------------------------------------------------------------------------

function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
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

  // CR-01: Use actual power stats with jitter (not `.power || 50` which fails at power=0)
  const eastPower = stat(east, "power") + jitter(rng, 10);
  const westPower = stat(west, "power") + jitter(rng, 10);
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
    // Henka succeeds when technique + opponent.speed combo clears opponent balance
    const henkaScore =
      stat(trickster, "technique") + stat(opponent, "speed") * 1.5 + jitter(rng, 8);
    const defenseScore = stat(opponent, "balance") + jitter(rng, 8);

    if (henkaScore > defenseScore) {
      // Early victory — skip phase loop
      st.phase = {
        tag: "resolved",
        winner: henkaSide,
        exitVector: { x: henkaSide === "east" ? 1 : -1, z: 0 },
        technique: "hatakikomi",
      };
      return;
    }
    // Henka failed — opponent's forward momentum carries into normal engagement
  }

  // Decide push vs belt battle (30% belt initiation probability, biased by combatProfile)
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

  // Advance position — each tick represents ~0.2s of real engagement
  push.contestLine += (push.eastForce - push.westForce) * 0.01;
  push.eastLeadFoot += push.eastMomentum * 0.01;
  push.westLeadFoot -= push.westMomentum * 0.01; // west is pushed in negative x direction

  // CR-03: Sync PhysicalBody positions so kimariteClassifier reads current state
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;

  // Update CoG offset from momentum (more momentum = more forward lean)
  st.east.cogOffset += push.westMomentum * 0.002;
  st.west.cogOffset += push.eastMomentum * 0.002;

  // CI-03: Mid-fight kimarite attempt — emergent classification
  const attempt = evaluateKimariteAttempt(east, west, null, null, push, null, st);
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

  // CR-04: Boundary check using TAWARA_RADIUS with correct signed comparisons
  // east starts positive and is pushed further positive; west starts negative, pushed more negative
  if (push.eastLeadFoot >= TAWARA_RADIUS) {
    st.phase = buildEdgeCrisis("east", push, undefined, "push_battle");
  } else if (push.westLeadFoot <= -TAWARA_RADIUS) {
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

  // Evolve grip geometry (arm reach, depth, grip strength decay)
  evolveGripGeometry(rng, east, west, belt);

  // Torques are now updated inside evolveGripGeometry with real force values

  const torqueAdvantage = belt.torqueEast - belt.torqueWest;

  // Apply torque to CoG offsets (belt pressure destabilises the opponent)
  if (torqueAdvantage > 0) {
    st.west.cogOffset += torqueAdvantage * 0.003;
  } else {
    st.east.cogOffset += Math.abs(torqueAdvantage) * 0.003;
  }

  // Torque also translates to positional displacement
  push.eastLeadFoot += Math.abs(Math.max(0, belt.torqueWest - belt.torqueEast)) * 0.005;
  push.westLeadFoot -= Math.abs(Math.max(0, belt.torqueEast - belt.torqueWest)) * 0.005;

  // CR-03: Sync PhysicalBody
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;

  // CI-03: Mid-fight kimarite attempt
  const attempt = evaluateKimariteAttempt(east, west, null, null, push, belt, st);
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

  // CR-05A: Edge crisis when torque advantage is overwhelming.
  // The LOSING side (less torque) goes into crisis — fix: inverted from original.
  if (Math.abs(torqueAdvantage) > 30) {
    const crisisSide: Side = torqueAdvantage > 0 ? "west" : "east"; // west loses when east has more torque
    st.phase = buildEdgeCrisis(crisisSide, push, belt, "belt_battle");
  } else if (push.eastLeadFoot >= TAWARA_RADIUS) {
    st.phase = buildEdgeCrisis("east", push, belt, "belt_battle");
  } else if (push.westLeadFoot <= -TAWARA_RADIUS) {
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

  return {
    tag: "edge_crisis",
    crisis: {
      side: crisisSide,
      ticksInCrisis: 0,
      recoveryProbability: 0.3,
      tawaraToePosition: 0,
      tawaraBounceForce: 0,
      escapeAngle: 0,
      escapeForceAvailable: crisisSide === "east" ? push.eastForce : push.westForce,
      opponentPressureX: opponentPressure,
      opponentPressureZ: 0,
      escaped: false,
    },
    prev,
    // Preserve current push/belt state for phase restoration on escape
    _savedPush: push,
    _savedBelt: belt,
  } as Extract<CombatPhase, { tag: "edge_crisis" }> & {
    _savedPush: PushBattleState;
    _savedBelt?: BeltBattleState;
  };
}

function tickEdgeCrisis(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | undefined {
  if (st.phase.tag !== "edge_crisis") return undefined;

  const crisis = st.phase.crisis;
  const prev = st.phase.prev;
  crisis.ticksInCrisis++;

  // Stat-based recovery: balance + tawara bounce resistance
  const defenderRikishi = crisis.side === "east" ? east : west;
  const balanceFactor = stat(defenderRikishi, "balance") * 0.003; // 0–0.3
  const bounceResistance = crisis.tawaraToePosition < 1.0 ? 0.05 : 0;
  // Recovery probability decreases as crisis extends (tires out)
  const tickDecay = Math.max(0, 1 - crisis.ticksInCrisis * 0.05);
  const recoveryChance =
    (crisis.recoveryProbability + balanceFactor + bounceResistance) * tickDecay;

  if (rng.next() < recoveryChance) {
    // CI-04: Tawara drama — fighter escapes. Restore previous phase with absorbed momentum.
    const saved = st.phase as typeof st.phase & {
      _savedPush?: PushBattleState;
      _savedBelt?: BeltBattleState;
    };

    if (prev === "belt_battle" && saved._savedBelt && saved._savedPush) {
      // Restore belt battle with reduced momentum (tawara bounce absorbed ~60%)
      const restoredPush: PushBattleState = {
        ...saved._savedPush,
        eastMomentum: saved._savedPush.eastMomentum * 0.4,
        westMomentum: saved._savedPush.westMomentum * 0.4,
      };
      st.phase = { tag: "belt_battle", state: saved._savedBelt, push: restoredPush };
    } else if (saved._savedPush) {
      const restoredPush: PushBattleState = {
        ...saved._savedPush,
        eastMomentum: saved._savedPush.eastMomentum * 0.4,
        westMomentum: saved._savedPush.westMomentum * 0.4,
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
  st: EngineStateV2
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

    const crisisResult = tickEdgeCrisis(rng, east, west, st);
    // CI-04: escaped: true means phase was restored, keep looping — don't declare a winner
    if (crisisResult?.winner && crisisResult?.kimarite) {
      return { winner: crisisResult.winner, kimarite: crisisResult.kimarite };
    }
  }

  // MI-04: Timeout — most stable rikishi wins (smallest cogOffset relative to footSpread)
  const eastInstability = Math.abs(st.east.cogOffset) / Math.max(0.01, st.east.footSpread);
  const westInstability = Math.abs(st.west.cogOffset) / Math.max(0.01, st.west.footSpread);
  const winner: Side = eastInstability <= westInstability ? "east" : "west";

  // Timeout kimarite based on whether grip was involved
  const hadBelt =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle");
  const kimarite: KimariteId = hadBelt ? "yorikiri" : "oshidashi";

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
  kimarite: KimariteId
): BoutResult {
  const duration = Math.max(1, st.tick * 2);

  // MI-03: Derive stance from actual phase at resolution
  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle") ||
    st.phase.tag === "resolved"
      ? "belt-dominant"
      : "push-dominant";

  // Upset: winner is lower ranked (higher rank number = lower rank in sumo)
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
    log: [],
    kenshoEnvelopes: 0,
  };
}

/**
 * CR-06: Build EngineSnapshot compatible with kimariteEvaluator.
 * Maps B+ spatial state back to the legacy snapshot format.
 */
function buildEngineSnapshotV2(st: EngineStateV2): EngineSnapshot {
  // Derive grapple state from belt battle if active
  const beltPhase =
    st.phase.tag === "belt_battle"
      ? st.phase
      : st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle"
        ? null // crisis — use stored grapple
        : null;

  const grappleState: GrappleState = beltPhase
    ? deriveGrappleStateFromBelt(beltPhase.state)
    : st.grappleState;

  // Update st.grappleState so subsequent snapshot reads are consistent
  st.grappleState = grappleState;

  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle")
      ? ("belt-dominant" as const)
      : ("push-dominant" as const);

  return {
    stance: resolvedStance,
    grappleState,
    // CR-06A: Clamp balance to [0, 100] — cogOffset of 10 → balance 0 (floor)
    balanceEast: Math.max(0, Math.min(100, 100 - Math.abs(st.east.cogOffset) * 10)),
    balanceWest: Math.max(0, Math.min(100, 100 - Math.abs(st.west.cogOffset) * 10)),
    position: "front",
    advantage: "none",
    winnerConsecutiveAdvantage: 0,
    loserLastActionFamily: undefined,
    finalLoserBalanceDrain: 0,
  };
}

/** Maps B+ BeltBattleState to legacy GrappleState for kimariteEvaluator compatibility. */
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

  const { winner, kimarite } = runPhaseLoop(rng, east, west, st);

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite);
  const engineSnapshot = buildEngineSnapshotV2(st);

  return { result, engineSnapshot };
}
