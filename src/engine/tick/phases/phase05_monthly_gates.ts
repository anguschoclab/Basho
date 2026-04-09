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
  EventBus.bashoStatus(nextWorld, {
    status: "meta_shift",
    incident: "monthly_boundary",
    day: nextWorld.calendar.month,
    score: nextWorld.calendar.year
  });

  return nextWorld;
}
