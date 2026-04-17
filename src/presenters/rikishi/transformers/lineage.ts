/**
 * Lineage Transformer
 * ===================
 * Transforms mentor/mentee (lineage) relationships.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { WorldState } from "../../../engine/types/world";
import type { RikishiLineageDTO, RikishiCareerDataDTO } from "../types";
import {
  getCitizenshipStatus,
  yearsUntilNaturalization,
} from "../../../engine/utils/citizenshipUtils";

/**
 * Transform lineage fields.
 */
export function toLineageDTO(r: Rikishi, world: WorldState): RikishiLineageDTO {
  return {
    mentorId: r.mentorId,
    mentorName: r.mentorId ? world.rikishi.get(r.mentorId)?.shikona : undefined,
    menteeNames: r.menteeIds
      ?.map((id) => world.rikishi.get(id)?.shikona)
      .filter(Boolean) as string[],
  };
}

/**
 * Transform career data (history, milestones, citizenship).
 */
export function toCareerDataDTO(r: Rikishi, world: WorldState): RikishiCareerDataDTO {
  return {
    careerHistory: r.careerHistory || [],
    milestones: r.milestones || [],
    citizenshipStatus: getCitizenshipStatus(r, world.year),
    yearsToNaturalization: yearsUntilNaturalization(r, world.year),
    consecutiveStrongOzeki: r.consecutiveStrongOzeki ?? 0,
  };
}
