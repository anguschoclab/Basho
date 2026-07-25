/**
 * Rank Transformer
 * ================
 * Transforms rikishi rank and division fields.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import { resolveRegistryLabel, resolveRegistryLabelJa } from "../../uiUtilities";
import type { RikishiRankDTO, RikishiStyleDTO } from "../types";
import type { CombatArchetype } from "../../../engine/types/combat";

/**
 * Transform rank-related fields.
 */
export function toRankDTO(r: Rikishi): RikishiRankDTO {
  return {
    rank: r.rank,
    rankLabel: resolveRegistryLabel("ranks", r.rank),
    rankLabelJa: resolveRegistryLabelJa("ranks", r.rank),
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
  const combatArchetype: CombatArchetype = r.combatProfile?.archetype ?? "hybrid";

  return {
    style: r.style,
    styleName: resolveRegistryLabel("styles", r.style),
    archetypeName: resolveRegistryLabel("archetypes", combatArchetype),
    combatArchetype,
    preferredGrip: r.combatProfile?.preferredGrip ?? "none",
    preferredGripDepth: r.combatProfile?.preferredGripDepth ?? "standard",
  };
}
