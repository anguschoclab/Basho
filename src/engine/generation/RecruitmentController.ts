/**
 * RecruitmentController — closed-loop replacement-rate controller.
 *
 * Computes the weekly global replacement gap from the active population vs the
 * live demographic floor (`computePopulationTarget` — Σ of current NPC heyas'
 * rosterTargets, so the floor breathes with league metabolism: stable
 * foundings raise it, mergers/closures lower it). The gap is then allocated
 * across NPC stables by `allocateVacancies`.
 *
 * `_populationTarget` (worldgen seed) is read only as the degenerate-world
 * fallback; this module never writes it. The controller self-stabilizes
 * around whatever attrition rate exists.
 */

import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import { DEFAULT_ROSTER_TARGET } from "@/constants/engine/generation";

/**
 * The stable's organic roster target — stamped at genesis from
 * `HEYA_ROSTER_TARGETS` (real 2026 per-stable sizes), drawn from
 * `ROSTER_TARGET_BY_STATURE` for mid-game foundings, and defaulted for
 * bare fixtures. One accessor so the controller, allocator, NPC appetite,
 * and UI all read the same number.
 */
export function getHeyaRosterTarget(heya: Heya): number {
  return heya.rosterTarget ?? DEFAULT_ROSTER_TARGET;
}

/**
 * Live demographic floor: Σ of NPC stables' `rosterTarget`, computed
 * each tick so the target breathes with league metabolism — stable
 * foundings raise it, mergers/closures lower it. Sanctioned stables count
 * toward the target (their slots exist even when unreachable; the allocator
 * caps at eligible headroom and the death pipeline handles hopeless cases).
 * Falls back to the worldgen `_populationTarget` snapshot for degenerate
 * worlds with no heya map (bare test fixtures).
 */
export function computePopulationTarget(world: WorldState): number {
  if (world.heyas.size === 0) return world._populationTarget ?? 0;
  let target = 0;
  for (const h of world.heyas.values()) {
    if (h.id !== world.playerHeyaId) target += getHeyaRosterTarget(h);
  }
  return target;
}

/**
 * Returns the number of replacements needed this tick to hold the active
 * population at its equilibrium target. Clamped at 0 so the controller never
 * drives growth above target. Returns 0 when the target is unset.
 */
export function computeReplacementGap(world: WorldState): number {
  const target = computePopulationTarget(world);
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
 * - Each heya's headroom = `max(0, getHeyaRosterTarget(heya) - roster.length)`.
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
    // Same freeze check evaluateVacancies applies — a frozen heya can't sign,
    // so allocating to it wastes the share other heyas could have used.
    if ((heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0) > 0) continue;
    const currentCount = (heya.rikishiIds ?? []).length;
    const headroom = Math.max(0, getHeyaRosterTarget(heya) - currentCount);
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
  const len = eligible.length;
  const shares = new Array(len);
  let assigned = 0;

  for (let i = 0; i < len; i++) {
    const e = eligible[i];
    const raw = (e.headroom / totalHeadroom) * toAllocate;
    const floor = Math.min(Math.floor(raw), e.headroom);
    shares[i] = {
      heyaId: e.heyaId,
      headroom: e.headroom,
      raw,
      floor,
      remainder: raw - floor,
    };
    assigned += floor;
  }

  let remaining = toAllocate - assigned;
  if (remaining > 0) {
    // Sort by remainder descending (stable: preserves insertion order on ties).
    const byRemainder = new Array(len);
    for (let i = 0; i < len; i++) {
      byRemainder[i] = { s: shares[i], idx: i };
    }

    byRemainder.sort((a, b) => b.s.remainder - a.s.remainder || a.idx - b.idx);

    for (let i = 0; i < len; i++) {
      if (remaining <= 0) break;
      const s = byRemainder[i].s;
      const canAdd = Math.min(s.headroom - s.floor, remaining);
      if (canAdd > 0) {
        s.floor += canAdd;
        remaining -= canAdd;
      }
    }
  }

  for (let i = 0; i < len; i++) {
    const s = shares[i];
    if (s.floor > 0) result[s.heyaId] = s.floor;
  }

  return result;
}
