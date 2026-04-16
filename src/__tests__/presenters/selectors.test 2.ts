/**
 * selectors.test.ts
 *
 * Tests for selector functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  selectInjuredRikishi,
  selectRecentEvents,
  selectPromotionCandidates,
  selectYokozunaCandidates,
  selectKadobanRikishi,
  selectTopRivals,
} from "../../presenters/selectors";
import { createMockWorldState } from "../utils/testHelpers";

describe("selectors", () => {
  describe("selectInjuredRikishi", () => {
    it("should return empty array when no injured rikishi", () => {
      const world = createMockWorldState() as any;
      const result = selectInjuredRikishi(world);
      expect(result).toHaveLength(0);
    });
  });

  describe("selectRecentEvents", () => {
    it("should return recent events", () => {
      const world = createMockWorldState() as any;
      const result = selectRecentEvents(world);
      expect(result).toBeDefined();
      expect(result.training).toBeDefined();
      expect(result.scouting).toBeDefined();
      expect(result.economy).toBeDefined();
    });
  });

  describe("selectPromotionCandidates", () => {
    it("should return promotion candidates", () => {
      const world = createMockWorldState() as any;
      const result = selectPromotionCandidates(world);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("selectYokozunaCandidates", () => {
    it("should return yokozuna candidates", () => {
      const world = createMockWorldState() as any;
      const result = selectYokozunaCandidates(world);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("selectKadobanRikishi", () => {
    it("should return kadoban rikishi", () => {
      const world = createMockWorldState() as any;
      const result = selectKadobanRikishi(world);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("selectTopRivals", () => {
    it("should return top rivals", () => {
      const world = createMockWorldState() as any;
      const result = selectTopRivals(world);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
