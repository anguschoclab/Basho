/**
 * phase_pre_basho_schedule.ts
 * ============================
 * Pipeline Phase — Generate Day 1-2 schedules 2 days before tournament starts.
 * This implements real-life torikumi announcement timing where early matches are announced in advance.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import * as schedule from "../../schedule";
import type { Division } from "../../types/banzuke";

/**
 * Generate Day 1-2 schedules during pre-basho phase.
 * In real sumo, Day 1-2 matches are announced 2 days before the basho starts.
 */
export function phase_pre_basho_schedule(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase_pre_basho_schedule");

  // Only generate schedules during pre_basho phase
  if (world.cyclePhase !== "pre_basho") {
    return builder.build();
  }

  // Check if schedules already generated
  if (world._preGeneratedSchedules) {
    return builder.build();
  }

  // Check if we're 2 days before basho starts (interimDaysRemaining <= 2)
  const daysUntilBasho = world._interimDaysRemaining ?? 0;
  if (daysUntilBasho > 2) {
    return builder.build();
  }

  // Initialize basho if not already done
  if (!world.currentBasho) {
    return builder.build();
  }

  const basho = world.currentBasho;
  const divisions: Division[] = [
    "makuuchi",
    "juryo",
    "makushita",
    "sandanme",
    "jonidan",
    "jonokuchi",
  ];

  // Generate Day 1 and Day 2 schedules
  const day1Schedules: any[] = [];
  const day2Schedules: any[] = [];

  for (const division of divisions) {
    // Generate Day 1 schedule
    const day1Result = schedule.scheduleDivisionDay({
      world,
      basho,
      division,
      day: 1,
      seed: `${world.seed}-day1-${division}`,
    });
    day1Schedules.push(...day1Result.scheduled);

    // Generate Day 2 schedule
    const day2Result = schedule.scheduleDivisionDay({
      world,
      basho,
      division,
      day: 2,
      seed: `${world.seed}-day2-${division}`,
    });
    day2Schedules.push(...day2Result.scheduled);
  }

  // Store pre-generated schedules in impact metadata (ephemeral, not persisted)
  // This ensures schedules can change if roster changes before announcement
  builder.addMetadata("preGeneratedSchedules", {
    day1: day1Schedules,
    day2: day2Schedules,
    announcedAtWeek: world.calendar.currentWeek,
  });

  return builder.build();
}
