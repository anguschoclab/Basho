import { describe, it, expect } from "vitest";
import {
  initPhysicalBody,
  isBodyFalling,
  isOutOfRing,
  tawaraBounceResistance,
} from "../boutSpatial";
import { mockRikishi } from "../utils";
import { TAWARA_RADIUS } from "../../types/combat-spatial";

describe("boutSpatial", () => {
  describe("initPhysicalBody", () => {
    it("initializes east body at positive x", () => {
      const rikishi = mockRikishi("r1");
      const body = initPhysicalBody(rikishi, "east");
      expect(body.x).toBeGreaterThan(0);
      expect(body.facingAngle).toBeCloseTo(0);
    });

    it("initializes west body at negative x", () => {
      const rikishi = mockRikishi("r1");
      const body = initPhysicalBody(rikishi, "west");
      expect(body.x).toBeLessThan(0);
      expect(body.facingAngle).toBeCloseTo(0);
    });
  });

  describe("tawaraBounceResistance", () => {
    it("returns 0 before tawara contact", () => {
      expect(tawaraBounceResistance(-0.1)).toBe(0);
    });

    it("returns 15 at heel contact", () => {
      expect(tawaraBounceResistance(0.3)).toBe(15);
    });

    it("returns 8 at toe contact", () => {
      expect(tawaraBounceResistance(0.7)).toBe(8);
    });

    it("returns 0 when fully out", () => {
      expect(tawaraBounceResistance(2.1)).toBe(0);
    });
  });

  describe("isBodyFalling", () => {
    it("stable when cogOffset is small", () => {
      const rikishi = mockRikishi("r1");
      const body = initPhysicalBody(rikishi, "east");
      body.cogOffset = 0.05;
      expect(isBodyFalling(body)).toBe(false);
    });

    it("falling when cogOffset exceeds footSpread/2", () => {
      const rikishi = mockRikishi("r1");
      const body = initPhysicalBody(rikishi, "east");
      body.cogOffset = body.footSpread / 2 + 0.01;
      expect(isBodyFalling(body)).toBe(true);
    });
  });

  describe("isOutOfRing", () => {
    it("returns false when within ring", () => {
      const rikishi = mockRikishi("r1");
      const body = initPhysicalBody(rikishi, "east");
      expect(isOutOfRing(body)).toBe(false);
    });

    it("returns true when beyond tawara", () => {
      const rikishi = mockRikishi("r1");
      const body = initPhysicalBody(rikishi, "east");
      body.x = TAWARA_RADIUS + 0.1;
      expect(isOutOfRing(body)).toBe(true);
    });
  });
});
