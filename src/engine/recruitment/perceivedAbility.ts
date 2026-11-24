/**
 * perceivedAbility.ts
 * ====================
 * Fog-of-war views of the 0–200 CA/PA layer (see development/caPa.ts) — the
 * rikishi-side counterpart to perceivedTalentSeed for candidates.
 *
 * WHY: the hidden `potential` block is the dynasty engine — a stable reading
 * true PA always outbids/develops optimally, which snowballs into permanent
 * dominance. Every observer — NPC agent decision AND the player's UI — sees
 * ability only through these deterministic noisy estimates keyed to the
 * observing heya. The player gets the same noisy lens an NPC does: no
 * information advantage in either direction.
 *
 *   - CA noise = the stable's scouting spread (same investment model as
 *     perceivedTalentSeed) rescaled to 0–200.
 *   - PA noise = that spread × PA_NOISE_MULT — potential is strictly harder
 *     to judge than what you can watch on the dohyo.
 *   - Own-roster rikishi perceive through OWN_ROSTER spreads — a stable
 *     watches its own wrestlers train daily; no scouting needed and no
 *     report can beat that familiarity (still not perfect).
 *
 * Pure functions of (world seed, heyaId, rikishiId): deterministic per
 * observer, different across observers.
 */
import { rngFromSeed } from "@/engine/core/rng";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import { currentAbility, potentialAbility, abilityToStars } from "@/engine/development/caPa";
import { scoutNoiseSpreadForHeya } from "@/engine/recruitment/perceivedTalent";

/** PA estimates are strictly noisier than CA — projecting growth is harder
 *  than reading current form. */
export const PA_NOISE_MULT = 1.6;

/** Spread (0–200 scale) a stable has on its OWN roster — daily keiko beats
 *  any scouting report, though even insiders misjudge ceilings. */
export const OWN_ROSTER_CA_SPREAD = 4;
export const OWN_ROSTER_PA_SPREAD = OWN_ROSTER_CA_SPREAD * PA_NOISE_MULT;

const clamp200 = (v: number) => Math.max(0, Math.min(200, v));

/** Effective CA noise spread for (observer heyaId, subject rikishi). */
function caSpread(world: WorldState, heyaId: Id, r: Rikishi, spreadOverride?: number): number {
  if (r.heyaId === heyaId) return OWN_ROSTER_CA_SPREAD;
  return (spreadOverride ?? scoutNoiseSpreadForHeya(world, heyaId)) * 2;
}

function noisyEstimate(
  heyaId: Id,
  rikishiId: Id,
  kind: "ca" | "pa",
  truth: number,
  spread: number
): number {
  const rng = rngFromSeed(`ability_${heyaId}_${rikishiId}_${kind}`, "scouting", "estimate");
  const noise = (rng.next() * 2 - 1) * spread;
  return Math.round(clamp200(truth + noise));
}

/** The observer's noisy CA estimate for a rikishi (0–200). */
export function perceivedCA(
  world: WorldState,
  heyaId: Id,
  r: Rikishi,
  spreadOverride?: number
): number {
  return noisyEstimate(heyaId, r.id, "ca", currentAbility(r), caSpread(world, heyaId, r, spreadOverride));
}

/** The observer's noisy PA estimate (0–200) — noisier than CA by design. */
export function perceivedPA(
  world: WorldState,
  heyaId: Id,
  r: Rikishi,
  spreadOverride?: number
): number {
  const spread = caSpread(world, heyaId, r, spreadOverride) * PA_NOISE_MULT;
  return noisyEstimate(heyaId, r.id, "pa", potentialAbility(r), spread);
}

export interface StarBand {
  lo: number;
  hi: number;
}

/**
 * The PA star band an observer reports: the perceived PA ± the observer's
 * PA uncertainty, each mapped to stars. Width is the honest expression of
 * scouting confidence — elite scouting narrows it, never zeroes it.
 */
export function paStarBand(world: WorldState, heyaId: Id, r: Rikishi): StarBand {
  const p = perceivedPA(world, heyaId, r);
  const uncertainty =
    (r.heyaId === heyaId ? OWN_ROSTER_CA_SPREAD : scoutNoiseSpreadForHeya(world, heyaId) * 2) *
    PA_NOISE_MULT;
  return {
    lo: abilityToStars(p - uncertainty),
    hi: abilityToStars(p + uncertainty),
  };
}

/** The observer's CA star estimate for a rikishi. */
export function caStars(world: WorldState, heyaId: Id, r: Rikishi): number {
  return abilityToStars(perceivedCA(world, heyaId, r));
}
