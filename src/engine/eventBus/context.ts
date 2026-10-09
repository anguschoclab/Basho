import type { WorldState } from "../types/world";
import type { NarrativeContext } from "../types/events";
import type { Id } from "../types/common";
import { getHeya } from "../queries";

/**
 * Enriches a caller-supplied NarrativeContext with entity names resolved from
 * the world: heya/heyaname/oyakata from heyaId, and shikona/winner/loser/east/
 * west names from the corresponding rikishi ids. Guarantees that templates
 * referencing %HEYANAME%, %SHIKONA%, %WINNER%, etc. resolve instead of
 * emitting [MISSING:] markers whenever the caller only supplied ids.
 */
export function enrichEventContext(world: WorldState, ctx: NarrativeContext): NarrativeContext {
  const out: NarrativeContext = { ...ctx };

  const heyaId = (out.heyaId ?? out.stableId) as Id | undefined;
  if (heyaId) {
    const heya = getHeya(world, heyaId);
    if (heya) {
      out.heya ??= heya.name;
      out.heyaId = heyaId;
      out.stableId ??= heyaId;
      const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : null;
      if (oyakata) {
        out.oyakata ??= oyakata.name || oyakata.shikona;
        out.oyakataId ??= heya.oyakataId;
      }
    }
  }
  // %HEYANAME% mirrors %HEYA% when only the plain name was supplied.
  out.heyaname ??= out.heya;
  if (out.heya === undefined && typeof out.heyaname === "string") out.heya = out.heyaname;

  const rikishiName = (id: unknown): string | undefined =>
    typeof id === "string" ? world.rikishi.get(id)?.shikona : undefined;
  const fill = (nameKey: string, ...idKeys: string[]) => {
    if (out[nameKey] !== undefined) return;
    for (const k of idKeys) {
      const name = rikishiName(out[k]);
      if (name) {
        out[nameKey] = name;
        return;
      }
    }
  };
  fill("shikona", "rikishiId");
  fill("winner", "winnerRikishiId", "winnerId");
  fill("loser", "loserRikishiId", "loserId");
  fill("east", "eastRikishiId");
  fill("west", "westRikishiId");

  return out;
}
