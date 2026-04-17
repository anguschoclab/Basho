/**
 * Visual Transformer
 * ==================
 * Transforms avatar, kesho-mawashi, and visual customization.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { WorldState } from "../../../engine/types/world";
import type { RikishiVisualDTO, RikishiH2HDTO } from "../types";

/**
 * Transform visual/appearance fields.
 */
export function toVisualDTO(r: Rikishi, world: WorldState): RikishiVisualDTO {
  return {
    avatarConfig: r.avatarConfig,
    keshoMawashi: world.customKeshoConfigs?.[r.id]
      ? ({
          ...r.keshoMawashi,
          ...world.customKeshoConfigs[r.id],
        } as RikishiVisualDTO["keshoMawashi"])
      : r.keshoMawashi,
    yokozunaTsuna: r.yokozunaTsuna,
    hasKeshoMawashi: !!r.keshoMawashi,
  };
}

/**
 * Transform H2H records.
 */
export function toH2HDTO(r: Rikishi): RikishiH2HDTO {
  return {
    h2h: r.h2h as RikishiH2HDTO["h2h"],
  };
}
