/**
 * src/engine/bout/kimariteStrategy.ts
 * =====================================
 * Thin re-export barrel — all logic lives in focused modules:
 *
 *   KimariteStrategyData.ts — KIMARITE_STRATEGIES registry (82 techniques + 5 hi_waza)
 *   KimariteStrategyV2.ts   — KIMARITE_STRATEGIES_V2 (V2 weight-recalibrated variant)
 */

export { KIMARITE_STRATEGIES } from "./KimariteStrategyData";
export { KIMARITE_STRATEGIES_V2 } from "./KimariteStrategyV2";
