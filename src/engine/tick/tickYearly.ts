import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { processYearEndInduction, HOF_CATEGORY_LABELS } from "../hallOfFame";
import * as talentpool from "../talentpool";
import { runTickPipeline, type TickStep } from "./tickOrchestrator";

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
          logEngineEvent(w, {
            type: "HOF_INDUCTION",
            category: "milestone",
            importance: "headline",
            scope: "world",
            rikishiId: inductee.rikishiId,
            title: `Hall of Fame: ${inductee.shikona}`,
            summary: `${inductee.shikona} has been inducted into the Hall of Fame as a ${catLabel}.`,
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
  ];

  runTickPipeline(world, subs, steps, { autosave: true });

  // Era label check (every 10 years)
  const isDecadeBoundary = newYear % 10 === 0;

  logEngineEvent(world, {
    type: "YEAR_BOUNDARY",
    category: "milestone",
    importance: isDecadeBoundary ? "headline" : "major",
    scope: "world",
    title: `Year ${newYear} begins`,
    summary: isDecadeBoundary
      ? "A new decade dawns. " + (hofInductees.length > 0 ? "Hall of Fame inductees: " + hofInductees.join(", ") + "." : "No new Hall of Fame inductees this year.")
      : "The sumo world enters year " + newYear + "." + (hofInductees.length > 0 ? " HoF: " + hofInductees.join(", ") + "." : ""),
    data: { year: newYear, hofInductees: hofInductees.length, isDecade: isDecadeBoundary },
    tags: ["boundary", "year"]
  });

  subs.push("year_boundary");
}
