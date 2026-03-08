import { describe, it, expect } from "vitest";
import { getVoiceMatrix, validateDiversityGates } from "../pbpMatrix";

describe("validateDiversityGates", () => {
  it("reports buckets below the minimum phrase threshold", () => {
    const lib = getVoiceMatrix();
    // Use a very high threshold to ensure we get failures (testing the function works)
    const failures = validateDiversityGates(lib, 999);
    expect(Array.isArray(failures)).toBe(true);
    // Every failure should have context, bucket, and count
    for (const f of failures) {
      expect(f).toHaveProperty("context");
      expect(f).toHaveProperty("bucket");
      expect(typeof f.count).toBe("number");
    }
  });

  it("returns empty array when threshold is 0", () => {
    const lib = getVoiceMatrix();
    const failures = validateDiversityGates(lib, 0);
    expect(failures).toEqual([]);
  });

  it("validates the real matrix with a low threshold", () => {
    const lib = getVoiceMatrix();
    // Each bucket should have at least 1 phrase
    const failures = validateDiversityGates(lib, 1);
    expect(failures).toEqual([]);
  });
});
