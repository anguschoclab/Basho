/**
 * phase01_daily_drama.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Drama event generation.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { processDramaTick } from "../../bard/dramaGenerator";

export function phase01_daily_drama(world: WorldState): StateImpact {
  return processDramaTick(world);
}
