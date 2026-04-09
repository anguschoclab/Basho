/**
 * phase05_monthly_gates.ts
 * ========================
 * Monthly boundary logic refactored into a pure pipeline phase.
 */

import type { WorldState } from "../../types/world";
import { tickMonthlyEconomics, tickArchetypeDrift } from "../tickMonthly";
import * as npcAI from "../../npcAI";
import * as loans from "../../loans";
import * as facilities from "../../facilities";
import { logEngineEvent } from "../../events";
import { BardEngine } from "../../narrative/BardEngine";
import { rngFromSeed } from "../../rng";

export function phase05_monthly_gates(world: WorldState): WorldState {
  const boundaries = (world as any).transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return world;

  // Clone to avoid mutation in the sub-logic
  const nextWorld = structuredClone(world);

  // 1. Monthly Economics (Salaries, Upkeep)
  tickMonthlyEconomics(nextWorld);

  // 2. NPC Monthly Logic
  if (npcAI.tickMonthlyNPC) npcAI.tickMonthlyNPC(nextWorld);

  // 3. Loan Repayments
  if (loans.processMonthlyLoanRepayments) loans.processMonthlyLoanRepayments(nextWorld);

  // 4. Archetype Drift
  tickArchetypeDrift(nextWorld);

  // 5. Facilities Upkeep
  if (facilities.tickMonthlyFacilities) facilities.tickMonthlyFacilities(nextWorld);

  // 6. Logging
  const rng = rngFromSeed(`monthly-bound-${nextWorld.calendar.year}-${nextWorld.calendar.month}`, "narrative", "event");
  logEngineEvent(nextWorld, {
    type: "MONTHLY_BOUNDARY",
    category: "economy",
    importance: "minor",
    scope: "world",
    title: BardEngine.resolve(rng, "events.titles.MONTHLY_BOUNDARY").text,
    summary: `Monthly salaries, rent, and supporter income processed for month ${nextWorld.calendar.month}.`,
    data: { year: nextWorld.calendar.year, month: nextWorld.calendar.month },
    tags: ["economy", "boundary"]
  });

  return nextWorld;
}
