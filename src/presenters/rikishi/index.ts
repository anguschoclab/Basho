/**
 * Rikishi Presenter Module
 * =======================
 * Decomposed presenter for transforming Rikishi engine entities to UI DTOs.
 *
 * This module replaces the monolithic rikishiUI.ts with focused, single-responsibility
 * transformers that can be composed as needed.
 */

// ============================================================================
// Types
// ============================================================================
export type {
  // Core DTOs
  RikishiIdentityDTO,
  RikishiRankDTO,
  RikishiStyleDTO,
  RikishiStatusDTO,
  RikishiBandsDTO,
  RikishiCareerDTO,
  RikishiPerceivedStatsDTO,
  RikishiDescriptorDTO,
  RikishiRivalsDTO,
  RikishiKimariteDTO,
  RikishiPersonalityDTO,
  RikishiAchievementsDTO,
  RikishiEconomicsDTO,
  RikishiVisualDTO,
  RikishiCareerDataDTO,
  RikishiLineageDTO,
  RikishiH2HDTO,
  UIRivalEntry,
  // Composite
  UIRikishiDTO,
  // Legacy compatibility
  UIRikishi,
  UIRosterEntry,
  UIRankDelta,
} from "@/presenters/rikishi/types";

// ============================================================================
// Transformers
// ============================================================================
export * from "@/presenters/rikishi/transformers/index";

// Re-export projectRosterEntry at top level for convenience
export { projectRosterEntry } from "@/presenters/rikishi/transformers/roster";

// ============================================================================
// Main Composition Function
// ============================================================================

import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import { SeededRNG } from "@/engine/core/rng";
import type { UIRikishiDTO } from "@/presenters/rikishi/types";

import {
  toIdentityDTO,
  toRankDTO,
  toStyleDTO,
  toStatusDTO,
  toBandsDTO,
  toPerceivedStatsDTO,
  toDescriptorDTO,
  toCareerDTO,
  toKimariteDTO,
  calculateTopRivals,
  toPersonalityDTO,
  toAchievementsDTO,
  toEconomicsDTO,
  toVisualDTO,
  toCareerDataDTO,
  toLineageDTO,
  toH2HDTO,
  toKihakuDTO,
} from "@/presenters/rikishi/transformers/index";

/**
 * Transform a Rikishi engine entity to a complete UI DTO.
 * This is the main entry point - it composes all specialized transformers.
 *
 * @param r - The rikishi entity from engine
 * @param world - The current world state
 * @returns Complete UI-ready rikishi DTO
 *
 * @example
 * ```typescript
 * const uiRikishi = projectRikishi(rikishi, world);
 * // Or compose only what you need:
 * const identity = toIdentityDTO(rikishi, world);
 * const stats = toBandsDTO(rikishi, rng);
 * ```
 */
export function projectRikishi(r: Rikishi, world: WorldState): UIRikishiDTO {
  const rng = world.rng || new SeededRNG(world.seed || r.id);

  return {
    // Identity
    ...toIdentityDTO(r, world),

    // Rank & Style
    ...toRankDTO(r),
    ...toStyleDTO(r),

    // Status & Stats
    ...toStatusDTO(r, rng, world),
    ...toBandsDTO(r, rng, world),
    perceivedStats: toPerceivedStatsDTO(r, rng),
    ...toDescriptorDTO(r, rng, world),

    // Career
    ...toCareerDTO(r),

    // Rivals & Kimarite
    topRivals: calculateTopRivals(r, world),
    ...toKimariteDTO(r, rng),

    // Personality & Achievements
    ...toPersonalityDTO(r),
    ...toAchievementsDTO(r),

    // Economics
    ...toEconomicsDTO(r),

    // Visual
    ...toVisualDTO(r, world),

    // Career Data & Lineage
    ...toCareerDataDTO(r, world),
    ...toLineageDTO(r, world),

    // H2H
    ...toH2HDTO(r),

    // Kihaku (fighting spirit)
    ...toKihakuDTO(r),
  };
}
