/**
 * objectives.ts — player career objectives (T1.1).
 * Serializable world state only: no functions, no closures.
 */

import type { Id } from "@/engine/types/common";

export type ObjectiveKind = "sekitori_count" | "funds_growth";

export interface PlayerObjective {
  id: string;
  kind: ObjectiveKind;
  title: string;
  /** Baseline measured at issue (e.g. sekitori count or funds at year start). */
  baseline: number;
  /** Target to reach by deadlineYear (absolute value, not delta). */
  target: number;
  /** Year the objective was issued. */
  issuedYear: number;
  /** Year the objective must be met by (evaluated at that year's boundary). */
  deadlineYear: number;
  outcome: "pending" | "met" | "failed";
  /** Political capital awarded on success (deducted on failure). */
  stakes: number;
}

export interface ObjectivesState {
  active: PlayerObjective[];
  /** Most recent outcomes (bounded, newest first). */
  history: { id: string; title: string; outcome: "met" | "failed"; year: number }[];
}

/** Progress metric for an objective kind against live world state. */
export function objectiveProgress(
  world: {
    rikishi: Map<Id, { heyaId?: string; division?: string; isRetired?: boolean }>;
    heyas: Map<Id, { funds?: number }>;
  },
  heyaId: Id,
  kind: ObjectiveKind
): number {
  if (kind === "funds_growth") return world.heyas.get(heyaId)?.funds ?? 0;
  let sekitori = 0;
  for (const r of world.rikishi.values()) {
    if (
      r.heyaId === heyaId &&
      !r.isRetired &&
      (r.division === "makuuchi" || r.division === "juryo")
    ) {
      sekitori++;
    }
  }
  return sekitori;
}
