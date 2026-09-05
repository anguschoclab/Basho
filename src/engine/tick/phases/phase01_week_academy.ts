/**
 * phase01_week_academy.ts — Pipeline Phase: Youth Academy Weekly Development.
 *
 * Calls applyWeeklyDevelopment for each heya that has a youth academy.
 * Runs during the off-season weekly pipeline.
 */
import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { applyWeeklyDevelopment, getYouthAcademy } from "../../systems/recruitment/YouthAcademyService";

export function phase01_week_academy(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_academy");

  for (const heya of world.heyas.values()) {
    const academy = getYouthAcademy(heya);
    if (!academy || academy.prospects.length === 0) continue;

    const impact = applyWeeklyDevelopment(world, heya.id);
    builder.merge(impact);
  }

  return builder.build();
}
