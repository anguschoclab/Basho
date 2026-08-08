import { describe, it, expect } from "vitest";
import {
  FACILITY_UPGRADE_BASE_COST,
  MAINTENANCE_COST_PER_POINT,
  FACILITY_BASE_COSTS,
  FACILITY_MAINTENANCE_COSTS,
} from "@/constants/engine/facilities";

describe("Facility constants", () => {
  describe("Existing constants (already extracted)", () => {
    it("FACILITY_UPGRADE_BASE_COST equals 200,000", () => {
      expect(FACILITY_UPGRADE_BASE_COST).toBe(200_000);
    });
    it("MAINTENANCE_COST_PER_POINT equals 3,000", () => {
      expect(MAINTENANCE_COST_PER_POINT).toBe(3_000);
    });
  });

  describe("FACILITY_BASE_COSTS", () => {
    it("has all 10 facility IDs with correct values", () => {
      expect(FACILITY_BASE_COSTS.weights_room).toBe(15_000_000);
      expect(FACILITY_BASE_COSTS.medical_suite).toBe(25_000_000);
      expect(FACILITY_BASE_COSTS.media_studio).toBe(5_000_000);
      expect(FACILITY_BASE_COSTS.traditional_kitchen).toBe(8_000_000);
      expect(FACILITY_BASE_COSTS.video_lab).toBe(12_000_000);
      expect(FACILITY_BASE_COSTS.scouting_office).toBe(18_000_000);
      expect(FACILITY_BASE_COSTS.academy_mongolia).toBe(50_000_000);
      expect(FACILITY_BASE_COSTS.academy_georgia).toBe(45_000_000);
      expect(FACILITY_BASE_COSTS.academy_europe).toBe(40_000_000);
      expect(FACILITY_BASE_COSTS.academy_americas).toBe(40_000_000);
    });
  });

  describe("FACILITY_MAINTENANCE_COSTS", () => {
    it("has all 10 facility IDs with correct values", () => {
      expect(FACILITY_MAINTENANCE_COSTS.weights_room).toBe(450_000);
      expect(FACILITY_MAINTENANCE_COSTS.medical_suite).toBe(800_000);
      expect(FACILITY_MAINTENANCE_COSTS.media_studio).toBe(150_000);
      expect(FACILITY_MAINTENANCE_COSTS.traditional_kitchen).toBe(350_000);
      expect(FACILITY_MAINTENANCE_COSTS.video_lab).toBe(250_000);
      expect(FACILITY_MAINTENANCE_COSTS.scouting_office).toBe(500_000);
      expect(FACILITY_MAINTENANCE_COSTS.academy_mongolia).toBe(2_000_000);
      expect(FACILITY_MAINTENANCE_COSTS.academy_georgia).toBe(1_800_000);
      expect(FACILITY_MAINTENANCE_COSTS.academy_europe).toBe(1_500_000);
      expect(FACILITY_MAINTENANCE_COSTS.academy_americas).toBe(1_500_000);
    });
  });
});
