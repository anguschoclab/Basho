/**
 * phase01_daily_drama.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Drama event generation.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { processDramaTick } from "@/engine/bard/dramaGenerator";

export function phase01_daily_drama(world: WorldState): StateImpact {
  return processDramaTick(world);
}
