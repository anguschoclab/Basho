/**
 * src/engine/bout/kimarite/index.ts
 * ===================================
 * Barrel re-export for the kimarite subsystem.
 *
 * KimariteDefinitions → ../kimariteStrategy.ts  (82 techniques + 5 hi_waza)
 * KimariteClassifier  → ../kimariteClassifier.ts (mid-fight spatial evaluation - B+)
 * KimariteEvaluator   → ../kimariteEvaluator.ts (weighted stochastic selection)
 */

export { KIMARITE_STRATEGIES, KIMARITE_STRATEGIES_V2 } from "../kimariteStrategy";
export { evaluateKimariteAttempt } from "../kimariteClassifier";
export { determineKimarite, type EngineSnapshot } from "../kimariteEvaluator";
