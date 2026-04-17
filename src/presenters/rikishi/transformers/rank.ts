/**
 * Rank Transformer
 * ================
 * Transforms rikishi rank and division fields.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import { BardEngine } from "../../../engine/narrative/BardEngine";
import type { RikishiRankDTO, RikishiStyleDTO } from "../types";

/**
 * Transform rank-related fields.
 */
export function toRankDTO(r: Rikishi): RikishiRankDTO {
  const rankEntry = BardEngine.getRegistryEntry("ranks", r.rank);
  const rankLabel = rankEntry?.label ?? r.rank;

  return {
    rank: r.rank,
    rankLabel,
    rankNumber: r.rankNumber ?? 1,
    division: r.division,
    side: r.side,
    isYokozuna: r.rank === "yokozuna",
  };
}

/**
 * Transform style and archetype fields.
 */
export function toStyleDTO(r: Rikishi): RikishiStyleDTO {
  const styleEntry = BardEngine.getRegistryEntry("styles", r.style);
  const styleName = styleEntry?.label ?? r.style;

  const combatArchetype = r.combatProfile?.archetype ?? r.archetype;
  const archEntry = BardEngine.getRegistryEntry("archetypes", combatArchetype);
  const archetypeName = archEntry?.label ?? combatArchetype;

  return {
    style: r.style,
    styleName,
    archetypeName,
    preferredGrip: r.combatProfile?.preferredGrip ?? "none",
    preferredGripDepth: r.combatProfile?.preferredGripDepth ?? "standard",
  };
}
