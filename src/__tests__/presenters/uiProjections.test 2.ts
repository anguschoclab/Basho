/**
 * uiProjections.test.ts
 *
 * Tests for UI projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  projectRikishiWithHeya,
  projectMediaUIDigest,
  projectHOFUIDigest,
  projectSponsorUIDigest,
  projectMedicalUIDigest,
} from "../../presenters/uiProjections";
import { createMockWorldState, createMockRikishi, createMockHeya } from "../utils/testHelpers";

describe("uiProjections", () => {
  describe("projectRikishiWithHeya", () => {
    it("should return rikishi with heya data", () => {
      const world = createMockWorldState() as any;
      const rikishi = createMockRikishi({ id: "rikishi-1", heyaId: "heya-1" }) as any;
      const heya = createMockHeya({ id: "heya-1", name: "Test Stable" });
      world.heyas.set("heya-1", heya);

      const result = projectRikishiWithHeya(rikishi, world);
      expect(result).toBeDefined();
      expect(result?.rikishi.id).toBe("rikishi-1");
    });
  });

  describe("projectMediaUIDigest", () => {
    it("should return media digest", () => {
      const world = createMockWorldState() as any;
      const result = projectMediaUIDigest(world);
      expect(result).toBeDefined();
    });
  });

  describe("projectHOFUIDigest", () => {
    it("should return HOF digest", () => {
      const world = createMockWorldState() as any;
      const result = projectHOFUIDigest(world);
      expect(result).toBeDefined();
    });
  });

  describe("projectSponsorUIDigest", () => {
    it("should return sponsor digest", () => {
      const world = createMockWorldState({ playerHeyaId: "heya-1" }) as any;
      const result = projectSponsorUIDigest(world);
      expect(result).toBeDefined();
    });
  });

  describe("projectMedicalUIDigest", () => {
    it("should return medical digest", () => {
      const world = createMockWorldState() as any;
      const result = projectMedicalUIDigest(world);
      expect(result).toBeDefined();
    });
  });
});
