import { describe, it, expect } from "vitest";
import { parseLLMResponse } from "../jsonParser";

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
