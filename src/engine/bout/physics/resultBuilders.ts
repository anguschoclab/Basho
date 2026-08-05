import type { Rikishi } from "../../types/rikishi";
import type { BoutResult, BoutLogEntry } from "../../types/basho";
import type { Side } from "../../types/banzuke";
import type { KimariteId, GrappleState, HandPosition } from "../../types/combat";
import {
  DURATION_MIN_SECONDS,
  CLOCK_MULTIPLIER,
  EXCITEMENT_TICK_DIVISOR,
  EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS,
} from "../../../constants/engine/physics";
import type { EngineStateV2, BeltBattleState } from "../../types/combat-spatial";
import type { BoutContext } from "../boutUtils";
import type { CombatArchetype } from "../../types/combat";

export function buildBoutResultV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  winner: Side,
  kimarite: KimariteId,
  boutLog: BoutLogEntry[],
  isTimeout: boolean = false
): BoutResult {
  const duration = Math.max(DURATION_MIN_SECONDS, st.tick * CLOCK_MULTIPLIER);

  // Compute composite excitement score:
  //   - Bout length: up to 40 points (120 ticks max → ~40)
  //   - Each tawara escape: +20 points (dramatic near-defeats)
  //   - Grip reversals (inside→outside swaps in log): +10 points each
  //   - Momentum shifts: +5 points each
  let edgeCrisisEscapes = 0;
  let momentumShifts = 0;
  for (const e of boutLog) {
    if (e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.escaped === true) {
      edgeCrisisEscapes++;
    } else if (e.phase === "momentum_shift") {
      momentumShifts++;
    }
  }
  const excitementScore = Math.min(
    100,
    Math.round(
      st.tick / EXCITEMENT_TICK_DIVISOR +
        edgeCrisisEscapes * EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS +
        momentumShifts * 5
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

  // Detect mono-ii trigger: close bout with edge crisis controversy or shini-tai
  const monoii = boutLog.some(
    (e) =>
      (e.phase === "edge_crisis" &&
        (e.data as Record<string, unknown>)?.controversial === true) ||
      (e.data as Record<string, unknown>)?.shinitai === true
  );

  // Archetype matchup data
  const eastArchetype: CombatArchetype = east.combatProfile.archetype;
  const westArchetype: CombatArchetype = west.combatProfile.archetype;
  const counterActivated =
    east.combatProfile.counterFamily === west.combatProfile.counterFamily ||
    west.combatProfile.counterFamily === east.combatProfile.counterFamily;

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
    momentumScore: st.momentumScore,
    inBoutInjury: st.inBoutInjury,
    archetypeMatchup: { eastArchetype, westArchetype, counterActivated },
    isTimeout,
    monoii,
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
