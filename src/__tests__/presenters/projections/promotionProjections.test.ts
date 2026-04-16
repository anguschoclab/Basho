/**
 * promotionProjections.test.ts
 *
 * Tests for promotion projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
} from "../../../presenters/projections/promotionProjections";
import { createMockWorldState } from "../../utils/testHelpers";

describe("promotionProjections", () => {
  describe("getOzekiRunCandidates", () => {
    it("should return empty array when no history", () => {
      const world = createMockWorldState({ historyIndex: undefined }) as any;
      const result = getOzekiRunCandidates(world);
      expect(result).toHaveLength(0);
    });

    it("should return candidates array", () => {
      const world = createMockWorldState({ historyIndex: { rikishi: {} } }) as any;
      const result = getOzekiRunCandidates(world);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getYokozunaCandidates", () => {
    it("should return empty array when no history", () => {
      const world = createMockWorldState({ historyIndex: undefined }) as any;
      const result = getYokozunaCandidates(world);
      expect(result).toHaveLength(0);
    });

    it("should return candidates array", () => {
      const world = createMockWorldState({ historyIndex: { rikishi: {} } }) as any;
      const result = getYokozunaCandidates(world);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getKadobanDrama", () => {
    it("should return empty array when no kadoban rikishi", () => {
      const world = createMockWorldState() as any;
      const result = getKadobanDrama(world);
      expect(result).toHaveLength(0);
    });
  });
});
