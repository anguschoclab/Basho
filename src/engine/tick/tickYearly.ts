import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { autosave } from "../saveload";
import { processYearEndInduction, HOF_CATEGORY_LABELS } from "../hallOfFame";
import * as talentpool from "../talentpool";

/**
 * Safe call.
 *  * @param fn - The Fn.
 *  * @returns The result.
 */
function safeCall(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * Year boundary tick — Constitution A3.5.
 * HoF eligibility, era labels, annual financial summary.
 */
export function tickYearBoundary(world: WorldState, subs: string[]): void {
  const newYear = world.calendar.year;
  world.year = newYear;

  // 1. Hall of Fame induction pipeline (deterministic, from immutable history)
  let hofInductees: string[] = [];
  safeCall(() => {
    const inductees = processYearEndInduction(world);
    hofInductees = inductees.map((i) => i.shikona);

    // Log each induction as an event
    for (const inductee of inductees) {
      const catLabel = HOF_CATEGORY_LABELS[inductee.category]?.name || inductee.category;
      logEngineEvent(world, {
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
  }) && subs.push("hall_of_fame");

  // 2. Era label check (every 10 years)
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

  // 3. Talent pool yearly refresh
  safeCall(() => { talentpool.tickYear(world); });

  subs.push("year_boundary");

  // Autosave at year boundary
  safeCall(() => { autosave(world); });
}
