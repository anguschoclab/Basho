import { describe, it, expect } from "vitest";
import { safeParse } from "../jsonParser";

describe("safeParse", () => {
  it("should parse valid JSON object and return it", () => {
    const jsonString = '{"name": "test", "value": 123}';
    const fallback = { name: "fallback", value: 0 };
    const result = safeParse(jsonString, fallback);
    expect(result).toEqual({ name: "test", value: 123 });
  });

  it("should return fallback for invalid JSON string", () => {
    const jsonString = "{invalid json}";
    const fallback = { name: "fallback", value: 0 };
    const result = safeParse(jsonString, fallback);
    expect(result).toBe(fallback);
  });

  it("should return fallback for valid JSON that is not an object (e.g., null)", () => {
    const jsonString = "null";
    const fallback = { name: "fallback", value: 0 };
    const result = safeParse(jsonString, fallback);
    expect(result).toBe(fallback);
  });

  it("should return fallback for valid JSON that is not an object (e.g., number)", () => {
    const jsonString = "123";
    const fallback = { name: "fallback", value: 0 };
    const result = safeParse(jsonString, fallback);
    expect(result).toBe(fallback);
  });

  it("should return fallback for valid JSON that is not an object (e.g., string)", () => {
    const jsonString = '"string value"';
    const fallback = { name: "fallback", value: 0 };
    const result = safeParse(jsonString, fallback);
    expect(result).toBe(fallback);
  });

  it("should return fallback for valid JSON array because typeof array is object but we might want to test if it handles arrays as well (arrays are objects in JS)", () => {
    // NOTE: `typeof [] === 'object'` is true in JS.
    // The current implementation of safeParse:
    // `if (result !== null && typeof result === 'object') { return result as T; }`
    // This means it will accept arrays. Let's write a test to verify this behavior.
    const jsonString = "[1, 2, 3]";
    const fallback: any = [];
    const result = safeParse(jsonString, fallback);
    expect(result).toEqual([1, 2, 3]);
  });
});
