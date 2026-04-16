/**
 * baseProjections.test.ts
 *
 * Tests for base projection utility functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  createBaseProjection,
  projectWithDefaults,
  projectFields,
  projectExcludeFields,
} from "../../../presenters/projections/baseProjections";

describe("baseProjections", () => {
  describe("createBaseProjection", () => {
    it("should create a base projection with id", () => {
      const entity = { id: "test-1", name: "Test Entity" };
      const result = createBaseProjection(entity);
      expect(result).toEqual({ id: "test-1" });
    });
  });

  describe("projectWithDefaults", () => {
    it("should merge projection with defaults", () => {
      const projection = { id: "test-1" };
      const defaults = { name: "Default", active: true } as any;
      const result = projectWithDefaults(projection, defaults);
      expect(result).toEqual({ id: "test-1", name: "Default", active: true });
    });
  });

  describe("projectFields", () => {
    it("should project only specified fields", () => {
      const entity = { id: "test-1", name: "Test", active: false, value: 100 };
      const fields = ["id", "name"];
      const result = projectFields(entity as any, fields);
      expect(result).toEqual({ id: "test-1", name: "Test" });
    });
  });

  describe("projectExcludeFields", () => {
    it("should project all fields except specified", () => {
      const entity = { id: "test-1", name: "Test", active: false, value: 100 };
      const exclude = ["active", "value"];
      const result = projectExcludeFields(entity as any, exclude);
      expect(result).toEqual({ id: "test-1", name: "Test" });
    });
  });
});
