import type { Rikishi } from "../../types/rikishi";
import type { BoutResult, BoutLogEntry } from "../../types/basho";
import type { Side } from "../../types/banzuke";
import type { KimariteId } from "../../types/combat";
import {
  DURATION_MIN_SECONDS,
  CLOCK_MULTIPLIER,
  EXCITEMENT_TICK_DIVISOR,
  EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS,
} from "../../../constants/engine/physics";
import type { EngineStateV2 } from "../../types/combat-spatial";
import type { BoutContext } from "../boutUtils";
import type { CombatArchetype, TacticalFamily } from "../../types/combat";
import { getKimarite } from "../../kimarite";

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

  // Stance follows the battle the bout actually lived in — for tachiai-resolved
  // (henka) finishes there is no battle phase, so derive it from the winning
  // technique's family instead of defaulting to belt.
  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle")
      ? "belt-dominant"
      : st.phase.tag === "resolved"
        ? getKimarite(kimarite)?.tacticalFamily === "belt"
          ? "belt-dominant"
          : "push-dominant"
        : "push-dominant";

  const winnerRikishi = winner === "east" ? east : west;
  const loserRikishi = winner === "east" ? west : east;
  const winnerRankNum = winnerRikishi.rankNumber ?? 99;
  const loserRankNum = loserRikishi.rankNumber ?? 99;
  const upset = winnerRankNum > loserRankNum;

  // Detect mono-ii trigger: close bout with edge crisis controversy or shini-tai
  const monoii = boutLog.some(
    (e) =>
      (e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.controversial === true) ||
      (e.data as Record<string, unknown>)?.shinitai === true
  );

  // Archetype matchup data
  // A counter "activates" when a side's counterFamily — the tactical family it
  // counters most effectively — matches the opponent's dominant family.
  const dominantFamily = (r: Rikishi): TacticalFamily => {
    const prefs = r.combatProfile?.familyPreferences;
    if (!prefs) return "push";
    return (Object.entries(prefs) as [TacticalFamily, number][]).sort(
      (a, b) => b[1] - a[1]
    )[0][0];
  };
  const eastDominant = dominantFamily(east);
  const westDominant = dominantFamily(west);
  const eastArchetype: CombatArchetype = east.combatProfile.archetype;
  const westArchetype: CombatArchetype = west.combatProfile.archetype;
  const counterActivated =
    east.combatProfile.counterFamily === westDominant ||
    west.combatProfile.counterFamily === eastDominant;

  return {
    boutId: bout.id,
    day: bout.day,
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
