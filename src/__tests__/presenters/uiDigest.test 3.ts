/**
 * uiDigest.test.ts
 *
 * Tests for uiDigest compatibility layer.
 */

import { describe, it, expect } from "vitest";
import {
  buildWeeklyDigest,
  getOzekiRunCandidates,
  getFacilityLevelLabel,
  projectDashboardUIDigest,
  projectBashoUIDigest,
  projectLoanStatus,
  projectHeyaData,
  projectEventLogData,
  resolveRegistryLabel,
  enrichRikishiForUI,
  // Ensure all re-exports work
} from "../../presenters/uiDigest";

describe("uiDigest (compatibility layer)", () => {
  it("should export all functions from projection modules", () => {
    expect(buildWeeklyDigest).toBeDefined();
    expect(getOzekiRunCandidates).toBeDefined();
    expect(getFacilityLevelLabel).toBeDefined();
    expect(projectDashboardUIDigest).toBeDefined();
    expect(projectBashoUIDigest).toBeDefined();
    expect(projectLoanStatus).toBeDefined();
    expect(projectHeyaData).toBeDefined();
    expect(projectEventLogData).toBeDefined();
    expect(resolveRegistryLabel).toBeDefined();
    expect(enrichRikishiForUI).toBeDefined();
  });

  it("should maintain backward compatibility with function signatures", () => {
    expect(typeof buildWeeklyDigest).toBe("function");
    expect(typeof getOzekiRunCandidates).toBe("function");
    expect(typeof getFacilityLevelLabel).toBe("function");
    expect(typeof projectDashboardUIDigest).toBe("function");
    expect(typeof projectBashoUIDigest).toBe("function");
    expect(typeof projectLoanStatus).toBe("function");
    expect(typeof projectHeyaData).toBe("function");
    expect(typeof projectEventLogData).toBe("function");
    expect(typeof resolveRegistryLabel).toBe("function");
    expect(typeof enrichRikishiForUI).toBe("function");
  });
});
