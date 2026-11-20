import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult, BoutLogEntry } from "@/engine/types/basho";
import type { Side } from "@/engine/types/banzuke";
import type { KimariteId, DrawOutcomeType, CombatArchetype, TacticalFamily } from "@/engine/types/combat";
import {
  DURATION_MIN_SECONDS,
  CLOCK_MULTIPLIER,
  EXCITEMENT_TICK_DIVISOR,
  EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS,
} from "@/constants/engine/physics";
import { DRAW_OUTCOME_METADATA } from "@/constants/engine/bout";
import type { EngineStateV2, BeltBattleState } from "@/engine/types/combat-spatial";
import type { BoutContext } from "@/engine/bout/boutUtils";
import { getKimarite } from "@/engine/bout/kimarite/kimariteRegistry";

interface DrawBuildOpts {
  isDraw?: boolean;
  drawType?: DrawOutcomeType;
  mizuIriCount?: number;
}

/** Compute excitement score (0-100) from bout duration and log milestones. */
function computeExcitementScore(st: EngineStateV2, boutLog: BoutLogEntry[]): number {
  let edgeCrisisEscapes = 0;
  let momentumShifts = 0;
  for (const e of boutLog) {
    if (e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.escaped === true) {
      edgeCrisisEscapes++;
    } else if (e.phase === "momentum_shift") {
      momentumShifts++;
    }
  }
  return Math.min(
    100,
    Math.round(
      st.tick / EXCITEMENT_TICK_DIVISOR +
        edgeCrisisEscapes * EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS +
        momentumShifts * 5
    )
  );
}

/**
 * Assemble the final `BoutResult` from a resolved physics state.
 *
 * Derives `duration` from `st.tick` (clamped to `DURATION_MIN_SECONDS`), computes
 * the composite `excitementScore` from the bout log, and resolves kimarite
 * display metadata via `getKimarite` (or `DRAW_OUTCOME_METADATA` for draws).
 */
export function buildBoutResultV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  winner: Side,
  kimarite: KimariteId | DrawOutcomeType,
  boutLog: BoutLogEntry[],
  isTimeout: boolean = false,
  drawOpts?: DrawBuildOpts
): BoutResult {
  const duration = Math.max(DURATION_MIN_SECONDS, st.tick * CLOCK_MULTIPLIER);
  const excitementScore = computeExcitementScore(st, boutLog);

  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle")
      ? "belt-dominant"
      : st.phase.tag === "resolved"
        ? getKimarite(kimarite)?.tacticalFamily === "belt"
          ? "belt-dominant"
          : "push-dominant"
        : "push-dominant";

  const isDraw = Boolean(drawOpts?.isDraw && drawOpts?.drawType);
  const drawType = isDraw ? drawOpts?.drawType : undefined;
  const winnerRikishi = winner === "east" ? east : west;
  const loserRikishi = winner === "east" ? west : east;
  const winnerRankNum = winnerRikishi.rankNumber ?? 99;
  const loserRankNum = loserRikishi.rankNumber ?? 99;
  const upset = !isDraw && winnerRankNum > loserRankNum;

  const monoii =
    !isDraw &&
    boutLog.some(
      (e) =>
        (e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.controversial === true) ||
        (e.data as Record<string, unknown>)?.shinitai === true
    );

  const dominantFamily = (r: Rikishi): TacticalFamily => {
    const prefs = r.combatProfile?.familyPreferences;
    if (!prefs) return "push";
    return (Object.entries(prefs) as [TacticalFamily, number][]).sort((a, b) => b[1] - a[1])[0][0];
  };
  const eastDominant = dominantFamily(east);
  const westDominant = dominantFamily(west);
  const eastArchetype: CombatArchetype | undefined = east.combatProfile?.archetype;
  const westArchetype: CombatArchetype | undefined = west.combatProfile?.archetype;
  const counterActivated =
    east.combatProfile?.counterFamily === westDominant ||
    west.combatProfile?.counterFamily === eastDominant;

  const finalBelt =
    st.phase.tag === "belt_battle"
      ? st.phase.state
      : st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle"
        ? st.phase.savedBelt
        : undefined;
  const winnerGrip =
    finalBelt && !isDraw
      ? winner === "east"
        ? finalBelt.eastGripClass
        : finalBelt.westGripClass
      : undefined;
  const securedFor = (
    r: Rikishi,
    left: BeltBattleState["eastLeft"] | undefined,
    right: BeltBattleState["eastRight"] | undefined
  ): boolean | undefined => {
    const pref = r.combatProfile?.preferredGrip;
    if (!finalBelt || (pref !== "migi" && pref !== "hidari")) return undefined;
    const hand = pref === "migi" ? right : left;
    return hand?.isInside === true;
  };
  const eastSecured = securedFor(east, finalBelt?.eastLeft, finalBelt?.eastRight);
  const westSecured = securedFor(west, finalBelt?.westLeft, finalBelt?.westRight);
  const gripSecured =
    eastSecured !== undefined || westSecured !== undefined
      ? {
          ...(eastSecured !== undefined ? { east: eastSecured } : {}),
          ...(westSecured !== undefined ? { west: westSecured } : {}),
        }
      : undefined;

  return {
    boutId: bout.id,
    day: bout.day,
    winner,
    winnerRikishiId: isDraw ? "" : winnerRikishi.id,
    loserRikishiId: isDraw ? "" : loserRikishi.id,
    kimarite: drawType ?? kimarite,
    kimariteName: drawType ? DRAW_OUTCOME_METADATA[drawType].name : kimarite,
    stance: resolvedStance,
    tachiaiWinner: st.tachiaiWinner,
    duration,
    excitementScore,
    upset,
    isKinboshi: false,
    log: boutLog,
    kenshoEnvelopes: 0,
    momentumScore: st.momentumScore,
    inBoutInjury: st.inBoutInjury,
    archetypeMatchup: { eastArchetype, westArchetype, counterActivated },
    isTimeout,
    monoii,
    ...(isDraw && drawType ? { isDraw: true, drawType } : {}),
    ...(drawOpts?.mizuIriCount ? { mizuIriCount: drawOpts.mizuIriCount } : {}),
    ...(winnerGrip !== undefined ? { winnerGrip } : {}),
    ...(gripSecured !== undefined ? { gripSecured } : {}),
  };
}
