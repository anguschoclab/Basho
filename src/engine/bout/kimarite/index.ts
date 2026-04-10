/**
 * src/engine/bout/kimarite/index.ts
 * ===================================
 * Barrel re-export for the kimarite subsystem.
 *
 * KimariteDefinitions → ../kimariteStrategy.ts  (82 techniques + 5 hi_waza)
 * KimariteEvaluator   → ../kimariteEvaluator.ts (weighted stochastic selection)
 */

export { KIMARITE_STRATEGIES } from "../kimariteStrategy";
export { determineKimarite, type EngineSnapshot } from "../kimariteEvaluator";
