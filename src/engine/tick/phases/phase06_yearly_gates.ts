/**
 * phase06_yearly_gates.ts
 * =======================
 * Yearly boundary logic refactored into a pure pipeline phase.
 */

import type { WorldState } from "../../types/world";
import { processYearEndInduction, HOF_CATEGORY_LABELS } from "../../hallOfFame";
import * as talentpool from "../../systems/generation/TalentPoolService";
import * as npcAI from "../../npcAI";
import { logEngineEvent } from "../../events";
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
    const hofRng = rngFromSeed(`hof-${inductee.rikishiId}-${newYear}`, "narrative", "event");
    const hofSummary = BardEngine.resolve(hofRng, "events.milestone.hof_induction", { 
      shikona: inductee.shikona, 
      category: catLabel 
    }).text;
    
    logEngineEvent(nextWorld, {
      type: "HOF_INDUCTION",
      category: "milestone",
      importance: "headline",
      scope: "world",
      rikishiId: inductee.rikishiId,
      title: `Hall of Fame: ${inductee.shikona}`,
      summary: hofSummary,
      data: {
        category: inductee.category,
        year: newYear,
        yushoCount: inductee.stats.yushoCount ?? 0,
        consecutiveBasho: inductee.stats.consecutiveBasho ?? 0,
        ginoShoCount: inductee.stats.ginoShoCount ?? 0,
      },
      tags: ["hall_of_fame", "milestone"]
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
  const yearRng = rngFromSeed(`year-boundary-${newYear}`, "narrative", "event");
  const yearPath = isDecadeBoundary ? "events.milestone.decade_boundary" : "events.milestone.year_boundary";
  
  const yearSummary = BardEngine.resolve(yearRng, yearPath, { 
    year: newYear,
    hof_count: hofInductees.length,
    hof_list: hofInductees.length > 0 ? hofInductees.join(", ") : "None"
  }).text;

  logEngineEvent(nextWorld, {
    type: "YEAR_BOUNDARY",
    category: "milestone",
    importance: isDecadeBoundary ? "headline" : "major",
    scope: "world",
    title: BardEngine.resolve(yearRng, "events.titles.YEAR_BOUNDARY", { YEAR: newYear }).text,
    summary: yearSummary,
    data: { year: newYear, hofInductees: hofInductees.length, isDecade: isDecadeBoundary },
    tags: ["boundary", "year"]
  });

  return nextWorld;
}
