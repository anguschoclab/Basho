import type { WorldState } from "@/engine/types/world";
import type { NarrativeContext } from "@/engine/types/events";
import type { Id } from "@/engine/types/common";
import { logBardEvent } from "@/engine/events/helpers";

/**
 * Creates a financial alert event for a heya.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param ctx - Narrative context containing financial incident details
 * @returns The logged engine event
 */
export function financialAlert(world: WorldState, heyaId: Id, ctx: NarrativeContext) {
  return logBardEvent(world, {
    salt: `finance-${heyaId}-${ctx.incident}`,
    ctx: { heyaId, ...ctx },
    titlePath: "events.economy.title",
    summaryPath: "events.economy.summary",
    event: {
      type: "FINANCIAL_ALERT",
      category: "economy",
      importance: ctx.incident === "insolvency" ? "headline" : "major",
      scope: "heya",
      heyaId,
      tags: ["economy", ctx.incident as string],
    },
  });
}

/**
 * Creates a monthly financial report event.
 * @param world - Current world state
 * @param data - Narrative context containing financial summary
 * @returns The logged engine event
 */
export function monthlyFinanceReport(world: WorldState, data: NarrativeContext) {
  return logBardEvent(world, {
    salt: `finance-tick-${data.heya}`,
    ctx: data,
    titlePath: "events.economy.title",
    summaryPath: "events.economy.market_shifts",
    summaryFirst: true,
    event: {
      type: "MONTHLY_FINANCE_REPORT",
      category: "economy",
      phase: "monthly",
      importance: "notable",
      scope: "heya",
      heyaId: data.heyaId,
      tags: ["economy", "finance"],
    },
  });
}

/**
 * Creates an event for a financial action (loan or market activity).
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param data - Narrative context containing financial details
 * @param type - Type of action ("loan" or "market")
 * @returns The logged engine event
 */
export function financialAction(
  world: WorldState,
  heyaId: Id,
  data: NarrativeContext,
  type: "loan" | "market"
) {
  return logBardEvent(world, {
    salt: `finance-${type}-${heyaId}`,
    ctx: { heyaId, ...data },
    titlePath: `events.economy.${type}_title`,
    summaryPath: `events.economy.${type}_summary`,
    event: {
      type: "FINANCIAL_ALERT",
      category: "economy",
      importance: "notable",
      scope: "heya",
      heyaId,
      tags: ["economy", type],
    },
  });
}
