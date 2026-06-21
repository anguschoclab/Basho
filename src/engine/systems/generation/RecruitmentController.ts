/**
 * RecruitmentController — closed-loop replacement-rate controller.
 *
 * Computes the weekly global replacement gap from the active population vs the
 * equilibrium target captured at world generation (`world._populationTarget`).
 * The gap is then allocated across NPC stables by `allocateVacancies`.
 *
 * Read-only consumption of `_populationTarget`: this module never writes it.
 * The lifecycle plan may own `_populationTarget`; this controller self-stabilizes
 * around whatever attrition rate exists.
 */

import type { WorldState } from "../../types/world";
import { TARGET_ROSTER_SIZE } from "../../../constants/engine/recruitmentExtended";

/**
 * Returns the number of replacements needed this tick to hold the active
 * population at its equilibrium target. Clamped at 0 so the controller never
 * drives growth above target. Returns 0 when the target is unset.
 */
export function computeReplacementGap(world: WorldState): number {
  const target = world._populationTarget;
  if (target == null) return 0;
  return Math.max(0, target - world.activeRikishiIds.size);
}

/**
 * Allocates a global replacement gap across eligible NPC stables.
 *
 * Eligibility:
 * - Excludes the player heya (`world.playerHeyaId`).
 * - Excludes sanctioned heyas (`welfareState.complianceState === "sanctioned"`).
 *
 * Distribution:
 * - Each heya's headroom = `max(0, TARGET_ROSTER_SIZE - roster.length)`.
 * - Gap is distributed proportionally to headroom via largest-remainder,
 *   capped at each heya's headroom. Sum = `min(gap, total headroom)`.
 * - Deterministic: iteration order follows `world.heyas` insertion order
 *   (Map preserves insertion order); no RNG or Math.random.
 *
 * @returns `Record<heyaId, vacancyCount>` — only non-zero entries included.
 */
export function allocateVacancies(world: WorldState, gap: number): Record<string, number> {
  const result: Record<string, number> = {};
  if (gap <= 0) return result;

  // Collect eligible heyas with headroom, preserving Map insertion order.
  const eligible: Array<{ heyaId: string; headroom: number }> = [];
  let totalHeadroom = 0;

  for (const heya of world.heyas.values()) {
    if (heya.id === world.playerHeyaId) continue;
    if (heya.welfareState?.complianceState === "sanctioned") continue;
    const currentCount = (heya.rikishiIds ?? []).length;
    const headroom = Math.max(0, TARGET_ROSTER_SIZE - currentCount);
    if (headroom > 0) {
      eligible.push({ heyaId: heya.id, headroom });
      totalHeadroom += headroom;
    }
  }

  if (totalHeadroom === 0) return result;

  const toAllocate = Math.min(gap, totalHeadroom);

  // Largest-remainder proportional allocation.
  // 1. Compute raw (float) share for each heya.
  // 2. Assign floor(share) to each.
  // 3. Distribute remaining units to heyas with largest fractional remainder,
  //    capped at headroom.
  const shares = eligible.map((e) => ({
    ...e,
    raw: (e.headroom / totalHeadroom) * toAllocate,
    floor: 0,
    remainder: 0,
  }));

  let assigned = 0;
  for (const s of shares) {
    s.floor = Math.min(Math.floor(s.raw), s.headroom);
    s.remainder = s.raw - s.floor;
    assigned += s.floor;
  }

  let remaining = toAllocate - assigned;
  if (remaining > 0) {
    // Sort by remainder descending (stable: preserves insertion order on ties).
    const byRemainder = [...shares]
      .map((s, idx) => ({ s, idx }))
      .sort((a, b) => b.s.remainder - a.s.remainder || a.idx - b.idx);

    for (const { s } of byRemainder) {
      if (remaining <= 0) break;
      const canAdd = Math.min(s.headroom - s.floor, remaining);
      if (canAdd > 0) {
        s.floor += canAdd;
        remaining -= canAdd;
      }
    }
  }

  for (const s of shares) {
    if (s.floor > 0) result[s.heyaId] = s.floor;
  }

  return result;
}
