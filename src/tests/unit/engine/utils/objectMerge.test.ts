import { describe, it, expect } from "vitest";
import { deepMerge, setNestedField } from "@/engine/utils/objectMerge";

describe("objectMerge", () => {
  describe("deepMerge", () => {
    it("merges flat objects", () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("deep merges nested objects", () => {
      const target = { a: { x: 1, y: 2 } };
      const source = { a: { y: 3, z: 4 } };
      expect(deepMerge(target, source)).toEqual({ a: { x: 1, y: 3, z: 4 } });
    });

    it("does not mutate target", () => {
      const target = { a: { x: 1 } };
      const source = { a: { y: 2 } };
      deepMerge(target, source);
      expect(target).toEqual({ a: { x: 1 } });
    });

    it("replaces arrays, not merges them", () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };
      expect(deepMerge(target, source)).toEqual({ arr: [4, 5] });
    });

    it("returns source when target is not an object", () => {
      expect(deepMerge(null as never, { a: 1 })).toEqual({ a: 1 });
    });

    it("returns source when source is not an object", () => {
      expect(deepMerge({ a: 1 }, null as never)).toEqual(null);
    });

    it("handles deeply nested structures", () => {
      const target = { a: { b: { c: { d: 1 } } } };
      const source = { a: { b: { c: { e: 2 } } } };
      expect(deepMerge(target, source)).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
    });

    it("overwrites primitive with object", () => {
      const target = { a: 1 };
      const source = { a: { b: 2 } };
      expect(deepMerge(target, source)).toEqual({ a: { b: 2 } });
    });
  });

  describe("setNestedField", () => {
    it("sets a top-level field", () => {
      const obj = { a: 1 };
      expect(setNestedField(obj, "b", 2)).toEqual({ a: 1, b: 2 });
    });

    it("sets a nested field", () => {
      const obj = { a: { b: 1 } };
      expect(setNestedField(obj, "a.c", 2)).toEqual({ a: { b: 1, c: 2 } });
    });

    it("sets a deeply nested field", () => {
      const obj = { a: { b: { c: 1 } } };
      expect(setNestedField(obj, "a.b.d", 2)).toEqual({ a: { b: { c: 1, d: 2 } } });
    });

    it("creates intermediate objects when missing", () => {
      const obj = {};
      expect(setNestedField(obj, "a.b.c", 1)).toEqual({ a: { b: { c: 1 } } });
    });

    it("does not mutate input", () => {
      const obj = { a: { b: 1 } };
      setNestedField(obj, "a.c", 2);
      expect(obj).toEqual({ a: { b: 1 } });
    });

    it("overwrites existing nested value", () => {
      const obj = { a: { b: 1 } };
      expect(setNestedField(obj, "a.b", 2)).toEqual({ a: { b: 2 } });
    });
  });
});
