/**
 * phase01_week_staff.ts
 * =====================
 * Pipeline Phase: Weekly Staff Tick.
 *
 * Responsibilities:
 * 1. Update staff fatigue and morale based on rikishi workload.
 * 2. Log overload events when staff are overworked.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { tickStaffWeek } from "../../staff";

export function phase01_week_staff(world: WorldState): StateImpact {
  return tickStaffWeek(world);
}
