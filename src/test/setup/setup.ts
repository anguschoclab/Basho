import { vi, afterEach } from "vitest";
import { setSeed } from "../../engine/rng";
import { resetImpactTimestampCounter } from "../../engine/core/StateImpact";

// Reset all mocks and singleton state between tests to prevent state pollution
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setSeed("test-reset");
  resetImpactTimestampCounter();
});
