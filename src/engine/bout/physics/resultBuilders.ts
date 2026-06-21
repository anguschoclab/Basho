import type { Rikishi } from "../../types/rikishi";
import type { BoutResult, BoutLogEntry } from "../../types/basho";
import type { Side } from "../../types/banzuke";
import type { KimariteId, GrappleState, HandPosition } from "../../types/combat";
import {
  DURATION_MIN_SECONDS,
  CLOCK_MULTIPLIER,
  EXCITEMENT_TICK_DIVISOR,
  EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS,
  POSITION_REAR_THRESHOLD,
  POSITION_LATERAL_THRESHOLD,
  ADVANTAGE_THRESHOLD_DIFFERENTIAL,
  BALANCE_CALCULATION_MULTIPLIER,
} from "../../../constants/engine/physics";
import type { EngineStateV2, EngineSnapshot, BeltBattleState } from "../../types/combat-spatial";
import type { BoutContext } from "../boutUtils";

export function buildBoutResultV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  winner: Side,
  kimarite: KimariteId,
  boutLog: BoutLogEntry[]
): BoutResult {
  const duration = Math.max(DURATION_MIN_SECONDS, st.tick * CLOCK_MULTIPLIER);

  // Compute composite excitement score:
  //   - Bout length: up to 40 points (120 ticks max → ~40)
  //   - Each tawara escape: +20 points (dramatic near-defeats)
  //   - Grip reversals (inside→outside swaps in log): +10 points each
  const edgeCrisisEscapes = boutLog.filter(
    (e) => e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.escaped === true
  ).length;
  const excitementScore = Math.min(
    100,
    Math.round(
      st.tick / EXCITEMENT_TICK_DIVISOR + edgeCrisisEscapes * EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS
    )
  );

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
    excitementScore,
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
export function buildEngineSnapshotV2(st: EngineStateV2, winner: Side): EngineSnapshot {
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
    avgFoot > POSITION_REAR_THRESHOLD
      ? "rear"
      : avgFoot > POSITION_LATERAL_THRESHOLD
        ? "lateral"
        : "front";

  // Derive advantage from CoG stability differential
  const advantage: "none" | "east" | "west" =
    st.east.cogOffset < st.west.cogOffset - ADVANTAGE_THRESHOLD_DIFFERENTIAL
      ? "east"
      : st.west.cogOffset < st.east.cogOffset - ADVANTAGE_THRESHOLD_DIFFERENTIAL
        ? "west"
        : "none";

  return {
    stance: resolvedStance,
    grappleState,
    balanceEast: Math.max(
      0,
      Math.min(100, 100 - Math.abs(st.east.cogOffset) * BALANCE_CALCULATION_MULTIPLIER)
    ),
    balanceWest: Math.max(
      0,
      Math.min(100, 100 - Math.abs(st.west.cogOffset) * BALANCE_CALCULATION_MULTIPLIER)
    ),
    position,
    advantage,
    winnerConsecutiveAdvantage: st.tick,
    loserLastActionFamily: undefined,
    finalLoserBalanceDrain:
      winner === "east"
        ? Math.abs(st.west.cogOffset) * BALANCE_CALCULATION_MULTIPLIER
        : Math.abs(st.east.cogOffset) * BALANCE_CALCULATION_MULTIPLIER,
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
