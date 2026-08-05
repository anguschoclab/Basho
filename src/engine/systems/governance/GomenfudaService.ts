/**
 * Gomenfuda (Apology Notice) System
 *
 * When a heya withdraws a rikishi from a basho (injury/scandal),
 * a gomenfuda is posted. Repeated withdrawals within a period
 * reduce the heya's reputation and can trigger JSA sanctions.
 */

import type { Id } from "../../types/common";
import type { Heya } from "../../types/heya";
import type { Rikishi } from "../../types/rikishi";
import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";

/** Reputation penalty per gomenfuda */
export const GOMENFUDA_REPUTATION_PENALTY = 5;

/** Reputation penalty multiplier for consecutive withdrawals */
export const CONSECUTIVE_WITHDRAWAL_MULTIPLIER = 1.5;

/** Threshold for JSA sanction (3+ withdrawals in a 12-month period) */
export const SANCTION_THRESHOLD = 3;

/** Gomenfuda record */
export interface GomenfudaRecord {
  id: Id;
  heyaId: Id;
  rikishiId: Id;
  bashoName: string;
  year: number;
  reason: "injury" | "scandal" | "disciplinary" | "medical";
  date: string;
}

/**
 * Record a gomenfuda withdrawal and apply reputation penalty to the heya.
 */
export function recordGomenfuda(
  world: WorldState,
  heya: Heya,
  rikishi: Rikishi,
  bashoName: string,
  reason: GomenfudaRecord["reason"]
): StateImpact {
  const builder = createImpactBuilder("recordGomenfuda");

  // Count prior gomenfuda for this heya in the current year
  const priorCount = countGomenfudaForHeya(world, heya.id, world.year);

  // Calculate penalty — consecutive withdrawals have multiplied penalty
  let penalty = GOMENFUDA_REPUTATION_PENALTY;
  if (priorCount > 0) {
    penalty = Math.round(penalty * CONSECUTIVE_WITHDRAWAL_MULTIPLIER * priorCount);
  }

  // Apply reputation penalty to heya (using brandIdentityId or direct field)
  const currentReputation = (heya as unknown as { reputation?: number }).reputation ?? 50;
  const newReputation = Math.max(0, currentReputation - penalty);

  builder.updateHeya(heya.id, {
    ...(heya as object),
    ...({ reputation: newReputation } as object),
  } as Partial<Heya>);

  // Mark the rikishi as absent
  builder.updateRikishi(rikishi.id, {
    absentFinalDay: true,
  });

  // Log the gomenfuda event
  builder.logEvent(
    "BASHO_STATUS",
    "discipline",
    {
      status: "gomenfuda_posted",
      description: `${heya.name} posts gomenfuda for ${rikishi.shikona} (${reason}).`,
      heyaId: heya.id,
      rikishiId: rikishi.id,
      bashoName,
      reason,
      reputationPenalty: penalty,
    },
    { heyaId: heya.id, rikishiId: rikishi.id, importance: "notable" }
  );

  // Check for sanction threshold
  if (priorCount + 1 >= SANCTION_THRESHOLD) {
    builder.logEvent(
      "BASHO_STATUS",
      "discipline",
      {
        status: "jsa_sanction_warning",
        description: `${heya.name} has posted ${priorCount + 1} gomenfuda this year — JSA sanction warning issued.`,
        heyaId: heya.id,
        withdrawalCount: priorCount + 1,
      },
      { heyaId: heya.id, importance: "headline" }
    );
  }

  return builder.build();
}

/**
 * Count gomenfuda records for a heya in a given year.
 * Uses world event log to find prior gomenfuda events.
 */
export function countGomenfudaForHeya(world: WorldState, heyaId: Id, year: number): number {
  const log = world.events?.log;
  if (!log) return 0;

  return log.filter(
    (e: { type: string; category: string; data: Record<string, unknown> }) =>
      e.type === "BASHO_STATUS" &&
      e.category === "discipline" &&
      e.data?.status === "gomenfuda_posted" &&
      e.data?.heyaId === heyaId &&
      e.data?.year === year
  ).length;
}

/**
 * Check if a heya has reached the sanction threshold.
 */
export function hasSanctionWarning(world: WorldState, heyaId: Id): boolean {
  return countGomenfudaForHeya(world, heyaId, world.year) >= SANCTION_THRESHOLD;
}
