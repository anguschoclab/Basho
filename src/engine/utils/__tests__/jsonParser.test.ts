import { describe, it, expect } from "vitest";
import { parseLLMResponse, safeParse } from "../jsonParser";

describe("parseLLMResponse", () => {
  it("parses valid strict JSON", () => {
    const input = '{"hello": "world", "count": 1}';
    expect(parseLLMResponse(input)).toEqual({ hello: "world", count: 1 });
  });

  it("strips markdown json blocks", () => {
    const input = '```json\n{"hello": "world"}\n```';
    expect(parseLLMResponse(input)).toEqual({ hello: "world" });
  });

  it("parses JSON with unquoted keys", () => {
    const input = '{hello: "world", count: 2}';
    expect(parseLLMResponse(input)).toEqual({ hello: "world", count: 2 });
  });

  it("parses JSON with trailing commas", () => {
    const input = '{"hello": "world", "count": 3,}';
    expect(parseLLMResponse(input)).toEqual({ hello: "world", count: 3 });
  });

  it("throws a descriptive error on completely invalid JSON", () => {
    const input = "not json at all";
    expect(() => parseLLMResponse(input)).toThrow(
      /Failed to parse LLM payload/,
    );
  });
});

describe("safeParse", () => {
  it("parses valid JSON successfully", () => {
    const input = '{"hello": "world"}';
    const fallback = { hello: "fallback" };
    expect(safeParse(input, fallback)).toEqual({ hello: "world" });
  });

  it("returns fallback for invalid JSON", () => {
    const input = "invalid json";
    const fallback = { hello: "fallback" };
    expect(safeParse(input, fallback)).toEqual(fallback);
  });

  it("returns fallback for non-object JSON", () => {
    const input = "123";
    const fallback = { hello: "fallback" };
    expect(safeParse(input, fallback)).toEqual(fallback);
  });

  it("prevents prototype pollution", () => {
    const input = '{"__proto__": {"polluted": true}, "hello": "world"}';
    const fallback = { hello: "fallback" };
    const result = safeParse(input, fallback);
    expect(result).toEqual({ hello: "world" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).__proto__.polluted).toBeUndefined();
    expect({}["polluted" as keyof object]).toBeUndefined();
  });
});
