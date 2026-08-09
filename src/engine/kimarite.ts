/**
 * src/engine/kimarite.ts
 * =======================
 * Thin re-export barrel for backward compatibility.
 *
 * The kimarite system has been decomposed into:
 * - kimariteRegistry.ts: Type definitions, CATEGORY_DEFAULTS, KIMARITE_ENRICHMENT,
 *   KIMARITE_REGISTRY, and lookup functions (getKimarite, getKimariteByJsaCategory, etc.)
 * - kimariteStrategies.ts: KimariteStrategy interface, spatial predicates,
 *   and KIMARITE_STRATEGIES array with condition functions for each technique.
 *
 * @see kimariteRegistry for the canonical kimarite definitions
 * @see kimariteStrategies for the bout-time strategy selection data
 */

export type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements } from "./types/kimarite";

export {
  KIMARITE_REGISTRY,
  getKimarite,
  getKimariteByJsaCategory,
  getKimariteByClass,
  getKimariteCount,
  getKimariteForFamily,
} from "./kimariteRegistry";

export type { KimariteStrategy } from "./kimariteStrategies";
export { KIMARITE_STRATEGIES } from "./kimariteStrategies";
