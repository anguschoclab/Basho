/**
 * ForeignSlotPolicy.ts — WS6 foreign-slot intelligence (canon §5, §9.3).
 *
 * The foreign slot is consumed ONLY by rikishi without Japanese citizenship
 * (§5.1–5.2). Dual citizens — rare foreign-born recruits holding a Japanese
 * passport — never consume it (§5.3) and are always recruitable (§5.4).
 *
 * NPC policy layer:
 *   - `candidateConsumesForeignSlot` — candidate-side slot check.
 *   - `foreignSlotOccupied` — heya-side slot check (roster + signed-pending).
 *   - `foreignSlotBidAggression` — persona multiplier: bold, ambitious
 *     managers and "Foreign Talent Believer"s pursue foreign talent harder.
 *   - `foreignRetentionMultiplier` — §9.3 sunk-cost reluctance: foreign-slot
 *     rikishi are held measurably longer than equivalent natives.
 */
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import {
  getForeignCountsByHeya,
  candidateConsumesForeignSlot,
} from "@/engine/generation/talentPoolReads";
import {
  FOREIGN_SLOT_BASE_AGGRESSION,
  FOREIGN_SLOT_AGGRESSION_TRAIT_WEIGHT,
  FOREIGN_SLOT_BELIEVER_QUIRK_BONUS,
  FOREIGN_SUNK_COST_RETENTION_MULT,
  FOREIGN_BID_BLOCKING_QUIRKS,
  FOREIGN_BID_TAPER_START_AGE,
  FOREIGN_BID_TAPER_END_AGE,
} from "@/constants/engine/recruitment";

export { candidateConsumesForeignSlot };

/**
 * Whether the heya's single foreign slot is currently spoken for — counting
 * rostered foreign-slot rikishi (the slot binds at debut citizenship;
 * post-debut naturalization does NOT free it) plus foreign candidates
 * already signed but not yet materialized.
 */
export function foreignSlotOccupied(world: WorldState, heyaId: Id): boolean {
  return (getForeignCountsByHeya(world).get(heyaId) ?? 0) >= 1;
}

/**
 * How hard this oyakata chases foreign talent — a multiplier on the foreign
 * bid. >1 for bold/ambitious personas and Foreign Talent Believers; <1 for
 * conservative stables that treat the slot as a last resort.
 */
export function foreignSlotBidAggression(oyakata: Oyakata): number {
  // Domestic-only pipelines: these oyakata never take a foreigner — the
  // 0.4 trait floor must not rescue them.
  if (FOREIGN_BID_BLOCKING_QUIRKS.some((q) => oyakata.quirks?.includes(q))) return 0;
  // Late-tenure taper: no new foreign pipeline opens near retirement.
  const age = oyakata.age ?? 50;
  if (age >= FOREIGN_BID_TAPER_END_AGE) return 0;
  const t = oyakata.traits;
  const traitEdge = (t.risk + t.ambition - 100) * FOREIGN_SLOT_AGGRESSION_TRAIT_WEIGHT;
  const quirkBonus = oyakata.quirks?.includes("Foreign Talent Believer")
    ? FOREIGN_SLOT_BELIEVER_QUIRK_BONUS
    : 0;
  const base = Math.max(0.4, Math.min(1.5, FOREIGN_SLOT_BASE_AGGRESSION + traitEdge + quirkBonus));
  if (age >= FOREIGN_BID_TAPER_START_AGE) {
    return (
      base *
      (1 - (age - FOREIGN_BID_TAPER_START_AGE) / (FOREIGN_BID_TAPER_END_AGE - FOREIGN_BID_TAPER_START_AGE))
    );
  }
  return base;
}

/**
 * §9.3 — sunk-cost retention: foreign-slot rikishi resist forced release.
 * Returns the factor applied to a rikishi's retention score in
 * retirement/release decisions; >1 means "holds on longer".
 */
export function foreignRetentionMultiplier(
  rikishi: Rikishi,
  _oyakata: Oyakata,
  currentYear: number
): number {
  return countsAsForeign(rikishi, currentYear) ? FOREIGN_SUNK_COST_RETENTION_MULT : 1;
}
