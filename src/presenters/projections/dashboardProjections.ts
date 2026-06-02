// @ts-nocheck
/**
 * dashboardProjections.ts
 *
 * Projections for dashboard and banzuke data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "../../engine/types/world";
import type {
  DashboardUIDigest,
  FinancialStatus,
  BanzukeUIDigest,
  BanzukeDivisionData,
} from "../types/uiDigest";
import { queryEvents } from "../../engine/events";
import { selectTopRivals } from "../selectors";
import { getSekitoriInHeya } from "../../engine/queries";
import { buildPrevRankScores, buildBanzukeRows } from "../banzukeUI";
import { projectRosterEntry } from "../rikishiUI";
import { EntityCollection } from "../../engine/core/EntityCollection";

/**
 * Project dashboard data for the main overview.
 */
export function projectDashboardUIDigest(world: WorldState): DashboardUIDigest | null {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;

  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  const recentEvents = queryEvents(world, { limit: 5 });
  const topRivals = selectTopRivals(world).slice(0, 3);

  const deltas = world.transientContext?.deltas;
  const status: FinancialStatus["status"] =
    heya.funds > 10000000 ? "stable" : heya.funds < 0 ? "critical" : "normal";
  const finances = {
    balance: heya.funds,
    weeklyIncome: deltas?.revenue ?? 0,
    weeklyExpense: deltas?.expenses ?? 0,
    status,
  };

  return {
    heya: {
      name: heya.name,
      reputation: heya.reputation,
      prestige: heya.prestigeBand,
      funds: heya.funds,
    },
    stats: {
      rosterSize: (heya.rikishiIds || []).length,
      sekitoriCount: getSekitoriInHeya(world, playerHeyaId),
      injuredCount: EntityCollection.getHeyaRoster(world, playerHeyaId).filter((r) => r.injured).length,
    },
    recentEvents,
    topRivals,
    finances,
    currentWeek: world.week,
    currentYear: world.year,
    phase: world.cyclePhase,
  };
}

/**
 * Project banzuke and rank movement data.
 */
export function projectBanzukeUIDigest(world: WorldState): BanzukeUIDigest {
  const divisions = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"] as const;
  const history = world.history || [];

  const prevScoreMap = buildPrevRankScores(history);

  const allRikishi = EntityCollection.getActiveRikishi(world);
  const rosterEntries = allRikishi.map((r) => {
    return projectRosterEntry(r, world, prevScoreMap.get(r.id));
  });

  const dividerData: BanzukeDivisionData[] = divisions.map((div) => {
    return {
      division: div,
      rows: buildBanzukeRows(rosterEntries, div, ""),
    };
  });

  const heyaNameMap = new Map<string, string>();
  for (const h of EntityCollection.getHeyas(world)) {
    heyaNameMap.set(h.id, h.name);
  }

  return {
    year: world.year,
    basho: world.currentBashoName,
    divisions: dividerData,
    kadobanMap: world.ozekiKadoban || {},
    heyaNameMap,
    hasPrevBasho: prevScoreMap.size > 0,
  };
}
