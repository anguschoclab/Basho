/**
 * phase01_daily_drama.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Drama event generation.
 */

import type { WorldState } from "../../types/world";
import { processDramaTick } from "../../bard/dramaGenerator";

export function phase01_daily_drama(world: WorldState) {
  return processDramaTick(world);
}
