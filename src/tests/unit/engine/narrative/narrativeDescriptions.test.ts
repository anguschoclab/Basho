import { describe, it, expect } from "vitest";
import { describeTrainingEffect } from "@/engine/narrativeDescriptions";

describe("narrativeDescriptions", () => {
  describe("describeTrainingEffect", () => {
    it("should return correct string for multiplier >= 1.5", () => {
      expect(describeTrainingEffect(1.6)).toBe("Dramatically increases");
      expect(describeTrainingEffect(10)).toBe("Dramatically increases");
    });

    it("should return correct string for multiplier >= 1.2", () => {
      expect(describeTrainingEffect(1.2)).toBe("Significantly improves");
      expect(describeTrainingEffect(1.49)).toBe("Significantly improves");
    });

    it("should return correct string for multiplier >= 1.05", () => {
      expect(describeTrainingEffect(1.05)).toBe("Slightly enhances");
      expect(describeTrainingEffect(1.19)).toBe("Slightly enhances");
    });

    it("should return correct string for multiplier >= 0.95", () => {
      expect(describeTrainingEffect(0.95)).toBe("Maintains");
      expect(describeTrainingEffect(1.04)).toBe("Maintains");
    });

    it("should return correct string for multiplier >= 0.8", () => {
      expect(describeTrainingEffect(0.8)).toBe("Slightly reduces");
      expect(describeTrainingEffect(0.94)).toBe("Slightly reduces");
    });

    it("should return correct string for multiplier >= 0.5", () => {
      expect(describeTrainingEffect(0.5)).toBe("Significantly reduces");
      expect(describeTrainingEffect(0.79)).toBe("Significantly reduces");
    });

    it("should return correct string for multiplier < 0.5", () => {
      expect(describeTrainingEffect(0.49)).toBe("Dramatically reduces");
      expect(describeTrainingEffect(0)).toBe("Dramatically reduces");
    });

    it("should clamp values above 10", () => {
      expect(describeTrainingEffect(15)).toBe("Dramatically increases");
    });

    it("should clamp values below 0", () => {
      expect(describeTrainingEffect(-5)).toBe("Dramatically reduces");
    });
  });
});
