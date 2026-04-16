import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";

// Reset all mocks and singleton state between tests to prevent state pollution
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  // resetAllSingletons(); // Disabled - governanceLog refactoring works without it
});
