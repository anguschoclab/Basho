import { describe, it, expect } from "vitest";
import {
  WEEKS_PER_YEAR,
  MAX_EVENT_AGE_WEEKS,
  RIVALRY_DECAY_THRESHOLDS,
  RIVALRY_DECAY_RATES,
  RIVALRY_PRUNING,
  MORALE_BOOST_DURATION_WEEKS,
  SPONSOR_RENEWAL_WINDOW_WEEKS,
  SPONSOR_MIN_LOYALTY_FOR_RENEWAL,
} from "@/constants/engine/time";

describe("time constants", () => {
  describe("scalar values", () => {
    it("WEEKS_PER_YEAR equals 52", () => {
      expect(WEEKS_PER_YEAR).toBe(52);
    });
    it("MAX_EVENT_AGE_WEEKS equals 52", () => {
      expect(MAX_EVENT_AGE_WEEKS).toBe(52);
    });
    it("MORALE_BOOST_DURATION_WEEKS equals 4", () => {
      expect(MORALE_BOOST_DURATION_WEEKS).toBe(4);
    });
    it("SPONSOR_RENEWAL_WINDOW_WEEKS equals 8", () => {
      expect(SPONSOR_RENEWAL_WINDOW_WEEKS).toBe(8);
    });
    it("SPONSOR_MIN_LOYALTY_FOR_RENEWAL equals 60", () => {
      expect(SPONSOR_MIN_LOYALTY_FOR_RENEWAL).toBe(60);
    });
  });

  describe("RIVALRY_DECAY_THRESHOLDS", () => {
    it("has correct values", () => {
      expect(RIVALRY_DECAY_THRESHOLDS.SHORT_TERM).toBe(4);
      expect(RIVALRY_DECAY_THRESHOLDS.MEDIUM_TERM).toBe(12);
      expect(RIVALRY_DECAY_THRESHOLDS.LONG_TERM).toBe(30);
    });
    it("is strictly ordered short < medium < long", () => {
      expect(RIVALRY_DECAY_THRESHOLDS.SHORT_TERM).toBeLessThan(
        RIVALRY_DECAY_THRESHOLDS.MEDIUM_TERM
      );
      expect(RIVALRY_DECAY_THRESHOLDS.MEDIUM_TERM).toBeLessThan(
        RIVALRY_DECAY_THRESHOLDS.LONG_TERM
      );
    });
  });

  describe("RIVALRY_DECAY_RATES", () => {
    it("has all positive rates", () => {
      expect(RIVALRY_DECAY_RATES.HEAT.SHORT).toBeGreaterThan(0);
      expect(RIVALRY_DECAY_RATES.HEAT.MEDIUM).toBeGreaterThan(0);
      expect(RIVALRY_DECAY_RATES.HEAT.LONG).toBeGreaterThan(0);
      expect(RIVALRY_DECAY_RATES.CLOSENESS).toBeGreaterThan(0);
      expect(RIVALRY_DECAY_RATES.SPITE).toBeGreaterThan(0);
    });
    it("heat decay accelerates with rivalry age", () => {
      expect(RIVALRY_DECAY_RATES.HEAT.SHORT).toBeLessThan(RIVALRY_DECAY_RATES.HEAT.MEDIUM);
      expect(RIVALRY_DECAY_RATES.HEAT.MEDIUM).toBeLessThan(RIVALRY_DECAY_RATES.HEAT.LONG);
    });
  });

  describe("RIVALRY_PRUNING", () => {
    it("has positive thresholds", () => {
      expect(RIVALRY_PRUNING.MIN_HEAT).toBeGreaterThan(0);
      expect(RIVALRY_PRUNING.MIN_MEETINGS).toBeGreaterThan(0);
    });
  });
});
