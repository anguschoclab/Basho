import { describe, it, expect } from "vitest";
import { describeAggression } from "../narrativeDescriptions";

describe("narrativeDescriptions", () => {
  describe("describeAggression", () => {
    it("should return 'Relentless' for values >= 85", () => {
      expect(describeAggression(85)).toBe("Relentless");
      expect(describeAggression(100)).toBe("Relentless");
      expect(describeAggression(200)).toBe("Relentless"); // Tests clamping
    });

    it("should return 'Aggressive' for values between 70 and 84", () => {
      expect(describeAggression(70)).toBe("Aggressive");
      expect(describeAggression(84)).toBe("Aggressive");
    });

    it("should return 'Forward-moving' for values between 55 and 69", () => {
      expect(describeAggression(55)).toBe("Forward-moving");
      expect(describeAggression(69)).toBe("Forward-moving");
    });

    it("should return 'Patient' for values between 40 and 54", () => {
      expect(describeAggression(40)).toBe("Patient");
      expect(describeAggression(54)).toBe("Patient");
    });

    it("should return 'Defensive' for values between 25 and 39", () => {
      expect(describeAggression(25)).toBe("Defensive");
      expect(describeAggression(39)).toBe("Defensive");
    });

    it("should return 'Passive' for values < 25", () => {
      expect(describeAggression(24)).toBe("Passive");
      expect(describeAggression(0)).toBe("Passive");
      expect(describeAggression(-10)).toBe("Passive"); // Tests clamping
    });

    it("should handle NaN/undefined/invalid values gracefully", () => {
      // safe(value, 0) falls back to 0, clamping to 0 -> "Passive"
      expect(describeAggression(NaN)).toBe("Passive");
      expect(describeAggression(undefined as unknown as number)).toBe("Passive");
      expect(describeAggression(null as unknown as number)).toBe("Passive");
      expect(describeAggression("invalid" as unknown as number)).toBe("Passive");
    });
  });
});
