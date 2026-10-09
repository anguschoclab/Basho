import type { WorldState } from "../types/world";
import type { NarrativeContext } from "../types/events";
import type { Id } from "../types/common";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import { createRngForEvent } from "../eventHelpers";
import { logEngineEvent } from "../events";
import { enrichEventContext } from "./context";

/**
 * Creates a financial alert event for a heya.
 * @param world - Current world state
 * @param heyaId - ID of the heya
 * @param ctx - Narrative context containing financial incident details
 * @returns The logged engine event
 */
export function financialAlert(world: WorldState, heyaId: Id, ctx: NarrativeContext) {
  ctx = enrichEventContext(world, { heyaId, ...ctx });
  const rng = createRngForEvent(world, `finance-${heyaId}-${ctx.incident}`);
  const titleRes = BardEngine.resolve(rng, "events.economy.title", ctx);
  const summaryRes = BardEngine.resolve(rng, "events.economy.summary", ctx);

  return logEngineEvent(world, {
    type: "FINANCIAL_ALERT",
    category: "economy",
    importance: ctx.incident === "insolvency" ? "headline" : "major",
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data: ctx,
    tags: ["economy", ctx.incident as string],
  });
}

/**
 * Creates a monthly financial report event.
 * @param world - Current world state
 * @param data - Narrative context containing financial summary
 * @returns The logged engine event
 */
export function monthlyFinanceReport(world: WorldState, data: NarrativeContext) {
  data = enrichEventContext(world, data);
  const rng = createRngForEvent(world, `finance-tick-${data.heya}`);
  const res = BardEngine.resolve(rng, "events.economy.market_shifts", data);
  const titleRes = BardEngine.resolve(rng, "events.economy.title", data);

  return logEngineEvent(world, {
    type: "MONTHLY_FINANCE_REPORT",
    category: "economy",
    phase: "monthly",
    importance: "notable",
    scope: "heya",
    heyaId: data.heyaId,
    title: titleRes.text,
    summary: res.text,
    data,
    tags: ["economy", "finance"],
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
  data = enrichEventContext(world, { heyaId, ...data });
  const rng = rngFromSeed(`finance-${type}-${heyaId}`, "narrative", "event");
  const titleRes = BardEngine.resolve(rng, `events.economy.${type}_title`, data);
  const summaryRes = BardEngine.resolve(rng, `events.economy.${type}_summary`, data);

  return logEngineEvent(world, {
    type: "FINANCIAL_ALERT",
    category: "economy",
    importance: "notable",
    scope: "heya",
    heyaId,
    title: titleRes.text,
    summary: summaryRes.text,
    data,
    tags: ["economy", type],
  });
}
