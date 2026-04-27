/**
 * src/engine/bout/kimarite/index.ts
 * ===================================
 * Barrel re-export for the kimarite subsystem.
 *
 * KimariteDefinitions → ../kimariteStrategy.ts  (82 techniques + 5 hi_waza)
 * KimariteClassifier  → ../kimariteClassifier.ts (mid-fight spatial evaluation — B+)
 *
 * Note: KimariteEvaluator (retroactive post-physics selection) was deleted in
 * Phase 8. The spatial classifier is now the sole kimarite selection path.
 * EngineSnapshot is now defined in types/combat-spatial.ts.
 */

export { KIMARITE_STRATEGIES, KIMARITE_STRATEGIES_V2 } from "../kimariteStrategy";
export { evaluateKimariteAttempt } from "../kimariteClassifier";
export type { EngineSnapshot } from "../../types/combat-spatial";
