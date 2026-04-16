import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Reset all mocks and timers between tests to prevent state pollution
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
