/**
 * src/engine/bout/kimarite/index.ts
 * ===================================
 * Barrel re-export for the kimarite subsystem.
 *
 * KimariteClassifier → ../kimariteClassifier.ts (mid-fight spatial evaluation — B+)
 *
 * Note: KimariteEvaluator (retroactive post-physics selection) was deleted in
 * Phase 8. The spatial classifier is now the sole kimarite selection path.
 * The KIMARITE_STRATEGIES / KIMARITE_STRATEGIES_V2 registries now live in
 * src/engine/kimarite.ts (KIMARITE_REGISTRY); the old kimariteStrategy.ts barrel
 * (and its deleted KimariteStrategyData/V2 backing modules) has been removed.
 * EngineSnapshot is now defined in types/combat-spatial.ts.
 */

export { evaluateKimariteAttempt } from "../kimariteClassifier";
export type { EngineSnapshot } from "../../types/combat-spatial";
