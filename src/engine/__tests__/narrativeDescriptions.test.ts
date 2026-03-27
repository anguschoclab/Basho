import { describe, it, expect } from "vitest";
import { describeTrainingEffect } from "../narrativeDescriptions";

describe("narrativeDescriptions", () => {
  describe("describeTrainingEffect", () => {
    it("returns 'Dramatically increases' for multipliers >= 1.5", () => {
      expect(describeTrainingEffect(1.5)).toBe("Dramatically increases");
      expect(describeTrainingEffect(2.0)).toBe("Dramatically increases");
      expect(describeTrainingEffect(10)).toBe("Dramatically increases");
      expect(describeTrainingEffect(100)).toBe("Dramatically increases"); // clamped to 10
    });

    it("returns 'Significantly improves' for multipliers between 1.2 and 1.49", () => {
      expect(describeTrainingEffect(1.2)).toBe("Significantly improves");
      expect(describeTrainingEffect(1.49)).toBe("Significantly improves");
    });

    it("returns 'Slightly enhances' for multipliers between 1.05 and 1.19", () => {
      expect(describeTrainingEffect(1.05)).toBe("Slightly enhances");
      expect(describeTrainingEffect(1.19)).toBe("Slightly enhances");
    });

    it("returns 'Maintains' for multipliers between 0.95 and 1.04", () => {
      expect(describeTrainingEffect(0.95)).toBe("Maintains");
      expect(describeTrainingEffect(1.0)).toBe("Maintains");
      expect(describeTrainingEffect(1.04)).toBe("Maintains");
    });

    it("returns 'Slightly reduces' for multipliers between 0.8 and 0.94", () => {
      expect(describeTrainingEffect(0.8)).toBe("Slightly reduces");
      expect(describeTrainingEffect(0.94)).toBe("Slightly reduces");
    });

    it("returns 'Significantly reduces' for multipliers between 0.5 and 0.79", () => {
      expect(describeTrainingEffect(0.5)).toBe("Significantly reduces");
      expect(describeTrainingEffect(0.79)).toBe("Significantly reduces");
    });

    it("returns 'Dramatically reduces' for multipliers below 0.5", () => {
      expect(describeTrainingEffect(0.49)).toBe("Dramatically reduces");
      expect(describeTrainingEffect(0)).toBe("Dramatically reduces");
      expect(describeTrainingEffect(-5)).toBe("Dramatically reduces"); // clamped to 0
    });

    it("handles edge cases with safe clamping", () => {
      // safe fallback for undefined/NaN is 1, which falls into 'Maintains'
      expect(describeTrainingEffect(NaN)).toBe("Maintains");
      expect(describeTrainingEffect(undefined as any)).toBe("Maintains");
    });
  });
});
