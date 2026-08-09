/**
 * src/engine/systems/economy/infrastructureValidation.ts
 * ========================================================
 * Validation logic for infrastructure construction.
 * Extracted from InfrastructureService for SRP separation.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import type { Id } from "../../types/common";
import type { FacilityId, FacilityDefinition } from "../../types/infrastructure";
import { FACILITY_REGISTRY } from "../../types/infrastructure";
import { getHeya } from "../../queries";
import { CONSTRUCTION_COST_LEVEL_MULTIPLIER } from "../../../constants/engine/economyExtended";

const KNOWN_FAILURE_REASONS = new Set([
  "heya_not_found",
  "facility_not_found",
  "already_under_construction",
  "insufficient_funds",
]);

export function isUnexpectedFailureReason(reason: string | undefined): boolean {
  return !!reason && !KNOWN_FAILURE_REASONS.has(reason);
}

export interface ValidationResult {
  ok: boolean;
  heya?: Heya;
  def?: FacilityDefinition;
  cost?: number;
  nextLevel?: number;
  reason?: string;
}

export function validateConstruction(
  world: WorldState,
  heyaId: Id,
  facilityId: FacilityId
): ValidationResult {
  const heya = getHeya(world, heyaId);
  if (!heya) return { ok: false, reason: "heya_not_found" };

  const def = FACILITY_REGISTRY[facilityId];
  if (!def) return { ok: false, reason: "facility_not_found" };

  const existing = heya.infrastructure?.[facilityId];
  if (existing && existing.status === "under_construction") {
    return { ok: false, reason: "already_under_construction" };
  }

  const currentLevel = existing?.level || 0;
  const nextLevel = currentLevel + 1;
  const cost = def.baseCost * (1 + (nextLevel - 1) * CONSTRUCTION_COST_LEVEL_MULTIPLIER);

  if (heya.funds < cost)
    return { ok: false, reason: "insufficient_funds", heya, def, cost, nextLevel };

  if (def.requirements?.regionalPresence) {
    const presence = heya.regionalPresence || {};
    for (const [region, minPresence] of Object.entries(def.requirements.regionalPresence)) {
      if ((presence[region] || 0) < (minPresence as number)) {
        return {
          ok: false,
          reason: `Insufficient presence in ${region}. Need ${minPresence}, have ${presence[region] || 0}.`,
          heya,
          def,
          cost,
          nextLevel,
        };
      }
    }
  }

  return { ok: true, heya, def, cost, nextLevel };
}
