/**
 * factions.ts — WS5 ichimon coordination (canon §16-adjacent faction depth).
 *
 * Each ichimon with a leader (leaguePerception.ichimonLeaders: the member
 * heya with most political capital) elects a league-visible posture weekly:
 *   - consolidating        — the leader is fragile; pull inward.
 *   - coordinated_pressure — the leader is dominant; squeeze the strongest
 *                            non-member heya (the player's stable included).
 *   - expansionist         — middle ground; grow.
 * Member heyas get a bounded plan-score alignment bonus — a tilt, never a
 * mandate.
 */

import type { WorldState } from "../types/world";
import type { IchimonName, FactionPosture } from "../types/economy";
import type { LeaguePerception } from "../ai/types";
import { stableSort } from "../utils/sort";

/**
 * Pick the strongest heya NOT in this ichimon — the pressure target. Strength
 * is measured by banded, visible signals only: prestige band + reputation +
 * political capital ranking.
 */
function strongestOutsider(world: WorldState, ichimon: IchimonName): string | undefined {
  const scored: { id: string; score: number }[] = [];
  for (const heya of world.heyas.values()) {
    if (heya.ichimon === ichimon) continue;
    const score = (heya.prestige ?? heya.reputation ?? 0) + (heya.politicalCapital ?? 0) * 0.5;
    scored.push({ id: heya.id, score });
  }
  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id)));
  return scored[0]?.id;
}

/** Deterministic weekly posture election from visible leader state. */
export function electFactionPostures(
  world: WorldState,
  league: LeaguePerception
): Partial<Record<IchimonName, FactionPosture>> {
  const out: Partial<Record<IchimonName, FactionPosture>> = {};
  const leaders = league.ichimonLeaders ?? {};
  const week = world.week ?? world.calendar?.currentWeek ?? 0;

  for (const ichimon of stableSort(Object.keys(leaders), (x) => x) as IchimonName[]) {
    const leader = leaders[ichimon];
    const leaderHeya = leader ? world.heyas.get(leader.heyaId) : undefined;
    if (!leaderHeya) continue;

    const fragile = leaderHeya.runwayBand === "desperate" || leaderHeya.runwayBand === "critical";
    const dominant = leader?.capitalBand === "dominant";

    const posture: FactionPosture["posture"] = fragile
      ? "consolidating"
      : dominant
        ? "coordinated_pressure"
        : "expansionist";

    out[ichimon] = {
      posture,
      targetHeyaId:
        posture === "coordinated_pressure" ? strongestOutsider(world, ichimon) : undefined,
      setWeek: week,
    };
  }
  return out;
}

/**
 * Bounded plan-score bonus for a member heya aligned with its ichimon's
 * posture. Returns 0 for non-members, missing postures, or plans that scored
 * nothing on their own merits.
 */
export function factionPlanBonus(
  world: WorldState,
  heyaId: string,
  planId: string,
  baseScore: number
): number {
  if (baseScore <= 0) return 0;
  const heya = world.heyas.get(heyaId);
  const ichimon = heya?.ichimon;
  if (!ichimon) return 0;
  const posture = world.factionPostures?.[ichimon]?.posture;
  if (!posture) return 0;

  const aligned =
    posture === "coordinated_pressure"
      ? planId === "faction_ascension" || planId === "rivalry_suppression"
      : posture === "consolidating"
        ? planId === "financial_consolidation" || planId === "talent_pipeline"
        : planId === "recruitment_blitz" || planId === "faction_ascension";

  return aligned ? 6 : 0;
}
