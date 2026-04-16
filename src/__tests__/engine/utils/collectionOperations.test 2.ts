/**
 * collectionOperations.test.ts
 *
 * Tests for collection operation utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  mapIdsToEntities,
  getEntitiesByIds,
  groupBy,
  countBy,
} from "../../../engine/utils/collectionOperations";

describe("collectionOperations", () => {
  describe("mapIdsToEntities", () => {
    it("should map IDs to entities from a Map", () => {
      const entityMap = new Map([
        ["id-1", { id: "id-1", name: "Entity 1" }],
        ["id-2", { id: "id-2", name: "Entity 2" }],
      ]);

      const result = mapIdsToEntities(["id-1", "id-2"], entityMap);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("id-1");
      expect(result[1].id).toBe("id-2");
    });

    it("should filter out IDs that don't exist in the map", () => {
      const entityMap = new Map([["id-1", { id: "id-1", name: "Entity 1" }]]);

      const result = mapIdsToEntities(["id-1", "id-2"], entityMap);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("id-1");
    });
  });

  describe("getEntitiesByIds", () => {
    it("should get entities by IDs from a Map", () => {
      const entityMap = new Map([
        ["id-1", { id: "id-1", name: "Entity 1" }],
        ["id-2", { id: "id-2", name: "Entity 2" }],
      ]);

      const result = getEntitiesByIds(["id-1", "id-2"], entityMap);
      expect(result).toHaveLength(2);
    });

    it("should return empty array if no IDs provided", () => {
      const entityMap = new Map([["id-1", { id: "id-1", name: "Entity 1" }]]);

      const result = getEntitiesByIds([], entityMap);
      expect(result).toHaveLength(0);
    });
  });

  describe("groupBy", () => {
    it("should group entities by key function", () => {
      const entities = [
        { id: "1", category: "A" },
        { id: "2", category: "B" },
        { id: "3", category: "A" },
      ];

      const result = groupBy(entities, (e) => e.category);
      expect(result.get("A")).toHaveLength(2);
      expect(result.get("B")).toHaveLength(1);
    });
  });

  describe("countBy", () => {
    it("should count entities by key function", () => {
      const entities = [
        { id: "1", category: "A" },
        { id: "2", category: "B" },
        { id: "3", category: "A" },
      ];

      const result = countBy(entities, (e) => e.category);
      expect(result.get("A")).toBe(2);
      expect(result.get("B")).toBe(1);
    });
  });
});
