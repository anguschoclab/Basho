import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { processYearEndInduction, HOF_CATEGORY_LABELS } from "../hallOfFame";
import * as talentpool from "../systems/generation/TalentPoolService";
import { runTickPipeline, type TickStep } from "./tickOrchestrator";
import * as npcAI from "../npcAI";
import { BardEngine } from "../narrative/BardEngine";
import { rngFromSeed } from "../rng";

/**
 * Year boundary tick — Constitution A3.5.
 * HoF eligibility, era labels, annual financial summary.
 */
export function tickYearBoundary(world: WorldState, subs: string[]): void {
  const newYear = world.calendar.year;
  world.year = newYear;

  let hofInductees: string[] = [];

  const steps: TickStep[] = [
    {
      label: "hall_of_fame",
      run: (w) => {
        const inductees = processYearEndInduction(w);
        hofInductees = inductees.map((i) => i.shikona);

        for (const inductee of inductees) {
          const catLabel = HOF_CATEGORY_LABELS[inductee.category]?.name || inductee.category;
          const hofRng = rngFromSeed(`hof-${inductee.rikishiId}-${newYear}`, "narrative", "event");
          const hofSummary = BardEngine.resolve(hofRng, "events.milestone.hof_induction", { shikona: inductee.shikona, category: catLabel }).text;
          logEngineEvent(w, {
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
      },
    },
    { label: "talentpool_yearly", run: (w) => { talentpool.tickYear(w); } },
    { label: "npcAI_yearly", run: (w) => { npcAI.tickYear(w); } },
    { label: "staff_yearly", run: (w) => { import("../staff").then(m => m.tickStaffYear(w)); } },
  ];


  runTickPipeline(world, subs, steps, { autosave: true });

  // Era label check (every 10 years)
  const isDecadeBoundary = newYear % 10 === 0;

  const yearRng = rngFromSeed(`year-boundary-${newYear}`, "narrative", "event");
  const yearPath = isDecadeBoundary ? "events.milestone.decade_boundary" : "events.milestone.year_boundary";
  
  // Use Bard for the main year summary
  let yearSummary = BardEngine.resolve(yearRng, yearPath, { 
    year: newYear,
    hof_count: hofInductees.length,
    hof_list: hofInductees.join(", ")
  }).text;

  logEngineEvent(world, {
    type: "YEAR_BOUNDARY",
    category: "milestone",
    importance: isDecadeBoundary ? "headline" : "major",
    scope: "world",
    title: BardEngine.resolve(yearRng, "events.titles.YEAR_BOUNDARY", { YEAR: newYear }).text,
    summary: yearSummary,
    data: { year: newYear, hofInductees: hofInductees.length, isDecade: isDecadeBoundary },
    tags: ["boundary", "year"]
  });

  subs.push("year_boundary");
}
