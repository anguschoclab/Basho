/**
 * Identity Transformer
 * ====================
 * Transforms rikishi identity fields (name, heya, age, etc.)
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { WorldState } from "../../../engine/types/world";
import type { RikishiIdentityDTO } from "../types";

/**
 * Transform rikishi identity fields.
 */
export function toIdentityDTO(r: Rikishi, world: WorldState): RikishiIdentityDTO {
  const heya = world.heyas.get(r.heyaId);
  const age = world.year - r.birthYear;

  return {
    id: r.id,
    shikona: r.shikona,
    realName: r.realName ?? r.shikona,
    heyaId: r.heyaId,
    heyaName: heya?.name ?? "Unknown",
    isPlayerOwned: heya?.isPlayerOwned ?? false,
    age,
    nationality: r.nationality,
    origin: r.origin ?? r.nationality,
    height: r.height,
    weight: r.weight,
  };
}
