import type { WorldState } from "../types/world";

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
          EventBus.lifecycleEvent(w, {
            rikishiId: inductee.rikishiId,
            shikona: inductee.shikona,
            status: "hof_induction",
            reason: inductee.category,
            score: inductee.stats.yushoCount ?? 0
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

  EventBus.bashoStatus(world, {
    status: "meta_shift",
    incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
    day: newYear,
    score: hofInductees.length,
    reason: hofInductees.join("|")
  });

  subs.push("year_boundary");
}
