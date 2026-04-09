/**
 * phase06_yearly_gates.ts
 * =======================
 * Yearly boundary logic refactored into a pure pipeline phase.
 */

import type { WorldState } from "../../types/world";
import { processYearEndInduction, HOF_CATEGORY_LABELS } from "../../hallOfFame";
import * as talentpool from "../../systems/generation/TalentPoolService";
import * as npcAI from "../../npcAI";

import { BardEngine } from "../../narrative/BardEngine";
import { rngFromSeed } from "../../rng";

export function phase06_yearly_gates(world: WorldState): WorldState {
  const boundaries = (world as any).transientContext?.boundaries;
  if (!boundaries?.yearBoundary) return world;

  // Clone to avoid mutation
  const nextWorld = structuredClone(world);
  const newYear = nextWorld.calendar.year;
  nextWorld.year = newYear;

  // 1. Hall of Fame Inductions
  const inductees = processYearEndInduction(nextWorld);
  const hofInductees = inductees.map((i) => i.shikona);

  for (const inductee of inductees) {
    const catLabel = HOF_CATEGORY_LABELS[inductee.category]?.name || inductee.category;
    EventBus.lifecycleEvent(nextWorld, {
      rikishiId: inductee.rikishiId,
      shikona: inductee.shikona,
      status: "hof_induction",
      reason: inductee.category,
      score: inductee.stats.yushoCount ?? 0
    });
  }

  // 2. Talent Pool Yearly Refresh
  if (talentpool.tickYear) talentpool.tickYear(nextWorld);

  // 3. NPC Yearly Logic
  if (npcAI.tickYear) npcAI.tickYear(nextWorld);

  // 4. Staff Yearly Aging
  // Note: We use the local aging logic to keep it deterministic in the pipeline
  if (nextWorld.staff) {
    for (const staff of nextWorld.staff.values()) {
      staff.age += 1;
      staff.yearsAtBeya += 1;
      // Phase transitions
      if (staff.careerPhase === "apprentice" && staff.age >= 30) staff.careerPhase = "established";
      else if (staff.careerPhase === "established" && staff.age >= 45) staff.careerPhase = "senior";
      else if (staff.careerPhase === "senior" && staff.age >= 55) staff.careerPhase = "declining";
      else if (staff.careerPhase === "declining" && staff.age >= 65) staff.careerPhase = "retired";
    }
  }

  // 5. Logging & Era Check
  const isDecadeBoundary = newYear % 10 === 0;
  EventBus.bashoStatus(nextWorld, {
    status: "meta_shift",
    incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
    day: newYear,
    score: hofInductees.length,
    reason: hofInductees.length > 0 ? hofInductees.join("|") : "None"
  });

  return nextWorld;
}
