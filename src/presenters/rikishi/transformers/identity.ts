/**
 * Identity Transformer
 * ====================
 * Transforms rikishi identity fields (name, heya, age, etc.)
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { RikishiIdentityDTO } from "@/presenters/rikishi/types";

/**
 * Transform rikishi identity fields.
 */
export function toIdentityDTO(r: Rikishi, world: WorldState): RikishiIdentityDTO {
  const heya = world.heyas.get(r.heyaId);
  const age = rikishiAge(r, world);

  return {
    id: r.id,
    shikona: r.shikona,
    realName: r.realName ?? r.shikona,
    heyaId: r.heyaId,
    heyaName: heya?.name ?? "Unknown",
    isPlayerOwned: r.heyaId === world.playerHeyaId,
    age,
    debutYear: r.debutYear,
    yearsActive: r.debutYear !== undefined ? world.year - r.debutYear : undefined,
    nationality: r.nationality,
    origin: r.origin ?? r.nationality,
    height: r.height,
    weight: r.weight,
  };
}

/**
 * Canonical world-age: `world.year - birthYear`, or 0 when no world is
 * supplied (the optional-world fallback used by the DTO transforms). Sites
 * with different missing-data semantics (e.g. `birthYear ?? year - 25`)
 * keep their own logic — this helper is only for the world-optional shape.
 */
export function rikishiAge(r: Rikishi, world?: WorldState): number {
  return world ? world.year - r.birthYear : 0;
}
