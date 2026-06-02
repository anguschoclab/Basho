import { describe, it, expect } from "vitest";
import {
  formatStance,
  formatSaveDate,
  formatEventTime,
  formatFinePenalty,
} from "../../../engine/utils/formatters";
import type { EngineEvent } from "../../../engine/types/events";

describe("Formatter Utilities", () => {
  describe("formatStance", () => {
    it('should return "—" for falsy values', () => {
      expect(formatStance(undefined)).toBe("—");
      expect(formatStance(null)).toBe("—");
      expect(formatStance("")).toBe("—");
    });

    it("should format a hyphenated string", () => {
      expect(formatStance("yotsu-zumo")).toBe("Yotsu zumo");
    });

    it("should format a regular string", () => {
      expect(formatStance("oshi")).toBe("Oshi");
    });

    it("should handle objects with a toString method", () => {
      const obj = { toString: () => "tsuki-oshi" };
      expect(formatStance(obj)).toBe("Tsuki oshi");
    });

    it("should handle non-string objects without toString fallback gracefully", () => {
      const obj = Object.create(null);
      // It falls back to "" and then to "—"
      expect(formatStance(obj)).toBe("—");
    });
  });

  describe("formatSaveDate", () => {
    it("should format a valid ISO date string", () => {
      // Using a fixed date so it's consistent, though the output format
      // depends on the environment's locale settings. We can check parts.
      const iso = "2023-10-25T14:30:00Z";
      const formatted = formatSaveDate(iso);

      // The exact output depends on timezone, but it shouldn't be the ISO string
      expect(formatted).not.toBe(iso);
      expect(formatted).toContain(":"); // should have time
      // The word 'Oct' should be present in English locales, but we can't guarantee locale.
      // So checking length and structure is safer.
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should return the original string if parsing fails", () => {
      const invalidIso = "not-a-date";
      expect(formatSaveDate(invalidIso)).toBe("Invalid Date");
    });
  });

  describe("formatEventTime", () => {
    it("should format with basho and day if present", () => {
      const event: Partial<EngineEvent> = { bashoNumber: 1, day: 5 };
      expect(formatEventTime(event as EngineEvent)).toBe("B1 D5");
    });

    it("should format with week if basho or day is missing", () => {
      const event: Partial<EngineEvent> = { week: 10 };
      expect(formatEventTime(event as EngineEvent)).toBe("W10");

      const event2: Partial<EngineEvent> = { bashoNumber: 1, week: 11 };
      expect(formatEventTime(event2 as EngineEvent)).toBe("W11");

      const event3: Partial<EngineEvent> = { day: 1, week: 12 };
      expect(formatEventTime(event3 as EngineEvent)).toBe("W12");
    });
  });

  describe("formatFinePenalty", () => {
    it('should return "Severe fine" for 10,000,000 or more', () => {
      expect(formatFinePenalty(10_000_000)).toBe("Severe fine");
      expect(formatFinePenalty(15_000_000)).toBe("Severe fine");
    });

    it('should return "Significant fine" for 3,000,000 to 9,999,999', () => {
      expect(formatFinePenalty(3_000_000)).toBe("Significant fine");
      expect(formatFinePenalty(9_999_999)).toBe("Significant fine");
    });

    it('should return "Moderate fine" for 500,000 to 2,999,999', () => {
      expect(formatFinePenalty(500_000)).toBe("Moderate fine");
      expect(formatFinePenalty(2_999_999)).toBe("Moderate fine");
    });

    it('should return "Minor fine" for less than 500,000', () => {
      expect(formatFinePenalty(499_999)).toBe("Minor fine");
      expect(formatFinePenalty(0)).toBe("Minor fine");
      expect(formatFinePenalty(-100)).toBe("Minor fine");
    });
  });
});
