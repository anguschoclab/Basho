/**
 * resetSingletons.ts
 * ===================
 * Centralized utility for resetting all singleton instances and module-level state
 * between tests to prevent state pollution and flaky tests.
 */

import { BardEngine } from "../../engine/narrative/BardEngine";
import { resetStorageProvider } from "../../engine/storageProvider";
import { clearQueryCaches } from "../../engine/queries";
import { logger } from "../../engine/utils/Logger";
import { historyCache } from "../../engine/historyCache";

/**
 * Reset all singleton instances and module-level state.
 * Call this in afterEach hooks to ensure test isolation.
 *
 * Note: The selector cache (WeakMap-based in selectors.ts) is not reset here
 * because WeakMap automatically garbage collects entries when WorldState objects
 * are no longer referenced. Tests create fresh WorldState objects, so the cache
 * naturally cleans itself up.
 *
 * Note: The global RNG is not reset here because tests use world-specific RNGs
 * (rngForWorld) rather than the global random() function, and resetting it
 * causes test failures due to implicit dependencies.
 */
export function resetAllSingletons(): void {
  // Reset BardEngine LRU cache
  BardEngine.resetCache();

  // Reset storage provider
  resetStorageProvider();

  // Reset query caches (roster and style bias)
  clearQueryCaches();

  // Clear logger history
  logger.clearHistory();

  // Clear history cache
  historyCache.clear();
}
